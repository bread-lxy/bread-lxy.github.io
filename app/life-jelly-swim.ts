import {lifeJellyAtlas,type LifeJellyfish} from '../content/life-scene.ts';

// One phase drives both the pixel pose and propulsion. These are art-directed
// timings, not species-specific hydrodynamics. Recovery retains forward thrust.
export const swimFramePhases = [0,.065,.145,.2,.275,.365,.465,.565,.65,.745,.84,.93] as const;
const speedKnots = [[0,.35],[.065,1.1],[.18,2.7],[.3,1.6],[.65,.6],[1,.35]] as const;
const speedArea = speedKnots.slice(1).reduce((area,[x,y],i)=>{
  const [a,b]=speedKnots[i];return area+(x-a)*(y+b)/2;
},0);
const modulo=(value:number,range:number)=>((value%range)+range)%range;

/** Exact integral of the positive, piecewise-linear speed envelope. */
function integratedPulse(cycles:number) {
  const whole=Math.floor(cycles),phase=cycles-whole;
  let area=0;
  for(let i=1;i<speedKnots.length;i++){
    const [a,b]=speedKnots[i-1],[x,y]=speedKnots[i];
    const length=Math.max(0,Math.min(phase,x)-a);
    area+=b*length+(y-b)*length*length/(2*(x-a));
  }
  return whole+area/speedArea;
}

export function sampleSwimPulse(seconds:number,period:number,offset=0) {
  const cycles=Math.max(0,seconds)/period+offset,phase=modulo(cycles,1);
  let frame=0;
  for(let i=1;i<swimFramePhases.length;i++)if(phase>=swimFramePhases[i])frame=i;
  const knot=speedKnots.findIndex(([x])=>x>phase);
  const [a,b]=speedKnots[knot-1],[x,y]=speedKnots[knot];
  return {phase,frame,speed:(b+(y-b)*(phase-a)/(x-a))/speedArea,
    distance:(integratedPulse(cycles)-integratedPulse(offset))*period};
}

export type LifeSwimViewport = {width:number;height:number;mobile:boolean};
export type LifeSwimPose = {x:number;y:number;width:number;height:number;angle:number;frame:number;phase:number;progress:number;offscreen:boolean};

export function sampleLifeSwim(jelly:LifeJellyfish,seconds:number,viewport:LifeSwimViewport):LifeSwimPose {
  const {width:vw,height:vh,mobile}=viewport;
  const placement=(mobile&&jelly.mobile)||jelly.desktop;
  const width=mobile?vw*placement.width/100:Math.max(42,Math.min(122,vw*placement.width/100));
  const height=width*lifeJellyAtlas.height/lifeJellyAtlas.width;
  const start=vh+height*.3,end=-height*1.4,span=start-end;
  const initialY=mobile?placement.y*7.1:vh*placement.y/100;
  const pulse=sampleSwimPulse(seconds,jelly.swim.period,jelly.swim.phase);
  const cycle=modulo((start-initialY)/span+pulse.distance/jelly.swim.crossing,1+jelly.swim.rest/jelly.swim.crossing);
  const progress=Math.min(1,cycle);
  const [from,to]=(mobile&&jelly.swim.mobileCorridor)||jelly.swim.corridor;
  // A gentle diagonal, not a sine-wave patrol. Direction always follows ascent.
  const dx=(to-from)*vw/100;
  const x=(from+(to-from)*progress)*vw/100-width/2;
  const y=start-progress*span;
  const angle=Math.atan2(dx,span)*180/Math.PI;
  return {x,y,width,height,angle,frame:pulse.frame,phase:pulse.phase,progress,
    offscreen:y>vh+height*.1||y+height*1.2<0};
}

/** DOM-only projection, also used by the dev motion study. No React frame renders. */
export function paintLifeSwim(node:HTMLElement,pose:LifeSwimPose) {
  const drift=node.querySelector<HTMLElement>('.life-jelly-drift');
  const heading=node.querySelector<HTMLElement>('.life-jelly-heading');
  const sprite=node.querySelector<HTMLElement>('.life-jelly-sprite');
  if(!drift||!heading||!sprite)return;
  drift.style.transform=`translate(${pose.x.toFixed(3)}px,${pose.y.toFixed(3)}px)`;
  heading.style.width=`${pose.width}px`;
  heading.style.transform=`rotate(${pose.angle.toFixed(3)}deg)`;
  const col=pose.frame%lifeJellyAtlas.columns,row=Math.floor(pose.frame/lifeJellyAtlas.columns);
  sprite.style.transform=`translate(${-col*100/lifeJellyAtlas.columns}%,${-row*100/lifeJellyAtlas.rows}%)`;
  node.dataset.swimFrame=String(pose.frame);
}
