/**
 * Anime2.5DRig headless character renderer. MIT, Copyright (c) 2026 hakoniwa.
 * Source: https://github.com/852wa/Anime2.5DRig/tree/7450341934a8ff77bf05b90d9f708786e3eb3996
 * Extracted kernels: app.js 18-39,45-116,662-797,875-891,894-923.
 * Adapter: caller-owned RAF/input/lifecycle, same-origin model loader, no camera/mic/editor UI.
 */
import './vendor/rigger.js';
import './vendor/runtime.js';
import './vendor/genericparts.js';
import { defaultParams, parameterRanges, normalizeParams } from './params.js';
import { createAccessorySpring, resetAccessorySpring, advanceAccessorySpring, accessoryVertexDelta } from './accessory-spring.js';
import { closedEyeY, closedMouthPoint, neckBlend } from './feature-deformation.js';
import { isV2Model, refineV2Rig, continuousV2Hair, hairRootWeight, armPoint } from './v2-refinements.js';
export { defaultParams, parameterRanges, expressionPresets, blinkAt } from './params.js';
const Rigger = globalThis.Rigger, RT = globalThis.RigRuntime;
function sameOriginUrl(value) {
  const url = new URL(value, location.href);
  if(url.origin !== location.origin || !['http:','https:'].includes(url.protocol)) throw new Error('Character assets must be same-origin HTTP(S) URLs');
  return url;
}
async function fetchAsset(url, signal, kind = 'buffer') {
  const response = await fetch(sameOriginUrl(url), { signal });
  if(!response.ok) throw new Error('Character asset HTTP '+response.status);
  if(kind === 'json') return response.json();
  if(Number(response.headers.get('content-length')) > RT.MAX_FILE_BYTES) throw new Error('Character PSD exceeds 128MB');
  return response.arrayBuffer();
}
function parseRig(buffer, signal, generic, onProgress) {
  RT.validateHeader(buffer);
  return new Promise((resolve,reject) => {
    if(signal?.aborted) { reject(signal.reason || new DOMException('Aborted','AbortError')); return; }
    const worker = new Worker(new URL('./psd-worker.js', import.meta.url));
    const finish = (error, value) => { worker.terminate(); signal?.removeEventListener('abort',abort); error ? reject(error) : resolve(value); };
    const abort = () => finish(signal.reason || new DOMException('Aborted','AbortError'));
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage = ({data}) => {
      if(data.progress) { onProgress?.(data.progress); return; }
      finish(data.error ? new Error(data.error) : null,data);
    };
    worker.onerror = () => finish(new Error('Character PSD worker failed'));
    worker.postMessage({buffer,generic}, [buffer]);
  });
}
/** canvas is supplied by the host. No frame loop or DOM node is installed. */
export async function createCharacterPlayer({canvas:cv, psdUrl, settingsUrl, signal, rig:providedRig, generic, onProgress, layerOverrides = {}, accessories = []}) {
  if(!cv) throw new TypeError('canvas is required');
  if(signal?.aborted) throw signal.reason || new DOMException('Aborted','AbortError');
  let modelId='', rig=providedRig;
  if(!rig) {
    const buffer = await fetchAsset(psdUrl,signal);
    modelId = RT.fingerprint(buffer);
    const GP = globalThis.GenericParts;
    const fallback = generic === false ? undefined : (generic || (GP && {eyeL:GP.get('eyeL'),eyeR:GP.get('eyeR'),mouth:GP.get('mouth')}));
    rig = (await parseRig(buffer,signal,fallback,onProgress)).rig;
  }
  const settings = settingsUrl ? await fetchAsset(settingsUrl,signal,'json') : null;
  if(isV2Model(modelId))rig=refineV2Rig(rig);
  if(signal?.aborted) throw signal.reason || new DOMException('Aborted','AbortError');
  const gl = cv.getContext('webgl',{alpha:true,stencil:true,antialias:true,premultipliedAlpha:true});
  if(!gl) throw new Error('WebGL is unavailable');
  let disposed=false, contextLost=false, lastTime=null, viewport={x:0,y:0,w:cv.width,h:cv.height};
  let layers=[], A=rig.anchors, CW=rig.canvas.w, CH=rig.canvas.h, FS=A.faceScale;
  const rigInfo={warnings:[...(rig.warnings||[])],synth:rig.synth};
  const NP=A.neckPivot, BP=A.bodyPivot, FC={x:A.face.cx,y:A.face.cy};
  const CHEST={cx:NP.cx,cy:A.neckBottom+(A.face.y1-A.face.y0)*0.60,rx:Math.max(1,(A.face.x1-A.face.x0)*0.60),ry:Math.max(1,(A.face.y1-A.face.y0)*0.45)};
  const bounce={x:0,v:0,dy:0};
  const auto={phys:true,idle:true};
  let accessorySprings=[];
  let blinkVariant=1, baseParams={...defaultParams,bust:0};

function sh(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) {const msg=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(msg);} return s; }
let prog,locPos,locUV,locRes,locCut,locAl;
function initGL(){
prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER,
 'attribute vec2 aPos; attribute vec2 aUV; uniform vec2 uRes; varying vec2 vUV;'+
 'void main(){ vUV=aUV; vec2 c = aPos/uRes*2.0-1.0; gl_Position=vec4(c.x,-c.y,0.0,1.0); }'));
gl.attachShader(prog, sh(gl.FRAGMENT_SHADER,
 'precision mediump float; varying vec2 vUV; uniform sampler2D uTex; uniform float uCut; uniform float uAlpha;'+
 'void main(){ vec4 c=texture2D(uTex,vUV); if(c.a<uCut) discard; gl_FragColor=c*uAlpha; }'));
gl.linkProgram(prog);
for(const shader of gl.getAttachedShaders(prog)){gl.detachShader(prog,shader);gl.deleteShader(shader);}
if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
locPos=gl.getAttribLocation(prog,'aPos'); locUV=gl.getAttribLocation(prog,'aUV');
locRes=gl.getUniformLocation(prog,'uRes'); locCut=gl.getUniformLocation(prog,'uCut'); locAl=gl.getUniformLocation(prog,'uAlpha');
gl.enableVertexAttribArray(locPos); gl.enableVertexAttribArray(locUV);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
}
function mkTex(imgData){
  const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,imgData);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return t;
}

function disposeLayers(list){for(const L of list){if(L.tex)gl.deleteTexture(L.tex);for(const b of [L.vboPos,L.vboUV,L.ibo])if(b)gl.deleteBuffer(b);}}
function prepareLayers(rig){
  const A=rig.anchors,CW=rig.canvas.w,prepared=[];
  const maxTexture=gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const maxViewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  if(rig.canvas.w>maxViewport[0]||rig.canvas.h>maxViewport[1])throw new Error('この端末の描画サイズを超えています。PSDを縮小してください');
  try{
  for(const Lr of rig.layers){
    if(Lr.w>maxTexture||Lr.h>maxTexture)throw new Error('画像パーツがこの端末の上限 '+maxTexture+'px を超えています');
    const L=Object.assign({visible:true,opacity:1},Lr,{id:String(Lr.z)+':'+Lr.name});
    L.defaultDepth=L.depth;L.defaultOpacity=L.opacity;
    prepared.push(L);
    const cell=L.continuousBackHair?24:(L.phys?30:42)*Math.max(0.6,CW/768);
    const {nx,ny}=RT.meshSize(L.w,L.h,cell);
    const nv=(nx+1)*(ny+1);
    const base=new Float32Array(nv*2), uv=new Float32Array(nv*2);
    let k=0;
    for(let j=0;j<=ny;j++) for(let i=0;i<=nx;i++){
      base[k]=L.x+L.w*i/nx; base[k+1]=L.y+L.h*j/ny; uv[k]=i/nx; uv[k+1]=j/ny; k+=2;
    }
    const idx=[];
    for(let j=0;j<ny;j++) for(let i=0;i<nx;i++){
      const a=j*(nx+1)+i, b=a+1, c=a+nx+1, d=c+1; idx.push(a,b,c,b,d,c);
    }
    L.base=base; L.cur=new Float32Array(base); L.nIdx=idx.length;
    L.bn=Rigger.baseName(L.name.replace(/_(l|r)$/,''));
    if(L.strands&&L.strands.length){
      const S=L.strands, nS=S.length;
      let spacing=120;
      if(nS>1){ const ds=[]; for(let s=1;s<nS;s++)ds.push(S[s].x-S[s-1].x); ds.sort((a,b)=>a-b); spacing=ds[ds.length>>1]; }
      const sig=Math.max(1,spacing*0.6);
      L.sw=new Float32Array(nv*nS); L.su=new Float32Array(nv);
      L.spr=S.map((s,i)=>({stiff:{x:0,v:0,dx:0}, soft:{x:0,v:0,dx:0}, phase:s.phase??i*1.37+L.z,side:s.side}));
      for(let v=0;v<nv;v++){
        const x=base[v*2], y=base[v*2+1];
        let tot=0;
        for(let s=0;s<nS;s++){ const w=L.continuousBackHair&&S[s].side!==(x<512?0:1)?0:Math.exp(-Math.pow((x-S[s].x)/sig,2)); L.sw[v*nS+s]=w; tot+=w; }
        let rY=0,tY=0;
        if(tot>1e-6){ for(let s=0;s<nS;s++){ L.sw[v*nS+s]/=tot; rY+=L.sw[v*nS+s]*S[s].rootY; tY+=L.sw[v*nS+s]*S[s].tipY; } }
        else {
          const candidates=S.map((s,i)=>({s,i})).filter(({s})=>!L.continuousBackHair||s.side===(x<512?0:1));
          const nearest=candidates.sort((a,b)=>Math.abs(a.s.x-x)-Math.abs(b.s.x-x))[0];
          if(nearest){L.sw[v*nS+nearest.i]=1;rY=nearest.s.rootY;tY=nearest.s.tipY;}
        }
        L.su[v]=Math.min(1,Math.max(0,(y-rY)/Math.max(1,tY-rY)));
      }
      if(L.bn==='front hair'){
        const fw=A.face.x1-A.face.x0, fcx=A.face.cx;
        const f=36, b1=fcx-fw*0.22, b2=fcx+fw*0.22;
        L.bw=new Float32Array(nv*3);
        for(let v=0;v<nv;v++){ const x=base[v*2];
          const s1=smooth((x-b1)/f+0.5), s2=smooth((x-b2)/f+0.5);
          L.bw[v*3]=1-s1; L.bw[v*3+1]=s1*(1-s2); L.bw[v*3+2]=s2; }
      }
    }
    L.vboPos=gl.createBuffer(); L.vboUV=gl.createBuffer(); L.ibo=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,L.vboPos); gl.bufferData(gl.ARRAY_BUFFER,L.cur,gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,L.vboUV); gl.bufferData(gl.ARRAY_BUFFER,uv,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,L.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    const idata=(typeof ImageData!=='undefined')?new ImageData(L.img.data,L.img.width,L.img.height):L.img;
    L.tex=mkTex(idata); delete L.img;
    const glError=gl.getError();
    if(!L.vboPos||!L.vboUV||!L.ibo||!L.tex||glError!==gl.NO_ERROR)throw new Error(glError===gl.OUT_OF_MEMORY?'Character texture memory exhausted; reduce PSD size':`Character GL allocation error 0x${glError.toString(16)}`);
  }
  return prepared;
  }catch(err){disposeLayers(prepared);throw err;}
}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function smooth(t){t=clamp(t,0,1);return t*t*(3-2*t)}

function fadeAlpha(L,e){
  if(!L.fade) return 1;
  if(L.fade==='eyeOpen'){ const v=L.side==='L'?e.eyeOpenL:e.eyeOpenR; return smooth((v-(0.10+e.eyeEase*0.45))/0.15); }
  if(L.fade==='eyeClose'||L.fade==='eyeClose2'){
    const alternate=blinkVariant===2&&layers.some(p=>p.fade==='eyeClose2'&&p.side===L.side&&p.visible&&p.opacity>0);
    if((L.fade==='eyeClose2')!==alternate) return 0;
    const v=L.side==='L'?e.eyeOpenL:e.eyeOpenR; return 1-smooth((v-(0.10+e.eyeEase*0.45))/0.15);
  }
  if(L.fade==='mouthOpen') return smooth((e.mouthOpen-(0.05+e.mouthEase*0.35))/0.12);
  if(L.fade==='mouthClose') return 1-smooth((e.mouthOpen-(0.05+e.mouthEase*0.35))/0.12);
  return 1;
}

function deform(L, e){
  const b=L.base, o=L.cur, n=b.length;
  const isHead=L.group==='head';
  const az=e.angleZ*0.07, cz=Math.cos(az), sz=Math.sin(az);
  const ab=e.body*0.028, cb=Math.cos(ab), sb=Math.sin(ab);
  const nm=L.name, bn=L.bn;
  const eyeSide=L.side, EA=eyeSide==='L'?A.eyeL:(eyeSide==='R'?A.eyeR:null);
  const vOpen=eyeSide==='L'?e.eyeOpenL:e.eyeOpenR;
  const mo=e.mouthOpen;
  const mHalfW=(A.mouth.x1-A.mouth.x0)/2;
  const nS=L.strands?L.strands.length:0;
  const bcx=L.x+L.w/2, bcy=L.y+L.h/2;
  const isFH=(bn==='front hair');
  for(let k=0;k<n;k+=2){
    let x=b[k], y=b[k+1];
    const neck = bn==='neck' ? neckBlend(y,A.neckTop,A.neckBottom) : null;
    const vi=k>>1;
    // --- closed-eye / mouth scale ---
    if(EA && (bn==='eye_close'||bn==='eye_close2')){
      const sE=eyeSide==='L'?e.eyeScaleL:e.eyeScaleR;
      if(sE!==1){ const cxE=(EA.x0+EA.x1)/2, cyE=(EA.y0+EA.y1)/2;
        x=cxE+(x-cxE)*sE; y=cyE+(y-cyE)*sE; }
    }
    if(bn==='mouth_open'||bn==='mouth_close'){
      const sM=e.mouthScale;
      if(sM!==1){ x=A.mouth.cx+(x-A.mouth.cx)*sM; y=A.mouth.cy+(y-A.mouth.cy)*sM; }
    }
    // --- local features ---
    if(L.fade==='eyeOpen'&&EA){
      if(bn==='irides'){
        const isc=e.irisScale;
        const ibx=e.irisBounceX||1, iby=e.irisBounceY||1;
        x=EA.icx+(x-EA.icx)*isc*ibx; y=EA.icy+(y-EA.icy)*isc*iby;
        x+=e.eyeX*11*FS; y+=e.eyeY*6*FS;
        const tl=smooth((0.32-vOpen)/0.32);           // iris stays round until nearly closed
        y = EA.closeY + (y-EA.closeY)*(1-0.80*tl);
      } else {
        y = EA.closeY + (y-EA.closeY)*(1-0.85*(1-vOpen));   // lid compression
      }
    }
    if((L.fade==='eyeClose'||L.fade==='eyeClose2')&&EA){
      y = closedEyeY(y, EA.closeY, e.eyeSmile);
      y -= vOpen*3;
      y += e.eyeCY*14*FS;
      const thE=e.eyeCAng*0.3*(eyeSide==='L'?1:-1);
      if(thE){ const ct=Math.cos(thE), st=Math.sin(thE), rx=x-bcx, ry=y-bcy;
        x=bcx+rx*ct-ry*st; y=bcy+rx*st+ry*ct; }
    }
    if(bn==='eyebrow'){
      y += (-e.brow*9 + (1-vOpen)*3.5)*FS;
      const th=(eyeSide==='L'?(e.browAngL+e.browAngSym):(e.browAngR-e.browAngSym))*0.30;
      if(th){ const ct=Math.cos(th), st=Math.sin(th), rx=x-bcx, ry=y-bcy;
        x=bcx+rx*ct-ry*st; y=bcy+rx*st+ry*ct; }
    }
    if(L.fade==='mouthOpen'){
      y = A.mouth.y0 + (y-A.mouth.y0)*(0.5+0.5*mo);
      const q=Math.pow(Math.abs(x-A.mouth.cx)/(mHalfW+4),1.5);
      y -= e.mouthForm*6*FS*(q-0.35);
    }
    if(L.fade==='mouthClose'){
      [x,y] = closedMouthPoint(x,y,A.mouth.cx,mHalfW,FS,e.mouthForm);
      y += e.mouthCY*14*FS;
      const thM=e.mouthCAng*0.35;
      if(thM){ const ct=Math.cos(thM), st=Math.sin(thM), rx=x-A.mouth.cx, ry=y-A.mouth.cy;
        x=A.mouth.cx+rx*ct-ry*st; y=A.mouth.cy+rx*st+ry*ct; }
    }
    if(bn==='face' && y>A.mouth.cy){
      y += mo*6*FS*smooth((y-A.mouth.cy)/(A.face.y1-A.mouth.cy));
    }
    // Real separated arm, shoulder anchored before the common body transform.
    if(L.armSide)[x,y]=armPoint(x,y,L.armPivot,L.armSide==='l'?e.armL:e.armR,L.armSide);
    // --- head transform ---
    let hw = isHead?1:(L.group==='body'?0.16:0);   // body subtly follows head XYZ
    if(neck) hw = neck.follow;
    if(hw>0){
      let rx=x-NP.cx, ry=y-NP.cy;
      const rx2=rx*cz-ry*sz, ry2=rx*sz+ry*cz;
      x+=(rx2-rx)*hw; y+=(ry2-ry)*hw;
      const dd=neck ? neck.depth : L.depth;
      x += hw*FS*( e.angleX*(14+40*(dd-1)) + e.angleX*(NP.cy-y)*0.028 );
      y += hw*FS*( -e.angleY*(9+30*(dd-1)) - e.angleY*(dd-1)*(y-FC.y)*0.05 );
    }
    // --- breathing ---
    y -= (neck ? e.breath*2*(1-neck.head)+e.breathHead*1.6*neck.head : L.group==='body'?e.breath*2.0:e.breathHead*1.6)*FS;
    const jacket = bn==='topwear' ? 1 : neck ? 1-neck.head : 0;
    if(jacket&&y<CHEST.cy) y -= jacket*e.breath*2.2*FS*smooth((CHEST.cy-y)/(CHEST.ry*2));
    if(jacket) x = NP.cx + (x-NP.cx)*(1+jacket*e.breath*0.003);
    // --- bust jiggle ---
    if(bn==='topwear'){
      const gx=(x-CHEST.cx)/CHEST.rx, gy=(y-(CHEST.cy+e.bustY*70*FS))/CHEST.ry;
      y += bounce.dy*e.bust*Math.exp(-gx*gx-gy*gy);
    }
    // --- arms ---
    if(bn==='handwear'){
      const w=smooth((y-L.y)/L.h*1.15);
      y -= e.armY*30*FS*w;
      y += e.armPos*40*FS;
      x += e.armY*6*FS*w*(x<NP.cx?1:-1);
    }
    // --- bang blocks ---
    if(L.bw&&L.su){ const m=Math.pow(L.su[vi],1.4)*22*FS;
      x += (e.bangL*L.bw[vi*3]+e.bangC*L.bw[vi*3+1]+e.bangR*L.bw[vi*3+2])*m;
    }
    // --- hair strand physics (stiff top, fluffy bottom; front hair has own params) ---
    if(nS && auto.phys){
      const u=isFH?Math.min(1,L.su[vi]*1.6):L.su[vi];
      const rootPin=L.name==='back hair_1'?270:L.name==='back hair_2'?260:null;
      const rooted=L.continuousBackHair?hairRootWeight(b[k],b[k+1]):rootPin===null?1:smooth((b[k+1]-rootPin)/60);
      const amp=Math.pow(u,isFH?1.8:2.1)*(isFH?e.fhAmp:e.physAmp)*rooted;
      const softMix=Math.pow(u,1.2)*(isFH?e.fhSoft:e.soft);
      let dx=0;
      for(let s=0;s<nS;s++){
        const w=L.sw[vi*nS+s]; if(w<0.001)continue;
        const sp=L.spr[s];
        dx += w*( sp.stiff.dx*(1-softMix) + sp.soft.dx*softMix );
      }
      x += dx*amp; y += Math.abs(dx)*amp*0.12;
    }
    // Adapter extension: optional local cloth-ear bend, before inherited body rotation.
    if(L.accessoryBindings){
      const delta=accessoryVertexDelta(L.accessoryBindings,vi);
      x+=delta[0]; y+=delta[1];
    }
    o[k]=x; o[k+1]=y;
  }
  // --- body rotation (around bottom center) ---
  if(Math.abs(ab)>1e-4){
    for(let k=0;k<n;k+=2){
      const rx=o[k]-BP.cx, ry=o[k+1]-BP.cy;
      o[k]=BP.cx+rx*cb-ry*sb; o[k+1]=BP.cy+rx*sb+ry*cb;
    }
  }
}
function bindLayer(L){
  gl.bindBuffer(gl.ARRAY_BUFFER,L.vboPos);gl.vertexAttribPointer(locPos,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,L.vboUV);gl.vertexAttribPointer(locUV,2,gl.FLOAT,false,0,0);
  gl.bindTexture(gl.TEXTURE_2D,L.tex);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,L.ibo);
}
function render(e){
  gl.viewport(viewport.x,viewport.y,viewport.w,viewport.h);
  gl.clearColor(0,0,0,0); gl.clearStencil(0);
  gl.stencilMask(0xff);gl.colorMask(true,true,true,true);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
  gl.uniform2f(locRes,CW,CH);
  const active=[];
  for(const L of layers){
    if(!L.visible)continue;const alpha=fadeAlpha(L,e)*L.opacity;if(alpha<0.004)continue;
    deform(L,e);gl.bindBuffer(gl.ARRAY_BUFFER,L.vboPos);gl.bufferSubData(gl.ARRAY_BUFFER,0,L.cur);
    active.push({L,alpha});
  }
  // Build the eye masks before painting: layer order cannot change clip geometry.
  gl.enable(gl.STENCIL_TEST);gl.colorMask(false,false,false,false);gl.uniform1f(locAl,1);gl.uniform1f(locCut,0.25);
  for(const {L} of active){if(L.bn!=='eyewhite'||!L.side)continue;const bit=L.side==='L'?1:2;
    bindLayer(L);gl.stencilMask(bit);gl.stencilFunc(gl.ALWAYS,bit,bit);gl.stencilOp(gl.KEEP,gl.KEEP,gl.REPLACE);gl.drawElements(gl.TRIANGLES,L.nIdx,gl.UNSIGNED_SHORT,0);}
  gl.colorMask(true,true,true,true);gl.stencilMask(0);gl.uniform1f(locCut,0);
  for(const {L,alpha} of active){
    bindLayer(L);gl.uniform1f(locAl,alpha);
    if(L.bn==='irides'&&L.side){const bit=L.side==='L'?1:2;gl.enable(gl.STENCIL_TEST);gl.stencilFunc(gl.EQUAL,bit,bit);gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);}
    else gl.disable(gl.STENCIL_TEST);
    gl.drawElements(gl.TRIANGLES,L.nIdx,gl.UNSIGNED_SHORT,0);
  }
  gl.disable(gl.STENCIL_TEST);gl.stencilMask(0xff);
}

  function applySettings(value) {
    // eyeSmile is an adapter extension; older upstream files remain loadable.
    const compatible = value && { ...value, params: { eyeSmile: 0, ...value.params } };
    const validated=RT.settings(compatible,modelId,parameterRanges,[...new Set(layers.map(L=>L.sourceId||L.id))]);
    baseParams=normalizeParams(validated.params);
    auto.phys=validated.auto.phys; auto.idle=validated.auto.idle;
    layers=validated.layers.flatMap(record=>layers.filter(L=>(L.sourceId||L.id)===record.id).map(L=>Object.assign(L,{...record,id:L.id})));
  }
  function applyOverrides() {
    for(const L of layers) {
      const override=layerOverrides[L.name] || layerOverrides[L.id];
      if(!override) continue;
      if(['head','body'].includes(override.group)) L.group=override.group;
      if(Number.isFinite(override.depth)) L.depth=Math.max(0,Math.min(2,override.depth));
      if(typeof override.visible==='boolean') L.visible=override.visible;
      if(Number.isFinite(override.opacity)) L.opacity=Math.max(0,Math.min(1,override.opacity));
    }
  }
  function init() {
    layers=rig.layers.map(L=>({visible:true,opacity:1,...L,id:String(L.z)+':'+L.name}));
    if(settings) applySettings(settings);
    applyOverrides();
    if(isV2Model(modelId)){
      const merged=continuousV2Hair(layers);
      if(merged===layers)rigInfo.warnings.push('Back-hair merge skipped: incompatible layer settings or pixel overlap');
      layers=merged;
    }
    initGL(); layers=prepareLayers({...rig,layers});
    accessorySprings=[];
    if(!Array.isArray(accessories)) throw new TypeError('accessories must be an array');
    for(const [index,config] of accessories.entries()) {
      const matches=layers.filter(L=>L.name===config.layer);
      if(matches.length!==1) throw new Error('Accessory layer must match exactly one layer: '+config.layer);
      const L=matches[0],spring=createAccessorySpring(config,L.base,index*1.73);
      if(!spring.weights.some(weight=>weight>0)) throw new Error('Accessory strip contains no movable mesh vertices: '+config.layer);
      (L.accessoryBindings ||= []).push(spring);accessorySprings.push(spring);
    }
  }
  function resetPhysics() {
    Object.assign(bounce,{x:0,v:0,dy:0});
    for(const spring of accessorySprings) resetAccessorySpring(spring);
    for(const L of layers) for(const sp of L.spr||[]) {
      Object.assign(sp.stiff,{x:0,v:0,dx:0}); Object.assign(sp.soft,{x:0,v:0,dx:0});
    }
  }
  function resize(width,height,dpr=1) {
    if(disposed) return;
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0) return;
    const ratio=Math.max(1,Math.min(2,Number.isFinite(dpr)?dpr:1));
    cv.width=Math.max(1,Math.round(width*ratio));cv.height=Math.max(1,Math.round(height*ratio));
    const scale=Math.min(cv.width/CW,cv.height/CH);
    viewport={x:Math.round((cv.width-CW*scale)/2),y:Math.round((cv.height-CH*scale)/2),w:Math.round(CW*scale),h:Math.round(CH*scale)};
  }
  function frame(params={},timeSeconds=0) {
    if(disposed||contextLost) return false;
    if(!Number.isFinite(timeSeconds)) throw new TypeError('timeSeconds must be finite');
    const t=timeSeconds;
    const dt=lastTime===null?0:Math.max(0,Math.min(0.05,t-lastTime));
    if(lastTime!==null&&(t<lastTime||t-lastTime>0.5)) resetPhysics();
    lastTime=t;
    const e=normalizeParams(params,baseParams);
    // Caller can fully freeze reduced motion and can override breathing/iris bounce.
    auto.phys=params.physics===undefined?(settings?.auto?.phys??true):!!params.physics;
    auto.idle=params.wind===undefined?(settings?.auto?.idle??true):!!params.wind;
    blinkVariant=params.blinkVariant===2?2:1;
    e.breath=Number.isFinite(params.breath)?params.breath:0.5+0.5*Math.sin(t*2*Math.PI/3.4);
    e.breathHead=Number.isFinite(params.breathHead)?params.breathHead:0.5+0.5*Math.sin(t*2*Math.PI/3.4-0.6);
    e.greetingRaise=clamp(Number(params.greetingRaise)||0,0,1);
    e.armL=clamp(Number(params.armL??params.greetingRaise)||0,-.4,1);
    e.armR=clamp(Number(params.armR)||0,-.4,1);
    e.irisBounceX=Number.isFinite(params.irisBounceX)?params.irisBounceX:1;
    e.irisBounceY=Number.isFinite(params.irisBounceY)?params.irisBounceY:1;
      // strand springs
  const headDX=(e.angleX*14+e.angleZ*0.07*(NP.cy-FC.y))*FS;
  for(const L of layers){
    if(!L.spr) continue;
    for(const sp of L.spr){
      const wind=auto.idle?(1.8*Math.sin(t*0.8+sp.phase)+1.0*Math.sin(t*1.9+sp.phase*2.3)):0;
      const hairValue=sp.side===0?params.hairL:sp.side===1?params.hairR:0;
      const hairCue=Number.isFinite(hairValue)?clamp(hairValue,-1,1):0;
      const txv=headDX+(wind+hairCue*16)*FS;
      RT.spring(sp.stiff,txv,70,9,dt);
      sp.stiff.dx=-(sp.stiff.x-txv)*2.2;
      RT.spring(sp.soft,txv,16,1.3,dt);
      sp.soft.dx=-(sp.soft.x-txv)*3.0;
    }
  }
  // bust bounce
  { const bustTgt=(e.breath*3.0 - e.angleY*6.0 + e.body*4.0)*FS;
    RT.spring(bounce,bustTgt,140,4.2,dt);
    bounce.dy=-(bounce.x-bustTgt)*3.0; }
    for(const [index,spring] of accessorySprings.entries()) advanceAccessorySpring(spring,{time:t,dt,impulse:params['earImpulse'+index]??params.earImpulse??0,physics:auto.phys,wind:auto.idle});
    render(e);
    return true;
  }
  function metadata() {
    return {sourceCommit:'7450341934a8ff77bf05b90d9f708786e3eb3996',modelId,canvas:{w:CW,h:CH},anchors:A,warnings:rigInfo.warnings,synth:rigInfo.synth,layers:layers.map(L=>({id:L.id,name:L.name,group:L.group,depth:L.depth,visible:L.visible,opacity:L.opacity,vertices:L.base.length/2,strands:L.strands?.length||0,sourceIds:L.sourceIds,continuousBackHair:!!L.continuousBackHair})),accessories:accessorySprings.map(s=>({layer:s.layer,root:s.root,tip:s.tip,width:s.width,amplitude:s.amplitude,movingVertices:s.weights.filter(w=>w>0).length})),baseParams:{...baseParams}};
  }
  function onLost(event) {event.preventDefault();contextLost=true;}
  // The React host owns context restoration and creates a fresh player.
  // Never allocate a second resource set behind its lifecycle.
  function dispose() {
    if(disposed) return;
    disposed=true;cv.removeEventListener('webglcontextlost',onLost);
    // Restored contexts reject objects from the old generation, even when
    // gl.isContextLost() is false again. They were already freed on loss.
    if(!contextLost&&!gl.isContextLost()) {disposeLayers(layers);gl.deleteProgram(prog);}
    layers=[];accessorySprings=[];rig=null;
  }
  try {init();} catch(error) {dispose();throw error;}
  // GPU textures and lightweight metadata are enough; release parsed CPU RGBA.
  // Reassign our reference, never mutate the caller's providedRig object.
  rig=null;
  cv.addEventListener('webglcontextlost',onLost);
  resize(cv.clientWidth||CW,cv.clientHeight||CH,1);
  return {render:frame,resize,dispose,getMetadata:metadata};
}
