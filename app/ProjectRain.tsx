"use client";

import { useCallback, useEffect, useRef } from 'react';

type RainLayer = 'ambient' | 'plate';
type RainOptions = {
  theme: 'binary';
  charset: string;
  background: 'transparent';
  color: string;
  leadColor: string;
  fadeAlpha: number;
  fontSize: number;
  speed: number;
  density: number;
  glow: number;
  autoStart: false;
};
type RainInstance = {
  pause(): void;
  resume(): void;
  destroy(): void;
  /** Pinned upstream's frame renderer; used only to paint a motionless first frame. */
  _drawFrame(): void;
};
type RainConstructor = new (host: HTMLElement, options: RainOptions) => RainInstance;

declare global {
  interface Window { MatrixRain?: RainConstructor }
}

let sourcePromise: Promise<RainConstructor> | undefined;

function loadSource(): Promise<RainConstructor> {
  if (window.MatrixRain) return Promise.resolve(window.MatrixRain);
  if (sourcePromise) return sourcePromise;
  sourcePromise = new Promise<RainConstructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/matrixrain/matrixrain.js';
    script.async = true;
    script.onload = () => window.MatrixRain ? resolve(window.MatrixRain) : reject(new Error('MatrixRain did not register'));
    script.onerror = () => { script.remove(); reject(new Error('MatrixRain source could not load')); };
    document.head.appendChild(script);
  }).catch(error => {
    sourcePromise = undefined;
    throw error;
  });
  return sourcePromise;
}

// Repeated digits are intentional: the upstream renderer samples each character,
// so punctuation remains occasional without changing its drawing algorithm.
const charset = '000000000000111111111111<>{}/';
const options: Record<RainLayer, RainOptions> = {
  ambient: {
    theme: 'binary', charset, background: 'transparent', color: '#81e99e',
    leadColor: '#eaffec', fadeAlpha: .085, fontSize: 16, speed: 72,
    density: .54, glow: 3, autoStart: false,
  },
  plate: {
    theme: 'binary', charset, background: 'transparent', color: '#a6ff72',
    leadColor: '#f0ffe5', fadeAlpha: .07, fontSize: 15, speed: 54,
    density: .78, glow: 4, autoStart: false,
  },
};

function paintStill(rain: RainInstance) {
  // An established trail is visible immediately, including in reduced motion.
  // These upstream frames are drawn synchronously, without a visible animation.
  for (let frame = 0; frame < 24; frame++) rain._drawFrame();
}

export function ProjectRain({ layer, active, reducedMotion }: {
  layer: RainLayer;
  active: boolean;
  reducedMotion: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rainRef = useRef<RainInstance | null>(null);
  const inViewRef = useRef(false);
  const canAnimateRef = useRef(active && !reducedMotion);

  const syncPlayback = useCallback(() => {
    const rain = rainRef.current;
    if (!rain) return;
    if (canAnimateRef.current && inViewRef.current && !document.hidden) rain.resume();
    else rain.pause();
  }, []);

  useEffect(() => {
    canAnimateRef.current = active && !reducedMotion;
    syncPlayback();
  }, [active, reducedMotion, syncPlayback]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let resizeFrame = 0;
    const onVisibility = () => syncPlayback();
    document.addEventListener('visibilitychange', onVisibility);
    const viewport = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      inViewRef.current = Boolean(entries[0]?.isIntersecting);
      syncPlayback();
    }, { threshold: .01 });
    if (viewport) viewport.observe(host);
    else inViewRef.current = true;

    let resize: ResizeObserver | null = null;
    void loadSource().then(MatrixRain => {
      if (disposed) return;
      const rain = new MatrixRain(host, options[layer]);
      rainRef.current = rain;
      paintStill(rain);
      host.dataset.rainState = 'ready';
      // The library clears its canvas on resize. Repaint a still before the next tick.
      if (typeof ResizeObserver !== 'undefined') {
        resize = new ResizeObserver(() => {
          cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(() => { if (!disposed) paintStill(rain); });
        });
        resize.observe(host);
      }
      syncPlayback();
    }).catch(() => { if (!disposed) host.dataset.rainState = 'unavailable'; });

    return () => {
      disposed = true;
      viewport?.disconnect();
      resize?.disconnect();
      cancelAnimationFrame(resizeFrame);
      document.removeEventListener('visibilitychange', onVisibility);
      rainRef.current?.destroy();
      rainRef.current = null;
    };
  }, [layer, syncPlayback]);

  return <div ref={hostRef} className={`project-rain project-rain-${layer}`} data-project-rain={layer} aria-hidden="true" />;
}
