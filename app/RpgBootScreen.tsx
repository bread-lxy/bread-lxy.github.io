"use client";
import gsap from 'gsap';
import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {Overlay} from './pixel-doorway';
import {ENTRY_TIMING} from './entry-geometry';
import './rpg-entry.css';
export type RpgEntryPhase = 'boot' | 'title' | 'entering';
type Props = {
  phase: RpgEntryPhase; reducedMotion: boolean; posterUrl: string; backgroundUrl: string;
  onBootComplete: () => void; onPrepareLobby: () => void; onEntryComplete: () => void;
};
export function RpgBootScreen({phase, reducedMotion, posterUrl, backgroundUrl, onBootComplete, onPrepareLobby, onEntryComplete}: Props) {
  const root = useRef<HTMLDivElement>(null), card = useRef<HTMLButtonElement>(null), mask = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(0), [titleReady, setTitleReady] = useState(false);
  const entering = useRef(false), consumedUntil = useRef(0), heldEnter = useRef(false);
  const origin = useRef({x: 0, y: 0});
  const callbacks = useRef({onBootComplete, onPrepareLobby, onEntryComplete});
  useLayoutEffect(() => {callbacks.current = {onBootComplete, onPrepareLobby, onEntryComplete};});
  useEffect(() => {
    if (phase !== 'boot') return;
    if (reducedMotion) {callbacks.current.onBootComplete(); return;}
    let disposed = false, count = 0, readyTimer = 0;
    const started = performance.now();
    if (root.current) root.current.dataset.loadStarted = String(started);
    const images: HTMLImageElement[] = [];
    const complete = () => {
      if (disposed) return;
      if (root.current) root.current.dataset.loadEnded = String(performance.now());
      callbacks.current.onBootComplete();
    };
    const resolved = () => {
      if (disposed) return;
      count++; setSettled(count);
      if (count === 3) readyTimer = window.setTimeout(complete, Math.max(380, ENTRY_TIMING.minimumLoad - (performance.now()-started)));
    };
    const loadImage = (url: string) => {const image = new Image(); images.push(image); image.onload = image.onerror = resolved; image.src = url;};
    document.fonts.load('32px "Album Pixel"', 'XUEYING LU ENTER').then(resolved, resolved);
    loadImage(backgroundUrl); loadImage(posterUrl);
    const deadline = window.setTimeout(complete, ENTRY_TIMING.maximumLoad);
    return () => {disposed = true; clearTimeout(readyTimer); clearTimeout(deadline); images.forEach(image => {image.onload = image.onerror = null;});};
  }, [phase, reducedMotion, posterUrl, backgroundUrl]);
  useLayoutEffect(() => {
    if (phase !== 'title') return;
    const element = root.current!;
    const ready = () => {setTitleReady(true); element.dataset.beat = 'idle';};
    if (reducedMotion) {gsap.set(element.querySelectorAll('.entry-name-band'), {clipPath: 'inset(0% 0% 0% 0%)'}); gsap.set(card.current, {opacity: 1}); ready(); return;}
    element.dataset.beat = 'name';
    const timeline = gsap.timeline({onComplete: ready})
      .to(element.querySelector('.entry-loading'), {scaleY: .12, opacity: 0, duration: .15, ease: 'steps(3)'})
      .fromTo(element.querySelectorAll('.entry-name-band'), {clipPath: 'inset(0% 100% 0% 0%)'}, {clipPath: 'inset(0% 0% 0% 0%)', duration: ENTRY_TIMING.name, stagger: .012, ease: 'steps(16)'}, .13)
      .fromTo(card.current, {opacity: 0, y: 8}, {opacity: 1, y: 0, duration: ENTRY_TIMING.card, ease: 'steps(4)'}, .64);
    const finish = () => timeline.progress(1);
    const visibility = () => {if (document.hidden) finish();};
    document.addEventListener('visibilitychange', visibility);
    const deadline = window.setTimeout(finish, 1000);
    return () => {clearTimeout(deadline); timeline.kill(); document.removeEventListener('visibilitychange', visibility);};
  }, [phase, reducedMotion]);
  useEffect(() => {if (titleReady && phase === 'title') root.current?.focus({preventScroll: true});}, [titleReady, phase]);
  // Held boot Enter cannot become a second title input.
  useEffect(() => {
    const keyup = (event: KeyboardEvent) => {if (event.key === 'Enter') heldEnter.current = false;};
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        if (phase === 'title' && titleReady) card.current?.focus({preventScroll: true});
        else root.current?.focus({preventScroll: true});
        return;
      }
      if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.repeat || heldEnter.current) return;
      heldEnter.current = true;
      if (phase === 'boot') {consumedUntil.current = performance.now()+350; callbacks.current.onBootComplete();}
      else if (phase === 'title' && titleReady && performance.now() >= consumedUntil.current) card.current?.click();
    };
    addEventListener('keydown', keydown, true); addEventListener('keyup', keyup, true);
    return () => {removeEventListener('keydown', keydown, true); removeEventListener('keyup', keyup, true);};
  }, [phase, titleReady]);
  useLayoutEffect(() => {
    if (phase !== 'entering' || !root.current || !mask.current) return;
    let disposed = false, completed = false;
    const element = root.current;
    const finish = () => {if (disposed || completed) return; completed = true; callbacks.current.onEntryComplete();};
    element.dataset.beat = 'pressed';
    if (reducedMotion) {
      const tween = gsap.to(element, {opacity: 0, duration: ENTRY_TIMING.reduced, onComplete: finish});
      const timer = window.setTimeout(finish, 150);
      return () => {disposed = true; clearTimeout(timer); tween.kill();};
    }
    const overlay = new Overlay(mask.current, origin.current);
    void overlay.show();
    const timeline = gsap.timeline()
      .set(card.current, {backgroundColor: '#f3efdf', color: '#090a0c'})
      .to(card.current, {scale: .95, duration: .07, ease: 'steps(2)'})
      .to(element.querySelector('.entry-name'), {opacity: 0, duration: .12, ease: 'steps(3)'}, .07)
      .to(card.current, {scaleX: .36, scaleY: .045, duration: .15, ease: 'power2.in'}, .07)
      .call(() => {
        element.dataset.beat = 'doorway';
        gsap.set(card.current, {opacity: 0});
        void overlay.hide({duration: ENTRY_TIMING.doorway}).then(ok => {if (ok) finish();});
      }, [], .25);
    const settle = () => {timeline.kill(); overlay.finish(); finish();};
    const visibility = () => {if (document.hidden) settle();};
    const deadline = window.setTimeout(settle, 1450);
    addEventListener('resize', settle); document.addEventListener('visibilitychange', visibility);
    return () => {disposed = true; clearTimeout(deadline); timeline.kill(); overlay.destroy(); removeEventListener('resize', settle); document.removeEventListener('visibilitychange', visibility);};
  }, [phase, reducedMotion]);
  const start = () => {
    if (phase !== 'title' || !titleReady || entering.current || performance.now() < consumedUntil.current) return;
    entering.current = true;
    const rect = card.current!.getBoundingClientRect();
    origin.current = {x: rect.left + rect.width/2, y: rect.top + rect.height/2};
    callbacks.current.onPrepareLobby();
  };
  return <div ref={root} className="rpg-entry" tabIndex={-1} data-phase={phase} data-motion={reducedMotion ? 'reduced' : 'full'} role="dialog" aria-modal="true" aria-label="进入个人空间"
    onClickCapture={event => {if (phase === 'boot') {event.preventDefault(); event.stopPropagation(); consumedUntil.current = performance.now()+350; callbacks.current.onBootComplete();}}}>
    <div className="entry-darkness" aria-hidden="true"/>
    <div ref={mask} className="pixel-doorway" aria-hidden="true"/>
    <div className="entry-loading" role="progressbar" aria-label="准备字体、背景与角色静态图" aria-valuemin={0} aria-valuemax={3} aria-valuenow={settled} hidden={reducedMotion || phase === 'entering'}>
      {Array.from({length: 12}, (_,i) => <i key={i} data-filled={i < settled*4} style={{'--segment': i} as CSSProperties}/>)}
    </div>
    <div className="entry-title" aria-hidden={phase === 'boot'}>
      <h1 className="entry-name"><span className="entry-name-measure">XUEYING LU</span>{Array.from({length: 6}, (_,i) => <span key={i} className="entry-name-band" aria-hidden="true" style={{'--band': i} as CSSProperties}><span>XUEYING LU</span></span>)}</h1>
      <button ref={card} className="entry-enter" type="button" disabled={!titleReady || phase !== 'title'} onClick={start}><span>ENTER</span></button>
    </div>
  </div>;
}
