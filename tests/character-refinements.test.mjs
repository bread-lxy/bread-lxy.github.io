import test from 'node:test';
import assert from 'node:assert/strict';
import { refineV2Rig, continuousV2Hair, hairRootWeight, armPoint } from '../public/vendor/anime25d/v2-refinements.js';

test('back-hair rebuild preserves every original opaque RGBA byte, no padding seams',()=>{
  const names=['back hair','back hair_1','back hair_2'];
  const source=names.map((name,i)=>({name,z:i+2,id:`${i+2}:${name}`,x:i===2?4:0,y:i?2:0,w:i?4:8,h:4,group:'head',depth:.55,visible:true,opacity:1,img:{width:i?4:8,height:4,data:new Uint8ClampedArray((i?4:8)*16)},strands:[{x:i===2?600:300,rootY:260,tipY:850}]}));
  source.forEach((p,i)=>{for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){if(i===0&&y>=2)continue;if(i&&y===3)continue;p.img.data.set([11+i,45+i,88+i,180+i],(y*p.w+x)*4);}});
  const result=continuousV2Hair(source);assert.equal(result.length,1);assert.equal(result[0].continuousBackHair,true);assert.equal(result[0].strands.length,2);
  for(const p of source)for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){const s=(y*p.w+x)*4;if(p.img.data[s+3]){const d=((y+p.y)*8+x+p.x)*4;assert.deepEqual(result[0].img.data.subarray(d,d+4),p.img.data.subarray(s,s+4));}}
  assert.equal(source.length,3);assert.notEqual(result[0].img,source[0].img);
  const incompatible=source.map((p,i)=>({...p,opacity:i===2?.5:1}));assert.equal(continuousV2Hair(incompatible),incompatible);
  const nonadjacent=[source[0],{name:'face'},...source.slice(1)];assert.equal(continuousV2Hair(nonadjacent),nonadjacent);
});
test('hair root pin extends past both old cuts and transitions continuously',()=>{
  for(const x of [350,650]){assert.equal(hairRootWeight(x,226),0);assert.equal(hairRootWeight(x,260),0);assert.equal(hairRootWeight(x,350),1);}
  assert.ok(Math.abs(hairRootWeight(350,300)-hairRootWeight(350,300.001))<.0001);
});
test('local limb refinement leaves accepted facial pixels and geometry untouched',()=>{
  const layers=['eye_close_l','eye_close_r','eyelash_l','eyelash_r','mouth','mouth_open'].map((name,z)=>({name,z,x:400,y:190,w:60,h:50,img:{width:60,height:50,data:new Uint8ClampedArray(12000)}}));
  const refined=refineV2Rig({layers}).layers;
  refined.forEach((layer,index)=>{assert.equal(layer.img,layers[index].img);for(const key of ['x','y','w','h'])assert.equal(layer[key],layers[index][key]);});
});
test('arm partitions preserve original RGBA bytes and settings source identity',()=>{
  const data=new Uint8ClampedArray(610*628*4);for(let i=0;i<data.length;i++)data[i]=i%251;
  const original={name:'handwear',z:9,x:260,y:335,w:610,h:628,img:{width:610,height:628,data}};
  const parts=refineV2Rig({layers:[original]}).layers;
  assert.deepEqual(parts.map(p=>p.name),['handwear_l','handwear_r']);
  for(const p of parts){assert.equal(p.sourceId,'9:handwear');for(let y=0;y<p.h;y++){
    assert.deepEqual(p.img.data.subarray(y*p.w*4,(y+1)*p.w*4),data.subarray((y*610+p.x-260)*4,(y*610+p.x-260+p.w)*4));
  }}
});
test('greeting fixes the shoulder seam and rotates a distal point without stretching',()=>{
  assert.deepEqual(armPoint(395,337,[403,360],1),[395,337]);
  const before=[491,440],after=armPoint(...before,[403,360],1);
  assert.ok(after[1]<before[1]);
  assert.ok(Math.abs(Math.hypot(before[0]-403,before[1]-360)-Math.hypot(after[0]-403,after[1]-360))<.001);
  assert.deepEqual(armPoint(...before,[403,360],0),before);
});
