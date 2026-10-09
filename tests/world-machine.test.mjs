import assert from 'node:assert/strict';
import test from 'node:test';
import { SECTION_IDS, createInitialState, stepWorld, siteReducer, shouldAcceptWheel, createWheelGate, parseLocation, routeHash } from '../app/world-machine.ts';

test('five sections cycle with experience initially selected', () => {
  assert.deepEqual(SECTION_IDS, ['experience','research','projects','studio','life']);
  assert.equal(createInitialState().activeWorld, 'experience');
  assert.equal(stepWorld('experience', -1), 'life');
  assert.equal(stepWorld('life', 1), 'experience');
});
test('preview and confirmation are separated from reading', () => {
  const preview=siteReducer(createInitialState(),{type:'PREVIEW',direction:1});
  assert.equal(preview.activeWorld,'research');
  const pending=siteReducer(preview,{type:'CONFIRM'});
  assert.equal(pending.targetWorld,'research');
  const content=siteReducer(pending,{type:'ENTER_CONTENT'});
  assert.equal(content.mode,'content');
  assert.deepEqual(siteReducer(content,{type:'PREVIEW',direction:1}),content);
  assert.equal(siteReducer(content,{type:'RETURN_HOME'}).activeWorld,'research');
});
test('wheel gate rejects inertia and accepts a new deliberate gesture',()=>{
  const gate=createWheelGate();
  assert.equal(gate(0,60),1);
  for(let t=50;t<1000;t+=50) assert.equal(gate(t,10),0);
  assert.equal(gate(1300,-50),-1);
  assert.equal(gate(2100,80,true),0);
  assert.equal(shouldAcceptWheel(100,0),false);
});
test('new and legacy hashes resolve without inventing items',()=>{
  assert.deepEqual(parseLocation('').route,{kind:'home'});
  assert.deepEqual(parseLocation('#resume').route,{kind:'resume'});
  assert.equal(parseLocation('#art').canonicalHash,'#studio');
  assert.equal(parseLocation('#playground').canonicalHash,'#studio/collection/play');
  assert.equal(parseLocation('#ai-tech/item/eval-studio').canonicalHash,'#projects/item/eval-studio');
  assert.equal(parseLocation('#art/item/fan-work').canonicalHash,'#studio/collection/fan-art');
  assert.equal(parseLocation('#archive/item/travel-index').canonicalHash,'#life/collection/travel');
  assert.deepEqual(parseLocation('#projects/item/%E0%A4%A').route,{kind:'section',section:'projects'});
  assert.deepEqual(parseLocation('#unknown').route,{kind:'home'});
  for(const section of SECTION_IDS) assert.equal(parseLocation(routeHash({kind:'section',section})).route.section,section);
});

test('a restored lobby consumes a returning gesture until 180ms of idle',()=>{
 const gate=createWheelGate(1000);
 for(let time=1010;time<=2010;time+=50)assert.equal(gate(time,-60),0,'returning inertia is not a preview');
 assert.equal(gate(2190,-60),0,'180ms is still part of the tail');
 assert.equal(gate(2371,60),1,'a fresh gesture selects exactly once');
 assert.equal(gate(2390,60),0);
 assert.equal(gate(3100,-60),-1);
});

test('all worlds return atomically from content or a cancelled transition',()=>{
 for(const world of SECTION_IDS){
  const content=siteReducer(createInitialState(),{type:'OPEN_CONTENT',world});
  const home=siteReducer(content,{type:'RETURN_HOME',world});
  assert.deepEqual(home,{mode:'lobby',activeWorld:world,targetWorld:null});
  assert.equal(siteReducer(home,{type:'PREVIEW',direction:1}).activeWorld,stepWorld(world,1));
  const transition=siteReducer(home,{type:'CONFIRM'});
  assert.deepEqual(siteReducer(transition,{type:'RETURN_HOME',world:'projects'}),{mode:'lobby',activeWorld:'projects',targetWorld:null});
 }
});
