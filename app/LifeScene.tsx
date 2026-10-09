"use client";

import {useEffect,useRef,type CSSProperties} from 'react';
import gsap from 'gsap';
import {lifeScene,lifeJellyAtlas,type LifePlacement} from '../content/life-scene';
import {lifeMotionAllowed} from './life-motion';
import {paintLifeSwim,sampleLifeSwim} from './life-jelly-swim';

function placement(desktop: LifePlacement, mobile?: LifePlacement): CSSProperties {
  return {
    '--life-x':`${desktop.x}%`,'--life-y':`${desktop.y}%`,'--life-width':`${desktop.width}%`,'--life-angle':`${desktop.rotation}deg`,
    // Mobile composition uses a 710px artboard; paper texture still covers the full hero.
    '--life-mobile-x':`${mobile?.x??0}%`,'--life-mobile-y':`${(mobile?.y??0)*7.1}px`,'--life-mobile-width':`${mobile?.width??0}%`,'--life-mobile-angle':`${mobile?.rotation??0}deg`,
  } as CSSProperties;
}

/** Local, decorative scenery. The shared character and navigation stay outside. */
export function LifeScene({active,reducedMotion}:{active:boolean;reducedMotion:boolean}) {
  const root=useRef<HTMLDivElement>(null);
  const swimSeconds=useRef(0);
  useEffect(()=>{
    const element=root.current;
    if(!element)return;
    const stage=element.closest<HTMLElement>('.album-home');
    if(!stage)return;
    let inView=true;
    let animationFrame=0,lastTime=0;
    const mobileQuery=matchMedia('(max-width:700px)');
    let viewport={width:element.clientWidth,height:element.clientHeight,mobile:mobileQuery.matches};
    const swimmers=lifeScene.jellyfish.map(config=>({config,node:element.querySelector<HTMLElement>(`[data-jelly="${config.id}"]`)!}));
    const paint=()=>swimmers.forEach(({node,config})=>{
      const animated=!reducedMotion&&node.dataset.sprite==='ready'&&(!viewport.mobile||!!config.mobile);
      if(animated){
        paintLifeSwim(node,sampleLifeSwim(config,swimSeconds.current,viewport));
        node.dataset.swimState='swimming';
      }else if(node.dataset.swimState!=='static'){
        node.querySelectorAll<HTMLElement>('.life-jelly-drift,.life-jelly-heading,.life-jelly-sprite').forEach(part=>part.removeAttribute('style'));
        node.dataset.swimState='static';
      }
    });
    const animate=(time:number)=>{
      swimSeconds.current+=Math.min(.1,Math.max(0,(time-lastTime)/1000));lastTime=time;
      paint();animationFrame=requestAnimationFrame(animate);
    };
    const query=matchMedia('(min-width:701px) and (pointer:fine)');
    const moves:Array<{x:ReturnType<typeof gsap.quickTo>;y:ReturnType<typeof gsap.quickTo>;depth:number}>=[];
    const context=gsap.context(()=>{
      if(!reducedMotion)element.querySelectorAll<HTMLElement>('.life-paper-parallax').forEach(node=>{
        moves.push({x:gsap.quickTo(node,'x',{duration:.7,ease:'power2.out'}),y:gsap.quickTo(node,'y',{duration:.7,ease:'power2.out'}),depth:Number(node.dataset.depth)||0});
      });
    },element);
    const running=()=>lifeMotionAllowed(active,reducedMotion,inView,document.hidden);
    const update=()=>{
      element.dataset.motion=String(running());
      if(running()){
        if(!animationFrame){lastTime=performance.now();animationFrame=requestAnimationFrame(animate);}
      }else{
        cancelAnimationFrame(animationFrame);animationFrame=0;
        moves.forEach(move=>{move.x.tween.pause();move.y.tween.pause();});
      }
      paint();
    };
    const measure=()=>{viewport={width:element.clientWidth,height:element.clientHeight,mobile:mobileQuery.matches};paint();};
    const resizeObserver=new ResizeObserver(measure);
    resizeObserver.observe(element);
    const pointer=(event:PointerEvent)=>{
      if(!running()||!query.matches||event.pointerType==='touch')return;
      const rect=stage.getBoundingClientRect();
      const x=Math.max(-.5,Math.min(.5,(event.clientX-rect.left)/rect.width-.5));
      const y=Math.max(-.5,Math.min(.5,(event.clientY-rect.top)/rect.height-.5));
      moves.forEach(move=>{move.x(x*move.depth);move.y(y*move.depth);});
    };
    const reset=()=>{if(running())moves.forEach(move=>{move.x(0);move.y(0);});};
    const observer=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;update();},{threshold:0});
    observer.observe(stage);
    document.addEventListener('visibilitychange',update);
    query.addEventListener('change',reset);
    mobileQuery.addEventListener('change',measure);
    stage.addEventListener('pointermove',pointer,{passive:true});
    stage.addEventListener('pointerleave',reset);
    update();
    return()=>{
      observer.disconnect();document.removeEventListener('visibilitychange',update);
      resizeObserver.disconnect();mobileQuery.removeEventListener('change',measure);
      cancelAnimationFrame(animationFrame);
      query.removeEventListener('change',reset);stage.removeEventListener('pointermove',pointer);stage.removeEventListener('pointerleave',reset);
      context.revert();element.dataset.motion='false';
    };
  },[active,reducedMotion]);

  return <div ref={root} className="life-scene" data-motion="false" data-reduced-motion={reducedMotion} aria-hidden="true">
    <div className="life-paper-ground" style={{backgroundImage:`url(${lifeScene.texture})`}}/>
    <div className="life-paper-fibers" style={{backgroundImage:`url(${lifeScene.fibers})`}}/>
    <div className="life-marks">
      {lifeScene.marks.map(mark=><img key={mark.id} src={mark.src} alt="" draggable={false} className="life-mark" data-mobile={!!mark.mobile} style={{...placement(mark.desktop,mark.mobile),opacity:mark.opacity}} onError={event=>{event.currentTarget.style.visibility='hidden';}}/>)}
    </div>
    <div className="life-paper-stage">
      {lifeScene.papers.map(paper=><div key={paper.id} className="life-paper-slot" data-paper={paper.id} data-life-group={paper.group} data-mobile={!!paper.mobile} style={{...placement(paper.desktop,paper.mobile),'--life-aspect':paper.aspect,zIndex:paper.depth} as CSSProperties}>
        <div className="life-paper-parallax" data-depth={paper.depth} data-life-pose>
          <div className="life-paper-reveal" data-life-pose>
            <div className={`life-paper life-paper--${paper.edge}`}>
              <img src={paper.src} alt="" draggable={false} decoding="async" style={{objectPosition:paper.crop}} onError={event=>{event.currentTarget.hidden=true;}}/>
              <div className="life-print-grain"/>
            </div>
          </div>
        </div>
      </div>)}
    </div>
    {lifeScene.jellyfish.map(jelly=><div key={jelly.id} className={`life-jelly life-jelly--${jelly.layer}`} data-jelly={jelly.id} data-mobile={!!jelly.mobile} style={{...placement(jelly.desktop,jelly.mobile),'--life-jelly-tint':`${jelly.tint}deg`,'--life-jelly-aspect':`${lifeJellyAtlas.width}/${lifeJellyAtlas.height}`,'--life-atlas-width':`${lifeJellyAtlas.columns*100}%`} as CSSProperties}>
      <div className="life-jelly-drift" data-life-pose><div className="life-jelly-heading" data-life-pose><div className="life-jelly-body">
        <img src={jelly.src} alt="" width="36" height="54" draggable={false} className="life-jelly-fallback" onError={event=>{event.currentTarget.style.visibility='hidden';}}/>
        <img src={lifeJellyAtlas.src} alt="" width={lifeJellyAtlas.width*lifeJellyAtlas.columns} height={lifeJellyAtlas.height*lifeJellyAtlas.rows} draggable={false} className="life-jelly-sprite" data-life-pose
          onLoad={event=>{event.currentTarget.closest<HTMLElement>('.life-jelly')!.dataset.sprite='ready';}}
          onError={event=>{event.currentTarget.closest<HTMLElement>('.life-jelly')!.dataset.sprite='failed';}}/>
      </div></div></div>
    </div>)}
  </div>;
}
