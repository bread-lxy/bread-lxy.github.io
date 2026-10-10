import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import sharp from 'sharp';
import { anchorsOf, fingerprint, layerSignature, outsideSignature, readPsd, rgbaAt, sha256 } from '../scripts/character-asset-io.mjs';
import { V2_MODEL_ID, V2_NECK_REPAIR_MODEL_ID, isV2Model } from '../public/vendor/anime25d/v2-refinements.js';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/character-neck-baseline.json', import.meta.url), 'utf8'));
const bytes = readFileSync(new URL('../public/character/hero-v2/model.psd', import.meta.url));
const psd = readPsd(bytes);

test('neck repair preserves every layer alpha, bounds, ordering and all pixels outside the two local regions', () => {
  assert.deepEqual([psd.width, psd.height], baseline.canvas);
  assert.equal(psd.children.length, baseline.layers.length);
  psd.children.forEach((layer, i) => {
    const actual = layerSignature(layer, baseline.edits[layer.name]), expected = baseline.layers[i];
    for (const key of ['name', 'bounds', 'width', 'height', 'alphaSha256', 'outsideSha256', 'opacity', 'blendMode', 'hidden', 'clipping']) {
      assert.deepEqual(actual[key], expected[key], `${layer.name}: ${key}`);
    }
    if (!baseline.edits[layer.name]) assert.equal(actual.rgbaSha256, expected.rgbaSha256, layer.name);
  });
});

test('source lower-neck contour is replaced with connected skin, while chest uses the neck palette', () => {
  const neck = psd.children.find(l => l.name === 'neck'), body = psd.children.find(l => l.name === 'topwear');
  const edge = rgbaAt(neck, 520, 338), neckBase = rgbaAt(neck, 525, 330), chest = rgbaAt(body, 525, 345);
  assert.ok(edge[0] >= 250 && edge[1] >= 243 && edge[2] >= 236, 'no dark grey internal neck contour');
  for (let c = 0; c < 3; c++) assert.ok(Math.abs(chest[c] - neckBase[c]) <= 5, 'chest and neck skin join without a yellow colour step');
});

test('actual Rigger anchors are byte-for-byte numerically unchanged after the pixel edit', () => {
  assert.deepEqual(anchorsOf(psd), baseline.anchors);
});

test('static fallback preserves all alpha and every RGBA pixel outside the repair rectangle', async () => {
  const { data, info } = await sharp(readFileSync(new URL('../public/character/hero-v2/poster.png', import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height], baseline.canvas);
  assert.equal(sha256(Buffer.from(data.filter((_, i) => i % 4 === 3))), baseline.poster.alphaSha256);
  assert.equal(outsideSignature(data, info.width, baseline.compositeRect), baseline.poster.outsideSha256);
});

test('original model remains recognized and served settings match the repaired PSD', () => {
  assert.equal(V2_MODEL_ID, baseline.modelId);
  assert.ok(isV2Model(V2_MODEL_ID));
  assert.ok(isV2Model(V2_NECK_REPAIR_MODEL_ID));
  assert.equal(isV2Model('unrelated-model'), false);
  assert.ok(isV2Model(fingerprint(bytes)), 'real served PSD still gets both v2 arm and continuous hair refinements');
  const settings = JSON.parse(readFileSync(new URL('../public/character/hero-v2/rig.json', import.meta.url), 'utf8'));
  assert.equal(settings.modelId, fingerprint(bytes));
});
