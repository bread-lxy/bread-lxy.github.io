import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {visibleBgmTracks} from '../content/bgm.ts';
import {validBgmAnalysis, sampleBgmBand} from '../app/bgm-analysis.ts';
import {BgmPlayback} from '../app/bgm-playback.ts';

const load = track => JSON.parse(readFileSync(`public${track.analysis.src}`,'utf8'));
test('both recordings have matching, finite five-band envelopes and distinct measured dynamics', () => {
  for(const track of visibleBgmTracks) {
    const data = load(track);
    assert.ok(validBgmAnalysis(data,track));
    assert.equal(data.audioSha256,createHash('sha256').update(readFileSync(`public${track.asset.src}`)).digest('hex'));
    assert.ok(data.duration>100);
    assert.ok(data.values.every(band=>new Set(band).size>50));
    assert.notDeepEqual(data.values[0],data.values[4]);
    for(let band=0;band<5;band++) for(const t of [0, 10.5,25,100,data.duration-.02]) {
      const sample = sampleBgmBand(data,band,t); assert.ok(sample>=0&&sample<=1);
    }
  }
});
test('missing, stale and malformed analysis is rejected without touching audio', () => {
  const track=visibleBgmTracks[0],data=load(track);
  for(const value of [null,{}, {...data,version:2},{...data,audioSha256:'bad'},{...data,trackId:'other'},{...data,fps:0},{...data,duration:NaN},{...data,values:[[NaN]]},{...data,values:data.values.slice(1)},{...data,bands:[[0,Infinity]]}]) assert.equal(validBgmAnalysis(value,track),false);
  assert.equal(validBgmAnalysis(data,{...track,analysis:undefined}),false);
  assert.equal(validBgmAnalysis(data,{...track,asset:{...track.asset,sha256:'a'.repeat(64)}}),false);
});
test('sampling interpolates real data and never loops or invents silence', () => {
  const data={fps:30,duration:2/30,values:[[0,255],[0,0]]};
  assert.equal(sampleBgmBand(data,0,1/60),.5);
  for(const seconds of [-1,NaN,Infinity,2/30,999]) assert.equal(sampleBgmBand(data,0,seconds),0);
  assert.equal(sampleBgmBand(data,1,1/60),0);
  assert.equal(sampleBgmBand(data,7,0),0);
});
test('visual frame reads live playhead without React/store notifications or a playback mutation', async () => {
  let position=12,notifications=0,reads=0,options;
  const sound={load(){},play(){return 23;},pause(){},unload(){},duration(){return 214;},volume(){},once(){},seek(...args){assert.deepEqual(args,[23]);reads++;return position;}};
  const engine=new BgmPlayback(visibleBgmTracks,()=>true,async()=>value=>{options=value;return sound;});
  engine.subscribe(()=>notifications++);
  await engine.play(); options.onplay(23);
  const count=notifications;
  assert.equal(engine.readVisualFrame().position,12);
  position=72.5;assert.equal(engine.readVisualFrame().position,72.5);
  assert.equal(engine.getSnapshot().position,0);
  assert.equal(notifications,count);assert.equal(reads,2);
  engine.dispose();
});
