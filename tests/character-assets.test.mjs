import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { heroCharacterAssets, heroCharacterEnabled } from '../content/character.ts';
import { parameterRanges } from '../public/vendor/anime25d/params.js';

const publicFile = path => new URL('../public' + path, import.meta.url);

test('enabled character points to the real RGB 1024px v2 PSD and RGBA poster', () => {
  assert.equal(heroCharacterEnabled, true);
  assert.match(heroCharacterAssets.psdUrl, /\/hero-v2\//);
  const psd = readFileSync(publicFile(heroCharacterAssets.psdUrl));
  assert.equal(psd.toString('ascii', 0, 4), '8BPS');
  assert.equal(psd.readUInt16BE(4), 1);
  assert.equal(psd.readUInt32BE(14), 1024);
  assert.equal(psd.readUInt32BE(18), 1024);
  assert.equal(psd.readUInt16BE(24), 3);
  const png = readFileSync(publicFile(heroCharacterAssets.posterUrl));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png[25], 6, 'poster contains its own alpha channel');
});

test('rig settings fingerprint matches the exact served PSD bytes', () => {
  const buffer = readFileSync(publicFile(heroCharacterAssets.psdUrl));
  const settings = JSON.parse(readFileSync(publicFile(heroCharacterAssets.settingsUrl), 'utf8'));
  let a = 2166136261, c = 5381;
  for (const byte of buffer) { a = Math.imul(a ^ byte, 16777619); c = Math.imul(c, 33) ^ byte; }
  const fingerprint = `${buffer.length.toString(16)}-${(a>>>0).toString(16)}-${(c>>>0).toString(16)}`;
  assert.equal(settings.modelId, fingerprint);
  assert.equal(settings.format, 'anime25d-settings');
  for (const key of Object.keys(parameterRanges)) assert.ok(Number.isFinite(settings.params[key]), `served settings include parameter ${key}`);
  assert.equal(settings.layers.length, 26, '19 PSD layers split paired features and add three runtime differences');
  for (const accessory of heroCharacterAssets.accessories) {
    assert.ok(settings.layers.some(l => l.id.endsWith(':' + accessory.layer)));
    assert.ok([...accessory.root, ...accessory.tip].every(v => v >= 0 && v < 1024));
    assert.ok(accessory.amplitude <= 14, 'no large unpainted-root deformation');
  }
});
