"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { createStageLightLoop } from './stage-light-runtime';
import { windowMotion, windowOffset } from './experience-aquatic';
import type { createAquaticLayer } from './experience-aquatic-renderer';
import './experience-aquatic.css';

type Props = {
  foregroundHost: RefObject<HTMLDivElement|null>;
  preload: boolean;
  active: boolean;
  paused: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
};
type Layer = ReturnType<typeof createAquaticLayer>;

/** Two decorative planes and five DOM windows, one clock; never reads character pixels. */
export function ExperienceAquatic(props: Props) {
  const backRef=useRef<HTMLCanvasElement>(null), nearRef=useRef<HTMLCanvasElement>(null);
  const [host,setHost]=useState<HTMLDivElement|null>(null);
  const flags=useRef(props);flags.current=props;
  const control=useRef<{sync:()=>void;measure:()=>void}|null>(null);
  useLayoutEffect(()=>{
    // The portal host is a later sibling: its ref attaches after this layout effect.
    const frame=requestAnimationFrame(()=>setHost(props.foregroundHost.current));
    return()=>cancelAnimationFrame(frame);
  },[props.foregroundHost]);
  useLayoutEffect(()=>{
    const back=backRef.current,near=nearRef.current;
    const home=back?.closest<HTMLElement>('.hero-lobby');
    const stage=home?.querySelector<HTMLElement>('.album-stage');
    if(!props.preload||!back||!near||!home||!stage)return;
    const abort=new AbortController();
    const fishSeed=crypto.getRandomValues(new Uint32Array(1))[0];
    home.dataset.aquaticSeed=String(fishSeed);
    let disposed=false,visible=false,ready=false,failed=false,measureFrame=0;
    let farLayer:Layer|undefined,nearLayer:Layer|undefined;
    let origin={x:0,y:0,width:1,height:1};
    let windows:(HTMLElement|null)[]=[],pointerX=0,pointerY=0,targetX=0,targetY=0;
    const fine=matchMedia('(pointer:fine) and (min-width:701px)'),forced=matchMedia('(forced-colors:active)');
    let lastSeconds=0;
    const drawWindows=(seconds:number,still=false)=>{
      pointerX+=(targetX-pointerX)*.14;pointerY+=(targetY-pointerY)*.14;
      home.style.setProperty('--exp-depth-x',still?'0px':(pointerX*6).toFixed(2)+'px');
      home.style.setProperty('--exp-depth-y',still?'0px':(pointerY*6).toFixed(2)+'px');
      windows.forEach((element,index)=>{
        if(!element)return;
        const p=still?{x:0,y:0}:windowOffset(index,seconds,pointerX,pointerY);
        element.style.translate=`${p.x}px ${p.y}px`;
        element.style.setProperty('--exp-edge-light',still?'0':String(Math.max(0,Math.sin(seconds*.33-index*1.1)-.78)*2));
      });
    };
    const loop=createStageLightLoop({
      now:()=>performance.now(),requestFrame:callback=>requestAnimationFrame(callback),cancelFrame:id=>cancelAnimationFrame(id),
      draw(seconds){
        lastSeconds=seconds;
        farLayer?.draw(seconds);nearLayer?.draw(seconds);
        drawWindows(seconds,flags.current.reducedMotion);
      },
      onState(state){
        home.dataset.aquaticState=state;
        home.dataset.experienceMotion=String(state==='playing');
        if(state==='fallback'){
          failed=true;back.dataset.failed='true';near.dataset.failed='true';drawWindows(0,true);
          farLayer?.dispose();nearLayer?.dispose();
        }
      },
      onFrame(frames,seconds){
        // Small diagnostic counters, not React state or a per-frame layout query.
        home.dataset.aquaticFrames=String(frames);home.dataset.aquaticTime=seconds.toFixed(3);
      },
    },{active:false,paused:true,reducedMotion:props.reducedMotion,visible:false,hidden:document.hidden,ready:false});
    const sync=()=>{
      const f=flags.current;
      const suppressed=f.highContrast||forced.matches;
      home.dataset.aquaticReduced=String(f.reducedMotion);
      home.dataset.aquaticSuppressed=String(suppressed);
      loop.update({active:f.active&&!suppressed,paused:f.paused,reducedMotion:f.reducedMotion,visible,hidden:document.hidden,ready});
      if(f.reducedMotion||suppressed){targetX=targetY=pointerX=pointerY=0;drawWindows(0,true);}
    };
    const measure=()=>{
      measureFrame=0;if(disposed)return;
      const r=stage.getBoundingClientRect();origin={x:r.x,y:r.y,width:r.width,height:r.height};
      if(r.width<1||r.height<1)return;
      windows=windowMotion.map(m=>home.querySelector<HTMLElement>('.current-windows .exp-window-'+m.kind));
      farLayer?.resize(r.width,r.height);nearLayer?.resize(r.width,r.height);
      if(ready&&!failed){
        // Resize clears buffers. Repaint the frozen time even while a transition is paused.
        if(!document.hidden&&visible){farLayer?.draw(flags.current.reducedMotion?0:lastSeconds);nearLayer?.draw(flags.current.reducedMotion?0:lastSeconds);}
        loop.invalidate();
      }
    };
    const schedule=()=>{if(!measureFrame&&!disposed)measureFrame=requestAnimationFrame(measure);};
    const observer=new ResizeObserver(schedule);observer.observe(home);
    const dialogue=home.querySelector('.rpg-dialogue-stage');if(dialogue)observer.observe(dialogue);
    const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();if(visible)schedule();},{threshold:.01});
    intersection.observe(home);
    const pointer=(event:PointerEvent)=>{
      if(!fine.matches||event.pointerType==='touch'||loop.snapshot().state!=='playing')return;
      targetX=Math.max(-1,Math.min(1,((event.clientX-origin.x)/origin.width-.5)*2));
      targetY=Math.max(-1,Math.min(1,((event.clientY-origin.y)/Math.min(origin.height,innerHeight)-.5)*2));
    };
    const leave=()=>{targetX=targetY=0;};
    const visibility=()=>{sync();if(!document.hidden)schedule();};
    const lost=(event:Event)=>{event.preventDefault();loop.fail();};
    back.addEventListener('webglcontextlost',lost);near.addEventListener('webglcontextlost',lost);
    home.addEventListener('pointermove',pointer,{passive:true});home.addEventListener('pointerleave',leave);
    document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',schedule);
    fine.addEventListener('change',leave);forced.addEventListener('change',sync);
    control.current={sync,measure:schedule};schedule();sync();
    // Neither original fish texture nor OGL work blocks the original opening.
    void import('./experience-aquatic-renderer').then(async({loadAquaticImages,createAquaticLayer})=>{
      const images=await loadAquaticImages(abort.signal);if(disposed)return;
      farLayer=createAquaticLayer(back,'far',images,fishSeed);
      nearLayer=createAquaticLayer(near,'near',images,fishSeed);
      ready=true;measure();sync();
    }).catch(()=>{if(!disposed)loop.fail();});
    return()=>{
      disposed=true;abort.abort();loop.dispose();control.current=null;
      observer.disconnect();intersection.disconnect();cancelAnimationFrame(measureFrame);
      back.removeEventListener('webglcontextlost',lost);near.removeEventListener('webglcontextlost',lost);
      farLayer?.dispose();nearLayer?.dispose();
      home.removeEventListener('pointermove',pointer);home.removeEventListener('pointerleave',leave);
      document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',schedule);
      fine.removeEventListener('change',leave);forced.removeEventListener('change',sync);
      windows.forEach(e=>{e?.style.removeProperty('translate');e?.style.removeProperty('--exp-edge-light');});
      delete home.dataset.experienceMotion;
    };
  },[host,props.preload]);
  useLayoutEffect(()=>{
    control.current?.sync();
    // Rebind only when React has committed the new current-windows subtree.
    if(props.active&&!props.paused)control.current?.measure();
  },[props.active,props.paused,props.reducedMotion,props.highContrast]);
  return <><canvas ref={backRef} className="experience-aquatic-canvas aquatic-far" aria-hidden="true"/>{host&&createPortal(<canvas ref={nearRef} className="experience-aquatic-canvas aquatic-near" aria-hidden="true"/>,host)}</>;
}
