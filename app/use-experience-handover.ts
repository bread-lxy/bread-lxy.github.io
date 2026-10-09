"use client";
import {useLayoutEffect,type RefObject} from 'react';
import {handoverAt,type WordmarkLayout} from './wordmark-handover-geometry';

const syncEvent='portfolio:sync-wordmark';
export const wordmarkLayoutEvent='portfolio:wordmark-layout';
export function syncExperienceHandover(){window.dispatchEvent(new Event(syncEvent));}

/** DECO27's matching hero/teaser wordmarks: two complementary clipped surfaces.
 * Native scroll replaces its threshold tween. Only our own OFL wordmark is used.
 * Source map: docs/research/deco27-wordmark-handover.md. */
export function useExperienceHandover(root:RefObject<HTMLElement|null>,reduced:boolean,ready:boolean,world:string){
 useLayoutEffect(()=>{
  const node=root.current;if(!node||!ready)return;
  const home=node.querySelector<HTMLElement>('.home-surface');
  const stage=node.querySelector<HTMLElement>('.album-stage');
  const source=node.querySelector<HTMLElement>('[data-wordmark-source]');
  const dialogue=node.querySelector<HTMLElement>('.rpg-dialogue-stage');
  const masthead=node.querySelector<HTMLElement>('.publication-masthead');
  const target=node.querySelector<HTMLElement>('[data-wordmark-target]');
  if(!home||!stage||!source||!masthead||!target)return;
  let layout:WordmarkLayout|null=null,frame=0,measureFrame=0,disposed=false,layoutKey='';
  const paint=()=>{
   if(!layout||disposed)return;
   const {progress,source:from,target:to}=handoverAt(layout,scrollY);
   const transform=(v:typeof from)=>`translate(${v.x}px,${v.y}px) scale(${v.scaleX},${v.scaleY})`;
   source.style.transform=reduced?'':transform(from);
   target.style.transform=reduced?'':transform(to);
   source.style.setProperty('--wordmark-landing',String(reduced?0:progress));
   home.dataset.wordmarkProgress=(reduced?1:progress).toFixed(4);
   masthead.dataset.wordmarkState=reduced||progress===1?'landed':progress===0?'start':'moving';
  };
  const measure=()=>{
   measureFrame=0;if(disposed)return;
   // Natural offsets ignore entrance/handover translation; no visible reset.
   const stageBox=stage.getBoundingClientRect(),mastheadBox=masthead.getBoundingClientRect();
   // Retain the last visible dialogue height during content mode (display:none).
   // On return we measure again, including text zoom and wrapping.
   if(dialogue&&dialogue.offsetHeight>0)stage.style.setProperty('--wordmark-dialogue-height',`${dialogue.offsetHeight}px`);
   const natural=(el:HTMLElement,parent:DOMRect)=>{
    const style=getComputedStyle(el);
    return {left:parent.left+el.offsetLeft,top:parent.top+scrollY+el.offsetTop,width:parseFloat(style.width)||el.offsetWidth,height:parseFloat(style.height)||el.offsetHeight};
   };
   const targetRect=natural(target,mastheadBox);
   // Mobile uses the same two-line font layout in both surfaces: preserve its
   // aspect ratio so scaled letter baselines, not just outer boxes, align.
   if(matchMedia('(max-width:700px)').matches)source.style.height=`${natural(source,stageBox).width*targetRect.height/Math.max(1,targetRect.width)}px`;
   else source.style.removeProperty('height');
   layout={source:natural(source,stageBox),target:targetRect,stageBottom:stageBox.bottom+scrollY,homeBottom:home.getBoundingClientRect().bottom+scrollY,viewportHeight:innerHeight};
   paint();
   const nextKey=JSON.stringify(layout);
   if(nextKey!==layoutKey){layoutKey=nextKey;dispatchEvent(new Event(wordmarkLayoutEvent));}
  };
  const scheduleMeasure=()=>{if(!disposed&&!measureFrame)measureFrame=requestAnimationFrame(measure);};
  const scroll=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;paint();});};
  const sync=()=>{if(measureFrame){cancelAnimationFrame(measureFrame);measure();}else paint();};
  const observer=new ResizeObserver(scheduleMeasure);[home,stage,source,masthead,...(dialogue?[dialogue]:[])].forEach(e=>observer.observe(e));
  const phaseObserver=new MutationObserver(()=>{if(node.dataset.scenePhase==='idle')scheduleMeasure();});
  phaseObserver.observe(node,{attributes:true,attributeFilter:['data-scene-phase','data-entry-phase','class']});
  addEventListener('scroll',scroll,{passive:true});addEventListener('resize',scheduleMeasure);addEventListener(syncEvent,sync);
  const fonts=document.fonts;fonts.ready.then(scheduleMeasure);fonts.addEventListener('loadingdone',scheduleMeasure);
  node.addEventListener('load',scheduleMeasure,true);
  measure();
  return()=>{
   disposed=true;cancelAnimationFrame(frame);cancelAnimationFrame(measureFrame);
   observer.disconnect();phaseObserver.disconnect();
   removeEventListener('scroll',scroll);removeEventListener('resize',scheduleMeasure);removeEventListener(syncEvent,sync);
   fonts.removeEventListener('loadingdone',scheduleMeasure);node.removeEventListener('load',scheduleMeasure,true);
   source.style.removeProperty('transform');source.style.removeProperty('height');source.style.removeProperty('--wordmark-landing');target.style.removeProperty('transform');
   delete home.dataset.wordmarkProgress;delete masthead.dataset.wordmarkState;
  };
 },[root,reduced,ready,world]);
}
