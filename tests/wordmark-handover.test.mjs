import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {handoverAt} from '../app/wordmark-handover-geometry.ts';

const fixture=()=>({source:{left:-72,top:300,width:1584,height:370},target:{left:18,top:980,width:1404,height:207},stageBottom:900,homeBottom:980,viewportHeight:900});
test('giant cover type shrinks to the independent masthead without a scroll runway',()=>{
 const layout=fixture(),first=handoverAt(layout,0),middle=handoverAt(layout,183.5),last=handoverAt(layout,287);
 assert.equal(first.progress,0);assert.deepEqual(first.source,{x:0,y:0,scaleX:1,scaleY:1});
 assert.equal(middle.progress,.5);assert.equal(middle.rect.width,1494);assert.equal(middle.rect.height,288.5);
 assert.equal(last.progress,1);assert.deepEqual(last.target,{x:0,y:0,scaleX:1,scaleY:1});
 assert.deepEqual(handoverAt(layout,1400),last);
 assert.deepEqual(handoverAt(layout,183.5),middle);
});
test('tall mobile cover begins at its actual tail; degenerate heights stay finite',()=>{
 const layout={...fixture(),target:{left:12,top:1200,width:366,height:135},homeBottom:1200,viewportHeight:844};
 assert.equal(handoverAt(layout,355).progress,0);
 assert.equal(handoverAt(layout,423.5).progress,.5);
 assert.equal(handoverAt(layout,491).progress,1);
 const zero=handoverAt({...layout,target:{left:0,top:0,width:0,height:0}},1400);
 assert.equal(zero.progress,1);assert.ok(Object.values(zero.target).every(Number.isFinite));
});
test('paired surfaces share identical glyph geometry across a ribbon gap at every progress',()=>{
 const layout=fixture(),{source,target}=layout;
 for(const scroll of [0,80,100,140,210,270,287,700,210,80]){
  const frame=handoverAt(layout,scroll),a=frame.source,b=frame.target;
  assert.ok(Math.abs(source.left+a.x-target.left-b.x)<1e-8);
  assert.ok(Math.abs(source.width*a.scaleX-target.width*b.scaleX)<1e-8);
  assert.ok(Math.abs(source.height*a.scaleY-target.height*b.scaleY)<1e-8);
  assert.ok(Math.abs(target.top+b.y-(source.top+a.y)-(target.top-layout.stageBottom))<1e-8);
 }
});
test('no paired school ghosts, pinning, canvas copying or delayed body',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const hook=read('app/use-experience-handover.ts');
 const page=read('app/PersonalArchive.tsx');
 assert.doesNotMatch(hook,/Flip|ScrollTrigger|cloneNode|appendChild|pin:|firstRecordDetails/);
 assert.doesNotMatch(hook,/masthead\.style\.height\s*=/);
 assert.match(hook,/ResizeObserver/);
 assert.match(hook,/cancelAnimationFrame/);
 assert.doesNotMatch(page,/SceneUnfoldLayer|data-unfold/);
 assert.equal((page.match(/<HeroCharacter /g)||[]).length,1);
 assert.doesNotMatch(read('app/ExperienceNotes.tsx'),/unfoldTarget|data-unfold-target/);
});
