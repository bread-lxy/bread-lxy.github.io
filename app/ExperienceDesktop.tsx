"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { experienceCategories, experienceDesktop } from '../content/experience-desktop';
import { PixelIcon, type ExperienceIcon } from './experience-icons';

type Props = { reducedMotion: boolean; active: boolean; animateEntrance: boolean };
function Window({ kind, title, icon, children }: { kind: string; title: string; icon: ExperienceIcon; children: ReactNode }) {
  return <section className={'exp-window exp-window-' + kind} aria-label={title}>
    <header className="exp-titlebar"><PixelIcon name={icon}/><span>{title}</span><span className="exp-title-grip" aria-hidden="true"/></header>
    {children}
    <span className="exp-window-outline" aria-hidden="true"/>
  </section>;
}
function PhotoSlot() {
  const [failed, setFailed] = useState(false);
  const photo = experienceDesktop.photo;
  return <div className="exp-photo" role={photo && !failed ? undefined : 'img'} aria-label={photo && !failed ? undefined : '个人照片位置，照片待补充'}>
    {photo && !failed ? <img src={photo.src} alt={photo.alt} width={90} height={120} onError={() => setFailed(true)}/> : <span><PixelIcon name="image"/>照片待补充</span>}
    <i className="exp-photo-corner" aria-hidden="true"/>
  </div>;
}
export function ExperienceDesktopBackdrop({children}: {children?: ReactNode}) {
  return <div className="experience-desktop-wallpaper" aria-hidden="true">
    <div className="exp-wallpaper-haze"/><div className="exp-wallpaper-dither"/>
    {children}
    <div className="exp-starfield">{Array.from({ length: 8 }, (_, i) => <i key={i}/>)}</div>
  </div>;
}

/** A readable cover collage, not an interactive desktop or a second résumé. */
export function ExperienceDesktop({ reducedMotion, active, animateEntrance }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const entered = useRef(false);
  // Narrow layouts depend on the collage's intrinsic height. No writes inside RO delivery.
  useLayoutEffect(() => {
    const element = root.current, home = element?.closest<HTMLElement>('.hero-lobby');
    const dialogue = home?.querySelector<HTMLElement>('.rpg-dialogue-stage');
    if (!element || !home || !dialogue) return;
    let frame = 0;
    const setSize = (property: string, value: number) => {
      const next = Math.ceil(value) + 'px';
      if (home.style.getPropertyValue(property) !== next) home.style.setProperty(property, next);
    };
    const measure = () => {
      frame = 0;
      if (dialogue.offsetHeight) setSize('--experience-dialogue-height', dialogue.offsetHeight);
      setSize('--experience-record-height', element.scrollHeight);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(dialogue); observer.observe(element); schedule();
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame);
      home.style.removeProperty('--experience-record-height'); home.style.removeProperty('--experience-dialogue-height');
    };
  }, []);

  useLayoutEffect(() => {
    const element = root.current;
    // World previews are owned exclusively by the parent album timeline.
    if (!element || reducedMotion || !animateEntrance || entered.current) return;
    entered.current = true;
    element.dataset.entering = 'true';
    const context = gsap.context(() => {
      // Main list appears first. All five windows have settled by 490 ms.
      const windows = ['notepad', 'photo', 'browser', 'files', 'notice'].map(kind => element.querySelector('.exp-window-' + kind));
      gsap.timeline({ onComplete: () => { element.dataset.entering = 'false'; } })
        .fromTo(windows, { opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0 0 0% 0)', duration: .25, stagger: .06, ease: 'steps(4)', clearProps: 'opacity,clipPath' }, 0)
        .fromTo('.exp-window-outline', { scaleX: .65, scaleY: .25, opacity: .9 }, { scaleX: 1, scaleY: 1, opacity: 0, duration: .32, ease: 'steps(4)', clearProps: 'transform,opacity' }, 0);
    }, element);
    const settle = () => { context.revert(); element.dataset.entering = 'false'; };
    const visibility = () => { if (document.hidden) settle(); };
    window.addEventListener('resize', settle); document.addEventListener('visibilitychange', visibility);
    return () => { settle(); window.removeEventListener('resize', settle); document.removeEventListener('visibilitychange', visibility); };
  }, [active, animateEntrance, reducedMotion]);

  // Ambient drift and pointer depth share ExperienceAquatic's visibility-gated clock.

  return <div ref={root} className="experience-desktop" data-reduced-motion={reducedMotion} inert={!active}>
    <Window kind="notepad" title={experienceDesktop.title} icon="notes">
      <div className="exp-note-paper" data-world-input-island tabIndex={active ? 0 : -1} role="region" aria-label="经历记录，可滚动查看">
        <div className="exp-summary" aria-label="教育与实习概览">
          {experienceCategories.map(category => <section className="exp-summary-group" key={category.id} aria-label={category.label}>
            <h3>{category.label}</h3>
            <ul>{experienceDesktop.records[category.id].map(item => <li key={item.id}><span data-experience-summary={item.id}>{item.label}</span></li>)}</ul>
          </section>)}
        </div>
        <div className="exp-paper-margin" aria-hidden="true"/>
      </div>
      <div className="exp-note-status" aria-hidden="true"><span>我的经历</span><span>UTF-8</span></div>
    </Window>
    <Window kind="browser" title="经历速览" icon="globe">
      <div className="exp-browser-strip" aria-hidden="true"><span>教育 {experienceDesktop.records.education.length} 项</span><span>实习 {experienceDesktop.records.internship.length} 项</span><PixelIcon name="globe"/></div>
      <div className="exp-browser-page"><p>EXPERIENCE</p><h3>{experienceDesktop.records.education[0].label}</h3><span>{experienceDesktop.records.internship[0].label}</span><div className="exp-browser-watermark" aria-hidden="true"><PixelIcon name="globe"/></div></div>
    </Window>
    <Window kind="photo" title="图片查看器" icon="image">
      <div className="exp-viewer-mat"><PhotoSlot/></div>
      <div className="exp-viewer-status" aria-hidden="true"><span>个人照片</span><span>3 : 4</span></div>
    </Window>
    <Window kind="files" title="我的文档" icon="folder">
      <div className="exp-file-path" aria-hidden="true"><PixelIcon name="folder"/><span>经历记录</span></div>
      <div className="exp-folders" aria-hidden="true"><div><PixelIcon name="folder"/><span>教育记录</span></div><div><PixelIcon name="folder"/><span>实习记录</span></div></div>
    </Window>
    <Window kind="notice" title="信息提示" icon="info">
      <div className="exp-notice-copy"><PixelIcon name="info"/><p>正在加载<br/>下一段历程<span className="exp-notice-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div>
    </Window>
  </div>;
}
