import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {items,sections,itemById,findItem} from '../content/site.ts';
import {albumTiming} from '../content/home-scenes.ts';
import {addResearchPaperDrop,addResearchSceneSwitch,involvesResearch} from '../app/research-transition.ts';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const ids=['housing-expectations','worldquant','tennis','pricing'];

test('the cover retains four real research records and journal-level metadata',()=>{
  assert.deepEqual(items.filter(item=>item.primarySection==='research').map(item=>item.id),ids);
  for(const id of ids)assert.equal(findItem('research',itemById[id].slug),itemById[id]);
  assert.equal(sections.find(section=>section.id==='research')?.previewId,'housing-expectations');
  assert.equal(sections.find(section=>section.id==='research')?.previewDetail,'Cities · SSCI · JCR Q1');
  assert.equal(itemById['housing-expectations'].role,'共同第一作者');
  assert.equal(itemById['housing-expectations'].href,'https://doi.org/10.1016/j.cities.2026.106853');
  assert.equal(albumTiming.researchPreview,.95);
});

test('the non-interactive dossier leads with subjects, then evidence and journal qualifier',()=>{
  const cover=read('app/ResearchDossierScene.tsx');
  const scene=read('app/AlbumScene.tsx');
  const home=read('app/PersonalArchive.tsx');
  assert.match(scene,/world==='research'&&<ResearchDossierScene\/>/);
  assert.match(cover,/className="research-dossier" aria-hidden="true"/);
  assert.equal((cover.match(/data-research-drop data-drop-order=/g)||[]).length,4);
  for(const [order,id] of ['cities','worldquant','tennis','pricing'].entries())
    assert.match(cover,new RegExp(`data-drop-order="${order}" data-record="${id}"`));
  for(const cue of ['住房价格预期中的','赌徒谬误','房价上涨','看涨预期','WorldQuant','因子研究','网球动量预测','商超采购与定价','3,000+','金奖','Binary Swing','AUC 0.90','32 SKU','Apriori → TOPSIS','SSCI','JCR Q1','2025 JCR','共同第一作者'])
    assert.ok(cover.includes(cue),cue);
  assert.match(cover,/<i>Cities<\/i> 期刊收录与分区 · 2025 JCR 数据/);
  assert.match(cover,/research-housing\.webp/);
  assert.match(home,/ResearchDossierContinuation/);
  assert.doesNotMatch(cover,/<(?:button|a|video)\b|onClick=|tabIndex=/);
  assert.doesNotMatch(cover,/SCP|CLASSIFIED|CONFIDENTIAL|SECRET/);
});

test('falling records begin hidden above the stage and settle by the preview deadline',()=>{
  const papers=[3,1,0,2].map(order=>({dataset:{dropOrder:String(order)}}));
  const calls=[];
  const timeline={set(...args){calls.push(['set',...args]);return this;},to(...args){calls.push(['to',...args]);return this;}};
  const frame={querySelectorAll:()=>papers};
  assert.equal(addResearchPaperDrop(timeline,frame,.41),4);
  const sets=calls.filter(call=>call[0]==='set');
  const landings=calls.filter(call=>call[0]==='to');
  assert.deepEqual(sets.map(call=>Number(call[1].dataset.dropOrder)),[0,1,2,3]);
  assert.deepEqual(sets.map(call=>call[2].y),[-170,-125,-230,-190]);
  assert.ok(sets.every(call=>call[2].opacity===0&&call[3]===0));
  assert.ok(landings.every(call=>call[2].y===0&&call[2].opacity===1&&call[2].duration===.42));
  for(let index=0;index<landings.length;index++)assert.ok(Math.abs(landings[index][3]-(.41+index*.04))<1e-9);
  assert.ok(landings.at(-1)[3]+landings.at(-1)[2].duration<=albumTiming.researchPreview);
});

test('research is the only route through the opaque stack transition',()=>{
  assert.equal(involvesResearch(null),false);
  assert.equal(involvesResearch({from:'life',to:'studio'}),false);
  assert.equal(involvesResearch({from:'research',to:'life'}),true);
  assert.equal(involvesResearch({from:'projects',to:'research'}),true);

  const calls=[];
  const timeline={set(...args){calls.push(['set',...args]);return this;},to(...args){calls.push(['to',...args]);return this;}};
  const oldFrame={appendChild(){}};
  const newFrame={querySelectorAll:()=>[0,1,2,3].map(order=>({dataset:{dropOrder:String(order)}}))};
  const cover={},backdrop={};
  const previousDocument=globalThis.document;
  globalThis.document={createElement:()=>({style:{},setAttribute(){}})};
  try{
    addResearchSceneSwitch(timeline,{oldFrame,newFrame,cover,backdrop,fromInk:'#111',toInk:'#222',enteringResearch:true,leavingExperience:false,enteringExperience:false,oldWindows:null,newWindows:null,wallpaper:null,aquaticForeground:null},albumTiming.researchPreview);
  }finally{globalThis.document=previousDocument;}
  const hiddenOld=calls.find(call=>call[0]==='set'&&call[1]===oldFrame&&call[2].autoAlpha===0);
  const revealedNew=calls.find(call=>call[0]==='set'&&call[1]===newFrame&&call[2].autoAlpha===1);
  const covered=calls.find(call=>call[0]==='to'&&call[1]===cover&&call[2].yPercent===0);
  assert.equal(hiddenOld?.[3],.4);
  assert.equal(revealedNew?.[3],.4);
  assert.ok(covered&&covered[3]+covered[2].duration<=.4);
  assert.ok(calls.some(call=>call[0]==='to'&&call[1]===oldFrame&&call[2].scale===.9));
  assert.equal(calls.filter(call=>call[0]==='to'&&call[1]?.dataset?.dropOrder!==undefined).length,4);
  assert.ok(!calls.some(call=>call[0]==='to'&&call[1]===newFrame&&call[2].opacity<1));
});
