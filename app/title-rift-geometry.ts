/** Five horizontal track mattes; the large first band reveals the face as one piece.
 * Composition reference: Matt Stone's Goodgrowth case study (2026-08-27).
 * Not a copy of Goodgrowth's site source; see docs/research/title-rift.md.
 */
export const RIFT_TIMING = {minimumLoad: 700, maximumLoad: 2500, form: .50, button: .18, press: .12, reveal: .9, reduced: .12} as const;

export function riftGeometry(width: number, height: number, wordmarkWidth = 69.5) {
  const mobile = width <= 700;
  const pixel = Math.max(2, Math.floor(width * (mobile ? .90 : .76) / wordmarkWidth));
  const nameWidth = wordmarkWidth * pixel, nameHeight = 9.5 * pixel;
  const x = Math.round((width - nameWidth) / 2), y = Math.round(height * .41);
  const baseline = y + nameHeight;
  const buttonWidth = mobile ? 190 : 212, buttonHeight = mobile ? 64 : 68;
  const buttonY = Math.min(height - buttonHeight - 36, baseline + Math.max(mobile ? 54 : 58, height * .075));
  const cuts = [0, ...[.2, .4, .6, .8].map(r => Math.round(y + nameHeight * r)), height];
  const faceX = width * (mobile ? .50 : width <= 1100 ? .65 : .66);
  const splits = [0, -.04, .03, -.02, .02].map(offset => Math.round((faceX + width * offset) / pixel) * pixel);
  return {width,height,mobile,pixel,x,y,nameWidth,nameHeight,baseline,buttonWidth,buttonHeight,buttonY,
    bands: cuts.slice(0,5).map((top,i)=>({top,height:cuts[i+1]-top,split:splits[i],delay:i*.045}))};
}
