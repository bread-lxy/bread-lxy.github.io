import assert from 'node:assert/strict';
import test from 'node:test';
import { homeScenes, albumTiming } from '../content/home-scenes.ts';
import { beginCue, createCue, sampleCue } from '../app/character/motion.ts';

test('five independently composed covers keep the existing section identifiers', () => {
  assert.deepEqual(Object.keys(homeScenes), ['experience', 'research', 'projects', 'studio', 'life']);
  assert.equal(new Set(Object.values(homeScenes).map(s => s.composition)).size, 5);
  for (const [world,scene] of Object.entries(homeScenes)) {
    assert.ok(scene.palette.ink && scene.palette.accent && scene.palette.paper);
    assert.ok(scene.desktop.faceX >= 60 && scene.desktop.faceX <= 75);
    assert.ok(scene.mobile.faceX >= 49 && scene.mobile.faceX <= 51);
    assert.ok(scene.texture.startsWith(world === 'studio' ? '/publication/tv-wall/' : '/album/'));
    assert.ok(scene.layers.length >= 2);
    assert.ok(scene.expression.eyes > 0 && scene.expression.eyes <= 1);
  }
});

test('album timelines have distinct bounded durations', () => {
  assert.equal(albumTiming.entrance, 1.3);
  assert.equal(albumTiming.preview, 0.8);
  assert.equal(albumTiming.studioPreview, 0.95);
  assert.equal(albumTiming.confirm, 0.55);
});

test('entrance expires, and a deliberate preview or tap takes priority immediately', () => {
  const enter = beginCue(createCue(), {action:'enter',id:10}, 100);
  assert.equal(sampleCue(enter, 600).action, 'enter');
  assert.equal(sampleCue(enter, 2000).action, 'idle');
  for (const action of ['preview','tap','confirm']) {
    assert.equal(beginCue(enter, {action,id:11}, 200).action, action);
  }
});
