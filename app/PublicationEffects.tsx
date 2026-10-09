"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Adapted from React Bits ScrollReveal. MIT + Commons Clause, notice at
 * public/album/licenses/ReactBits-LICENSE.md. Explicit phrase boundaries keep
 * Chinese readable. No blur, no global ScrollTrigger cleanup, static SSR first. */
export function ScrollTitle({phrases,className=''}:{phrases:readonly string[];className?:string}){
 const ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const mm=gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',()=>{
   gsap.fromTo(el,{rotate:1.5,transformOrigin:'0% 50%'},{rotate:0,ease:'none',scrollTrigger:{trigger:el,start:'top 98%',end:'top 62%',scrub:true}});
   gsap.fromTo(el.querySelectorAll('.scroll-phrase'),{opacity:.65,y:26},{opacity:1,y:0,stagger:.05,ease:'none',scrollTrigger:{trigger:el,start:'top 98%',end:'top 62%',scrub:true}});
  });
  return()=>mm.revert();
 },[]);
 return <span className={`scroll-title ${className}`} ref={ref}>{phrases.map((phrase,i)=><span className="scroll-phrase" key={i}>{phrase}</span>)}</span>;
}

// Original deterministic signal graphic. Decorative, NOT an audio analyser.
// The repeated identical half gives a seamless linear loop like DECO27's SVG
// background-position treatment; no artwork or waveform is copied from it.
function signalPath(variant:number){
 const points=Array.from({length:641},(_,i)=>{
  const x=i/640;
  const envelope=.85*Math.exp(-Math.pow((x-.12-variant*.025)/.065,2))+.55*Math.exp(-Math.pow((x-.34)/.025,2))+.96*Math.exp(-Math.pow((x-.59+variant*.02)/.13,2))+.33*Math.exp(-Math.pow((x-.87)/.045,2));
  const detail=.14+.86*Math.abs(Math.sin(i*2.471+variant)*Math.cos(i*.871));
  return [+(x*1200).toFixed(2),Math.min(56,1+envelope*detail*62)];
 });
 return `M0 60 ${points.map(([x,h])=>`L${x} ${(60-h).toFixed(2)}`).join(' ')} ${points.reverse().map(([x,h])=>`L${x} ${(60+h*.79).toFixed(2)}`).join(' ')} Z`;
}
export function WaveTape({variant=0,className=''}:{variant?:number;className?:string}){
 const d=useMemo(()=>signalPath(variant),[variant]);
 return <div className={`signal-wave ${className}`} aria-hidden="true" style={{'--wave-duration':`${[30,40,20,47.5][variant%4]}s`} as CSSProperties}><div className="wave-track">{[0,1].map(i=><svg key={i} viewBox="0 0 1200 120" preserveAspectRatio="none" focusable="false"><path d={d} fill="currentColor"/><path d="M0 60H1200" stroke="currentColor" strokeWidth=".5"/></svg>)}</div></div>;
}

export function RegistrationMark(){return <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false"><path d="M40 0C40 35 35 40 0 40C35 40 40 45 40 80C40 45 45 40 80 40C45 40 40 35 40 0Z" fill="currentColor"/></svg>;}
