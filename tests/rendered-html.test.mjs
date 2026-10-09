import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {publicationItems,experienceOrder,experienceNotes} from '../content/publication.ts';
async function render() {
  return readFile(new URL("../dist/client/index.html",import.meta.url),"utf8");
}
test('static HTML exposes identity, five entrances and mixed content without JS',async()=>{
  const html=await render();
  for(const label of ['卢雪莹','XUEYING','Eval Studio','EXPERIENCE','RESEARCH','PROJECTS','STUDIO','LIFE','共同第一作者','经历索引','SIDE A / 01—02','SIDE B / 03—07','Challenge 金奖','MCM H 奖','北京市一等奖'])assert.ok(html.includes(label),label);
  for(const id of ['sand-ai','huatai','baidu','guotai','esg','eval-studio','yama','director'])assert.equal(html.split(`data-content-id="${id}"`).length-1,1,id+' has one full body');
  assert.doesNotMatch(html,/class="home-overview"|class="reading-surface"|<details/);
  assert.doesNotMatch(html,/FRAMEWORK \/ 0→1|VISUAL ARTIST|Your site is taking shape|角色 A · 待替换/);
  assert.match(html,/id="selected"/);
});
test('a11y, accepted character, reduced motion and metadata remain present',async()=>{
  const css=await readFile(new URL('../app/globals.css',import.meta.url),'utf8');
  const page=await readFile(new URL('../app/PersonalArchive.tsx',import.meta.url),'utf8');
  const layout=await readFile(new URL('../app/layout.tsx',import.meta.url),'utf8');
  assert.match(css,/prefers-reduced-motion/);assert.match(css,/focus-visible/);assert.match(css,/100svh/);
  assert.match(layout,/lang="zh-CN"/);assert.match(layout,/Xueying Lu/);
  assert.match(page,/<HeroCharacter pose=/);
  assert.match(page,/(?:lobby|selector)\?\.addEventListener\("wheel"/);
  assert.doesNotMatch(page,/addEventListener\("keydown", onKeyDown/);
});
test('all retained real-media branches and accessible native dialog survive',async()=>{
  const source=await readFile(new URL('../app/ContentViews.tsx',import.meta.url),'utf8');
  for(const feature of ['showModal','onCancel','preload="none"','loading="lazy"','素材暂时无法加载','noopener noreferrer','onRelated'])assert.ok(source.includes(feature),feature);
});
test('cover previews are buttons; body links and every canonical paragraph remain readable',async()=>{
  const html=await render();
  for(const id of ['experience','research','projects','studio','life']){
    assert.match(html,new RegExp(`<button type="button" class="world-tab[^>]+data-world="${id}"`));
    assert.match(html,new RegExp(`<a href="#${id}"[^>]+data-focus-key="reading-${id}"`));
  }
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
  for(const item of publicationItems){
    assert.equal(html.split(`data-content-id="${item.id}"`).length-1,1,item.id);
    if(!experienceOrder.includes(item.id))for(const note of item.details||[])assert.ok(html.includes(escape(note.text)),item.id+' / '+note.label+' is readable without JS');
  }
  let previous=-1;
  for(const id of experienceOrder){const position=html.indexOf(`data-content-id="${id}"`);assert.ok(position>previous,id+' approved order');previous=position;for(const sentence of experienceNotes[id].sentences)assert.ok(html.includes(escape(sentence)),id+' short copy readable without JS');}
  assert.match(html,/class="video-wall"/);assert.match(html,/id="studio-title">VIDEO/);assert.match(html,/class="life-sheet"/);
  assert.doesNotMatch(html,/SCREENING ROOM|PROGRAM \/ 节目单|deck-status-bars|life-collage/);
});
