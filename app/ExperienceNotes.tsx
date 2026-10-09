"use client";
import {useEffect,useRef,useState,type MouseEvent} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {experienceOrder,experienceNotes,publicationById,type ExperienceId} from '../content/publication';
import {type ContentItem} from '../content/site';
import {routeHash} from './world-machine';
import {ExperienceLineSidebar,ExperienceFloat} from './ExperiencePrimitives';
import Shuffle from './ExperienceShuffle';
gsap.registerPlugin(ScrollTrigger);
const href=(item:ContentItem)=>routeHash({kind:'item',section:item.primarySection,slug:item.slug});
function follow(e:MouseEvent<HTMLAnchorElement>,fn:()=>void){if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!e.shiftKey){e.preventDefault();fn();}}
export function settleExperienceViewport(){
 document.querySelectorAll<HTMLElement>('.track-record,.experience-scroll-float').forEach(record=>{
  const box=record.getBoundingClientRect();if(box.bottom<0||box.top>innerHeight)return;
  const nodes=record.querySelectorAll('.track-title-mask > span,.liner-copy > p,.char');
  gsap.killTweensOf(nodes);gsap.set(nodes,{clearProps:'transform,opacity,willChange'});
 });
}
export function ExperienceNotes({onItem,reducedMotion}:{onItem:(item:ContentItem)=>void;reducedMotion:boolean}){
 const root=useRef<HTMLElement>(null),[active,setActive]=useState<ExperienceId>('ruc'),[menuOpen,setMenuOpen]=useState(false);
 const activeIndex=experienceOrder.indexOf(active);
 useEffect(()=>{
  const node=root.current;if(!node)return;
  const ctx=gsap.context(()=>{
   if(reducedMotion)return;
   node.querySelectorAll<HTMLElement>('.track-record.is-designed').forEach(record=>{
    if(record.getBoundingClientRect().top<innerHeight*.86)return;
    // P3R: masked title first, prose next; completes even when scroll stops.
    gsap.timeline({scrollTrigger:{trigger:record,start:'top 88%',once:true}})
     .from(record.querySelectorAll('.track-title-mask > span'),{yPercent:105,duration:.65,ease:'power3.out',clearProps:'transform'})
     .from(record.querySelectorAll('.liner-copy > p'),{y:18,opacity:0,duration:.4,stagger:.09,ease:'power2.out',clearProps:'transform,opacity'},.3);
   });
  },node);
  let frame=0;const update=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;let next:ExperienceId='ruc';for(const id of experienceOrder){const e=document.getElementById('item-'+id);if(e&&e.getBoundingClientRect().top<Math.max(220,innerHeight*.42))next=id;}setActive(next);});};
  addEventListener('scroll',update,{passive:true});update();
  return()=>{ctx.revert();removeEventListener('scroll',update);cancelAnimationFrame(frame);};
 },[reducedMotion]);
 const entries=experienceOrder.map(id=>({id,label:publicationById[id].title,href:href(publicationById[id])}));
 return <section ref={root} id="experience" className="experience-tracklist pub-anchor" tabIndex={-1} aria-labelledby="experience-title" data-publication-section="experience">
  <span id="resume" className="pub-anchor track-resume-anchor" aria-hidden="true"/>
  <div className="track-edition"><span>01 / EXPERIENCE</span><span>教育 · 实习</span><span>07 TRACKS</span></div>
  <div className="track-layout">
   <aside className="experience-index">
    <div className="track-index-title"><ExperienceFloat text="经历" id="experience-title" reducedMotion={reducedMotion}/><span className="track-disc" aria-hidden="true">01</span></div>
    <div className="track-index-meta"><span>EDUCATION / PRACTICE</span><span>01—07</span></div>
    <button className="track-mobile-current" aria-expanded={menuOpen} aria-controls="experience-track-menu" onClick={()=>setMenuOpen(!menuOpen)}><span>{String(activeIndex+1).padStart(2,'0')}</span><strong>{publicationById[active].title}</strong><i>{menuOpen?'−':'+'}</i></button>
    <div id="experience-track-menu" className="track-menu" data-open={menuOpen} onKeyDown={e=>{if(e.key==='Escape'){setMenuOpen(false);root.current?.querySelector<HTMLButtonElement>('.track-mobile-current')?.focus();}}}>
     <ExperienceLineSidebar items={entries} activeIndex={activeIndex} reducedMotion={reducedMotion} onItem={i=>{setMenuOpen(false);onItem(publicationById[experienceOrder[i]]);}}/>
    </div>
    <div className="track-position" aria-hidden="true"><span>READING</span><Shuffle key={`${active}-${reducedMotion}`} text={String(activeIndex+1).padStart(2,'0')} tag="span" className="track-shuffle" triggerOnHover={false} loop={false} rootMargin="0px"/><span>/ 07</span><i/></div>
   </aside>
   <div className="track-records">{experienceOrder.map((id,i)=>{const item=publicationById[id],note=experienceNotes[id];return <div key={id} className="track-unit">
    {(i===0||i===2)&&<div className="track-side-title"><span>{i===0?'SIDE A / 01—02':'SIDE B / 03—07'}</span><ExperienceFloat text={i===0?'教育':'实践'} reducedMotion={reducedMotion}/><span>{i===0?'EDUCATION':'PRACTICE'}</span></div>}
    <article id={`item-${id}`} className="track-record liner-record pub-anchor is-designed" tabIndex={-1} data-content-id={id}>
     <span id={`experience/item/${item.slug}`} className="track-native-anchor" aria-hidden="true"/>
     <div className="track-record-meta"><span className="track-number">{String(i+1).padStart(2,'0')}</span><span>{note.field}</span><time>{item.year}</time></div>
     <h3 className="track-title-mask"><span>{item.title}</span></h3>
     <p className="track-role">{item.kind==='experience'&&item.role}</p>
     <div className="liner-copy">{note.sentences.map(s=><p key={s}>{s}</p>)}{note.projects&&<div className="liner-related" aria-label="相关项目">{note.projects.map(project=><a key={project} data-focus-key={`related-${project}`} href={href(publicationById[project])} onClick={e=>follow(e,()=>onItem(publicationById[project]))}>{publicationById[project].title}<span aria-hidden="true">↗</span></a>)}</div>}</div>
    </article>
   </div>;})}</div>
  </div>
  <div className="track-end"><span>01 / EXPERIENCE</span><span>下一章 · 研究 ↘</span></div>
  <noscript><style>{`.track-menu{display:block!important;max-height:none!important}.track-mobile-current{display:none!important}.experience-index{position:static!important}`}</style></noscript>
 </section>;
}
