"use client";
import gsap from 'gsap';
import {useEffect,useLayoutEffect,useRef,useState,useId,type CSSProperties} from 'react';
import {RIFT_WORDMARK} from './rift-wordmark';
import {riftGeometry,RIFT_TIMING} from './title-rift-geometry';
import './title-rift.css';

export type TitleRiftPhase = 'boot'|'title'|'entering';
type Props = {
  phase: TitleRiftPhase; reducedMotion: boolean; highContrast?: boolean;
  posterUrl: string; backgroundUrl: string;
  /** An opening owner can replace the exit while retaining the accepted loading/title. */
  externalEntry?: boolean;
  onBootComplete:()=>void; onPrepareLobby:()=>void; onEntryComplete:()=>void;
};

/** Shared loading/title choreography. No global selector or world state. */
export function TitleRiftOpening({phase,reducedMotion,highContrast=false,posterUrl,backgroundUrl,externalEntry=false,onBootComplete,onPrepareLobby,onEntryComplete}:Props){
  const root=useRef<HTMLDivElement>(null),card=useRef<HTMLButtonElement>(null);
  const callbacks=useRef({onBootComplete,onPrepareLobby,onEntryComplete});
  const [size,setSize]=useState({width:1440,height:900});
  const [settled,setSettled]=useState(0),[ready,setReady]=useState(false);
  const entered=useRef(false),held=useRef(false),consumedUntil=useRef(0),skip=useRef(false);
  const id=useId().replace(/:/g,'');
  const g=riftGeometry(size.width,size.height,RIFT_WORDMARK.width);
  useLayoutEffect(()=>{callbacks.current={onBootComplete,onPrepareLobby,onEntryComplete};});
  useLayoutEffect(()=>{
    const resize=()=>setSize({width:innerWidth,height:innerHeight});resize();
    addEventListener('resize',resize);return()=>removeEventListener('resize',resize);
  },[]);

  useEffect(()=>{
    if(phase!=='boot')return;
    if(reducedMotion){callbacks.current.onBootComplete();return;}
    let disposed=false,done=false,count=0,minTimer=0;
    const started=performance.now(),images:HTMLImageElement[]=[];
    if(root.current)root.current.dataset.loadStarted=String(started);
    const complete=()=>{if(disposed||done)return;done=true;if(root.current)root.current.dataset.loadEnded=String(performance.now());callbacks.current.onBootComplete();};
    const resolved=()=>{
      if(disposed||done)return;
      setSettled(++count);
      if(count===3)minTimer=window.setTimeout(complete,Math.max(0,RIFT_TIMING.minimumLoad-(performance.now()-started)));
    };
    const image=(url:string)=>{const asset=new Image();images.push(asset);asset.onload=asset.onerror=resolved;asset.src=url;};
    document.fonts.load('32px "Album Pixel"','ENTER').then(resolved,resolved);
    image(posterUrl);image(backgroundUrl);
    const deadline=window.setTimeout(complete,RIFT_TIMING.maximumLoad);
    return()=>{disposed=true;clearTimeout(minTimer);clearTimeout(deadline);images.forEach(image=>{image.onload=image.onerror=null;});};
  },[phase,reducedMotion,posterUrl,backgroundUrl]);

  useLayoutEffect(()=>{
    if(phase!=='boot'||!root.current)return;
    const target=root.current.querySelector('.rift-scan-fill');
    const tween=gsap.to(target,{attr:{width:g.nameWidth*settled/3},duration:.18,ease:'steps(10)'});
    return()=>{tween.kill();};
  },[phase,settled,size]);

  useLayoutEffect(()=>{
    if(phase!=='title'||!root.current)return;
    const element=root.current;
    const finish=()=>{element.dataset.beat='idle';setReady(true);};
    let timeline:gsap.core.Timeline|undefined;
    const context=gsap.context(()=>{
      if(reducedMotion||skip.current||ready){
        gsap.set('.rift-build-band',{attr:{transform:'translate(0 0) scale(1 1)'},opacity:1});
        gsap.set('.rift-enter',{opacity:1,y:0});gsap.set('.rift-scan',{opacity:0});finish();return;
      }
      element.dataset.beat='form';
      const bands=gsap.utils.toArray<SVGGElement>('.rift-build-band',element);
      timeline=gsap.timeline({onComplete:finish});
      // Shared group choreography from the existing Codrops TypeTransition approach:
      // a single owner timeline and staggered text groups, no rotation or letter swarm.
      bands.forEach((band,i)=>{
        const stripBottom=g.y+g.nameHeight*(i+1)/5;
        // SVG bbox ignores clipping: explicit coordinates keep every compressed
        // strip on the same baseline instead of leaking fragments beneath it.
        gsap.set(band,{attr:{transform:`translate(0 ${g.baseline-stripBottom*.08}) scale(1 .08)`},opacity:1});
        timeline!.to(band,{attr:{transform:'translate(0 0) scale(1 1)'},duration:.36,ease:'power3.inOut'},(4-i)*.035);
      });
      timeline.to('.rift-scan',{opacity:0,duration:.15},.14)
        .fromTo('.rift-enter',{opacity:0,y:10},{opacity:1,y:0,duration:RIFT_TIMING.button,ease:'power2.out'},.53);
    },element);
    const settle=()=>{timeline?.progress(1);finish();};
    const visibility=()=>{if(document.hidden)settle();};
    const timer=window.setTimeout(settle,1000);
    document.addEventListener('visibilitychange',visibility);
    return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);context.revert();};
    // ready is intentionally read only when this phase/viewport changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,reducedMotion,size.width,size.height]);

  useEffect(()=>{if(ready&&phase==='title')root.current?.focus({preventScroll:true});},[ready,phase]);
  useEffect(()=>{
    const down=(event:KeyboardEvent)=>{
      if(event.ctrlKey||event.altKey||event.metaKey)return;
      if(event.key==='Tab'){
        event.preventDefault();(phase==='title'&&ready?card.current:root.current)?.focus({preventScroll:true});return;
      }
      if(event.key!=='Enter')return;
      event.preventDefault();event.stopImmediatePropagation();
      if(event.repeat||held.current)return;held.current=true;
      if(phase==='boot'){skip.current=true;consumedUntil.current=performance.now()+350;callbacks.current.onBootComplete();}
      else if(phase==='title'&&ready&&performance.now()>=consumedUntil.current)card.current?.click();
    };
    const up=(event:KeyboardEvent)=>{if(event.key==='Enter')held.current=false;};
    addEventListener('keydown',down,true);addEventListener('keyup',up,true);
    return()=>{removeEventListener('keydown',down,true);removeEventListener('keyup',up,true);};
  },[phase,ready]);

  useLayoutEffect(()=>{
    if(phase!=='entering'||externalEntry||!root.current)return;
    const element=root.current;let disposed=false,complete=false;
    const finish=()=>{if(disposed||complete)return;complete=true;callbacks.current.onEntryComplete();};
    element.dataset.beat='press';
    const context=gsap.context(()=>{
      if(reducedMotion){gsap.to(element,{opacity:0,duration:RIFT_TIMING.reduced,onComplete:finish});return;}
      const timeline=gsap.timeline({onComplete:finish});
      // Press and lettering compression live on the same matte that subsequently moves.
      timeline.to('.rift-enter',{scale:.94,y:3,duration:.08,ease:'power2.out'})
        .to('.rift-pane-name',{scaleX:.985,transformOrigin:`${g.width/2}px ${g.y+g.nameHeight/2}px`,duration:.12,ease:'power2.inOut'},0)
        .to('.rift-enter',{opacity:0,duration:.08},.12)
        .call(()=>{element.dataset.beat='rift';},[],.16);
      g.bands.forEach((band,i)=>{
        for(const side of ['left','right'] as const){
          const shift=side==='left'?-band.split-2:g.width-band.split+2;
          timeline.to(`.rift-pane-${i}-${side}`,{x:shift,duration:.72,ease:'power3.inOut'},.16+band.delay);
        }
      });
      timeline.call(()=>{element.dataset.beat='land';},[],1.06).to({}, {duration:.10});
    },element);
    // Resizing or backgrounding settles rather than leaving a stale full-screen lock.
    const settle=()=>{context.revert();finish();};
    const visibility=()=>{if(document.hidden)settle();};
    const deadline=window.setTimeout(settle,1500);
    addEventListener('resize',settle);document.addEventListener('visibilitychange',visibility);
    return()=>{disposed=true;clearTimeout(deadline);removeEventListener('resize',settle);document.removeEventListener('visibilitychange',visibility);context.revert();};
    // Geometry is captured for one atomic entry. A resize settles it before re-layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,reducedMotion,externalEntry]);

  const start=()=>{
    if(phase!=='title'||!ready||entered.current||performance.now()<consumedUntil.current)return;
    entered.current=true;callbacks.current.onPrepareLobby();
  };
  const name=(className?:string)=><g className={className}><svg x={g.x} y={g.y} width={g.nameWidth} height={g.nameHeight} viewBox={`0 0 ${RIFT_WORDMARK.width} ${RIFT_WORDMARK.height}`} overflow="visible"><path d={RIFT_WORDMARK.path} fill="currentColor" stroke="currentColor" strokeWidth=".25" strokeLinejoin="miter"/></svg></g>;
  return <div ref={root} className="title-rift" data-phase={phase} data-beat={phase==='boot'?'scan':undefined} data-ready={ready} data-contrast={highContrast} data-motion={reducedMotion?'reduced':'full'} role="dialog" aria-modal="true" aria-label="XUEYING LU — 进入个人空间" tabIndex={-1}
    onClickCapture={event=>{if(phase==='boot'){event.preventDefault();event.stopPropagation();skip.current=true;consumedUntil.current=performance.now()+350;callbacks.current.onBootComplete();}}}>
    <svg className="rift-canvas" viewBox={`0 0 ${g.width} ${g.height}`} width={g.width} height={g.height} aria-hidden="true">
      <defs>
        <pattern id={`${id}-grain`} patternUnits="userSpaceOnUse" width="8" height="8"><path d="M0 0h1v1H0zM4 4h1v1H4z" fill="currentColor" opacity=".025"/></pattern>
        {g.bands.map((band,i)=>['left','right'].map(side=><clipPath key={`${i}-${side}`} id={`${id}-${i}-${side}`}><rect shapeRendering="crispEdges" x={side==='left'?0:band.split} y={band.top} width={side==='left'?band.split:g.width-band.split} height={band.height+1}/></clipPath>))}
        {Array.from({length:5},(_,i)=><clipPath key={i} id={`${id}-build-${i}`}><rect x={0} y={g.y+i*g.nameHeight/5-.15} width={g.width} height={g.nameHeight/5+.3}/></clipPath>)}
      </defs>
      {(phase!=='entering'||externalEntry)&&<>
        <rect width={g.width} height={g.height} className="rift-ink"/><rect width={g.width} height={g.height} fill={`url(#${id}-grain)`}/>
        <g className="rift-scan"><rect x={g.x} y={g.baseline-g.pixel*1.25} width={g.nameWidth} height={g.pixel*1.25} fill="currentColor" opacity=".10"/><rect className="rift-scan-fill" x={g.x} y={g.baseline-g.pixel*1.25} width={phase==='boot'?0:g.nameWidth} height={g.pixel*1.25} fill="currentColor"/></g>
        <g className="rift-build">{Array.from({length:5},(_,i)=><g key={i} className="rift-build-band" style={{opacity:0}}><g clipPath={`url(#${id}-build-${i})`}>{name()}</g></g>)}</g>
        <g className="rift-still">{name()}</g>
      </>}
      {phase==='entering'&&!externalEntry&&g.bands.map((band,i)=>['left','right'].map(side=><g key={`${i}-${side}`} className={`rift-pane-${i}-${side}`}><g clipPath={`url(#${id}-${i}-${side})`}>
        <rect width={g.width} height={g.height} className="rift-ink"/><rect width={g.width} height={g.height} fill={`url(#${id}-grain)`}/>{name('rift-pane-name')}
      </g></g>))}
    </svg>
    <span className="rift-a11y" role="progressbar" aria-label="准备字体、背景与角色" aria-valuemin={0} aria-valuemax={3} aria-valuenow={settled} hidden={phase!=='boot'}/>
    <h1 className="rift-a11y">XUEYING LU</h1>
    <button ref={card} className="rift-enter" type="button" onClick={start} disabled={!ready||phase!=='title'} style={{left:(g.width-g.buttonWidth)/2,top:g.buttonY,width:g.buttonWidth,height:g.buttonHeight} as CSSProperties}><span aria-hidden="true" className="rift-pointer"/><span>ENTER</span></button>
  </div>;
}
