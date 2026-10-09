import assert from 'node:assert/strict';
import test from 'node:test';
test('real renderer uploads independent arm and hair meshes, with pinned root vertices',async()=>{
 const old=globalThis.self;globalThis.self=globalThis;
 try{
  const {createCharacterPlayer}=await import('../public/vendor/anime25d/character-player.js');
  let id=0,bound;const uploads=new Map();
  const gl=new Proxy({NO_ERROR:0,ARRAY_BUFFER:34962,MAX_TEXTURE_SIZE:3379,MAX_VIEWPORT_DIMS:3386,
   getParameter:k=>k===3386?[8192,8192]:8192,getShaderParameter:()=>true,getProgramParameter:()=>true,getAttachedShaders:()=>[],getAttribLocation:()=>0,getUniformLocation:()=>({}),getError:()=>0,isContextLost:()=>false,
   createProgram:()=>({}),createShader:()=>({}),createTexture:()=>({}),createBuffer:()=>++id,
   bindBuffer:(t,v)=>{if(t===34962)bound=v;},bufferSubData:(_t,_o,d)=>uploads.set(bound,[...d]),
  },{get:(t,k)=>k in t?t[k]:/^[A-Z_]+$/.test(String(k))?1:()=>{}});
  const canvas=new EventTarget();Object.assign(canvas,{width:1024,height:1024,clientWidth:1024,clientHeight:1024,getContext:()=>gl});
  const layer=(name,z,x,y,w,h,extra={})=>({name,z,x,y,w,h,group:'body',depth:1,img:{width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(255)},...extra});
  const rig={canvas:{w:1024,h:1024},anchors:{face:{cx:500,cy:200,x0:400,x1:600,y0:120,y1:300},faceScale:1,mouth:{x0:460,x1:540,y0:260,y1:280,cx:500,cy:270},neckPivot:{cx:500,cy:330},bodyPivot:{cx:500,cy:1000},neckTop:300,neckBottom:380},layers:[
   layer('back hair',2,200,100,624,800,{group:'head',continuousBackHair:true,strands:[{x:280,rootY:220,tipY:900,side:0},{x:380,rootY:220,tipY:900,side:0},{x:650,rootY:216,tipY:900,side:1},{x:760,rootY:216,tipY:900,side:1}]}),
   layer('handwear_l',9,300,330,230,420,{armSide:'l',armPivot:[403,360]}),layer('handwear_r',9.1,580,365,230,420,{armSide:'r',armPivot:[633,397]}),
  ]};
  const player=await createCharacterPlayer({canvas,rig,generic:false});
  const neutral={wind:false,physics:true,breath:0,breathHead:0,bust:0,body:0,angleX:0,angleY:0,angleZ:0,physAmp:1};
  const draw=(params,t)=>{uploads.clear();player.render({...neutral,...params},t);return [...uploads.values()];};
  const base=draw({},0),leftArm=draw({armL:1},0),rightArm=draw({armR:1},0);
  assert.notDeepEqual(leftArm[1],base[1]);assert.deepEqual(leftArm[2],base[2]);
  assert.notDeepEqual(rightArm[2],base[2]);assert.deepEqual(rightArm[1],base[1]);
  const hairPeak=side=>{draw({},-1);draw({},0);let frame;for(let n=1;n<=8;n++)frame=draw({[side]:.8},n/30);return frame[0];};
  const leftHair=hairPeak('hairL'),rightHair=hairPeak('hairR');let lm=0,rm=0;
  for(let k=0;k<base[0].length;k+=2){const x=base[0][k],y=base[0][k+1];
   if(y<=260){assert.equal(leftHair[k],x);assert.equal(rightHair[k],x);}
   if(x>=512)assert.equal(leftHair[k],x);else lm=Math.max(lm,Math.abs(leftHair[k]-x));
   if(x<512)assert.equal(rightHair[k],x);else rm=Math.max(rm,Math.abs(rightHair[k]-x));
  }
  assert.ok(lm>1&&rm>1,'independent tail impulses move actual uploaded vertices');
  assert.ok(draw({hairL:Infinity,hairR:NaN},.4).flat().every(Number.isFinite));
  player.dispose();
 }finally{if(old===undefined)delete globalThis.self;else globalThis.self=old;}
});
