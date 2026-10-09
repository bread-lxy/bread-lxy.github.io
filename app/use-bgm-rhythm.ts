"use client";
import { useEffect, type RefObject } from 'react';
import type { BgmTrack } from '../content/bgm';
import type { BgmSnapshot } from './bgm-playback';
import { validBgmAnalysis, sampleBgmBand, type BgmAnalysis } from './bgm-analysis';
import { approach } from './poster-motion';

// Existing attributed React Bits smoothing; no audio graph or React frame state.
const cache = new Map<string, BgmAnalysis>();
export function useBgmRhythm(ref: RefObject<HTMLElement | null>, track: BgmTrack | undefined,
  readFrame: () => BgmSnapshot | null, audible: boolean, enabled: boolean, reduced: boolean) {
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const items = [...host.querySelectorAll<HTMLElement>('[data-world]')];
    const reset = () => {
      host.dataset.musicActive = 'false';
      items.forEach(item => item.style.removeProperty('--music-energy'));
    };
    reset();
    if (!track?.analysis || track.analysis.audioSha256 !== track.asset?.sha256 || !enabled || reduced || !audible) return reset;
    const src = track.analysis.src;
    if (!/^\/audio\/bgm\/analysis\/[a-z0-9-]+\.json$/.test(src)) return reset;
    let disposed = false, inView = false, raf = 0, last = 0, position = -1, frameTrack = '';
    let data: BgmAnalysis | undefined;
    const values = items.map(() => 0), abort = new AbortController();
    const key = `${src}:${track.asset.sha256}`;
    const stop = () => { cancelAnimationFrame(raf); raf = 0; position = -1; values.fill(0); reset(); };
    const tick = (now: number) => {
      raf = 0;
      if (disposed || !inView || document.hidden || !data) return;
      const frame = readFrame();
      if (!frame || frame.trackId !== track.id || frame.status !== 'playing' || frame.volume <= 0) { stop(); return; }
      const jump = frameTrack !== frame.trackId || position < 0 || frame.position < position - .05 || frame.position - position > .25;
      const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
      last = now; position = frame.position; frameTrack = frame.trackId;
      host.dataset.musicActive = 'true';
      items.forEach((item, index) => {
        const target = sampleBgmBand(data!, index, frame.position) * Math.min(1, Math.sqrt(frame.volume / .25));
        values[index] = jump ? target : approach(values[index], target, dt, target > values[index] ? .045 : .16);
        item.style.setProperty('--music-energy', values[index].toFixed(4));
      });
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!disposed && data && inView && !document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const visibility = () => { if (document.hidden) stop(); else start(); };
    const observer = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? false; if (inView) start(); else stop(); });
    observer.observe(host);
    document.addEventListener('visibilitychange', visibility);
    const cached = cache.get(key);
    if (cached) { data = cached; start(); }
    else void fetch(src, { signal: abort.signal }).then(response => {
      if (!response.ok) throw new Error('Optional rhythm data unavailable');
      return response.json() as Promise<unknown>;
    }).then(value => {
      if (disposed || !validBgmAnalysis(value, track)) return;
      cache.set(key, value); data = value; start();
    }).catch(() => { /* No substitute/fake motion. Playback stays independent. */ });
    return () => { disposed = true; abort.abort(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); stop(); };
  }, [ref, track, readFrame, audible, enabled, reduced]);
}
