import assert from "node:assert/strict";
import test from "node:test";
import { createAccessorySpring, advanceAccessorySpring, accessoryVertexDelta } from "../public/vendor/anime25d/accessory-spring.js";

test("cloth-ear bending keeps root and unrelated vertices fixed", () => {
  const spring = createAccessorySpring({ layer: "headwear", root: [10, 0], tip: [10, 100], width: 20, amplitude: 18 }, new Float32Array([10, 0, 10, 100, 60, 60]));
  for (let i = 0; i < 30; i++) advanceAccessorySpring(spring, { dt: 1 / 60, time: i / 60, impulse: i < 5 ? 1 : 0, wind: false });
  assert.deepEqual(accessoryVertexDelta([spring], 0), [0, 0]);
  assert.ok(Math.abs(accessoryVertexDelta([spring], 1)[0]) > 0);
  assert.deepEqual(accessoryVertexDelta([spring], 2), [0, 0]);
  advanceAccessorySpring(spring, { physics: false });
  assert.deepEqual(accessoryVertexDelta([spring], 1), [0, 0]);
});

test("a held tap is not repeatedly injected and invalid geometry is rejected", () => {
  const config = { layer: "headwear", root: [10, 0], tip: [10, 100], width: 20, amplitude: 18 };
  const spring = createAccessorySpring(config, new Float32Array([10, 100]));
  advanceAccessorySpring(spring, { impulse: 1, dt: 0, wind: false });
  const velocity = spring.velocity;
  advanceAccessorySpring(spring, { impulse: 1, dt: 0, wind: false });
  assert.equal(spring.velocity, velocity);
  assert.throws(() => createAccessorySpring({ ...config, tip: [10, 0] }, new Float32Array([10, 100])), /different/);
});
