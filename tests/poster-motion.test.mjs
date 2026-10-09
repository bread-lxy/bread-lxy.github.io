import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapRibbon,ribbonCopies,approach,lineProximity,ribbonScrollVelocity,ribbonVelocityTarget } from '../app/poster-motion.ts';
import { characterParameters,characterPose } from '../app/character/performance.ts';
test('measured loop wraps in either direction, preserving fractional widths',()=>{
  for(const [x,w,result] of [[0,1000,0],[1000,1000,0],[-1,1000,999],[2205.25,1000,205.25],[2,0,0]])assert.equal(wrapRibbon(x,w),result);
  assert.ok(Math.abs(wrapRibbon(2000.4,1000.2))<.000001);
  assert.equal(ribbonCopies(1440,500),5);assert.equal(ribbonCopies(390,1200),3);
});
test('LogoLoop velocity approaches 28px/s, Sidebar proximity stays local',()=>{
  let v=0;for(let i=0;i<120;i++)v=approach(v,28,1/60,.25);
  assert.ok(Math.abs(v-28)<.02);assert.equal(lineProximity(0),1);
  assert.ok(Math.abs(lineProximity(56)-.410432)<1e-6);assert.equal(lineProximity(112),0);
});
test('ribbon scroll response stays between the readable base and 70px/s in either direction',()=>{
  assert.equal(ribbonVelocityTarget(0),28);
  assert.equal(ribbonVelocityTarget(500),49);
  assert.equal(ribbonVelocityTarget(-500),49);
  for(const velocity of [1000,-1000,10000,-10000])assert.equal(ribbonVelocityTarget(velocity),70);
  for(const velocity of [NaN,Infinity,-Infinity])assert.equal(ribbonVelocityTarget(velocity),28);
});
test('only an armed actual scroll sample can change ribbon velocity',()=>{
  assert.equal(ribbonScrollVelocity(10,.02,900,false),0);
  assert.equal(ribbonScrollVelocity(10,.02,900,true),500);
  assert.equal(ribbonScrollVelocity(-10,.02,900,true),-500);
  assert.equal(ribbonScrollVelocity(0,.02,900,true),0);
});
test('larger-than-viewport jumps and stale or invalid scroll samples do not produce a boost',()=>{
  for(const delta of [901,-901,5000,-5000])assert.equal(ribbonScrollVelocity(delta,.02,900,true),0);
  assert.equal(ribbonScrollVelocity(900,.02,900,true),45000);
  for(const dt of [0,-.01,.101,1,NaN,Infinity])assert.equal(ribbonScrollVelocity(10,dt,900,true),0);
  for(const height of [0,-1,NaN,Infinity])assert.equal(ribbonScrollVelocity(10,.02,height,true),0);
  for(const delta of [NaN,Infinity,-Infinity])assert.equal(ribbonScrollVelocity(delta,.02,900,true),0);
});
test('short frame intervals are bounded and idle samples smoothly return to 28px/s',()=>{
  assert.equal(ribbonScrollVelocity(1,.001,900,true),120);
  let velocity=28;
  for(let i=0;i<60;i++)velocity=approach(velocity,ribbonVelocityTarget(1000),1/60,.25);
  assert.ok(velocity>69&&velocity<=70);
  const boosted=velocity;
  velocity=approach(velocity,ribbonVelocityTarget(0),1/60,.25);
  assert.ok(velocity< boosted&&velocity>28);
  for(let i=0;i<120;i++)velocity=approach(velocity,ribbonVelocityTarget(0),1/60,.25);
  assert.ok(velocity>=28&&velocity<28.02);
});
test('all five world events drive distinct arms/head/body tracks, preserving face artwork contract',()=>{
  const base={seconds:0,gaze:{x:0,y:0},pose:characterPose('reach'),blink:1};
  const idle=characterParameters({...base,cue:{action:'idle',progress:1,weight:0}});
  const motions=['experience','research','projects','studio','life'].map(world=>{
    const cue=characterParameters({...base,world,cue:{action:'preview',progress:.4,weight:1}});
    assert.notEqual(cue.armL,idle.armL);assert.notEqual(cue.body,idle.body);assert.notEqual(cue.hairL,idle.hairL);
    for(const key of ['eyeOpenL','eyeOpenR','mouthOpen','mouthForm'])assert.equal(cue[key],idle[key]);
    return [cue.angleX,cue.angleY,cue.angleZ,cue.armL,cue.armR].join(',');
  });assert.equal(new Set(motions).size,5);
  const ear=side=>characterParameters({...base,cue:{action:'tap',region:'ear',earIndex:side,progress:.4,weight:1}});
  assert.ok(ear(0).armL>ear(0).armR);assert.ok(ear(1).armR>ear(1).armL);
});
