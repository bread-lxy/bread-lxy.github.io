import test from 'node:test';
import assert from 'node:assert/strict';
import { createGreeting, advanceGreeting, createGreetingReadyGate } from '../app/character/greeting.ts';

test('post-ready GPU stalls do not consume the greeting before steady visible frames',()=>{
  const ready=createGreetingReadyGate(0);
  assert.equal(ready(33),false);assert.equal(ready(66),false);
  assert.equal(ready(1500),false);
  for(const t of [1533,1566,1600,1633,1666,1700,1733])assert.equal(ready(t),false);
  assert.equal(ready(1766),true);
});

test('greeting waits for a visible ready model, even after a long load',()=>{
  let state=createGreeting();
  state=advanceGreeting(state,{ready:false,eligible:true,interacted:false,now:5000});
  assert.equal(state.phase,'pending');
  state=advanceGreeting(state,{ready:true,eligible:true,interacted:false,now:9000});
  assert.equal(state.phase,'playing');assert.equal(state.startedAt,9000);
  assert.equal(advanceGreeting(state,{ready:true,eligible:true,interacted:false,now:10801}).phase,'done');
});
test('interaction or leaving cancels pending greeting and HOME never replays',()=>{
  for(const patch of [{interacted:true},{eligible:false}]){
    let state=advanceGreeting(createGreeting(),{ready:false,eligible:true,interacted:false,now:10,...patch});
    assert.equal(state.phase,'done');
    state=advanceGreeting(state,{ready:true,eligible:true,interacted:false,now:4000});
    assert.equal(state.phase,'done');
  }
});
test('in-progress greeting has a short smooth recovery on input',()=>{
  let state=advanceGreeting(createGreeting(),{ready:true,eligible:true,interacted:false,now:100});
  state=advanceGreeting(state,{ready:true,eligible:true,interacted:true,now:700});
  assert.equal(state.phase,'settling');assert.equal(state.settleAt,700);
  assert.equal(advanceGreeting(state,{ready:true,eligible:true,interacted:false,now:1021}).phase,'done');
});
