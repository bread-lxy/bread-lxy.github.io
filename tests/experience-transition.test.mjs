import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {involvesExperience} from '../app/experience-transition.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('only the eight experience edges use the synchronized scenery layers',()=>{
  const worlds=['experience','research','projects','studio','life'];
  for(const from of worlds)for(const to of worlds)if(from!==to)
    assert.equal(involvesExperience({from,to,direction:1}),from==='experience'||to==='experience');
  assert.equal(involvesExperience(null),false);
});
test('wallpaper is stationary and cover wordmark is no longer hidden',()=>{
  const scene=read('app/AlbumScene.tsx'),page=read('app/PersonalArchive.tsx'),css=read('app/experience-desktop.css');
  assert.doesNotMatch(scene,/ExperienceDesktopBackdrop/);
  assert.match(page,/className="album-scene-backdrop"/);
  assert.match(page,/className="experience-window-track"/);
  assert.match(page,/animateEntrance=\{entryPhase==='entering'\}/);
  assert.doesNotMatch(css,/wordmark-ink\s*\{opacity:/);
  assert.match(page,/addAlbumSlide\(timeline,outgoingWindowsRef/);
});
