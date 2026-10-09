/** Local art direction only: no changes to worlds, routes or résumé records. */
export const aquaticAssets = {
  fantail: '/experience/aquatic/fantail-v5.png',
  comet: '/experience/aquatic/comet-v5.png',
  caustics: '/experience/aquatic/caustics-cc0.png',
} as const;
export type AquaticLayer = 'far' | 'near';
export const windowMotion = [
  { kind: 'notepad', amplitude: 2, period: 22, phase: .4 },
  { kind: 'photo', amplitude: 3, period: 19, phase: 1.3 },
  { kind: 'browser', amplitude: 6, period: 20, phase: 2.1 },
  { kind: 'files', amplitude: 4, period: 17, phase: 3.4 },
  { kind: 'notice', amplitude: 6, period: 15, phase: 4.2 },
] as const;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export function aquaticSize(width: number, height: number) {
  const w = Math.max(1, Number.isFinite(width) ? width : 1);
  const h = Math.max(1, Number.isFinite(height) ? height : 1);
  const scale = Math.min(.5, w <= 700 ? 300 / w : 720 / w, w <= 700 ? 660 / h : 450 / h);
  return { width: Math.max(1, Math.floor(w * scale)), height: Math.max(1, Math.floor(h * scale)) };
}
export function windowOffset(index: number, seconds: number, pointerX = 0, pointerY = 0) {
  const m = windowMotion[index];
  const t = seconds * Math.PI * 2 / m.period + m.phase;
  // Same current, phase-delayed. Integral CSS pixels keep pixel type crisp.
  return {
    x: Math.round(clamp(m.amplitude * (.68 * Math.sin(t) + .32 * pointerX), -m.amplitude, m.amplitude)),
    y: Math.round(clamp(m.amplitude * (.76 * Math.cos(t * .84) + .24 * pointerY), -m.amplitude, m.amplitude)),
  };
}
// Small pools, not an equally spaced school. Independent passages make the
// visible density vary as fish overlap, pass behind windows or leave the frame.
export function fishCount(layer: AquaticLayer, mobile: boolean) { return layer === 'near' ? (mobile ? 2 : 3) : (mobile ? 3 : 6); }

export const DEFAULT_FISH_SEED = 73021;

// Stable random values per passage, never frame-by-frame jitter. A visit supplies
// one shared seed to both canvases; the default keeps geometry tests reproducible.
function random(seed: number, stream: number) {
  let n = (seed ^ Math.imul(stream + 1, 0x9e3779b9)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
  return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
}

/** Independent curved passages through the whole water column, not swim lanes.
 * Re-sample silhouette, size and course only when the entire fish is offscreen. */
export function fishPose(layer: AquaticLayer, index: number, seconds: number, width: number, height: number, mobile = width <= 700, seed = DEFAULT_FISH_SEED) {
  const near = layer === 'near';
  const id = index + (near ? 11 : 1);
  const birth = (seed ^ Math.imul(id, 73856093)) >>> 0;
  const duration = (mobile ? 43 : 58) + random(birth, 0) * (mobile ? 27 : 43);
  const elapsed = Math.max(0, seconds) / duration + .12 + random(birth, 1) * .74;
  const passage = Math.floor(elapsed), progress = elapsed - passage;
  const routeSeed = (birth ^ Math.imul(passage + 1, 19349663)) >>> 0;
  const r = (stream: number) => random(routeSeed, stream);
  const species = r(0) < .5 ? 0 : 1;
  const scale = clamp(width / 1440, mobile ? .52 : .68, 1.5);
  const size = (near ? 88 + r(1) * 100 : 42 + r(1) * 62) * scale;
  // A constant generous margin encloses every silhouette, rotation and tail bend.
  // Different cycles may change course without a visible teleport or mirror flip.
  const margin = (near ? 190 : 115) * scale;
  const rightward = random(birth, 2) > .5;
  const travel = width + margin * 2;
  const x = (rightward ? progress : 1 - progress) * travel - margin;
  const fieldHeight = Math.min(height, mobile ? 740 : width <= 1000 ? 900 : height);
  const top = Math.min(fieldHeight * .16, mobile ? 125 : 115);
  const bottom = fieldHeight * .81;
  // A loose diagonal/arched route with independent entry, exit and control points.
  // Positions span the scene; neither indices nor textures map to a fixed row.
  // Jittered low-discrepancy sampling avoids a bad opening where every fish
  // happens to gather at the same height. The offset changes on every passage;
  // these are broad curved courses, never persistent or evenly spaced rows.
  const depth = (random(seed,31) + id*.61803398875 + passage*.41421356 + (r(2)-.5)*.22) % 1;
  const y0 = top + depth * (bottom - top);
  const y3 = clamp(y0 + (r(3)-.5)*fieldHeight*.55, top, bottom);
  const y1 = clamp(y0 + (r(4)-.5)*fieldHeight*.45, top, bottom);
  const y2 = clamp(y3 + (r(5)-.5)*fieldHeight*.45, top, bottom);
  const p = progress, q = 1 - p;
  const phase = r(6) * Math.PI * 2;
  const wave = Math.sin(p * Math.PI * 2 + phase) * 16 * scale;
  const y = q*q*q*y0 + 3*q*q*p*y1 + 3*q*p*p*y2 + p*p*p*y3 + wave;
  const slope = 3*q*q*(y1-y0) + 6*q*p*(y2-y1) + 3*p*p*(y3-y2) + Math.cos(p*Math.PI*2+phase)*Math.PI*32*scale;
  return {
    x, y, width: size, height: size * (species === 0 ? 2 / 3 : .5),
    angle: Math.atan(slope / ((rightward ? 1 : -1) * travel)),
    direction: rightward ? -1 : 1, alpha: near ? .9 : .43 + random(birth, 3) * .22,
    phase, species, passage,
  };
}
