"use client";
import {useEffect,useLayoutEffect,useRef} from 'react';
import gsap from 'gsap';
import {TitleRiftOpening,type TitleRiftPhase} from './TitleRiftOpening';
import {createAwakeningRenderer,type AwakeningCharacterLayout} from './awakening-renderer';
import {awakeningBeat,AWAKENING_DURATION,smooth} from './awakening-palette';
import './character-awakening.css';

type Props={
 phase:TitleRiftPhase;reducedMotion:boolean;highContrast?:boolean;posterUrl:string;backgroundUrl:string;
 onBootComplete:()=>void;onPrepareLobby:()=>void;onEntryComplete:()=>void;
 onSceneFrame:(ui:number,characterReady:boolean)=>void;
 /** Production measures the live stage, so responsive layout is never duplicated. */
 measureCharacter?:()=>AwakeningCharacterLayout|undefined;
 /** Only the independent QA harness supplies this. Never enabled by production storage. */
 inspectAt?:number;
};

export function CharacterAwakeningOpening(props:Props){
 const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const renderer=useRef<ReturnType<typeof createAwakeningRenderer>|null>(null);
 const callbacks=useRef(props);
 useLayoutEffect(()=>{callbacks.current=props;});
 useEffect(()=>{
  if(props.reducedMotion)return;
  let cancelled=false;
  const image=new Image();
  const build=()=>{
   if(cancelled||!canvas.current)return;
   try{
    renderer.current?.dispose();
    renderer.current=createAwakeningRenderer(canvas.current,image,innerWidth,innerHeight);
    if(root.current)root.current.dataset.renderer='ready';
    if(props.inspectAt!==undefined)renderer.current.draw(props.inspectAt);
   }catch{if(root.current)root.current.dataset.renderer='unavailable';}
  };
  image.onload=build;
  const resize=()=>{if(image.complete&&image.naturalWidth&&root.current?.dataset.phase!=='entering')build();};
  addEventListener('resize',resize);
  image.onerror=()=>{if(root.current)root.current.dataset.renderer='unavailable';};
  image.src=props.posterUrl;
  return()=>{cancelled=true;removeEventListener('resize',resize);image.onload=image.onerror=null;renderer.current?.dispose();renderer.current=null;};
 },[props.posterUrl,props.reducedMotion,props.inspectAt]);

 useLayoutEffect(()=>{
  if(props.phase!=='entering'||!root.current||!canvas.current)return;
  const element=root.current,layer=canvas.current,title=element.querySelector<HTMLElement>('.title-rift')!;
  const layout=callbacks.current.measureCharacter?.();
  if(layout)renderer.current?.setLayout(layout);
  let disposed=false,completed=false;
  const finish=()=>{if(disposed||completed)return;completed=true;callbacks.current.onSceneFrame(1,true);callbacks.current.onEntryComplete();};
  const draw=(ms:number)=>{
   element.dataset.beat=awakeningBeat(ms);element.dataset.time=String(Math.round(ms));
   title.style.opacity=ms<120?'1':'0';
   layer.style.visibility=ms<120?'hidden':'visible';
   renderer.current?.draw(ms);
   callbacks.current.onSceneFrame(smooth((ms-980)/220),ms>=980);
  };
  if(props.inspectAt!==undefined){draw(props.inspectAt);return()=>{disposed=true;};}
  const context=gsap.context(()=>{
   gsap.set('.rift-enter',{opacity:1,y:0});
   if(props.reducedMotion||!renderer.current){
    element.dataset.fallback=props.reducedMotion?'reduced-motion':'resource-unavailable';
    callbacks.current.onSceneFrame(1,true);
    gsap.to(title,{opacity:0,duration:.12,onComplete:finish});return;
   }
   const clock={ms:0};
   gsap.timeline({onComplete:finish})
    .to('.rift-enter',{scale:.94,y:3,duration:.08,ease:'power2.out'},0)
    .to(clock,{ms:AWAKENING_DURATION,duration:AWAKENING_DURATION/1000,ease:'none',onUpdate:()=>draw(clock.ms)},0);
  },element);
  const settle=()=>{context.revert();finish();};
  const visibility=()=>{if(document.hidden)settle();};
  const deadline=window.setTimeout(settle,1600);
  addEventListener('resize',settle);document.addEventListener('visibilitychange',visibility);
  return()=>{disposed=true;clearTimeout(deadline);removeEventListener('resize',settle);document.removeEventListener('visibilitychange',visibility);context.revert();};
 },[props.phase,props.reducedMotion,props.inspectAt]);

 return <div className="awakening-opening" ref={root} data-entry-overlay data-renderer="loading" data-phase={props.phase} data-inspect={props.inspectAt!==undefined}>
  <TitleRiftOpening {...props} externalEntry/>
  <canvas ref={canvas} className="awakening-canvas" aria-hidden="true"/>
 </div>;
}
