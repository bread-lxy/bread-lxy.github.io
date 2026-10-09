import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {lifeScene,lifeJellyAtlas} from '../content/life-scene.ts';
import {homeScenes,albumTiming} from '../content/home-scenes.ts';
import {addLifeSettle,freezeLifeSnapshot,involvesLife,lifeMotionAllowed} from '../app/life-motion.ts';
import {sampleLifeSwim,sampleSwimPulse,swimFramePhases} from '../app/life-jelly-swim.ts';

test('life collage has six authored slots, three mobile compositions, independent assets',()=>{
  assert.equal(lifeScene.papers.length,6);
  assert.equal(lifeScene.papers.filter(p=>p.mobile).length,3);
  assert.equal(new Set(lifeScene.papers.map(p=>p.id)).size,6);
  for(const entry of [...lifeScene.papers,...lifeScene.marks,...lifeScene.jellyfish]) {
    assert.ok(existsSync(new URL('../public'+entry.src,import.meta.url)),entry.src);
    assert.ok(entry.desktop.width>0&&entry.desktop.width<30);
    assert.ok(Math.abs(entry.desktop.rotation)<=15);
  }
  assert.ok(existsSync(new URL('../public'+lifeScene.texture,import.meta.url)));
  assert.equal(lifeScene.jellyfish.filter(j=>j.mobile).length,1);
  assert.deepEqual(lifeScene.jellyfish.map(j=>j.layer),['back','front']);
  assert.equal(homeScenes.life.desktop.scale,.9);
  assert.equal(homeScenes.life.mobile.scale,.94);
});

test('paper settlement fits within existing gate and never overwrites base rotation',()=>{
  const calls=[];
  const timeline={fromTo(...args){calls.push(args);return this;}};
  const root={querySelectorAll(selector){return selector;}};
  addLifeSettle(timeline,root,albumTiming.preview);
  assert.equal(calls.length,3);
  for(const [target,from,to,offset] of calls){
    assert.ok(target.includes('.life-paper-reveal'));
    assert.ok(from.y>=8&&from.y<=16);
    assert.ok(Math.abs(from.rotation)<2);
    assert.ok(offset+to.duration<=.8);
    assert.equal(to.clearProps,'transform,opacity');
  }
});

test('only LIFE edges gain material blending; existing world identifiers untouched',()=>{
  const worlds=Object.keys(homeScenes);
  for(const from of worlds)for(const to of worlds)if(from!==to)
    assert.equal(involvesLife({from,to,direction:1}),from==='life'||to==='life');
  assert.equal(involvesLife(null),false);
});

test('continuous motion stops for content, reduced motion, offscreen or background',()=>{
  assert.equal(lifeMotionAllowed(true,false,true,false),true);
  for(const args of [[false,false,true,false],[true,true,true,false],[true,false,false,false],[true,false,true,true]])assert.equal(lifeMotionAllowed(...args),false);
});

test('outgoing snapshots freeze every animated wrapper at the painted pose',()=>{
  const original=globalThis.getComputedStyle;
  globalThis.getComputedStyle=node=>({getPropertyValue:property=>node[property]??'none'});
  const source={querySelectorAll:()=>[{transform:'matrix(1, 0, 0, 1, -180, -270)',opacity:'.72'}]};
  const values={};
  const node={style:{setProperty:(k,v)=>{values[k]=v;}}};
  const attrs={};
  const clone={querySelectorAll:()=>[node],querySelector:()=>({setAttribute:(k,v)=>{attrs[k]=v;}})};
  try{
    freezeLifeSnapshot(source,clone);
    assert.equal(values.transform,'matrix(1, 0, 0, 1, -180, -270)','current atlas cell transform is frozen too');
    assert.equal(values.opacity,'.72');
    assert.equal(node.style.animation,'none');
    assert.equal(attrs['data-motion'],'false');
  }finally{globalThis.getComputedStyle=original;}
});

test('decorative renderer has fallbacks and no navigation or character ownership',()=>{
  const source=readFileSync(new URL('../app/LifeScene.tsx',import.meta.url),'utf8');
  assert.match(source,/aria-hidden="true"/);
  assert.match(source,/onError=/);
  assert.match(source,/observer.disconnect\(\)/);
  assert.match(source,/context.revert\(\)/);
  assert.doesNotMatch(source,/onClick|<button|<a\s|HeroCharacter|pushState|localStorage/);
});

test('the same pulse couples all twelve poses to continuous positive propulsion',()=>{
  assert.equal(swimFramePhases.length,12);
  assert.deepEqual(swimFramePhases.map(p=>sampleSwimPulse(p*3+.00001,3).frame),Array.from({length:12},(_,i)=>i));
  assert.ok(sampleSwimPulse(.18*3,3).speed>sampleSwimPulse(.8*3,3).speed*3);
  for(const period of [3,3.4])for(const offset of [0,.58]){
    assert.ok(Math.abs(sampleSwimPulse(period,period,offset).distance-period)<1e-9);
    let last=sampleSwimPulse(0,period,offset);
    for(let t=.01;t<period*3;t+=.01){
      const pose=sampleSwimPulse(t,period,offset);
      assert.ok(pose.distance>last.distance,'never reverses or stops dead');
      const derivative=(sampleSwimPulse(t+.00001,period,offset).distance-pose.distance)/.00001;
      assert.ok(Math.abs(derivative-pose.speed)<.001,'translation and sprite use one clock');
      last=pose;
    }
  }
});

test('upward travel only wraps when both poses are completely outside the screen',()=>{
  for(const viewport of [{width:1440,height:900,mobile:false},{width:1024,height:900,mobile:false},{width:390,height:720,mobile:true}]){
    for(const jelly of lifeScene.jellyfish.filter(j=>!viewport.mobile||j.mobile)){
      let last=sampleLifeSwim(jelly,0,viewport),exits=0,entries=0;
      for(let t=.1;t<200;t+=.1){
        const pose=sampleLifeSwim(jelly,t,viewport);
        assert.ok(Object.values(pose).every(v=>typeof v!=='number'||Number.isFinite(v)));
        assert.ok(Math.abs(pose.angle)<8);
        if(pose.y>last.y+.01){
          assert.ok(last.y+last.height<0);
          assert.ok(pose.y>viewport.height);
          assert.ok(last.offscreen&&pose.offscreen,'never resets in view');entries++;
        }else if(!last.offscreen&&pose.offscreen)exits++;
        assert.ok(pose.x>=viewport.width*(viewport.mobile?.8:.3));
        assert.ok(pose.x+pose.width<=viewport.width);
        last=pose;
      }
      assert.ok(exits>=1&&entries>=1,'real departure and re-entry');
    }
  }
});

test('only the swim clock drives jelly motion; lifecycle has no restarting CSS pulse',()=>{
  const css=readFileSync(new URL('../app/life-scene.css',import.meta.url),'utf8');
  const source=readFileSync(new URL('../app/LifeScene.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(css,/life-flight|@keyframes life-jelly-pulse/);
  assert.match(source,/cancelAnimationFrame\(animationFrame\)/);
  assert.match(source,/resizeObserver.disconnect\(\)/);
  assert.match(source,/swimSeconds=useRef\(0\)/);
  assert.match(source,/dataset.sprite==='ready'/);
  assert.match(css,/data-reduced-motion=true\] \.life-jelly-fallback\{visibility:visible\}/);
});

test('replacement sprite is a real low-resolution, limited-palette PNG with hard alpha',()=>{
  const png=readFileSync(new URL('../public/life/jellyfish-pixel.png',import.meta.url));
  assert.equal(png.readUInt32BE(16),36);
  assert.equal(png.readUInt32BE(20),54);
  let paletteEntries=0,transparency=[];
  for(let offset=8;offset<png.length;){
    const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);
    if(type==='PLTE')paletteEntries=length/3;
    if(type==='tRNS')transparency=[...png.subarray(offset+8,offset+8+length)];
    offset+=12+length;
  }
  assert.ok(paletteEntries>0&&paletteEntries<=12);
  assert.ok(transparency.includes(0));
  assert.ok(transparency.every(alpha=>alpha===0||alpha===255));
});

test('swim atlas is a local, correctly sized twelve-frame pixel asset',()=>{
  const png=readFileSync(new URL('../public'+lifeJellyAtlas.src,import.meta.url));
  assert.equal(png.readUInt32BE(16),lifeJellyAtlas.width*lifeJellyAtlas.columns);
  assert.equal(png.readUInt32BE(20),lifeJellyAtlas.height*lifeJellyAtlas.rows);
  assert.equal(lifeJellyAtlas.columns*lifeJellyAtlas.rows,12);
});

test('all twelve poses share the anchor and palette, with restrained real bell contraction',async()=>{
  const {default:sharp}=await import('sharp');
  const {data}=await sharp(fileURLToPath(new URL('../public'+lifeJellyAtlas.src,import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const shapes=new Set(),widths=[],colors=new Set();
  for(let frame=0;frame<12;frame++){
    let left=36,right=0;const pixels=[],apex=[];
    for(let y=0;y<54;y++)for(let x=0;x<36;x++){
      const index=((Math.floor(frame/4)*54+y)*144+(frame%4)*36+x)*4;
      const rgba=[...data.subarray(index,index+4)];pixels.push(...rgba);
      assert.ok(rgba[3]===0||rgba[3]===255);
      if(!rgba[3])continue;
      colors.add(rgba.slice(0,3).join(','));
      assert.ok(x>0&&x<35&&y>0&&y<53,'no clipped ribbons');
      if(y===5)apex.push(x);
      if(y<21){left=Math.min(left,x);right=Math.max(right,x);}
    }
    assert.equal((apex[0]+apex.at(-1))/2,18);
    widths.push(right-left+1);shapes.add(Buffer.from(pixels).toString('base64'));
  }
  assert.equal(shapes.size,12);
  assert.deepEqual(widths,[23,21,19,19,21,22,23,23,23,23,23,23]);
  assert.equal(colors.size,3);
});
