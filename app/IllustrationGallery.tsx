"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { safeContentUrl, type ContentItem } from '../content/site';
import './publication-illustration.css';

/** A detail is a second view of the same image, never a second portfolio item. */
const detailViews: Record<string, { x: string; y: string; scale: number; credit: string }> = {
  'sample-character': { x: '51%', y: '19%', scale: 1.72, credit: '排版样片 · 本站 OC 素材' },
  'sample-art-pomegranate': { x: '29%', y: '50%', scale: 1.62, credit: '版式样片 · 非本人作品 · CMA / CC0' },
  'sample-art-pine': { x: '46%', y: '28%', scale: 1.45, credit: '版式样片 · 非本人作品 · NGA / Public Domain' },
};

function Artwork({ item, sample, index, onMedia, reducedMotion }: { item: ContentItem; sample: boolean; index: number; onMedia: (item: ContentItem) => void; reducedMotion: boolean }) {
  const src = safeContentUrl(item.media?.src);
  const imageRef = useRef<HTMLImageElement>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLButtonElement>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !!src && failedSrc === src;
  useLayoutEffect(() => {
    const image = imageRef.current;
    if (src && !failed && image?.complete && image.naturalWidth === 0) setFailedSrc(src);
  }, [src, failed]);
  const detail = detailViews[item.id];
  const width = item.media?.width;
  const height = item.media?.height;
  const detailStyle = detail ? { '--detail-x': detail.x, '--detail-y': detail.y, '--detail-scale': detail.scale } as CSSProperties : undefined;
  const playable = !!src && !failed;
  const rebalance = (focused: 'main' | 'detail' | null) => {
    if (!detail || reducedMotion || !mainRef.current || !detailRef.current || matchMedia('(max-width: 700px), (prefers-reduced-motion: reduce)').matches) return;
    // A small, uncropped version of Accordion Gallery's GSAP flex balance.
    gsap.to(mainRef.current, { flexGrow: focused === 'main' ? 1.2 : focused === 'detail' ? .98 : 1.08, duration: .34, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(detailRef.current, { flexGrow: focused === 'detail' ? 1.02 : focused === 'main' ? .8 : .92, duration: .34, ease: 'power2.out', overwrite: 'auto' });
  };
  return <article
    className={`illustration-row illustration-row-${index + 1} pub-anchor`}
    id={`item-${item.id}`}
    tabIndex={-1}
    data-content-id={sample ? undefined : item.id}
    data-illustration-row
    data-illustration-work
  >
    <div className="illustration-row-meta">
      {item.year && (item.year === '20XX' ? <span className="illustration-year">{item.year}</span> : <time className="illustration-year">{item.year}</time>)}
    </div>
    <div className="illustration-image-column">
      {playable ? <>
        <div className={`illustration-pair ${detail ? 'has-detail' : 'is-single'}`} style={detailStyle}>
          <button ref={mainRef} className="illustration-image-button illustration-main" type="button" onPointerEnter={() => rebalance('main')} onPointerLeave={() => rebalance(null)} onFocus={() => rebalance('main')} onBlur={() => rebalance(null)} onClick={() => onMedia(item)} data-focus-key={`media-${item.id}`} aria-label={`查看完整图片：${item.title}`}>
            <span className="illustration-image-plane">
              <img ref={imageRef} src={src} alt={item.media?.alt || item.title} width={width} height={height} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSrc(src)} />
            </span>
            {index === 0 && <span className="illustration-signal" aria-hidden="true" />}
          </button>
          {detail && <button ref={detailRef} className="illustration-image-button illustration-detail" type="button" onPointerEnter={() => rebalance('detail')} onPointerLeave={() => rebalance(null)} onFocus={() => rebalance('detail')} onBlur={() => rebalance(null)} onClick={() => onMedia(item)} data-focus-key={`media-detail-${item.id}`} aria-label={`查看完整图片：${item.title}（局部预览）`}>
            <span className="illustration-image-plane"><img src={src} alt="" aria-hidden="true" width={width} height={height} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSrc(src)} /></span>
          </button>}
        </div>
        <div className="illustration-row-footer">
          {sample && <span className="illustration-sample-mark">{detail?.credit || '排版样片'}</span>}
          <button className="illustration-detail-link" type="button" onClick={() => onMedia(item)} data-focus-key={`media-link-${item.id}`} aria-label={`查看详情：${item.title}`}>
            <span>查看详情</span><span className="illustration-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
      </> : <div className="illustration-image-missing" role="status">图片暂时无法加载</div>}
    </div>
  </article>;
}

/** One shared first-viewport handoff, adapted from React Bits' one-shot
 * intersection reveal and MaskedHeading clip. Later rows enter independently.
 * CSS is the complete static fallback; animation never pins or blocks scroll. */
export function IllustrationGallery({ items, sample, onMedia, reducedMotion, active }: {
  items: ContentItem[];
  sample: boolean;
  onMedia: (item: ContentItem) => void;
  reducedMotion: boolean;
  active: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const played = useRef(false);
  const itemKey = items.map(item => item.id).join('|');
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const noMotion = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!active || played.current || noMotion) {
      node.dataset.illustrationMotion = !active ? 'inactive' : played.current ? 'complete' : 'reduced';
      return;
    }
    const title = node.querySelector<HTMLElement>('[data-illustration-title]');
    const intro = node.querySelector<HTMLElement>('[data-illustration-intro]');
    const rows = [...node.querySelectorAll<HTMLElement>('[data-illustration-row]')];
    const first = rows[0];
    const main = first?.querySelector<HTMLElement>('.illustration-main');
    const detail = first?.querySelector<HTMLElement>('.illustration-detail');
    const year = first?.querySelector<HTMLElement>('.illustration-year');
    const footer = first?.querySelector<HTMLElement>('.illustration-row-footer');
    const signal = first?.querySelector<HTMLElement>('.illustration-signal');
    if (!title || !intro || !first || !main || !footer) return;
    const later = rows.slice(1);
    node.dataset.illustrationMotion = 'armed';
    gsap.set(title, { clipPath: 'inset(0% 100% 0% 0%)', y: 16, opacity: 1 });
    gsap.set(intro, { y: 22, opacity: 0 });
    gsap.set(main, { y: 88, opacity: 0 });
    if (detail) gsap.set(detail, { y: 110, opacity: 0 });
    if (year) gsap.set(year, { y: 20, opacity: 0 });
    gsap.set(footer, { y: 18, opacity: 0 });
    if (signal) gsap.set(signal, { opacity: .82, clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(later, { y: 55, opacity: 0 });
    let started = false;
    let headingObserver: IntersectionObserver;
    const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: () => {
      played.current = true;
      node.dataset.illustrationMotion = 'complete';
      gsap.set([title, intro, main, ...(detail ? [detail] : []), ...(year ? [year] : []), footer, ...(signal ? [signal] : [])], { clearProps: 'all' });
    } });
    timeline.to(title, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: .48 }, 0)
      .to(intro, { y: 0, opacity: 1, duration: .53 }, .11)
      .to(main, { y: 0, opacity: 1, duration: .73, ease: 'back.out(1.08)' }, .16);
    if (detail) timeline.to(detail, { y: 0, opacity: 1, duration: .64, ease: 'power3.out' }, .3);
    if (year) timeline.to(year, { y: 0, opacity: 1, duration: .44 }, .42);
    timeline.to(footer, { y: 0, opacity: 1, duration: .45 }, .59)
      .to(title, { x: -8, opacity: .83, duration: .42, ease: 'power2.out' }, .66);
    if (signal) timeline.to(signal, { opacity: 0, clipPath: 'inset(0% 0% 0% 100%)', duration: .66, ease: 'power2.out' }, .28);
    const enter = () => {
      if (started || document.hidden) return;
      const headingRect = node.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      if (!headingRect.width || !firstRect.width || firstRect.top >= innerHeight * .91 || firstRect.bottom <= 0) return;
      started = true;
      node.dataset.illustrationMotion = 'playing';
      headingObserver.disconnect();
      timeline.play();
    };
    headingObserver = new IntersectionObserver(enter, { rootMargin: '0px 0px -9% 0px', threshold: 0 });
    headingObserver.observe(first);
    const laterObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || document.hidden) continue;
        const element = entry.target as HTMLElement;
        if (!element.getBoundingClientRect().width) continue;
        laterObserver.unobserve(element);
        gsap.to(element, { y: 0, opacity: 1, duration: .67, ease: 'power3.out', onComplete: () => gsap.set(element, { clearProps: 'transform,opacity,visibility' }) });
      }
    }, { rootMargin: '0px 0px -11% 0px', threshold: 0 });
    later.forEach(element => laterObserver.observe(element));
    const frame = requestAnimationFrame(enter);
    const onVisible = () => { if (!document.hidden) enter(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisible);
      headingObserver.disconnect();
      laterObserver.disconnect();
      timeline.kill();
      gsap.killTweensOf(later);
      gsap.set([title, intro, main, ...(detail ? [detail] : []), ...(year ? [year] : []), footer, ...(signal ? [signal] : []), ...later], { clearProps: 'all' });
      if (!played.current) node.dataset.illustrationMotion = 'reset';
    };
  }, [active, reducedMotion, itemKey]);

  return <div className="illustration-scene" ref={root}>
    <div id="studio-original" className="pub-anchor illustration-heading" tabIndex={-1}>
      <h3 className="illustration-title-line"><span data-illustration-title>Illustration</span></h3>
      <p data-illustration-intro>我曾经梦想去当艺术生...好吧，其实现在、未来也都想啊...！</p>
    </div>
    <div id="studio-fan-art" className="pub-anchor illustration-subanchor" tabIndex={-1} />
    <div id="studio-study" className="pub-anchor illustration-subanchor" tabIndex={-1} />
    <div className={`illustration-gallery ${sample ? 'illustration-gallery-sample' : 'illustration-gallery-real'}`}>
      {items.map((item, index) => <Artwork key={item.id} item={item} sample={sample} index={index} onMedia={onMedia} reducedMotion={reducedMotion} />)}
    </div>
  </div>;
}
