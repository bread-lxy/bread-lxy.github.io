import assert from 'node:assert/strict';
import test from 'node:test';

test('restored WebGL generation never deletes old objects or retains caller pixels', async () => {
  const oldSelf=globalThis.self;
  globalThis.self=globalThis;
  try {
    const {createCharacterPlayer}=await import('../public/vendor/anime25d/character-player.js');
    let generation=0,lost=false,error=0,invalidDeletes=0;
    const noop=()=>{};
    // Mimics Chromium's generation validation, not a substitute for real GPU QA.
    const gl=new Proxy({NO_ERROR:0,MAX_TEXTURE_SIZE:3379,MAX_VIEWPORT_DIMS:3386,
      getParameter:key=>key===3386?[8192,8192]:8192,
      getShaderParameter:()=>true,getProgramParameter:()=>true,getAttachedShaders:()=>[],
      getAttribLocation:()=>0,getUniformLocation:()=>({}),getError:()=>{const e=error;error=0;return e;},isContextLost:()=>lost,
      createProgram:()=>({generation}),createShader:()=>({generation}),createTexture:()=>({generation}),createBuffer:()=>({generation})
    },{get(target,key){if(key in target)return target[key];if(String(key).startsWith('delete'))return object=>{if(object&&object.generation!==generation){error=1282;invalidDeletes++;}};return /^[A-Z_]+$/.test(String(key))?1:noop;}});
    const cv=new EventTarget();Object.assign(cv,{width:64,height:64,clientWidth:64,clientHeight:64,getContext:()=>gl});
    const rig={canvas:{w:64,h:64},anchors:{face:{cx:32,cy:16,x0:20,x1:44,y0:6,y1:26},faceScale:1,mouth:{x0:28,x1:36,y0:20,y1:24,cx:32,cy:22},neckPivot:{cx:32,cy:28},bodyPivot:{cx:32,cy:64},neckBottom:32},layers:[{z:0,name:'body',x:0,y:0,w:64,h:64,group:'body',depth:1,img:{width:64,height:64,data:new Uint8ClampedArray(64*64*4)}}],warnings:['fixture warning'],synth:[]};
    const p=await createCharacterPlayer({canvas:cv,rig,generic:false});
    assert.equal(p.render({},0),true);
    assert.deepEqual(p.getMetadata().warnings,['fixture warning']);
    assert.ok(rig.layers[0].img.data.byteLength,'providedRig remains unchanged');
    lost=true;cv.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
    lost=false;generation++;cv.dispatchEvent(new Event('webglcontextrestored'));
    p.dispose();
    assert.equal(invalidDeletes,0,'old generation objects were already released on loss');
    const p2=await createCharacterPlayer({canvas:cv,rig,generic:false});
    assert.equal(p2.render({},0),true);
    assert.equal(p2.getMetadata().layers.length,1);
    p2.dispose();p2.dispose();
    assert.equal(invalidDeletes,0);
  } finally { if(oldSelf===undefined)delete globalThis.self;else globalThis.self=oldSelf; }
});
