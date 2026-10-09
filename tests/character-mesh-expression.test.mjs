import assert from 'node:assert/strict';
import test from 'node:test';

test('the native player actually uploads different closed-eye and mouth meshes', async () => {
  const oldSelf = globalThis.self;
  globalThis.self = globalThis;
  try {
    const { createCharacterPlayer } = await import('../public/vendor/anime25d/character-player.js');
    let nextBuffer = 0, bound = null;
    const uploads = new Map();
    const gl = new Proxy({
      NO_ERROR: 0, ARRAY_BUFFER: 34962, MAX_TEXTURE_SIZE: 3379, MAX_VIEWPORT_DIMS: 3386,
      getParameter: key => key === 3386 ? [8192, 8192] : 8192,
      getShaderParameter: () => true, getProgramParameter: () => true, getAttachedShaders: () => [],
      getAttribLocation: () => 0, getUniformLocation: () => ({}), getError: () => 0, isContextLost: () => false,
      createProgram: () => ({}), createShader: () => ({}), createTexture: () => ({}), createBuffer: () => ++nextBuffer,
      bindBuffer: (target, value) => { if (target === 34962) bound = value; },
      bufferSubData: (_target, _offset, data) => uploads.set(bound, [...data]),
    }, { get: (target, key) => key in target ? target[key] : /^[A-Z_]+$/.test(String(key)) ? 1 : () => {} });
    const cv = new EventTarget();
    Object.assign(cv, { width: 64, height: 64, clientWidth: 64, clientHeight: 64, getContext: () => gl });
    const layer = (z, name, fade, x, y, side) => ({ z, name, fade, side, x, y, w: 20, h: 12, group: 'head', depth: 1.08,
      img: { width: 20, height: 12, data: new Uint8ClampedArray(20 * 12 * 4).fill(255) } });
    const rig = { canvas: { w: 64, h: 64 }, anchors: {
      face: { cx: 32, cy: 20, x0: 10, x1: 54, y0: 4, y1: 40 }, faceScale: 1,
      eyeL: { x0: 12, x1: 32, y0: 12, y1: 28, closeY: 22 },
      mouth: { x0: 22, x1: 42, y0: 30, y1: 38, cx: 32, cy: 34 },
      neckPivot: { cx: 32, cy: 42 }, bodyPivot: { cx: 32, cy: 64 }, neckTop: 35, neckBottom: 48,
    }, layers: [layer(0, 'eye_close_l', 'eyeClose', 12, 16, 'L'), layer(1, 'mouth_close', 'mouthClose', 22, 30)] };
    const player = await createCharacterPlayer({ canvas: cv, rig, generic: false });
    const frozen = { eyeOpenL: 0, mouthOpen: 0, physics: false, wind: false, breath: 0, breathHead: 0, bust: 0 };
    player.render({ ...frozen, eyeSmile: 0, mouthForm: 0 }, 0);
    const blink = [...uploads.values()];
    uploads.clear();
    player.render({ ...frozen, eyeSmile: 1, mouthForm: .8 }, 0);
    const smile = [...uploads.values()];
    assert.equal(blink.length, 2);
    assert.notDeepEqual(smile[0], blink[0], 'closed-eye expression reaches the GL vertex upload');
    assert.notDeepEqual(smile[1], blink[1], 'closed-mouth expression reaches the GL vertex upload');
    assert.ok(smile.flat().every(Number.isFinite));
    player.dispose();
  } finally { if (oldSelf === undefined) delete globalThis.self; else globalThis.self = oldSelf; }
});
