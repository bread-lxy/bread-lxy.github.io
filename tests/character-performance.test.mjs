import assert from 'node:assert/strict';
import test from 'node:test';
import { characterParameters, characterPose, accessoryHitBox } from '../app/character/performance.ts';
import { closedEyeY, closedMouthPoint, neckBlend } from '../public/vendor/anime25d/feature-deformation.js';
import { heroCharacterAssets } from '../content/character.ts';

const frame = (action = 'idle', region = 'head', weight = 0, progress = 0.4) => characterParameters({
  seconds: 0, gaze: { x: 0, y: 0 }, pose: characterPose('reach'), blink: 1,
  cue: { action, region, weight, progress },
});
test('entrance cannot alter the accepted facial expression',()=>{
  const idle=frame();
  for(const progress of [.1,.25,.5,.7,.9]){
    const greeting=frame('enter','head',1,progress);
    for(const key of ['eyeOpenL','eyeOpenR','eyeSmile','brow','mouthOpen','mouthForm','irisScale'])assert.equal(greeting[key],idle[key],key);
  }
});

test('arrival has a visible body, head and hair gesture rather than idle motion',()=>{
  const idle=frame(),peak=frame('enter','head',1,.55);
  assert.ok(peak.armL>.9);
  assert.ok(peak.angleZ-idle.angleZ>.85);
  assert.ok(peak.angleX-idle.angleX>.6);
  assert.ok(idle.body-peak.body>.8);
  assert.ok(peak.hairL>.45);
  assert.deepEqual(frame('enter','head',0),idle,'settles to unchanged idle');
});

test('head tap is a genuine happy expression and ear tap remains distinct', () => {
  const idle = frame(), smile = frame('tap', 'head', 1), surprise = frame('tap', 'ear', 1);
  assert.ok(smile.eyeOpenL < 0.05 && smile.eyeOpenR < 0.05);
  assert.equal(smile.eyeSmile, 1);
  assert.ok(smile.mouthForm > idle.mouthForm);
  assert.ok(smile.mouthOpen > 0.5, 'the drawn open smile is actually shown');
  assert.ok(surprise.eyeOpenL > 0.9 && surprise.irisScale < idle.irisScale);
  assert.ok(surprise.mouthForm < smile.mouthForm);
  assert.ok(surprise.earImpulse > 0);
});

test('preview and confirm have real pose changes and return to neutral', () => {
  const idle = frame();
  assert.notEqual(frame('preview', 'head', 1).angleY, idle.angleY);
  assert.ok(frame('confirm', 'head', 1).angleY < idle.angleY);
  for (const action of ['preview', 'confirm', 'tap']) assert.deepEqual(frame(action, 'head', 0), idle);
});

test('closed-eye geometry distinguishes a blink from a smile; closed mouth responds too', () => {
  assert.notEqual(closedEyeY(191, 200, 0), closedEyeY(191, 200, 1));
  assert.equal(closedEyeY(200, 200, 0), 200);
  const neutral = closedMouthPoint(30, 40, 20, 10, 1, 0);
  const smile = closedMouthPoint(30, 40, 20, 10, 1, 1);
  assert.deepEqual(neutral, [30, 40]);
  assert.ok(smile[0] > 30 && smile[1] < 40, 'mouth corners widen and lift');
});

test('neck endpoints blend continuously into face and jacket', () => {
  assert.deepEqual(neckBlend(236, 236, 340), { head: 1, follow: 1, depth: 1 });
  assert.deepEqual(neckBlend(340, 236, 340), { head: 0, follow: 0.16, depth: 0.9 });
  assert.ok(neckBlend(288, 236, 340).head > 0 && neckBlend(288, 236, 340).head < 1);
});

test('both source ears including their tips fit their own hitboxes', () => {
  for (const ear of heroCharacterAssets.accessories) {
    const box = accessoryHitBox(ear);
    for (const [x, y] of [ear.root, ear.tip]) {
      assert.ok(x / 1024 * 100 >= box.left && x / 1024 * 100 <= box.left + box.width);
      assert.ok(y / 1024 * 100 >= box.top && y / 1024 * 100 <= box.top + box.height);
    }
    assert.ok(box.width < 40, 'ear target must not become a whole-stage click layer');
  }
});
