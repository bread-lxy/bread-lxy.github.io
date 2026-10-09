import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {items} from '../content/site.ts';
import {experienceDesktop,experienceCategories} from '../content/experience-desktop.ts';
import {getRpgDialogueLines} from '../app/rpg-dialogue.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('cover lists the requested education and internship summaries without changing the canonical entries',()=>{
 for(const {id:category} of experienceCategories) {
  const source=items.filter(i=>i.kind==='experience'&&i.category===category);
  assert.ok(source.every(item=>experienceDesktop.records[category].filter(i=>i.id===item.id).length===1));
  assert.ok(experienceDesktop.records[category].every(i=>Object.keys(i).sort().join(',')==='id,label'));
 }
 assert.deepEqual(experienceDesktop.records.education.map(i=>i.label),['中国人民大学 · 金融工程 · 本科','哥本哈根商学院 · 交换生','中国人民大学 · 金融 · 硕士']);
 assert.deepEqual(experienceDesktop.records.internship.map(i=>i.label),['Sand AI / VidMuse · AI Agent调优','华泰证券 · 金融工程组','华泰证券 · 传媒组','百度智能云 · 智能云AI应用战略研究','国泰君安证券 · 家电组','北京 ESG 研究院 · 数据分析']);
 assert.equal(experienceDesktop.photo?.src,'/experience/profile-portrait.png');
});
test('collage is passive with no visit stack, page tabs or fake controls',()=>{
 const desktop=read('app/ExperienceDesktop.tsx'),page=read('app/PersonalArchive.tsx'),content=read('content/experience-desktop.ts');
 assert.doesNotMatch(desktop,/<button|<a\s|onClick|onKeyDown|onTouch|\.html|exp-record-wipe/);
 assert.match(desktop,/data-world-input-island tabIndex=\{active \? 0 : -1\}/);
 assert.doesNotMatch(page+content,/DesktopSession|experienceSession|PageVisits|travelDesktopPage/);
 assert.match(desktop,/kind="notepad"/);assert.match(desktop,/kind="photo"/);assert.match(desktop,/kind="browser"/);assert.match(desktop,/kind="files"/);assert.match(desktop,/kind="notice"/);
 assert.doesNotMatch(desktop,/window\.history|localStorage|setInterval|autoPlay/);
});
test('experience uses the approved first-person intro and pink shared dialogue',()=>{
 const lines=getRpgDialogueLines('experience');
 assert.ok(lines.every(line=>line.speaker==='XUEYING'));
 assert.equal(lines[0].text,'我身后悬浮的网页上是我的教育和实习经历哦。需要详细了解一下的话，可以点右侧的【进入】。不过在此之前...');
 assert.equal(getRpgDialogueLines('research')[0].speaker,'XUEYING');
 const css=read('app/experience-desktop.css');
 assert.match(css,/--hero-accent:#f0bce0/);assert.doesNotMatch(css,/\.rpg-dialogue\s*\{[^}]*background:/);
});
test('motion cleanup, reduced motion, inert snapshots and original publication survive',()=>{
 const page=read('app/PersonalArchive.tsx'),desktop=read('app/ExperienceDesktop.tsx'),css=read('app/experience-desktop.css');
 assert.match(page,/clone\.inert=true/);assert.match(page,/<CharacterAwakeningOpening/);assert.match(page,/<Publication /);
 assert.doesNotMatch(page,/<ExperienceRibbon|<ExperienceStageLight/);
 const ambience=read('app/ExperienceAquatic.tsx');
 assert.match(desktop,/context\.revert/);assert.match(desktop,/observer\.disconnect/);assert.match(ambience,/document\.hidden/);assert.match(ambience,/IntersectionObserver/);assert.match(desktop,/cancelAnimationFrame/);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/forced-colors/);assert.match(css,/98\.css/);
 assert.match(read('docs/licenses/Pixelarticons-MIT.txt'),/8275e0af7c16aa40c54ea2b90b7af83b1fe4eb4c/);
});
