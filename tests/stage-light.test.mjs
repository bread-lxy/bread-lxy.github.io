import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  createStageLightLoop, stageLightSize, STAGE_LIGHT_MAX_PIXELS,
  SIDE_RAYS_FRAGMENT,
} from '../app/stage-light-runtime.ts';

const running = {active:true, paused:false, reducedMotion:false, visible:true, hidden:false, ready:true};
function harness(flags = {}, fail = false) {
  let now = 0, nextId = 0;
  const queue = new Map(), draws = [], states = [];
  const loop = createStageLightLoop({
    now:()=>now,
    requestFrame:callback=>{const id=++nextId;queue.set(id,callback);return id;},
    cancelFrame:id=>queue.delete(id),
    draw:seconds=>{if(fail)throw new Error('lost context');draws.push(seconds);},
    onState:state=>states.push(state),
  }, {...running,...flags});
  const tick = time=>{now=time;const pending=[...queue.values()];queue.clear();pending.forEach(callback=>callback(time));};
  return {loop,queue,draws,states,tick};
}

test('stage light preserves the pinned SideRays fragment shader byte-for-byte',()=>{
  assert.equal(createHash('sha256').update(SIDE_RAYS_FRAGMENT).digest('hex'),
    '3723fa091ece288e8f9c51d6330008fd5e1758c7c7db0a93f986ed7f7e8db153');
});

test('stage light renders 30 frames in one second on 60, 120 and 144 Hz displays',()=>{
  for(const refresh of [60,120,144]){
    const h=harness();
    for(let frame=1;frame<=refresh;frame++)h.tick(frame*1000/refresh);
    assert.equal(h.draws.length,30,`${refresh}Hz`);
    assert.ok(Math.abs(h.draws.at(-1)-1)<.001);
    assert.equal(h.queue.size,1);
    h.loop.dispose();
    assert.equal(h.queue.size,0);
  }
});

test('pause, inactive, offscreen and hidden gates cancel RAF without losing elapsed time',()=>{
  for(const [key,value,state] of [['paused',true,'paused'],['active',false,'inactive'],['visible',false,'offscreen'],['hidden',true,'hidden']]){
    const h=harness();h.tick(34);const before=h.draws.at(-1);
    h.loop.update({[key]:value});
    assert.equal(h.loop.snapshot().state,state);
    assert.equal(h.queue.size,0);
    h.tick(60000);assert.equal(h.draws.length,1);
    h.loop.update({[key]:running[key]});h.tick(60034);
    assert.ok(h.draws.at(-1)-before>0&&h.draws.at(-1)-before<.05);
    h.loop.dispose();
  }
});

test('reduced motion draws one static frame and only repaints when invalidated',()=>{
  const h=harness({reducedMotion:true});
  assert.deepEqual(h.draws,[0]);assert.equal(h.queue.size,0);
  h.loop.update({reducedMotion:true});h.tick(1000);
  assert.deepEqual(h.draws,[0]);
  h.loop.invalidate();assert.deepEqual(h.draws,[0,0]);
  assert.equal(h.loop.snapshot().state,'static');
  h.loop.update({hidden:true});h.loop.invalidate();
  assert.deepEqual(h.draws,[0,0]);assert.equal(h.queue.size,0);
  h.loop.update({hidden:false});assert.deepEqual(h.draws,[0,0,0]);
  h.loop.dispose();
});

test('reduced motion remains a one-frame static fallback when global motion is also paused',()=>{
  const h=harness({reducedMotion:true,paused:true});
  assert.equal(h.loop.snapshot().state,'static');
  assert.deepEqual(h.draws,[0]);assert.equal(h.queue.size,0);
  h.loop.update({paused:false});assert.deepEqual(h.draws,[0]);
  h.loop.dispose();
});

test('unready light has no loop, updating unchanged flags does not restart the clock',()=>{
  const h=harness({ready:false});
  assert.equal(h.loop.snapshot().state,'loading');assert.equal(h.queue.size,0);
  h.loop.update({ready:true});h.tick(20);
  h.loop.update({active:true});h.tick(34);
  assert.equal(h.draws.length,1);assert.equal(h.queue.size,1);
  h.loop.dispose();
});

test('draw failure becomes terminal fallback and disposed callbacks cannot render',()=>{
  const h=harness({},true);h.tick(34);
  assert.equal(h.loop.snapshot().state,'fallback');assert.equal(h.queue.size,0);
  h.loop.update({paused:true});h.loop.update({paused:false});h.loop.invalidate();
  assert.equal(h.queue.size,0);assert.equal(h.loop.snapshot().state,'fallback');
  const other=harness(),stale=[...other.queue.values()][0];
  other.loop.dispose();stale(40);other.loop.update({active:true});
  assert.equal(other.draws.length,0);assert.equal(other.queue.size,0);
  assert.equal(other.loop.snapshot().state,'disposed');
});

test('light DPR never exceeds 1 and large screens respect the fragment pixel budget',()=>{
  for(const [w,h,dpr] of [[1440,900,2],[390,844,3],[3840,2160,2],[1024,768,.8],[0,0,NaN]]){
    const size=stageLightSize(w,h,dpr);
    assert.ok(size.dpr>0&&size.dpr<=1);
    assert.ok(size.pixelWidth*size.pixelHeight<=STAGE_LIGHT_MAX_PIXELS);
    assert.ok(Number.isFinite(size.pixelWidth)&&size.pixelWidth>=1);
    assert.ok(Number.isFinite(size.pixelHeight)&&size.pixelHeight>=1);
  }
  assert.equal(stageLightSize(1440,900,2).dpr,1);
  assert.equal(stageLightSize(390,844,3).pixelWidth,390);
});

test('the stage host owns only its canvas and provides cancellation, sizing and attribution',()=>{
  const source=readFileSync(new URL('../app/ExperienceStageLight.tsx',import.meta.url),'utf8');
  assert.match(source,/ResizeObserver/);assert.match(source,/IntersectionObserver/);
  assert.match(source,/visibilitychange/);assert.match(source,/webglcontextlost/);
  assert.match(source,/import\('ogl'\)/);assert.match(source,/disposed/);
  assert.match(source,/data-stage-light-state/);assert.match(source,/data-stage-light-frames/);
  assert.match(source,/ReactBits-LICENSE\.md/);
  assert.doesNotMatch(source,/innerHTML|replaceChildren|firstChild|querySelectorAll|toDataURL|drawImage/);
  assert.equal((source.match(/new Renderer\(/g)||[]).length,1);
});
