"use client";

import { itemById, type ExperienceItem } from '../content/site';
import { useCallback, useEffect, useRef, useState } from 'react';
import { approach, ribbonCopies, wrapRibbon, ribbonScrollVelocity, ribbonVelocityTarget } from './poster-motion';

const internships = ['sand-ai','huatai','baidu','guotai','esg'].map(id => itemById[id] as ExperienceItem);

/** LogoLoop + ScrollVelocity adaptation: measured copies and bounded native-scroll
 * response, retaining immediate reading pauses and the existing loop direction.
 * Source + MIT/Commons Clause notice: poster-motion.ts and public/album/licenses/ReactBits-LICENSE.md.
 */
export function ExperienceRibbon({paused=false,reducedMotion=false}:{paused?:boolean;reducedMotion?:boolean}) {
  const root=useRef<HTMLElement>(null),viewport=useRef<HTMLDivElement>(null),track=useRef<HTMLDivElement>(null),sequence=useRef<HTMLOListElement>(null);
  const offset=useRef(0),drag=useRef<{x:number;y:number;offset:number;horizontal:boolean}|null>(null);
  const [width,setWidth]=useState(0),[copies,setCopies]=useState(2);
  const [manual,setManual]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[visible,setVisible]=useState(false);
  const paint=useCallback((value:number)=>{offset.current=wrapRibbon(value,width);if(track.current)track.current.style.transform=`translate3d(${-offset.current}px,0,0)`;},[width]);
  useEffect(()=>{
    let alive=true;
    const measure=()=>{if(!alive)return;const w=sequence.current?.getBoundingClientRect().width||0;setWidth(w);setCopies(ribbonCopies(viewport.current?.clientWidth||0,w));};
    const resize=new ResizeObserver(measure);if(viewport.current)resize.observe(viewport.current);if(sequence.current)resize.observe(sequence.current);
    measure();void document.fonts.ready.then(measure);document.fonts.addEventListener('loadingdone',measure);
    return()=>{alive=false;resize.disconnect();document.fonts.removeEventListener('loadingdone',measure);};
  },[reducedMotion]);
  useEffect(()=>{
    let intersects=false;
    const update=()=>setVisible(intersects&&!document.hidden);
    const observer=new IntersectionObserver(([entry])=>{intersects=entry.isIntersecting;update();});
    if(root.current)observer.observe(root.current);document.addEventListener('visibilitychange',update);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);};
  },[]);
  const stopped=paused||reducedMotion||manual||hover||focused||!visible;
  useEffect(()=>{
    if(reducedMotion){if(track.current)track.current.style.transform='none';return;}
    paint(offset.current);if(stopped||width<=0)return;
    let raf=0,last:number|null=null,velocity=0,previousY=window.scrollY,armedUntil=0;
    let touch:{x:number;y:number;vertical:boolean}|null=null;
    const disarm=()=>{armedUntil=0;previousY=window.scrollY;touch=null;};
    const arm=(milliseconds:number)=>{
      const now=performance.now();
      // Discard any unobserved route jump before this new real gesture.
      if(now>=armedUntil)previousY=window.scrollY;
      armedUntil=now+milliseconds;
    };
    const wheel=(event:WheelEvent)=>{
      if(!event.isTrusted||event.defaultPrevented||event.ctrlKey||Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
      arm(180);
    };
    const touchStart=(event:TouchEvent)=>{
      if(!event.isTrusted)return;
      disarm();
      if(event.touches.length===1)touch={x:event.touches[0].clientX,y:event.touches[0].clientY,vertical:false};
    };
    const touchMove=(event:TouchEvent)=>{
      if(!event.isTrusted||event.defaultPrevented||!touch)return;
      if(event.touches.length!==1){disarm();return;}
      const dx=event.touches[0].clientX-touch.x,dy=event.touches[0].clientY-touch.y;
      if(!touch.vertical){if(Math.abs(dy)<=8||Math.abs(dy)<=Math.abs(dx))return;touch.vertical=true;}
      arm(900);
    };
    const touchEnd=(event:TouchEvent)=>{
      if(!event.isTrusted)return;
      if(touch?.vertical&&event.touches.length===0)arm(900);
      else disarm();
      touch=null;
    };
    const scrollKeys=new Set(['ArrowUp','ArrowDown','PageUp','PageDown',' ']);
    const keyCapture=()=>disarm();
    const key=(event:KeyboardEvent)=>{
      if(!event.isTrusted||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||!scrollKeys.has(event.key))return;
      const target=event.target instanceof HTMLElement?event.target:null;
      if(target?.isContentEditable||target?.closest('input,textarea,select,[role="textbox"]'))return;
      if(event.key===' '&&target?.closest('button,a[href],[role="button"]'))return;
      arm(360);
    };
    const animate=(now:number)=>{
      const seconds=last===null?0:Math.max(0,now-last)/1000,dt=Math.min(.1,seconds);last=now;
      const y=window.scrollY,delta=y-previousY;previousY=y;
      const scrollVelocity=ribbonScrollVelocity(delta,seconds,innerHeight,now<armedUntil);
      if(Math.abs(delta)>innerHeight)disarm();
      velocity=approach(velocity,ribbonVelocityTarget(scrollVelocity),dt,.25);
      paint(offset.current+velocity*dt);raf=requestAnimationFrame(animate);
    };
    // Input authorises sampling; scroll itself never authorises it. Native route
    // restoration can emit trusted scroll events, so those are not input evidence.
    addEventListener('wheel',wheel,{passive:true});
    addEventListener('touchstart',touchStart,{passive:true});
    addEventListener('touchmove',touchMove,{passive:true});
    addEventListener('touchend',touchEnd,{passive:true});
    addEventListener('touchcancel',disarm,{passive:true});
    addEventListener('pointerdown',disarm,{passive:true,capture:true});
    addEventListener('click',disarm,true);
    addEventListener('keydown',keyCapture,true);addEventListener('keydown',key);
    addEventListener('popstate',disarm);addEventListener('hashchange',disarm);addEventListener('resize',disarm);
    // Existing explicit HOME/history/section scrolls call this synchronisation
    // event, including each frame of the click-to-section scroll animation.
    addEventListener('portfolio:sync-wordmark',disarm);
    raf=requestAnimationFrame(animate);
    return()=>{
      cancelAnimationFrame(raf);
      removeEventListener('wheel',wheel);removeEventListener('touchstart',touchStart);removeEventListener('touchmove',touchMove);
      removeEventListener('touchend',touchEnd);removeEventListener('touchcancel',disarm);removeEventListener('pointerdown',disarm,true);
      removeEventListener('click',disarm,true);removeEventListener('keydown',keyCapture,true);removeEventListener('keydown',key);
      removeEventListener('popstate',disarm);removeEventListener('hashchange',disarm);removeEventListener('resize',disarm);
      removeEventListener('portfolio:sync-wordmark',disarm);
    };
  },[paint,width,stopped,reducedMotion]);
  return <aside ref={root} className={`experience-ribbon ${reducedMotion?'ribbon-static':''}`} aria-label="实习经历" data-ribbon-state={stopped?'paused':'playing'}>
    <p id="ribbon-help" className="sr-only">五段实习经历。聚焦暂停，用左右方向键浏览，也可横向拖动。纵向滑动仍浏览页面。</p>
    <div ref={viewport} className="ribbon-window" tabIndex={reducedMotion?undefined:0} role="group" aria-label="浏览五段实习经历" aria-describedby="ribbon-help"
      onPointerEnter={e=>{if(e.pointerType==='mouse')setHover(true);}} onPointerLeave={()=>setHover(false)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
      onKeyDown={e=>{if(reducedMotion||!['ArrowLeft','ArrowRight'].includes(e.key)||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();e.stopPropagation();const step=sequence.current?.firstElementChild?.getBoundingClientRect().width||300;paint(offset.current+(e.key==='ArrowRight'?step:-step));}}
      onPointerDown={e=>{if(reducedMotion||e.button!==0)return;drag.current={x:e.clientX,y:e.clientY,offset:offset.current,horizontal:false};}}
      onPointerMove={e=>{const d=drag.current;if(!d||reducedMotion)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.horizontal){if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){drag.current=null;return;}if(Math.abs(dx)<8)return;d.horizontal=true;setManual(true);e.currentTarget.setPointerCapture(e.pointerId);}paint(d.offset-dx);}}
      onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
      onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={e=>{
        // Touch starts with implicit capture on a text child. Moving capture to
        // this viewport emits a bubbling loss from that child, not a cancelled drag.
        if(e.target===e.currentTarget)drag.current=null;
      }}>
      <div ref={track} className="ribbon-track">{Array.from({length:reducedMotion?1:copies},(_,copy)=><ol key={copy} ref={copy===0?sequence:undefined} className="ribbon-sequence" aria-hidden={copy>0?true:undefined} inert={copy>0?true:undefined}>{internships.map(item =>
        <li className="ribbon-item" key={item.id} data-internship={item.id}>
          <span className="ribbon-divider" aria-hidden="true">//</span>
          <div><h2>{item.organisation}</h2><p className="ribbon-date">{item.year}</p><p className="ribbon-role">{item.role}</p></div>
        </li>
      )}</ol>)}</div>
    </div>
    {!reducedMotion&&<button className="ribbon-control" type="button" aria-label={manual?'继续经历条幅':'暂停经历条幅'} aria-pressed={manual} onClick={()=>setManual(v=>!v)}><span aria-hidden="true">{manual?'▷':'Ⅱ'}</span><small>{manual?'继续':'暂停'}</small></button>}
  </aside>;
}
