import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {homeScenes} from '../content/home-scenes.ts';
import {handoverAt} from '../app/wordmark-handover-geometry.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Experience uses the approved personal desktop while keeping the live character',()=>{
 assert.equal(homeScenes.experience.composition,'personal-desktop');
 assert.equal(homeScenes.experience.palette.ink.toLowerCase(),'#9dbbff');
 assert.equal(homeScenes.experience.palette.paper.toLowerCase(),'#251f33');
 assert.equal(homeScenes.experience.palette.accent.toLowerCase(),'#4d23cd');
 assert.deepEqual(homeScenes.experience.layers,['exp-window-browser','exp-window-notepad','exp-window-photo','exp-window-files','exp-window-notice']);
 assert.deepEqual(homeScenes.experience.desktop,{faceX:75,faceY:31,scale:.96});
});
test('Experience has no right-column or contain exception for the shared wordmark',()=>{
 assert.doesNotMatch(read('app/album.css'),/\.world-experience \.album-wordmark\{left:calc/);
 assert.doesNotMatch(read('app/album.css'),/\.world-experience \.album-wordmark::before\{mask-size:contain/);
 assert.doesNotMatch(read('app/wordmark-handover.css'),/world-experience.*mask-size:contain/);
});
test('ribbon separates complementary glyph slices without swallowing a band of letters',()=>{
 for(const [height,gap,stageBottom,sourceTop] of [[207,112,788,591],[145.92,112,656,520.08],[135,104,1200,1047]]){
  const layout={source:{left:0,top:sourceTop,width:1200,height},target:{left:0,top:stageBottom+gap,width:1200,height},stageBottom,homeBottom:stageBottom+gap,viewportHeight:900};
  const start=Math.max(0,layout.homeBottom-layout.viewportHeight);
  for(const p of [0,.25,.5,.75,1,.5,0]){
   const frame=handoverAt(layout,start+p*height),{progress}=frame;
   const source=sourceTop+frame.source.y,target=layout.target.top+frame.target.y;
   const upper=Math.min(height,Math.max(0,stageBottom-source));
   const lower=height-Math.min(height,Math.max(0,layout.target.top-target));
   assert.ok(Math.abs(upper+lower-height)<.001,'all glyph rows survive the two complementary crops');
   assert.ok(progress>=0&&progress<=1);
  }
  const final=handoverAt(layout,9999);
  assert.ok(Math.abs(sourceTop+final.source.y-stageBottom)<.001,'source fully leaves its crop');
  assert.ok(Math.abs(final.target.y)<.001,'target lands without a jump');
 }
});
