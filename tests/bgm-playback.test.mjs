import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BgmPlayback } from '../app/bgm-playback.ts';
import { bgmTracks, canPlayBgm, visibleBgmTracks } from '../content/bgm.ts';

const tracks = visibleBgmTracks.map((track, index) => ({ ...track, asset: { src: `/audio/bgm/test-${index}.mp3`, sha256: 'a'.repeat(64), acquiredAt: 'test-only', provenance: 'unit fixture, not a real recording' } }));
class FakeSound {
  constructor(options) { this.options = options; this.position = 0; this.isPlaying = false; this.unloaded = false; this.calls = []; this.events = {}; }
  load() { this.calls.push(['load']); }
  play(id) { this.calls.push(['play', id]); this.isPlaying = true; return id ?? 23; }
  pause() { this.isPlaying = false; this.calls.push(['pause']); }
  unload() { this.unloaded = true; this.isPlaying = false; this.calls.push(['unload']); }
  duration() { return 213; }
  seek(position, id) { if (id === undefined) return this.position; this.position = position; return this; }
  volume(value) { this.level = value; }
  once(event, callback) { this.events[event] = callback; }
  loaded() { this.options.onload(); }
  started() { this.options.onplay(23); }
}
function setup(list = tracks, factory) {
  const sounds = [], saved = [];
  const create = options => { const sound = new FakeSound(options); sounds.push(sound); return sound; };
  const engine = new BgmPlayback(list, canPlayBgm, factory ?? (async () => create), (...entry) => saved.push(entry));
  return { engine, sounds, saved, create };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('catalog has exact five versions; only official instrumentals are enabled', () => {
  assert.equal(bgmTracks.length, 5);
  assert.deepEqual(visibleBgmTracks.map(track => track.id), ['tooku-instrumental', 'suishitai-instrumental']);
  assert.equal(bgmTracks[3].sourceUrl, 'https://piapro.jp/t/jIZa');
  for (const track of bgmTracks) {
    assert.ok(track.sourceUrl.startsWith('https://'));
    assert.ok(track.licenseUrl.startsWith('https://'));
    if (canPlayBgm(track)) {
      const path = `public${track.asset.src}`;
      assert.ok(existsSync(path), `Do not enable absent media: ${path}`);
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), track.asset.sha256);
    }
  }
  assert.equal(canPlayBgm({ ...tracks[0], licenseStatus: 'pending' }), false);
  assert.equal(canPlayBgm({ ...tracks[0], enabled: false }), false);
  assert.equal(canPlayBgm({ ...tracks[0], asset: null }), false);
});
test('no factory/network/autoplay on construction or stored-preference restoration', () => {
  const { engine, sounds } = setup();
  engine.restore(tracks[1].id, '.4');
  assert.equal(sounds.length, 0);
  assert.equal(engine.getSnapshot().requested, false);
  assert.equal(engine.getSnapshot().volume, .4);
  assert.equal(engine.getSnapshot().trackId, tracks[1].id);
  engine.setHidden(true); engine.setHidden(false);
  assert.equal(engine.getSnapshot().status, 'off');
  assert.equal(sounds.length, 0);
});
test('explicit start, pause and resume preserve the same sound ID and time', async () => {
  const { engine, sounds } = setup();
  await engine.play();
  assert.equal(sounds[0].options.preload, false);
  assert.equal(sounds[0].options.autoplay, false);
  assert.equal(sounds[0].options.html5, true);
  assert.deepEqual(sounds[0].calls.slice(0, 2), [['load'], ['play', undefined]]);
  sounds[0].loaded(); sounds[0].started(); sounds[0].position = 32;
  engine.pause();
  assert.equal(engine.getSnapshot().position, 32);
  assert.equal(engine.getSnapshot().status, 'paused');
  await engine.play(); sounds[0].started();
  assert.equal(sounds.length, 1);
  assert.deepEqual(sounds[0].calls.at(-1), ['play', 23]);
});
test('switching unloads previous audio before starting next; late events are ignored', async () => {
  const { engine, sounds } = setup();
  await engine.play(); sounds[0].started();
  engine.step(1); await flush();
  assert.equal(sounds[0].unloaded, true);
  assert.equal(sounds.length, 2);
  sounds[0].options.onloaderror();
  assert.equal(engine.getSnapshot().status, 'loading');
  sounds[1].started(); assert.equal(engine.getSnapshot().trackId, tracks[1].id);
});
test('ended advances and wraps the playable playlist, skipping unavailable tracks', async () => {
  const { engine, sounds } = setup([tracks[0], { ...tracks[1], id: 'missing', asset: null }, tracks[1]]);
  await engine.play(); sounds[0].started(); sounds[0].options.onend(); await flush();
  assert.equal(engine.getSnapshot().trackId, tracks[1].id);
  sounds[1].started(); sounds[1].options.onend(); await flush();
  assert.equal(engine.getSnapshot().trackId, tracks[0].id);
});
test('pause during pending import or queued load cannot start stale playback', async () => {
  let resolve;
  const { engine, sounds, create } = setup(tracks, () => new Promise(done => { resolve = done; }));
  const pending = engine.play(); engine.pause(); resolve(create); await pending;
  assert.equal(sounds.length, 0);
  const loaded = setup(); await loaded.engine.play(); loaded.engine.pause();
  assert.equal(loaded.sounds[0].unloaded, true);
  loaded.sounds[0].started();
  assert.equal(loaded.engine.getSnapshot().status, 'paused');
});
test('rapid selections before import resolves construct only the latest track', async () => {
  const resolvers = [];
  const { engine, sounds, create } = setup(tracks, () => new Promise(resolve => resolvers.push(resolve)));
  void engine.play(); engine.select(tracks[1].id, true); engine.select(tracks[0].id, true);
  resolvers.forEach(resolve => resolve(create)); await flush();
  assert.equal(sounds.length, 1);
  assert.deepEqual(sounds[0].options.src, [tracks[0].asset.src]);
});
test('visibility resumes only previously playing audio; explicit pause cancels resume', async () => {
  const { engine, sounds } = setup();
  await engine.play(); sounds[0].started(); engine.setHidden(true);
  assert.equal(engine.getSnapshot().status, 'paused');
  engine.setHidden(false); sounds[0].started();
  assert.equal(engine.getSnapshot().status, 'playing');
  engine.setHidden(true); engine.pause(); engine.setHidden(false);
  assert.equal(engine.getSnapshot().status, 'paused');
});
test('video playback pauses BGM and completion does not auto-resume it', async () => {
  const { engine, sounds } = setup();
  await engine.play(); sounds[0].started(); engine.setVideoActive(true);
  assert.equal(engine.getSnapshot().status, 'paused');
  await engine.play(); assert.equal(engine.getSnapshot().requested, false);
  engine.setVideoActive(false); assert.equal(engine.getSnapshot().status, 'paused');
  await engine.play(); sounds[0].started(); assert.equal(engine.getSnapshot().status, 'playing');
});
test('load failure permits retry; blocked unlock respects user pause', async () => {
  const { engine, sounds } = setup();
  await engine.play(); sounds[0].options.onloaderror();
  assert.equal(engine.getSnapshot().status, 'error');
  await engine.play(); assert.equal(sounds[0].unloaded, true);
  sounds[1].options.onplayerror(); assert.equal(engine.getSnapshot().status, 'blocked');
  engine.pause(); const callCount = sounds[1].calls.length; sounds[1].events.unlock();
  assert.equal(sounds[1].calls.length, callCount);
});
test('volume and seek are clamped; invalid stored values are ignored', async () => {
  const { engine, sounds } = setup();
  engine.restore('not-a-track', 'not-a-number'); assert.equal(engine.getSnapshot().volume, .25);
  await engine.play(); sounds[0].loaded(); sounds[0].started();
  engine.setVolume(2); engine.seek(999);
  assert.equal(sounds[0].level, 1); assert.equal(engine.getSnapshot().position, 213);
  engine.setVolume(NaN); assert.equal(engine.getSnapshot().volume, 1);
});
test('pagehide and disposal unload sounds and invalidate pending callbacks', async () => {
  const { engine, sounds } = setup();
  await engine.play(); sounds[0].started(); engine.pageHide();
  assert.equal(sounds[0].unloaded, true); assert.equal(engine.getSnapshot().requested, false);
  await engine.play(); engine.dispose(); sounds[1].started();
  assert.notEqual(engine.getSnapshot().status, 'playing');
});
test('missing official assets never produce a synthetic or remote-stream substitute', async () => {
  const { engine, sounds } = setup(visibleBgmTracks.map(track => ({ ...track, asset: null })));
  await engine.play(); engine.step(1);
  assert.equal(sounds.length, 0); assert.equal(engine.getSnapshot().status, 'unavailable');
  const hook = readFileSync(new URL('../app/use-audio.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(hook, /source\(['"]bgm['"]/);
});
