import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('handover owns a separate layer and never reparents or compensates model geometry',()=>{
 const hook=read('app/use-experience-handover.ts'),page=read('app/PersonalArchive.tsx');
 assert.equal((page.match(/<HeroCharacter /g)||[]).length,1);
 assert.doesNotMatch(hook,/appendChild|replaceChildren|cloneNode|scrub:\s*\.[0-9]/);
 assert.doesNotMatch(hook,/Flip|ScrollTrigger|pin:|scale:/);
 assert.match(hook,/ResizeObserver/);
 assert.match(hook,/observer\.disconnect\(\)/);
 assert.match(hook,/cancelAnimationFrame/);
 assert.doesNotMatch(page,/experience-bridge|bridge-paper/);
 assert.doesNotMatch(page,/experience-relay|relay-type__line/);
});
test('experience styling is local, all seven use one hierarchy, no no-JS hidden title',()=>{
 const css=read('app/experience.css'),notes=read('app/ExperienceNotes.tsx');
 assert.doesNotMatch(css,/\.publication\[|\.pub-case|\.research-|\.project-/);
 assert.doesNotMatch(css,/is-pending|liner-display|height:\s*100vh/);
 assert.match(notes,/className="track-record liner-record pub-anchor is-designed"/);
 assert.match(notes,/position:static!important/);
 assert.match(read('app/ExperienceShuffle.tsx'),/Commons Clause/);
});
