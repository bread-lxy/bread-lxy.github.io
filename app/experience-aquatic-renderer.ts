import { Renderer, Plane, Mesh, Program, Texture, Transform, type OGLRenderingContext } from 'ogl';
import { aquaticAssets, aquaticSize, fishCount, fishPose, DEFAULT_FISH_SEED, type AquaticLayer } from './experience-aquatic';

// 4x4 ordered threshold, also used by the existing opening's faux-light adaptation.
const DITHER = `
float bayer(vec2 p) {
  vec2 a = mod(floor(p), 2.0), b = mod(floor(p / 2.0), 2.0);
  float v = 4.0 * (2.0*a.x + 3.0*a.y - 4.0*a.x*a.y) + (2.0*b.x + 3.0*b.y - 4.0*b.x*b.y);
  return (v + .5) / 16.0 - .5;
}`;
const WATER_VERTEX = `attribute vec3 position; attribute vec2 uv; varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy*2.0,0.0,1.0);}`;
// WaltGD, Cheap water shader (2022-09-16), CC0. Two self-displacing texture
// samples retained; adapted from Godot spatial to OGL 2D, original blue grading.
const WATER_FRAGMENT = `precision highp float;
uniform sampler2D tCaustics; uniform float uTime; uniform vec2 uResolution;
varying vec2 vUv;
${DITHER}
void main(){
  vec2 q=vec2(vUv.x,1.0-vUv.y), uv=vec2(q.x*uResolution.x/uResolution.y,q.y);
  float t=uTime/18.0;
  float form=texture2D(tCaustics,fract(uv*(2.4+sin(t)*.08)+vec2(t*.025,-t*.018))).r;
  vec2 cuv=uv*(2.4+cos(t)*.08)+form*.025+vec2(-t*.013,t*.027);
  float caustic=texture2D(tCaustics,fract(cuv)).r;
  float light=exp(-length((q-vec2(.79,-.10))*vec2(1.05,1.4))*1.6);
  float depth=smoothstep(.1,1.0,q.y)*.16 + .035*sin(q.x*5.0+q.y*2.0);
  vec3 blue=mix(vec3(.53,.66,.92),vec3(.67,.79,1.0),light);
  blue=mix(blue,vec3(.42,.47,.77),depth);
  blue=mix(blue,vec3(.91,.95,1.0),pow(light,2.2)*.7);
  float water=caustic*(.012+.034*light)*(1.0-q.y*.4);
  blue+=vec3(.80,.94,1.0)*water;
  float d=bayer(gl_FragCoord.xy);
  // Quantized blue bands, no temporal noise / scanlines / post blur.
  blue=floor(blue*38.0+d*.40+.5)/38.0;
  gl_FragColor=vec4(blue,1.0);
}`;

// Fish wave adapted from Google's WebGL Aquarium fishVertexShader, BSD-3-Clause,
// 3111b53fec040b64bfb27b107f79af57ede0a618. Original 3D axial bend -> 2D tail-weighted
// traveling wave on a subdivided textured plane. No upstream models/textures.
const FISH_VERTEX = `attribute vec3 position; attribute vec2 uv;
uniform vec2 uViewport; uniform vec2 uCenter; uniform vec2 uSize;
uniform float uTime; uniform float uPhase; uniform float uDirection; uniform float uAngle;
varying vec2 vUv;
void main(){
  vUv=uv;
  vec2 p=position.xy;
  float mult=smoothstep(.18,1.0,uv.x);
  float wave=sin(uTime*3.2-mult*5.2+uPhase);
  p.y+=pow(mult,2.0)*wave*.075;
  p.y*=1.0+sin(uTime*3.2+uPhase)*.035*mult;
  p*=uSize;
  p.x*=uDirection; p.y*=-1.0;
  float c=cos(uAngle),s=sin(uAngle);
  p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)+uCenter;
  vec2 screen=p/uViewport;
  gl_Position=vec4(screen.x*2.0-1.0,1.0-screen.y*2.0,0.0,1.0);
}`;
const FISH_FRAGMENT = `precision highp float;
uniform sampler2D tFish; uniform float uOpacity; uniform float uFog;
varying vec2 vUv;
${DITHER}
void main(){
  vec4 tex=texture2D(tFish,vUv);
  // Remove the photographic cutout's low-alpha halo, retain fin translucency.
  float alpha=smoothstep(.32,.89,tex.a)*uOpacity;
  if(alpha<.02)discard;
  // Real DOM depth owns occlusion: near fish cross whole windows; far fish
  // pass behind them. No window-shaped holes or proximity opacity changes.
  vec3 col=tex.rgb;
  col=mix(col,vec3(.69,.79,.99),uFog);
  col=floor(col*12.0+bayer(gl_FragCoord.xy)*.65+.5)/12.0;
  gl_FragColor=vec4(col*alpha,alpha);
}`;

function loadImage(src: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve,reject)=>{
    const image=new Image();
    const cancel=()=>{image.onload=null;image.onerror=null;image.src='';reject(new DOMException('Aborted','AbortError'));};
    const finish=()=>{signal.removeEventListener('abort',cancel);image.onload=null;image.onerror=null;};
    signal.addEventListener('abort',cancel,{once:true});
    image.onload=()=>{finish();resolve(image);};
    image.onerror=()=>{finish();reject(new Error('Experience asset unavailable'));};
    if(signal.aborted){cancel();return;}
    image.src=src;
  });
}
export function loadAquaticImages(signal: AbortSignal) {
  return Promise.all([loadImage(aquaticAssets.fantail,signal),loadImage(aquaticAssets.comet,signal),loadImage(aquaticAssets.caustics,signal)]);
}

export function createAquaticLayer(canvas: HTMLCanvasElement, layer: AquaticLayer, images: HTMLImageElement[], seed = DEFAULT_FISH_SEED) {
  const renderer=new Renderer({canvas,alpha:true,depth:false,stencil:false,antialias:false,dpr:1,premultipliedAlpha:true,powerPreference:'low-power'});
  const gl=renderer.gl as OGLRenderingContext;
  if(!gl)throw new Error('WebGL unavailable');
  gl.clearColor(0,0,0,0);
  const scene=new Transform(), programs:Program[]=[], textures:Texture[]=[], geometries:Plane[]=[];
  const texture=(image:HTMLImageElement)=>{
    const t=new Texture(gl,{image,generateMipmaps:false,minFilter:gl.LINEAR,magFilter:gl.NEAREST,premultiplyAlpha:false});
    // OGL 1.0.11 also sends WRAP_R for a 2D texture; WebGL1 has no such enum.
    if(!renderer.isWebgl2)Object.assign(t.state,{wrapR:t.wrapR});
    textures.push(t);return t;
  };
  const build=(vertex:string,fragment:string,uniforms:Record<string,{value:unknown}>,geometry:Plane)=>{
    const program=new Program(gl,{vertex,fragment,uniforms,transparent:true,depthTest:false,depthWrite:false,cullFace:false});
    programs.push(program);
    if(!gl.getProgramParameter(program.program,gl.LINK_STATUS))throw new Error('Aquatic shader failed');
    const mesh=new Mesh(gl,{geometry,program});mesh.setParent(scene);return mesh;
  };
  let water:Mesh|undefined;
  const geometry=new Plane(gl,{widthSegments:28,heightSegments:12});geometries.push(geometry);
  try {
    if(layer==='far'){
      const plane=new Plane(gl);geometries.push(plane);
      water=build(WATER_VERTEX,WATER_FRAGMENT,{tCaustics:{value:texture(images[2])},uTime:{value:0},uResolution:{value:[1,1]}},plane);
    }
    const maps=[texture(images[0]),texture(images[1])];
    const fish=Array.from({length:fishCount(layer,false)},(_,i)=>build(FISH_VERTEX,FISH_FRAGMENT,{
      tFish:{value:maps[i%2]},uViewport:{value:[1,1]},uCenter:{value:[0,0]},uSize:{value:[1,1]},
      uTime:{value:0},uPhase:{value:i*2.3},uDirection:{value:1},uAngle:{value:0},
      uOpacity:{value:0},uFog:{value:layer==='far'?.28:.035},
    },geometry));
    let width=1,height=1,mobile=false,disposed=false;
    return {
      resize(w:number,h:number){
        width=w;height=h;const size=aquaticSize(w,h);renderer.setSize(size.width,size.height);
        // Use the CSS viewport breakpoint, not canvas width minus the scrollbar.
        mobile=matchMedia('(max-width:700px)').matches;
        canvas.style.width='100%';canvas.style.height='100%';
        if(water)water.program.uniforms.uResolution.value=[w,h];
      },
      draw(seconds:number){
        if(disposed)return;
        if(gl.isContextLost())throw new Error('Aquatic context lost');
        if(water)water.program.uniforms.uTime.value=seconds;
        const count=fishCount(layer,mobile);
        fish.forEach((f,i)=>{
          f.visible=i<count;if(!f.visible)return;
          const p=fishPose(layer,i,seconds,width,height,mobile,seed),u=f.program.uniforms;
          u.tFish.value=maps[p.species];u.uPhase.value=p.phase;
          u.uViewport.value=[width,height];u.uCenter.value=[p.x,p.y];u.uSize.value=[p.width,p.height];
          u.uTime.value=seconds;u.uDirection.value=p.direction;u.uAngle.value=p.angle;
          u.uOpacity.value=p.alpha;
        });
        renderer.render({scene,sort:false,frustumCull:false});
      },
      dispose(){if(disposed)return;disposed=true;cleanup();},
    };
  } catch(error) {cleanup();throw error;}
  function cleanup(){
    programs.forEach(p=>p.remove());geometries.forEach(g=>g.remove());textures.forEach(t=>gl.deleteTexture(t.texture));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
