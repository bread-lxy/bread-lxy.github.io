/** Adapted from React Bits LogoLoop + LineSidebar + ScrollVelocity, David Haz (2026).
 * https://github.com/DavidHDev/react-bits/tree/3a1c7f2f9f94ed833934ab5c2635760b9e644583/src/ts-default
 * MIT + Commons Clause: public/album/licenses/ReactBits-LICENSE.md.
 * Source kernels: seamless measured copies, exponential velocity smoothing,
 * proximity smoothstep and settled-frame threshold. No demo assets are used.
 */
export const wrapRibbon=(offset:number,width:number)=>width>0?((offset%width)+width)%width:0;
export const ribbonCopies=(viewport:number,width:number)=>width>0?Math.max(2,Math.ceil(viewport/width)+2):2;
export const approach=(value:number,target:number,dt:number,tau:number)=>value+(target-value)*(1-Math.exp(-Math.max(0,dt)/tau));
export function lineProximity(distance:number){const p=Math.max(0,1-Math.abs(distance)/100);return p*p*(3-2*p);}

/** Actual native scroll delta, sampled only after a trusted scrolling gesture.
 * Ignore route/viewport jumps and stale frames; cap very short sampling intervals.
 */
export function ribbonScrollVelocity(delta:number,seconds:number,viewportHeight:number,armed:boolean){
  if(!armed||![delta,seconds,viewportHeight].every(Number.isFinite)||seconds<=0||seconds>.1||viewportHeight<=0||Math.abs(delta)>viewportHeight)return 0;
  return delta/Math.max(1/120,seconds);
}

/** ScrollVelocity's scroll speed -> factor -> base-speed modulation, adapted for
 * readable internship text: 28..70px/s, no direction reversal, no Motion runtime.
 * Original: TextAnimations/ScrollVelocity/ScrollVelocity.tsx at the commit above.
 * Its unbounded [0,1000] -> [0,5] mapping becomes a bounded [0,1.5] factor here;
 * the existing LogoLoop exponential approach owns smoothing instead of a spring.
 */
export function ribbonVelocityTarget(scrollVelocity:number){
  const factor=Number.isFinite(scrollVelocity)?Math.min(1.5,Math.abs(scrollVelocity)*1.5/1000):0;
  return 28*(1+factor);
}
