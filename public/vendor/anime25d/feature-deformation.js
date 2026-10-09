/** Local mesh refinements; MIT. These deform existing art, not new painted expression assets. */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function neckBlend(y, top, bottom) {
  const u = clamp((bottom - y) / Math.max(1, bottom - top), 0, 1);
  const head = u * u * (3 - 2 * u);
  return { head, follow: .16 + .84 * head, depth: .9 + .1 * head };
}
export function closedEyeY(y, center, smile = 0) {
  // The source is a smiling arc: flatten it for an ordinary blink, retain it for joy.
  return center + (y - center) * (.38 + .62 * clamp(smile, 0, 1));
}
export function closedMouthPoint(x, y, cx, halfWidth, faceScale, form = 0) {
  const q = Math.min(1, Math.abs(x - cx) / Math.max(1, halfWidth));
  return [cx + (x - cx) * (1 + form * .06), y - form * 4 * faceScale * (q * q - .25)];
}
