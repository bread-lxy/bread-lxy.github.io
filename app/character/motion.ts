import type { CharacterAction } from "../../content/site";

export type HitRegion = "head" | "ear";
export type CueRequest = { action: CharacterAction; id: number; region?: HitRegion; earIndex?: number };
export type Cue = CueRequest & { startedAt: number; endsAt: number };

const priority: Record<CharacterAction, number> = { idle: 0, enter: 0, preview: 2, tap: 1, confirm: 3 };
const duration: Record<CharacterAction, number> = { idle: 0, enter: 1300, preview: 800, tap: 1600, confirm: 700 };

export function createCue(): Cue {
  return { action: "idle", id: -1, startedAt: 0, endsAt: 0 };
}

/** Absolute deadlines replace competing delayed reset callbacks. */
export function beginCue(current: Cue, incoming: CueRequest, now: number): Cue {
  if (incoming.id === current.id) return current;
  if (now < current.endsAt && priority[incoming.action] < priority[current.action]) return current;
  return { ...incoming, startedAt: now, endsAt: now + duration[incoming.action] };
}

export function sampleCue(cue: Cue, now: number) {
  if (now >= cue.endsAt || cue.action === "idle") return { action: "idle" as CharacterAction, region: cue.region, earIndex: cue.earIndex, progress: 1, weight: 0 };
  const progress = Math.max(0, Math.min(1, (now - cue.startedAt) / (cue.endsAt - cue.startedAt)));
  // Fast readable anticipation, a small hold, and a longer settle.
  const fadeIn = Math.min(1, progress / 0.18);
  const fadeOut = Math.min(1, (1 - progress) / 0.35);
  const smooth = (value: number) => value * value * (3 - 2 * value);
  return { action: cue.action, region: cue.region, earIndex: cue.earIndex, progress, weight: smooth(fadeIn) * smooth(fadeOut) };
}

export function canAnimate(state: { ready: boolean; active: boolean; visible: boolean; inViewport: boolean; reducedMotion: boolean }) {
  return state.ready && state.active && state.visible && state.inViewport && !state.reducedMotion;
}

/** Pace only the mesh work, not browser scrolling or interface animation. */
export function createRenderClock(start: number) {
  const interval = 1000 / 30;
  let scheduled = start;
  let rendered = start;
  return (now: number): number | null => {
    const elapsed = now - scheduled;
    if (elapsed + 0.001 < interval || now <= rendered) return null;
    scheduled += Math.floor((elapsed + 0.001) / interval) * interval;
    const dt = Math.min(0.05, (now - rendered) / 1000);
    rendered = now;
    return dt;
  };
}

export function normalisePointer(x: number, y: number, width: number, height: number) {
  if (!(width > 0 && height > 0 && Number.isFinite(x) && Number.isFinite(y))) return { x: 0, y: 0 };
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  return { x: clamp(x / width * 2 - 1), y: clamp(y / height * 2 - 1) };
}

/** Seeded non-uniform intervals: repeatable for tests, not metronomic to visitors. */
export function createBlinkClock(seed = 1289) {
  let nextAt = 2200;
  let blinkAt = -1000;
  return (now: number) => {
    if (now >= nextAt) {
      blinkAt = now;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      nextAt = now + 2700 + (seed / 4294967296) * 3100;
    }
    const elapsed = now - blinkAt;
    if (elapsed < 0 || elapsed > 230) return 1;
    return elapsed < 85 ? 1 - elapsed / 85 : Math.min(1, (elapsed - 85) / 145);
  };
}
