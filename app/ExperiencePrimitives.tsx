"use client";
/* React Bits @3a1c7f2, MIT + Commons Clause: complete ruler DOM/CSS and
 * frame-rate independent proximity loop; ScrollFloat's original character curve.
 * Adaptations: controlled selection, real links/focus, local cleanup and readable SSR. */
import {useRef,useEffect,useCallback,useMemo,type CSSProperties,type MouseEvent} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import './experience-primitives.css';
gsap.registerPlugin(ScrollTrigger);
type Entry={id:string;label:string;href:string};
export function ExperienceLineSidebar({items,activeIndex,reducedMotion,onItem}:{items:Entry[];activeIndex:number;reducedMotion:boolean;onItem:(index:number)=>void}){
 const listRef=useRef<HTMLUListElement>(null),itemRefs=useRef<(HTMLLIElement|null)[]>([]);
 const targetsRef=useRef<number[]>([]),currentRef=useRef<number[]>([]),rafRef=useRef<number|null>(null),lastRef=useRef(0),activeRef=useRef(activeIndex),focusRef=useRef(-1);
 activeRef.current=activeIndex;
 const runFrame=useCallback((now:number)=>{
  const dt=Math.min((now-lastRef.current)/1000,.05);lastRef.current=now;
  const k=1-Math.exp(-dt/.1);let moving=false;
  itemRefs.current.forEach((el,i)=>{if(!el)return;const target=Math.max(targetsRef.current[i]||0,activeRef.current===i||focusRef.current===i?1:0),cur=currentRef.current[i]||0,next=cur+(target-cur)*k,settled=Math.abs(target-next)<.0015,value=settled?target:next;currentRef.current[i]=value;el.style.setProperty('--effect',value.toFixed(4));if(!settled)moving=true;});
  rafRef.current=moving?requestAnimationFrame(runFrame):null;
 },[]);
 const startLoop=useCallback(()=>{
  if(rafRef.current!==null)cancelAnimationFrame(rafRef.current);
  if(reducedMotion){itemRefs.current.forEach((el,i)=>el?.style.setProperty('--effect',activeRef.current===i||focusRef.current===i?'1':'0'));rafRef.current=null;return;}
  lastRef.current=performance.now();rafRef.current=requestAnimationFrame(runFrame);
 },[runFrame,reducedMotion]);
 useEffect(()=>{startLoop();return()=>{if(rafRef.current!==null)cancelAnimationFrame(rafRef.current);rafRef.current=null;};},[activeIndex,startLoop]);
 const follow=(e:MouseEvent<HTMLAnchorElement>,i:number)=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!e.shiftKey){e.preventDefault();onItem(i);}};
 return <nav aria-label="经历索引" className="experience-line-sidebar experience-line-sidebar--markers experience-line-sidebar--scale-tick" style={{'--max-shift':reducedMotion?'0px':'16px'} as CSSProperties}>
  <ul ref={listRef} className="experience-line-sidebar__list" onPointerMove={e=>{
   if(reducedMotion||e.pointerType==='touch')return;const list=listRef.current;if(!list)return;const pointerY=e.clientY-list.getBoundingClientRect().top;
   itemRefs.current.forEach((el,i)=>{if(!el)return;const p=Math.max(0,1-Math.abs(pointerY-(el.offsetTop+el.offsetHeight/2))/110);targetsRef.current[i]=p*p*(3-2*p);});startLoop();
  }} onPointerLeave={()=>{targetsRef.current=targetsRef.current.map(()=>0);startLoop();}}>
   {items.map((entry,i)=><li className="experience-line-sidebar__item" key={entry.id} ref={el=>{itemRefs.current[i]=el;}} data-active={activeIndex===i}>
    <a href={entry.href} aria-current={activeIndex===i?'location':undefined} data-focus-key={`jump-${entry.id}`} onClick={e=>follow(e,i)} onFocus={()=>{focusRef.current=i;startLoop();}} onBlur={()=>{focusRef.current=-1;startLoop();}}>
     <span className="experience-line-sidebar__marker" aria-hidden="true"/><span className="experience-line-sidebar__label"><span className="experience-line-sidebar__index">{String(i+1).padStart(2,'0')}</span><span className="experience-line-sidebar__text">{entry.label}</span></span>
    </a>
   </li>)}
  </ul>
 </nav>;
}
export function ExperienceFloat({text,reducedMotion,id}:{text:string;reducedMotion:boolean;id?:string}){
 const ref=useRef<HTMLHeadingElement>(null);
 const chars=useMemo(()=>Array.from(text).map((c,i)=><span className="char" key={i}>{c===' '?'\u00a0':c}</span>),[text]);
 useEffect(()=>{
  const el=ref.current;if(!el||reducedMotion)return;
  const ctx=gsap.context(()=>{
   if(el.getBoundingClientRect().top<innerHeight*.82)return;
   gsap.fromTo(el.querySelectorAll('.char'),{willChange:'opacity, transform',opacity:0,yPercent:120,scaleY:2.3,scaleX:.7,transformOrigin:'50% 0%'},{duration:1,ease:'back.inOut(2)',opacity:1,yPercent:0,scaleY:1,scaleX:1,stagger:.03,scrollTrigger:{trigger:el,start:'top bottom',end:'bottom 82%',scrub:true}});
  },el);return()=>ctx.revert();
 },[text,reducedMotion]);
 return <h2 ref={ref} id={id} className="experience-scroll-float" aria-label={text}><span className="experience-scroll-float-text" aria-hidden="true">{chars}</span></h2>;
}
