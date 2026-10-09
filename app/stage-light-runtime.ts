import {createRenderClock} from './character/motion.ts';

export const STAGE_LIGHT_MAX_PIXELS = 1440 * 900;

/** A decorative pass must not compete with the existing 30 fps character. */
export function stageLightSize(width: number, height: number, deviceDpr = 1) {
  const w = Number.isFinite(width) ? Math.max(1, width) : 1;
  const h = Number.isFinite(height) ? Math.max(1, height) : 1;
  const requestedDpr = Number.isFinite(deviceDpr) && deviceDpr > 0 ? deviceDpr : 1;
  const dpr = Math.min(1, requestedDpr, Math.sqrt(STAGE_LIGHT_MAX_PIXELS / (w * h)));
  return {width:w, height:h, dpr, pixelWidth:Math.max(1, Math.floor(w*dpr)), pixelHeight:Math.max(1, Math.floor(h*dpr))};
}

export type StageLightFlags = {
  active:boolean; paused:boolean; reducedMotion:boolean;
  visible:boolean; hidden:boolean; ready:boolean;
};
export type StageLightState = 'inactive' | 'offscreen' | 'hidden' | 'paused' | 'loading' | 'static' | 'playing' | 'fallback' | 'disposed';
type LoopOptions = {
  now:()=>number;
  requestFrame:(callback:(now:number)=>void)=>number;
  cancelFrame:(id:number)=>void;
  draw:(seconds:number)=>void;
  onState?:(state:StageLightState)=>void;
  onFrame?:(frames:number, seconds:number)=>void;
};

/** Scheduling only: the upstream shader is unchanged. No DOM or renderer ownership here. */
export function createStageLightLoop(options:LoopOptions, initial:StageLightFlags) {
  let flags = {...initial};
  let state:StageLightState = 'loading';
  let frame:number|null = null, clock:ReturnType<typeof createRenderClock>|null = null;
  let seconds = 0, frames = 0, dirty = true, failed = false, disposed = false;
  const stop = () => {
    if (frame !== null) options.cancelFrame(frame);
    frame = null; clock = null;
  };
  const publish = (next:StageLightState) => {
    if (state === next) return;
    state = next; options.onState?.(state);
  };
  const fail = () => { if (disposed) return; failed=true; stop(); publish('fallback'); };
  const draw = (time:number) => {
    try { options.draw(time); frames++; dirty=false; options.onFrame?.(frames,time); }
    catch { fail(); }
  };
  const tick = (now:number) => {
    frame = null;
    if (disposed || failed || state !== 'playing' || !clock) return;
    const dt = clock(now);
    if (dt !== null) { seconds += dt; draw(seconds); }
    if (!disposed && !failed && state === 'playing') frame=options.requestFrame(tick);
  };
  const sync = () => {
    const next:StageLightState = disposed ? 'disposed' : failed ? 'fallback'
      : !flags.active ? 'inactive' : flags.hidden ? 'hidden' : !flags.visible ? 'offscreen'
      : !flags.ready ? 'loading' : flags.reducedMotion ? 'static' : flags.paused ? 'paused' : 'playing';
    if (next !== 'playing') stop();
    publish(next);
    if (next === 'static' && dirty) draw(0);
    if (next === 'playing' && frame === null) {
      clock=createRenderClock(options.now());
      frame=options.requestFrame(tick);
    }
  };
  sync();
  return {
    update(next:Partial<StageLightFlags>) {
      if (disposed) return;
      if (next.reducedMotion !== undefined && next.reducedMotion !== flags.reducedMotion) dirty=true;
      if (next.ready === true && !flags.ready) dirty=true;
      flags={...flags,...next}; sync();
    },
    invalidate() { if (!disposed) {dirty=true;sync();} },
    fail,
    dispose() { if (!disposed) {disposed=true;stop();publish('disposed');} },
    snapshot:()=>({state,frames,seconds}),
  };
}

/**
 * React Bits SideRays — Copyright (c) 2026 David Haz.
 * MIT + Commons Clause; full notice: public/album/licenses/ReactBits-LICENSE.md.
 * https://github.com/DavidHDev/react-bits/blob/3a1c7f2f9f94ed833934ab5c2635760b9e644583/src/ts-default/Backgrounds/SideRays/SideRays.tsx
 * Both shaders below are byte-faithful to that revision. Adaptations are host lifecycle,
 * 30 fps / resolution budgets and the approved warm stage uniforms, not new shader art.
 */
export const SIDE_RAYS_VERTEX = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

export const SIDE_RAYS_FRAGMENT = `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform vec3 iRayColor1;
uniform vec3 iRayColor2;
uniform float iIntensity;
uniform float iSpread;
uniform float iFlipX;
uniform float iFlipY;
uniform float iTilt;
uniform float iSaturation;
uniform float iBlend;
uniform float iFalloff;
uniform float iOpacity;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0) *
    clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad);
  float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

  float halfSpread = iSpread * 0.275;
  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);

  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
  color.rgb *= brightness;

  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);

  color.a = max(color.r, max(color.g, color.b)) * iOpacity;
  gl_FragColor = color;
}`;
