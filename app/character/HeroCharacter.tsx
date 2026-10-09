"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { CharacterRendererProps } from "./types";
import { beginCue, canAnimate, createBlinkClock, createCue, createRenderClock, normalisePointer, sampleCue, type HitRegion } from "./motion";
import { rigProblems } from "./validate-rig";
import { accessoryHitBox, characterParameters, characterPose } from "./performance";
import { advanceGreeting, createGreeting, createGreetingReadyGate, GREETING_DURATION, GREETING_SETTLE } from './greeting';
import {blendPosterHandoff,POSTER_HANDOFF_MS} from './poster-handoff';

type Player = {
  render: (params: Record<string, number | boolean>, seconds: number) => boolean;
  resize: (width: number, height: number, dpr?: number) => void;
  dispose: () => void;
  getMetadata?: () => unknown;
};

export function HeroCharacter({ pose, action, actionId, active, assets, reducedMotion, onInteract, expression, onStatusChange,world,onGreetingBusy,entranceReady=true,preloadReady=false,posterHandoff=false }: CharacterRendererProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player | null>(null);
  const failRef = useRef<(error: unknown) => void>(() => {});
  const cueRef = useRef(createCue());
  const greetingRef = useRef(createGreeting());
  const greetingBusyRef=useRef(true);
  const interactedRef = useRef(false);
  const renderedParameters = useRef<Record<string,number|boolean>|null>(null);
  const localIdRef = useRef(1_000_000);
  const blinkRef = useRef(createBlinkClock());
  const timeRef = useRef(0);
  const handoffElapsed=useRef(POSTER_HANDOFF_MS);
  const handoffRequested=useRef(posterHandoff);handoffRequested.current=posterHandoff;
  const targetRef = useRef({ x: 0, y: 0 });
  const gazeRef = useRef({ x: 0, y: 0 });
  const poseRef = useRef({ tilt: -0.12, brow: 0, eyes: 1 });
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [hasActivated, setHasActivated] = useState(false);
  const [visible, setVisible] = useState(true);
  const [inViewport, setInViewport] = useState(true);
  const [reaction, setReaction] = useState<{ id: number; region: HitRegion; earIndex?: number } | null>(null);
  const [generation, setGeneration] = useState(0);
  const [posterFailed, setPosterFailed] = useState(false);
  useEffect(() => setPosterFailed(false), [assets.posterUrl]);
  useEffect(() => onStatusChange?.(reducedMotion ? 'reduced' : status), [status,reducedMotion,onStatusChange]);
  useEffect(()=>{if(reducedMotion||status==='fallback'){greetingBusyRef.current=false;onGreetingBusy?.(false);}},[reducedMotion,status,onGreetingBusy]);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);

  useEffect(()=>{
    // Only a real page departure cancels a pending greeting. Tab, modifier keys,
    // the opening ENTER and harmless clicks are not navigation intentions.
    const interrupt=()=>{if(entranceReady&&scrollY>2)interactedRef.current=true;};
    window.addEventListener('scroll',interrupt,{passive:true});
    return()=>window.removeEventListener('scroll',interrupt);
  },[entranceReady]);

  useEffect(() => {
    if (active && (entranceReady||preloadReady)) setHasActivated(true);
    else { cueRef.current = createCue(); targetRef.current = { x: 0, y: 0 }; }
  }, [active, entranceReady, preloadReady]);

  useEffect(() => {
    if(!['idle','enter'].includes(action))interactedRef.current=true;
    cueRef.current = action === 'idle' ? createCue() : beginCue(cueRef.current, { action, id: actionId }, performance.now());
  }, [action, actionId]);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting), { threshold: 0.05 });
    if (stageRef.current) observer.observe(stageRef.current);
    return () => { document.removeEventListener("visibilitychange", onVisibility); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!active || reducedMotion) return;
    const track = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "touch") return;
      const bounds = stageRef.current?.closest(".hero-lobby")?.getBoundingClientRect() || stageRef.current?.getBoundingClientRect();
      if (!bounds || event.clientY < bounds.top || event.clientY > bounds.bottom) { targetRef.current = { x: 0, y: 0 }; return; }
      targetRef.current = normalisePointer(event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height);
    };
    const reset = () => { targetRef.current = { x: 0, y: 0 }; };
    window.addEventListener("pointermove", track);
    document.documentElement.addEventListener("pointerleave", reset);
    return () => { window.removeEventListener("pointermove", track); document.documentElement.removeEventListener("pointerleave", reset); };
  }, [active, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !hasActivated || !canvasRef.current) return;
    const controller = new AbortController();
    let disposed = false;
    let ownedPlayer: Player | null = null;
    const canvas = canvasRef.current;
    setStatus("loading");
    const fail = (error: unknown) => {
      if (disposed) return;
      console.warn("Character uses its static poster:", error instanceof Error ? error.message : "render failed");
      if (playerRef.current === ownedPlayer) playerRef.current = null;
      ownedPlayer?.dispose();
      ownedPlayer = null;
      setStatus("fallback");
    };
    failRef.current = fail;
    const resize = () => {
      const rect = stageRef.current?.getBoundingClientRect();
      try {
        if (rect) ownedPlayer?.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, 1.5));
      } catch (error) { fail(error); }
    };
    const observer = new ResizeObserver(resize);
    if (stageRef.current) observer.observe(stageRef.current);
    const contextLost = (event: Event) => {
      event.preventDefault();
      setStatus("fallback");
    };
    const contextRestored = () => setGeneration((value) => value + 1);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);
    async function load() {
      try {
        // Absolute URL keeps Vite from treating this unbundled public module as a source import.
        const moduleUrl = new URL("/vendor/anime25d/character-player.js", window.location.origin).href;
        const { createCharacterPlayer } = await import(/* @vite-ignore */ moduleUrl);
        if (disposed) return;
        const player: Player = await createCharacterPlayer({
          canvas, psdUrl: assets.psdUrl, settingsUrl: assets.settingsUrl, signal: controller.signal,
          layerOverrides: { headwear: { group: "body", depth: 0.9 } },
          accessories: assets.accessories ?? [],
        });
        if (disposed) { player.dispose(); return; }
        ownedPlayer = player;
        playerRef.current = player;
        if (player.getMetadata) {
          const problems = rigProblems(player.getMetadata());
          if (problems.length) throw new Error(problems.join("; "));
        }
        resize();
        if (!ownedPlayer) return;
        // First visible mesh frame uses the same face contract as idle, not the
        // upstream demo defaults (which briefly flash a different expression).
        handoffElapsed.current=handoffRequested.current&&!interactedRef.current&&timeRef.current===0?0:POSTER_HANDOFF_MS;
        const initial=blendPosterHandoff(characterParameters({seconds:timeRef.current/1000,gaze:{x:0,y:0},pose:poseRef.current,blink:1,cue:sampleCue(createCue(),performance.now())}),handoffElapsed.current);
        if (!player.render(initial, timeRef.current/1000)) throw new Error("Initial character frame unavailable");
        renderedParameters.current=initial;
        setStatus("ready");
      } catch (error) {
        if (!disposed && !controller.signal.aborted) {
          fail(error);
        }
      }
    }
    void load();
    return () => {
      disposed = true;
      controller.abort();
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      ownedPlayer?.dispose();
      if (playerRef.current === ownedPlayer) playerRef.current = null;
      if (failRef.current === fail) failRef.current = () => {};
    };
  }, [assets.psdUrl, assets.settingsUrl, assets.accessories, reducedMotion, hasActivated, generation]);

  const animate = canAnimate({ ready: status === "ready", active: active && entranceReady, visible, inViewport, reducedMotion });
  useEffect(()=>{
    if(!entranceReady)return;
    if(!active||!visible||!inViewport||reducedMotion){
      // A pending performance has not happened yet. Visibility observation may
      // settle one frame after the title disappears; don't consume it unseen.
      if(active&&!reducedMotion&&!interactedRef.current&&greetingRef.current.phase==='pending')return;
      greetingRef.current=advanceGreeting(greetingRef.current,{ready:false,eligible:false,interacted:interactedRef.current,now:performance.now()});
      if(stageRef.current)stageRef.current.dataset.greeting=greetingRef.current.phase;
      greetingBusyRef.current=false;onGreetingBusy?.(false);
    }
  },[active,visible,inViewport,reducedMotion,onGreetingBusy,entranceReady]);
  useEffect(() => {
    if (!animate) {
      // Ordinary reactions expire; the one-time greeting has a separate ready gate.
      if (!active || !visible || !inViewport || reducedMotion) cueRef.current = createCue();
      targetRef.current = { x: 0, y: 0 };
      gazeRef.current = { x: 0, y: 0 };
      return;
    }
    let frame = 0;
    const renderClock = createRenderClock(performance.now());
    const greetingReady=createGreetingReadyGate(performance.now());
    const tick = (now: number) => {
      const dt = renderClock(now);
      if (dt === null) { frame = requestAnimationFrame(tick); return; }
      timeRef.current += dt * 1000;
      const seconds = timeRef.current / 1000;
      const ease = 1 - Math.exp(-dt * 5);
      gazeRef.current.x += (targetRef.current.x - gazeRef.current.x) * ease;
      gazeRef.current.y += (targetRef.current.y - gazeRef.current.y) * ease;
      // One-shot cues expire in real time; the physics clock alone pauses offscreen.
      let cue = sampleCue(cueRef.current, now);
      greetingRef.current=advanceGreeting(greetingRef.current,{ready:greetingReady(now)&&handoffElapsed.current>=POSTER_HANDOFF_MS,eligible:true,interacted:interactedRef.current||!['idle','enter'].includes(cue.action),now});
      const greeting=greetingRef.current;
      const busy=greeting.phase!=='done';
      if(busy!==greetingBusyRef.current){greetingBusyRef.current=busy;onGreetingBusy?.(busy);}
      if((greeting.phase==='playing'||greeting.phase==='settling')&&cue.action==='idle'){
        const sampleAt=greeting.phase==='settling'?greeting.settleAt:now;
        cue=sampleCue({action:'enter',id:-2,startedAt:greeting.startedAt,endsAt:greeting.startedAt+GREETING_DURATION},sampleAt);
        if(greeting.phase==='settling')cue={...cue,weight:cue.weight*Math.max(0,1-(now-greeting.settleAt)/GREETING_SETTLE)};
      }
      if(stageRef.current){stageRef.current.dataset.greeting=greeting.phase;stageRef.current.dataset.greetingProgress=String(Math.round(cue.progress*100)/100);}
      const blink = blinkRef.current(timeRef.current);
      // Navigation takes priority; interpolate the underlying pose during the short cue.
      const profile = cue.action === "tap" || cue.action === "confirm" ? poseRef.current : expression || characterPose(pose);
      poseRef.current.tilt += (profile.tilt - poseRef.current.tilt) * ease;
      poseRef.current.brow += (profile.brow - poseRef.current.brow) * ease;
      poseRef.current.eyes += (profile.eyes - poseRef.current.eyes) * ease;
      try {
      handoffElapsed.current=Math.min(POSTER_HANDOFF_MS,handoffElapsed.current+dt*1000);
      const target=blendPosterHandoff(characterParameters({ seconds, gaze: gazeRef.current, pose: poseRef.current, blink, cue,world }),handoffElapsed.current);
      const previous=renderedParameters.current;
      // Blend interruptions over several mesh frames instead of snapping to idle.
      if(previous)for(const key of ['angleX','angleY','angleZ','mouthOpen','mouthForm','eyeSmile','greetingRaise','armL','armR','hairL','hairR','bangL','bangC','bangR','body'] as const){
        const before=previous[key];if(typeof before==='number')target[key]=before+(target[key]-before)*(1-Math.exp(-dt*16));
      }
      renderedParameters.current=target;
      const rendered = playerRef.current?.render(target, seconds);
      if (!rendered) throw new Error("Character frame unavailable");
      } catch (error) {
        failRef.current(error);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, pose, expression,world,onGreetingBusy]);

  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), 1100);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  const interact = (region: HitRegion, keyboard: boolean, earIndex?: number) => {
    if (!keyboard && draggedRef.current) { draggedRef.current = false; return; }
    interactedRef.current=true;
    const id = ++localIdRef.current;
    const next = beginCue(cueRef.current, { action: "tap", id, region, earIndex }, performance.now());
    if (next === cueRef.current && animate) return;
    cueRef.current = animate ? next : createCue();
    setReaction({ id, region, earIndex });
    onInteract?.(region);
  };
  const trackPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartRef.current && Math.hypot(event.clientX - pointerStartRef.current.x, event.clientY - pointerStartRef.current.y) > 12) draggedRef.current = true;
    if (event.pointerType === "touch" || reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    targetRef.current = normalisePointer(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
  };

  const reactionEar = reaction?.earIndex === undefined ? undefined : assets.accessories?.[reaction.earIndex];
  const reactionPosition = reactionEar ? { left: `${(reactionEar.root[0] * .35 + reactionEar.tip[0] * .65) / 10.24}%`, top: `${(reactionEar.root[1] * .35 + reactionEar.tip[1] * .65) / 10.24}%` } : undefined;

  return (
    <div className="hero-character hero-character-live" ref={stageRef} data-character data-character-status={reducedMotion ? "reduced" : status} data-character-running={animate} onPointerDown={(event) => { pointerStartRef.current = { x: event.clientX, y: event.clientY }; draggedRef.current = false; }} onPointerUp={() => { pointerStartRef.current = null; }} onPointerCancel={() => { pointerStartRef.current = null; draggedRef.current = true; }} onPointerMove={trackPointer} onPointerLeave={() => { targetRef.current = { x: 0, y: 0 }; }}>
      <img className="character-poster" src={assets.posterUrl} alt="黑绿双马尾、白灰兔耳外套的原创角色" width="1024" height="1024" fetchPriority="high" draggable={false} onError={() => setPosterFailed(true)} style={{ opacity: posterFailed || (status === "ready" && !reducedMotion && active && entranceReady) ? 0 : 1 }} />
      {posterFailed && (status !== "ready" || reducedMotion) && <span className="character-unavailable" role="status">角色素材暂时无法加载</span>}
      <canvas ref={canvasRef} className="character-canvas" aria-hidden="true" style={{ opacity: status === "ready" && !reducedMotion && active && entranceReady ? 1 : 0 }} />
      <button type="button" className="character-hit character-hit-head" aria-label="和角色打招呼" onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) event.stopPropagation(); }} onClick={(event) => interact("head", event.detail === 0)} />
      {assets.accessories?.map((ear, index) => {
        const box = accessoryHitBox(ear);
        return <button key={ear.layer} type="button" className={`character-hit character-hit-ear character-hit-ear-${index}`} data-ear-layer={ear.layer} style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }} aria-label={index === 0 ? "轻碰左侧兔耳" : "轻碰兔耳"} onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) event.stopPropagation(); }} onClick={(event) => interact("ear", event.detail === 0, index)} />;
      })}
      <span className="character-touch-hint" aria-hidden="true">TOUCH TO SAY HI <i>✦</i></span>
      {reaction && <span key={reaction.id} className={`character-reaction reaction-${reaction.region}`} style={reactionPosition} role="status"><b>{reaction.region === "head" ? "✦" : "!"}</b><i /><i /><i /><span className="sr-only">{reaction.region === "head" ? "收到你的招呼" : "碰了一下兔耳"}</span></span>}
    </div>
  );
}
