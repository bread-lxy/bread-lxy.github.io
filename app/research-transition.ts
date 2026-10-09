import type gsap from 'gsap';
import type { SceneTransitionContext } from './experience-transition';

export const involvesResearch=(transition:SceneTransitionContext|null)=>
  !!transition&&(transition.from==='research'||transition.to==='research');

/** Research's physical records land behind the independent character and UI.
 * Set their starting state at time zero: a delayed fromTo otherwise risks one
 * painted frame of stationary papers before the opaque cover has arrived. */
export function addResearchPaperDrop(
  timeline:gsap.core.Timeline,
  frame:HTMLElement,
  start=0,
  duration=.42,
  stagger=.04,
){
  const papers=Array.from(frame.querySelectorAll<HTMLElement>('[data-research-drop]'))
    .sort((a,b)=>Number(a.dataset.dropOrder)-Number(b.dataset.dropOrder));
  const distances=[-170,-125,-230,-190];
  papers.forEach((paper,index)=>{
    timeline.set(paper,{y:distances[index]??-160,opacity:0},0)
      .to(paper,{y:0,opacity:1,duration,ease:'back.out(1.14)',clearProps:'transform,opacity,visibility'},start+index*stagger);
  });
  return papers.length;
}

type ResearchSwitchNodes={
  oldFrame:HTMLElement;
  newFrame:HTMLElement;
  cover:HTMLElement;
  backdrop:HTMLElement;
  fromInk:string;
  toInk:string;
  enteringResearch:boolean;
  leavingExperience:boolean;
  enteringExperience:boolean;
  oldWindows:HTMLElement|null;
  newWindows:HTMLElement|null;
  wallpaper:HTMLElement|null;
  aquaticForeground:HTMLElement|null;
};

/** Adapted from Codrops Interlude's Stack transition (MIT):
 * https://github.com/codrops/interlude/blob/main/src/transitions/stack.ts
 * The old scene steps back and darkens, a solid sheet covers the swap, and the
 * sheet fades to reveal the new scene. We keep this below the original wordmark,
 * character and dialogue; unlike Interlude, no Astro router is involved.
 */
export function addResearchSceneSwitch(
  timeline:gsap.core.Timeline,
  nodes:ResearchSwitchNodes,
  duration=.95,
){
  const {
    oldFrame,newFrame,cover,backdrop,fromInk,toInk,
    enteringResearch,leavingExperience,enteringExperience,
    oldWindows,newWindows,wallpaper,aquaticForeground,
  }=nodes;
  const swapAt=.4;
  const sheetFade=.21;
  const dim=document.createElement('div');
  dim.setAttribute('aria-hidden','true');
  Object.assign(dim.style,{
    position:'absolute',inset:'0',zIndex:'10',backgroundColor:'#05090b',
    opacity:'0',pointerEvents:'none',
  });
  oldFrame.appendChild(dim);

  timeline.set(backdrop,{backgroundColor:fromInk},0)
    .set(oldFrame,{autoAlpha:1,zIndex:3,backgroundColor:fromInk,transformOrigin:'50% 45%'},0)
    .set(newFrame,{autoAlpha:0,zIndex:2},0)
    .set(cover,{autoAlpha:1,opacity:1,yPercent:100,backgroundColor:'#eceadc'},0)
    .to(oldFrame,{scale:.9,duration:swapAt,ease:'expo.inOut'},0)
    .to(dim,{opacity:.5,duration:swapAt,ease:'expo.inOut'},0)
    .to(cover,{yPercent:0,duration:swapAt-.02,ease:'expo.inOut'},.02);

  // Experience's windows and aquatic layer live above the scene stack (z=3),
  // outside the copied frame. Retract them before the sheet uncovers anything.
  if(leavingExperience){
    if(oldWindows)timeline.to(oldWindows,{y:-48,opacity:0,duration:.28,ease:'power2.in'},.02);
    if(wallpaper)timeline.to(wallpaper,{opacity:0,duration:.3,ease:'power2.in'},.05);
    if(aquaticForeground)timeline.to(aquaticForeground,{opacity:0,duration:.25,ease:'power2.in'},.02);
  }
  if(enteringExperience){
    if(newWindows)timeline.set(newWindows,{opacity:0,y:36},0);
    if(wallpaper)timeline.set(wallpaper,{opacity:0},0);
    if(aquaticForeground)timeline.set(aquaticForeground,{opacity:0},0);
  }

  // This is the sole swap point: the outgoing clone is no longer painted by
  // the time any new-scene material can appear. Never crossfade both frames.
  timeline.set(oldFrame,{autoAlpha:0},swapAt)
    .set(backdrop,{backgroundColor:toInk},swapAt)
    .set(newFrame,{autoAlpha:1},swapAt)
    .to(cover,{opacity:0,duration:sheetFade,ease:'power2.out'},swapAt);

  if(enteringResearch)addResearchPaperDrop(timeline,newFrame,swapAt+.01);
  if(enteringExperience){
    if(wallpaper)timeline.to(wallpaper,{opacity:1,duration:.28,ease:'power2.out'},swapAt+.2);
    if(newWindows)timeline.to(newWindows,{y:0,opacity:1,duration:.3,ease:'power3.out'},swapAt+.21);
    if(aquaticForeground)timeline.to(aquaticForeground,{opacity:1,duration:.25,ease:'power2.out'},swapAt+.3);
  }

  timeline.set(cover,{clearProps:'transform,opacity,visibility,backgroundColor'},duration)
    .set(oldFrame,{clearProps:'transform,opacity,visibility,zIndex,backgroundColor,transformOrigin'},duration)
    .set(newFrame,{clearProps:'opacity,visibility,zIndex'},duration)
    .set(backdrop,{clearProps:'backgroundColor'},duration);
  if(oldWindows)timeline.set(oldWindows,{clearProps:'transform,opacity,visibility'},duration);
  if(newWindows)timeline.set(newWindows,{clearProps:'transform,opacity,visibility'},duration);
  if(wallpaper)timeline.set(wallpaper,{clearProps:'opacity,visibility'},duration);
  if(aquaticForeground)timeline.set(aquaticForeground,{clearProps:'opacity,visibility'},duration);
}
