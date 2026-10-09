import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {riftGeometry,RIFT_TIMING} from '../app/title-rift-geometry.ts';
import {RIFT_WORDMARK} from '../app/rift-wordmark.ts';

for(const [width,height] of [[1440,900],[1024,768],[390,844],[390,667]]){
 test(`rift geometry ${width}x${height}: continuous matte and readable title`,()=>{
  const g=riftGeometry(width,height,RIFT_WORDMARK.width);
  assert.equal(g.bands.length,5);
  assert.equal(g.bands[0].top,0);
  assert.equal(g.bands.reduce((sum,b)=>sum+b.height,0),height);
  g.bands.forEach((b,i)=>{assert.ok(b.height>0);assert.ok(b.split>0&&b.split<width);if(i)assert.equal(b.top,g.bands[i-1].top+g.bands[i-1].height);});
  assert.ok(g.x>=16&&g.x+g.nameWidth<=width-16);
  assert.ok(g.buttonHeight>=64&&g.buttonWidth>=180&&g.buttonY+g.buttonHeight<height-20);
  assert.ok(g.bands[0].height>height*.4,'face is not divided into equal strips');
  assert.ok(g.nameHeight>=45);
 });
}
test('title outline is real vector artwork with a complete glyph set',()=>{
 assert.ok(RIFT_WORDMARK.path.length>1000);assert.ok(RIFT_WORDMARK.width>60&&RIFT_WORDMARK.width<80);
 assert.match(RIFT_WORDMARK.path,/M/);assert.equal(RIFT_WORDMARK.height,9.5);
});
test('homepage uses approved awakening, never the rejected title curtains',async()=>{
 const page=await readFile(new URL('../app/PersonalArchive.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(page,/<TitleRiftOpening|<RpgBootScreen/);assert.match(page,/<CharacterAwakeningOpening/);
 const entry=await readFile(new URL('../app/TitleRiftOpening.tsx',import.meta.url),'utf8');
 assert.match(entry,/onBootComplete/);assert.match(entry,/onPrepareLobby/);assert.match(entry,/onEntryComplete/);
 assert.doesNotMatch(entry,/from ['"]three|new Audio|\.play\(/);
});
test('loading and reduced-motion deadlines stay bounded',()=>{
 assert.equal(RIFT_TIMING.minimumLoad,700);assert.equal(RIFT_TIMING.maximumLoad,2500);assert.ok(RIFT_TIMING.reduced<=.15);
});
