import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import test from 'node:test';
import {homeScenes} from '../content/home-scenes.ts';
import {studioFilmSamples} from '../content/studio-media.ts';

test('Studio lobby shares exactly the two VIDEO stills without loading a movie', async () => {
  assert.equal(studioFilmSamples.length, 2);
  const posters = studioFilmSamples.map(item => item.media?.poster);
  assert.equal(new Set(posters).size, 2);
  for (const poster of posters) {
    assert.ok(poster?.startsWith('/publication/samples/'), poster);
    assert.ok((await stat(new URL(`../public${poster}`, import.meta.url))).size > 1000, poster);
  }
  const wall = await readFile(new URL('../app/StudioLobbyWall.tsx', import.meta.url), 'utf8');
  assert.match(wall, /studioFilmSamples\[0\]/);
  assert.match(wall, /studioFilmSamples\[1\]/);
  assert.doesNotMatch(wall, /<video\b|autoPlay|autoplay/);
});

test('Studio lobby keeps the approved near-black palette and replaces poster panels only', async () => {
  assert.equal(homeScenes.studio.palette.ink.toLowerCase(), '#08090e');
  assert.equal(homeScenes.studio.palette.paper.toLowerCase(), '#e9e7ea');
  assert.equal(homeScenes.studio.palette.accent.toLowerCase(), '#b4bdd4');
  assert.equal(homeScenes.life.composition, 'paper-memories');
  const scene = await readFile(new URL('../app/AlbumScene.tsx', import.meta.url), 'utf8');
  assert.match(scene, /world==='studio'&&<StudioLobbyWall/);
  assert.doesNotMatch(scene, /studio-posters|poster-one|poster-two|poster-three/);
});
