import test from 'node:test';
import assert from 'node:assert/strict';
import { items, sections, itemById, homeConfig, filterPlayground, filterArt, safeContentUrl, findItem } from '../content/site.ts';
test('canonical content ids, slugs, section and relationships are valid',()=>{
  assert.deepEqual(sections.map(s=>s.id),['experience','research','projects','studio','life']);
  assert.equal(new Set(items.map(i=>i.id)).size,items.length);
  for(const item of items){
    assert.ok(sections.some(s=>s.id===item.primarySection));
    assert.equal(findItem(item.primarySection,item.slug),item);
    for(const id of item.relatedIds||[])assert.ok(itemById[id]);
  }
  assert.equal(items.filter(i=>i.id==='eval-studio').length,1);
  for(const id of [...homeConfig.featuredIds,...homeConfig.experienceIds])assert.ok(itemById[id]);
});
test('no internal links, telephone, fabricated studio works or stale school status',()=>{
  const source=JSON.stringify(items);
  assert.doesNotMatch(source,/sandaii\.cn|feishu\.cn|153[- ]?2182|本科至今|已公开上线/);
  assert.equal(items.filter(i=>i.primarySection==='studio'||i.primarySection==='life').length,0);
  assert.equal(itemById['housing-expectations'].role,'共同第一作者');
  assert.equal(itemById.director.status,'prototype');
  assert.equal(itemById.yama.status,'contribution');
});
const base={id:'fixture',slug:'fixture',primarySection:'studio',title:'Fixture',tags:[],year:'',eyebrow:'TEST',description:'Test fixture only',accent:'#fff'};
const records=[
 {...base,id:'fan',kind:'image',category:'fan-art',collection:'series',characterIds:['a']},
 {...base,id:'oc',kind:'image',category:'original',characterIds:['b']},
 {...base,id:'study',kind:'image',category:'study'},
 {...base,id:'movie',kind:'video',source:'local',collection:'play',characterIds:['a']},
 {...base,id:'external',kind:'video',source:'external',href:'https://example.com/watch'},
];
test('illustration, video, original collection and character filters work with real fixtures',()=>{
  assert.equal(filterArt(records,'all').length,5);
  assert.equal(filterArt(records,'motion').length,2);
  assert.equal(filterArt(records,'fan-art','series').length,1);
  assert.equal(filterArt(records,'fan-art','missing').length,0);
  assert.equal(filterArt(records,'play','all','a').length,1);
  assert.equal(filterArt(records,'original')[0].id,'oc');
  assert.equal(filterPlayground(records,'a').length,2);
  assert.equal(filterPlayground(records,'missing').length,0);
});
test('media URLs support local/external media and reject executable or credential links',()=>{
  assert.equal(safeContentUrl('/media/mv.mp4'),'/media/mv.mp4');
  assert.equal(safeContentUrl('https://example.com/video'),'https://example.com/video');
  for(const value of ['javascript:alert(1)','data:text/html,test','//example.com/','/\\\\example.com','https://name:secret@example.com','#studio',''])assert.equal(safeContentUrl(value),undefined);
});
