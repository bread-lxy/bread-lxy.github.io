import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {blendPosterHandoff,POSTER_HANDOFF_MS} from '../app/character/poster-handoff.ts';
import {palettePixels,AWAKENING_PALETTE,BAYER4,characterLayout,revealOrder,awakeningBeat,AWAKENING_DURATION} from '../app/awakening-palette.ts';

test('palette adapter preserves every alpha and never creates a fifth color',()=>{
 const pixels=new Uint8ClampedArray([210,130,70,0,55,25,95,12,255,220,250,255,60,200,180,128]);
 for(const mode of ['two','four']){
  const result=palettePixels(pixels,2,mode);
  for(let i=0;i<result.length;i+=4){
   assert.equal(result[i+3],pixels[i+3]);
   assert.ok(AWAKENING_PALETTE.some(c=>c.every((v,j)=>v===result[i+j])));
   if(mode==='two')assert.ok(result[i]===AWAKENING_PALETTE[0][0]||result[i]===AWAKENING_PALETTE[3][0]);
  }
 }
});
test('fixed Bayer pattern and ordered reveal are deterministic and bounded',()=>{
 assert.equal(new Set(BAYER4).size,16);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const order=revealOrder(x,y,256);assert.ok(order>=0&&order<=1);assert.equal(order,revealOrder(x,y,256));
 }
 assert.ok(revealOrder(128,48,256)<revealOrder(128,220,256));
});
for(const [width,height] of [[1440,900],[1024,768],[390,844],[390,667]])test(`one fixed character anchor ${width}x${height}`,()=>{
 const g=characterLayout(width,height),faceX=g.x+g.size*.4875,faceY=g.y+g.size*.1853;
 assert.ok(faceX>=width*.49&&faceX<=width*.67);assert.ok(faceY>height*.28&&faceY<=height*.31);
 assert.ok(g.y>=0);assert.ok(g.size/256<6);
});
test('click sequence stays within the approved duration',()=>{
 assert.equal(AWAKENING_DURATION,1200);
 assert.deepEqual([0,160,350,660,900,1100].map(awakeningBeat),['press','black','two','four','color','land']);
});
test('poster handoff starts at source pose and leaves accepted idle untouched',()=>{
 const idle={mouthOpen:0,mouthForm:0,angleZ:-.12,eyeOpenL:1,eyeOpenR:1,breath:.8,armL:.2,talk:false};
 const first=blendPosterHandoff(idle,0),mid=blendPosterHandoff(idle,POSTER_HANDOFF_MS/2);
 assert.equal(first.mouthOpen,1);assert.equal(first.angleZ,0);assert.equal(first.breath,0);
 assert.equal(mid.mouthOpen,.5);assert.equal(mid.angleZ,-.06);assert.equal(mid.armL,idle.armL);
 assert.equal(blendPosterHandoff(idle,POSTER_HANDOFF_MS),idle);
 assert.equal(idle.mouthOpen,0);assert.equal(blendPosterHandoff(idle,-100).mouthOpen,1);
});
test('approved opening integrates without the rejected doorway or QA frame controls',async()=>{
 const root=await readFile(new URL('../app/PersonalArchive.tsx',import.meta.url),'utf8');
 assert.match(root,/<CharacterAwakeningOpening/);
 assert.doesNotMatch(root,/RpgBootScreen|inspectAt=/);
 assert.match(root,/measureCharacter=\{measureOpeningCharacter\}/);
 assert.match(root,/entranceReady=\{entryPhase==="lobby"\}/);
 const component=await readFile(new URL('../app/CharacterAwakeningOpening.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(component,/new Audio|\.play\(/);assert.match(component,/context\.revert\(\)/);
 assert.match(component,/duration:\.12/);
});
