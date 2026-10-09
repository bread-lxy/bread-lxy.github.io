import type gsap from 'gsap';
import type { SceneTransitionContext } from './experience-transition';

export const involvesStudio=(transition:SceneTransitionContext|null)=>
  !!transition&&(transition.from==='studio'||transition.to==='studio');

/** Keep the world stationary while authored CRT surfaces enter or leave separately. */
export function addStudioSceneSwitch(
  timeline:gsap.core.Timeline,
  oldFrame:HTMLElement,
  newFrame:HTMLElement,
  enteringStudio:boolean,
  duration:number,
){
  const oldScene=oldFrame.firstElementChild as HTMLElement|null;
  const newScene=newFrame.firstElementChild as HTMLElement|null;
  const tvScene=(enteringStudio?newScene:oldScene);
  const drops=Array.from(tvScene?.querySelectorAll<HTMLElement>('[data-studio-tv-drop]')??[])
    .sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
  timeline.set(newFrame,{zIndex:2,backgroundColor:'transparent',autoAlpha:1},0);
  if(enteringStudio){
    timeline.set(oldFrame,{zIndex:1},0)
      .to(oldFrame,{opacity:0,duration:.34,ease:'power1.inOut'},0);
    const ground=newScene?.querySelector('.studio-lobby-ground');
    const cables=newScene?.querySelector('.studio-lobby-cables');
    if(ground)timeline.fromTo(ground,{opacity:0},{opacity:1,duration:.34,ease:'power1.out',clearProps:'opacity'},0);
    if(cables)timeline.fromTo(cables,{opacity:0},{opacity:1,duration:.48,ease:'power1.out',clearProps:'opacity'},.05);
    drops.forEach((drop,index)=>timeline.fromTo(drop,
      {y:-Math.min(185,95+index*13),opacity:.04},
      {y:0,opacity:1,duration:.52,ease:'back.out(1.18)',clearProps:'transform,opacity,visibility'},index*.053));
  }else{
    timeline.set(oldFrame,{zIndex:3},0);
    if(newScene)timeline.fromTo(newScene,{opacity:0},{opacity:1,duration:.53,ease:'power1.out',clearProps:'opacity'},.08);
    const scenery=newScene?.querySelectorAll('.scene-panel');
    if(scenery?.length)timeline.fromTo(scenery,{y:24,opacity:.6},{y:0,opacity:1,duration:.55,stagger:.055,ease:'power3.out',clearProps:'transform,opacity'},.13);
    const base=oldScene?.querySelectorAll('.studio-lobby-ground,.studio-lobby-cables');
    if(base?.length)timeline.to(base,{opacity:0,duration:.42,ease:'power1.inOut'},0);
    drops.reverse().forEach((drop,index)=>timeline.to(drop,
      {y:-Math.min(180,90+index*12),opacity:0,duration:.39,ease:'power2.in'},index*.046));
  }
  timeline.set(newFrame,{clearProps:'backgroundColor,zIndex,opacity,visibility'},duration);
  timeline.set(oldFrame,{clearProps:'zIndex,opacity,visibility'},duration);
}
