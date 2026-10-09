import assert from "node:assert/strict";
import test from "node:test";
import { beginCue, createCue, sampleCue, canAnimate, normalisePointer, createRenderClock } from "../app/character/motion.ts";

test("confirmation wins over taps and previews until its own end", () => {
  const confirm = beginCue(createCue(), { action: "confirm", id: 1 }, 100);
  assert.equal(beginCue(confirm, { action: "tap", id: 2 }, 200), confirm);
  assert.equal(beginCue(confirm, { action: "preview", id: 3 }, 300), confirm);
  assert.equal(sampleCue(confirm, 200).action, "confirm");
  assert.equal(sampleCue(confirm, 2000).action, "idle");
});

test("a second deliberate tap restarts without an older reset timer", () => {
  const first = beginCue(createCue(), { action: "tap", region: "head", id: 1 }, 100);
  const next = beginCue(first, { action: "tap", region: "ear", id: 2 }, 800);
  assert.equal(next.region, "ear");
  assert.equal(next.startedAt, 800);
  assert.equal(sampleCue(next, 1300).action, "tap");
  assert.equal(sampleCue(next, 4000).action, "idle");
  assert.equal(beginCue(next, { action: "tap", id: 2 }, 900), next);
});

test("navigation interrupts a tap; repeated taps cannot interrupt the scene cue", () => {
  const tap = beginCue(createCue(), { action: "tap", id: 1 }, 10);
  const preview = beginCue(tap, { action: "preview", id: 2 }, 30);
  assert.equal(preview.action, "preview");
  assert.equal(beginCue(preview,{action:'tap',id:3},40),preview);
  assert.equal(sampleCue(preview, 30).weight, 0);
  assert.ok(sampleCue(preview, 400).weight > 0.7);
  assert.equal(sampleCue(preview, 4000).weight, 0);
});

test("motion is disabled for fallback, accessibility, offscreen and hidden states", () => {
  const ready = { ready: true, active: true, visible: true, inViewport: true, reducedMotion: false };
  assert.equal(canAnimate(ready), true);
  for (const key of ["ready", "active", "visible", "inViewport"]) assert.equal(canAnimate({ ...ready, [key]: false }), false);
  assert.equal(canAnimate({ ...ready, reducedMotion: true }), false);
});

test("pointer coordinates are bounded and invalid dimensions stay neutral", () => {
  assert.deepEqual(normalisePointer(50, 25, 100, 50), { x: 0, y: 0 });
  assert.deepEqual(normalisePointer(200, -50, 100, 50), { x: 1, y: -1 });
  assert.deepEqual(normalisePointer(1, 2, 0, 0), { x: 0, y: 0 });
});

test("one-shot cues expire across a long pause without sampling intervening frames", () => {
  const tap = beginCue(createCue(), { action: "tap", region: "ear", id: 1 }, 1000);
  assert.ok(sampleCue(tap, 1500).weight > 0);
  assert.equal(sampleCue(tap, 11000).action, "idle");
  assert.equal(sampleCue(tap, 11000).weight, 0);
});

test("character mesh work stays at 30 fps even on high-refresh displays", () => {
  for (const hz of [60, 120, 144, 240]) {
    const clock = createRenderClock(0);
    const frames = [];
    for (let tick = 1; tick <= hz; tick++) {
      const dt = clock(tick * 1000 / hz);
      if (dt !== null) frames.push(dt);
    }
    assert.equal(frames.length, 30, `${hz} Hz must not multiply mesh work`);
    assert.ok(Math.abs(frames.reduce((sum, dt) => sum + dt, 0) - 1) < 0.001);
  }
});

test("frame pacing skips duplicate timestamps and caps a delayed physics step", () => {
  const clock = createRenderClock(100);
  assert.equal(clock(100), null);
  assert.equal(clock(110), null);
  assert.equal(clock(140), 0.04);
  assert.equal(clock(140), null);
  assert.equal(clock(1140), 0.05);
});
