import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {aquaticSize,fishPose,fishCount,windowOffset,windowMotion,aquaticAssets} from '../app/experience-aquatic.ts';

test('aquatic backing buffers never scale with DPR or exceed budget',()=>{
 for(const [w,h] of [[2560,1440],[1920,1080],[1440,900],[1024,900],[900,1500],[390,1600],[1,1],[NaN,Infinity]]){
  const s=aquaticSize(w,h);assert.ok(s.width>=1&&s.height>=1&&s.width<=720&&s.width*s.height<=324000,JSON.stringify(s));
 }
});
test('window pointer input and shared current stay within the five readable bounds',()=>{
 windowMotion.forEach((m,i)=>{
  const positions=new Set();
  for(let t=0;t<50;t+=.37)for(const x of [-1,0,1]){
   const p=windowOffset(i,t,x,-x);assert.ok(Math.abs(p.x)<=m.amplitude&&Math.abs(p.y)<=m.amplitude);assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y));positions.add(JSON.stringify(p));
  }
  assert.ok(positions.size>4);
 });
});
test('bounded fish pools, distinct continuous paths, no in-frame wrap',()=>{
 assert.equal(fishCount('near',true),2);assert.equal(fishCount('far',true),3);
 assert.equal(fishCount('near',false),3);assert.equal(fishCount('far',false),6);
 for(const layer of ['far','near'])for(let i=0;i<fishCount(layer,false);i++){
  let previous=fishPose(layer,i,0,1440,900);
  for(let t=.1;t<250;t+=.1){
   const p=fishPose(layer,i,t,1440,900);
   assert.ok(Object.values(p).every(Number.isFinite));
   assert.equal(p.direction,previous.direction);
   if(p.passage===previous.passage){assert.equal(p.width,previous.width);assert.equal(p.species,previous.species);}
   if(Math.abs(p.x-previous.x)>30)assert.ok((p.x<-p.width/2||p.x>1440+p.width/2)&&(previous.x<-previous.width/2||previous.x>1440+previous.width/2));
   previous=p;
  }
 }
});
test('seeded fish vary in height, silhouette, size and cycle without shared rows',()=>{
 const heights=new Set(),sizes=new Set(),species=new Set(),positions=new Set();
 for(const seed of [73021,12,54321,4294967295])for(const layer of ['near','far'])for(let i=0;i<fishCount(layer,false);i++){
  for(const t of [0,7,21,58,137,241]){
   const p=fishPose(layer,i,t,1440,900,false,seed);
   assert.deepEqual(p,fishPose(layer,i,t,1440,900,false,seed));
   heights.add(Math.floor(p.y/100));sizes.add(Math.floor(p.width/20));species.add(p.species);positions.add(Math.round(p.x));
  }
 }
 assert.ok(heights.size>=6,'fish must fill the water column, not two rows');
 assert.ok(sizes.size>=6);assert.equal(species.size,2);assert.ok(positions.size>100);
 assert.notDeepEqual(fishPose('near',0,0,1440,900,false,12),fishPose('near',0,0,1440,900,false,54321));
});
test('window depth is real layering, never window-shaped cuts or proximity fades',()=>{
 const renderer=readFileSync(new URL('../app/experience-aquatic-renderer.ts',import.meta.url),'utf8');
 const component=readFileSync(new URL('../app/ExperienceAquatic.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(renderer,/fishClearance|uRects|uRectCount|vScreen/);
 assert.doesNotMatch(component,/packProtection|protectionSelector/);
 assert.match(renderer,/u\.uOpacity\.value=p\.alpha/);
 for(const layer of ['near','far'])for(let i=0;i<fishCount(layer,false);i++){
  const alpha=fishPose(layer,i,0,1440,900).alpha;
  for(let t=1;t<150;t++)assert.equal(fishPose(layer,i,t,1440,900).alpha,alpha);
 }
});

test('701px desktop keeps finite desktop fish even with a 15px scrollbar',()=>{
 for(let i=0;i<4;i++)assert.ok(Object.values(fishPose('far',i,50,686,1450,false)).every(Number.isFinite));
});
test('only generated alpha fish and declared CC0 water are local runtime inputs',()=>{
 for(const src of Object.values(aquaticAssets)){
  const bytes=readFileSync(new URL('../public'+src,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');
 }
 for(const src of [aquaticAssets.fantail,aquaticAssets.comet])assert.equal(readFileSync(new URL('../public'+src,import.meta.url))[25],6,'RGBA PNG');
 const component=readFileSync(new URL('../app/ExperienceAquatic.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(component,/getImageData|setInterval|localStorage|onClick|onKeyDown|tabIndex/);
 assert.match(component,/createStageLightLoop/);assert.match(component,/webglcontextlost/);assert.match(component,/abort\.abort/);
});
