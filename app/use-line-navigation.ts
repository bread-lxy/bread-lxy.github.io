"use client";
import { useEffect, type RefObject } from 'react';
import { approach, lineProximity } from './poster-motion';

/** LineSidebar's visual kernel only; existing button routing and hitboxes remain owned by the page. */
export function useLineNavigation(ref:RefObject<HTMLElement|null>,active:string,reduced:boolean){
  useEffect(()=>{
    const host=ref.current;if(!host)return;
    const items=[...host.querySelectorAll<HTMLElement>('[data-world]')];
    const fine=matchMedia('(min-width:701px) and (pointer:fine)');
    let raf=0,last=0,pointerY:number|null=null;
    const values=items.map(el=>Number(el.style.getPropertyValue('--effect'))||0);
    const tick=(now:number)=>{
      const dt=Math.min((now-last)/1000,.05);last=now;let moving=false;
      items.forEach((el,i)=>{
        const box=el.getBoundingClientRect();
        const focus=el===document.activeElement;
        const target=Math.max(el.dataset.world===active?1:0,focus?1:0,pointerY===null?0:lineProximity(pointerY-(box.top+box.height/2)));
        const next=reduced||!fine.matches?target:approach(values[i],target,dt,.1);
        const settled=Math.abs(next-target)<.0015;values[i]=settled?target:next;
        el.style.setProperty('--effect',values[i].toFixed(4));if(!settled)moving=true;
      });
      raf=moving?requestAnimationFrame(tick):0;
    };
    const start=()=>{if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}};
    const move=(e:PointerEvent)=>{if(!fine.matches||reduced||e.pointerType==='touch')return;pointerY=e.clientY;start();};
    const leave=()=>{pointerY=null;start();};
    host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);
    host.addEventListener('focusin',start);host.addEventListener('focusout',start);fine.addEventListener('change',leave);start();
    return()=>{cancelAnimationFrame(raf);host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('focusin',start);host.removeEventListener('focusout',start);fine.removeEventListener('change',leave);};
  },[ref,active,reduced]);
}
