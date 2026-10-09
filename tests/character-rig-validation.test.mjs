import assert from 'node:assert/strict';
import test from 'node:test';
import { rigProblems } from '../app/character/validate-rig.ts';
const bounds={x0:1,x1:10,y0:2,y1:12};
const valid={layers:['face','eyewhite_l','eyewhite_r','irides_l','irides_r','mouth_open'].map(name=>({name,visible:true,opacity:1})),anchors:{face:bounds,eyeL:bounds,eyeR:bounds,mouth:bounds}};
test('accepts visible facial layers and finite complete anchors',()=>assert.deepEqual(rigProblems(valid),[]));
test('missing eye mask or iris forces static fallback instead of a damaged face',()=>{
  assert.ok(rigProblems({...valid,layers:valid.layers.filter(x=>x.name!=='eyewhite_r')}).some(x=>x.includes('eyewhite_r')));
  assert.ok(rigProblems({...valid,anchors:{...valid.anchors,eyeL:{...bounds,x1:NaN}}}).some(x=>x.includes('eyeL')));
  assert.ok(rigProblems(undefined).length);
});
