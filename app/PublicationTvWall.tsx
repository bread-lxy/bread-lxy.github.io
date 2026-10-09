"use client";

import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type RefObject} from 'react';
import gsap from 'gsap';
import {safeContentUrl,type ContentItem} from '../content/site';

// Author-controlled positions follow the supplied CRT-wall photographs. The
// two playable screens always sit above decorative monitors.
const positions=[
  {desktop:[27,39,47,-1.1,9],mobile:[4,19,91,-1.1,9],ratio:'16/9',signal:'snow'},
  {desktop:[68,20,29,2.2,8],mobile:[46,40,57,2.8,8],ratio:'4/3',signal:'snow'},
  {desktop:[-7,22,34,-3.3,4],mobile:[-16,7,58,-4,4],ratio:'4/3',signal:'snow'},
  {desktop:[24,-8,31,1.6,3],mobile:[49,1,57,3,3],ratio:'4/3',signal:'off'},
  {desktop:[52,-9,23,-2.4,4],mobile:[-16,42,56,-4,4],ratio:'5/4',signal:'snow'},
  {desktop:[-13,45,40,2.8,5],mobile:[-7,61,60,3,5],ratio:'4/3',signal:'off'},
  {desktop:[4,73,27,-2.1,5],mobile:[39,68,66,-2,5],ratio:'5/4',signal:'snow'},
  {desktop:[71,66,34,2.3,5],mobile:[-12,83,60,2,5],ratio:'4/3',signal:'off'},
  {desktop:[85,-4,25,4.1,2],mobile:[62,91,50,4,2],ratio:'3/4',signal:'snow'},
] as const;
type Position=typeof positions[number];
type TvCardProps={item?:ContentItem;slot:number;position:Position;hero:boolean;onMedia:(item:ContentItem)=>void;previewVisible:boolean;reducedMotion:boolean;videoRef?:RefObject<HTMLVideoElement|null>};

function cardStyle(position:Position):CSSProperties{
  const [dx,dy,dw,dr,dz]=position.desktop,[mx,my,mw,mr,mz]=position.mobile;
  return {'--tv-x':`${dx}%`,'--tv-y':`${dy}%`,'--tv-w':`${dw}%`,'--tv-r':`${dr}deg`,'--tv-z':dz,'--tv-mx':`${mx}%`,'--tv-my':`${my}%`,'--tv-mw':`${mw}%`,'--tv-mr':`${mr}deg`,'--tv-mz':mz,'--tv-ratio':position.ratio} as CSSProperties;
}

function TvCard({item,slot,position,hero,onMedia,previewVisible,reducedMotion,videoRef}:TvCardProps){
  const [videoFailed,setVideoFailed]=useState(false),[posterFailed,setPosterFailed]=useState(false);
  const source=safeContentUrl(item?.media?.src),poster=safeContentUrl(item?.media?.poster);
  const playable=!!item&&(!!source||!!safeContentUrl(item.href));
  useEffect(()=>{setVideoFailed(false);setPosterFailed(false);},[source,poster]);
  useEffect(()=>{
    if(!hero||!videoRef?.current)return;
    const video=videoRef.current;let cancelled=false;
    if(previewVisible&&!reducedMotion)void video.play().catch(error=>{if(!cancelled&&(video.error||error?.name==='NotSupportedError'))setVideoFailed(true);});
    else video.pause();
    return()=>{cancelled=true;video.pause();};
  },[hero,previewVisible,reducedMotion,source,videoRef,videoFailed]);
  return <figure className={`tv-card tv-slot-${slot} ${hero?'tv-hero':''} ${item?'tv-has-item':'tv-empty'} tv-${position.signal}`}
    style={cardStyle(position)} data-tv-card data-drop-order={slot}
    id={item?`item-${item.id}`:undefined} tabIndex={item?-1:undefined}
    data-content-id={item&&!item.id.startsWith('sample-')?item.id:undefined}
    aria-hidden={item?undefined:true}>
    <div className="tv-drop"><div className="tv-bezel">
      {playable?<button className="tv-screen tv-action" type="button" onClick={()=>onMedia(item)} data-focus-key={`tv-${item.id}`} aria-label={`播放完整视频：${item.title}`}>
        {hero&&item.kind==='video'&&item.source==='local'&&source&&!videoFailed
          ?<video ref={videoRef} src={source} poster={poster} muted loop playsInline preload="none" onLoadedMetadata={event=>{if(item.id==='sample-motion-home')event.currentTarget.currentTime=Math.min(10,event.currentTarget.duration/2);else if(item.id.startsWith('sample-'))event.currentTarget.currentTime=Math.min(4,event.currentTarget.duration/3);}} onTimeUpdate={event=>{const video=event.currentTarget;if(item.id==='sample-motion-home'&&video.currentTime>=22)video.currentTime=10;}} onError={()=>setVideoFailed(true)}/>
          :poster&&!posterFailed?<img src={poster} alt="" loading={hero?'eager':'lazy'} decoding="async" onError={()=>setPosterFailed(true)}/>
          :<span className="tv-signal tv-signal-fallback" aria-hidden="true"/>}
        <span className="tv-glass" aria-hidden="true"/>
        <span className="tv-play" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M8 5.5 19 12 8 18.5Z"/></svg></span>
        <span className="tv-watch">完整观看 <span aria-hidden="true">↗</span></span>
      </button>:<div className="tv-screen tv-signal" aria-hidden="true"/>}
      {item&&<div className="tv-caption"><span>{item.title}</span>{!item.id.startsWith('sample-')&&<small>{String(slot+1).padStart(2,'0')}</small>}</div>}
    </div></div>
  </figure>;
}

function TvCluster({records,index,onMedia,reducedMotion,active,previewBlocked}:{records:ContentItem[];index:number;onMedia:(item:ContentItem)=>void;reducedMotion:boolean;active:boolean;previewBlocked:boolean}){
  const wallRef=useRef<HTMLDivElement>(null),videoRef=useRef<HTMLVideoElement>(null),entered=useRef(false),animation=useRef<gsap.core.Timeline|null>(null);
  const [visible,setVisible]=useState(false),[landed,setLanded]=useState(reducedMotion);
  useLayoutEffect(()=>{
    const wall=wallRef.current;if(!wall)return;
    const drops=[...wall.querySelectorAll<HTMLElement>('.tv-drop')];
    if(reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches){gsap.set(drops,{clearProps:'all'});entered.current=true;setLanded(true);return;}
    if(!entered.current)gsap.set(drops,{y:(i)=>-Math.min(230,125+i*16),opacity:.18});
    return()=>{animation.current?.kill();};
  },[]);
  useEffect(()=>{
    const wall=wallRef.current;if(!wall)return;let intersecting=false;
    const update=()=>setVisible(intersecting&&!document.hidden);
    const observer=new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting;update();},{threshold:.06});
    observer.observe(wall);document.addEventListener('visibilitychange',update);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);};
  },[]);
  useEffect(()=>{
    if(!active||entered.current)return;
    const wall=wallRef.current;if(!wall)return;
    const drops=[...wall.querySelectorAll<HTMLElement>('.tv-drop')].sort((a,b)=>Number(a.parentElement?.dataset.dropOrder)-Number(b.parentElement?.dataset.dropOrder));
    const launch=()=>{
      if(entered.current||document.hidden)return;
      const rect=wall.getBoundingClientRect();
      if(rect.top>=innerHeight*.94||rect.bottom<=0)return;
      if(reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches){gsap.set(drops,{clearProps:'all'});entered.current=true;setLanded(true);return;}
      // Start as soon as the settled layout crosses the viewport. Deferring
      // through React state or extra RAFs caused the old invisible entrance.
      entered.current=true;
      animation.current=gsap.timeline({onComplete:()=>{gsap.set(drops,{clearProps:'transform,opacity,visibility'});setLanded(true);}});
      drops.forEach((drop,i)=>animation.current?.to(drop,{y:0,opacity:1,duration:.55,ease:'back.out(1.35)'},i*.068));
    };
    const observer=new IntersectionObserver(launch,{threshold:0});
    observer.observe(wall);
    addEventListener('scroll',launch,{passive:true});
    launch();
    return()=>{observer.disconnect();removeEventListener('scroll',launch);};
  },[active,reducedMotion]);
  useEffect(()=>{
    if(!reducedMotion)return;
    animation.current?.kill();
    if(wallRef.current)gsap.set(wallRef.current.querySelectorAll('.tv-drop'),{clearProps:'all'});
    entered.current=true;
    setLanded(true);
  },[reducedMotion]);
  const previewVisible=active&&visible&&landed&&!previewBlocked&&!reducedMotion;
  return <div className="tv-cluster" ref={wallRef} data-cluster-index={index} data-active={active} data-preview={previewVisible?'playing':'paused'} data-entered={entered.current}>
    <div className="tv-cables" aria-hidden="true"/>
    {positions.map((position,slot)=><TvCard key={records[slot]?.id||`empty-${index}-${slot}`} item={records[slot]} slot={slot} position={position} hero={index===0&&slot===0} onMedia={onMedia} previewVisible={previewVisible} reducedMotion={reducedMotion} videoRef={index===0&&slot===0?videoRef:undefined}/>)}
  </div>;
}

export function PublicationTvWall({records,onMedia,reducedMotion,active,previewBlocked}:{records:ContentItem[];onMedia:(item:ContentItem)=>void;reducedMotion:boolean;active:boolean;previewBlocked:boolean}){
  const clusters=Array.from({length:Math.max(1,Math.ceil(records.length/positions.length))},(_,index)=>records.slice(index*positions.length,(index+1)*positions.length));
  return <div className="video-wall">{clusters.map((group,index)=><TvCluster key={`tv-cluster-${index}`} records={group} index={index} onMedia={onMedia} reducedMotion={reducedMotion} active={active} previewBlocked={previewBlocked}/>)}</div>;
}
