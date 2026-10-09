"use client";

import { useEffect, useRef } from 'react';
import { PowerGlitch } from 'powerglitch';
import type { SectionId } from './world-machine';
import { LifeScene } from './LifeScene';
import { StudioLobbyWall } from './StudioLobbyWall';
import { ResearchDossierScene } from './ResearchDossierScene';
import { ProjectRain } from './ProjectRain';

/** Decorative title owns its own cloned DOM; React never reconciles glitch slices. */
function CutTitle({title, reducedMotion}:{title:string;reducedMotion:boolean}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const label = document.createElement('span');
    label.textContent = title;
    element.replaceChildren(label);
    if (reducedMotion) return () => element.replaceChildren();
    const effect = PowerGlitch.glitch(element, {
      createContainers:false,playMode:'manual',hideOverflow:false,
      timing:{duration:180,iterations:1},glitchTimeSpan:false,shake:false,
      slice:{count:2,velocity:12,minHeight:.02,maxHeight:.08,hueRotate:false},pulse:false,
    });
    const timer = window.setTimeout(effect.startGlitch, 530);
    return () => {clearTimeout(timer);effect.stopGlitch();element.getAnimations({subtree:true}).forEach(a=>a.cancel());element.replaceChildren();};
  },[title,reducedMotion]);
  return <div ref={host} className="cut-title" aria-hidden="true"/>;
}

export function AlbumScene({world,reducedMotion,active=true}:{world:SectionId;reducedMotion:boolean;active?:boolean}) {
  return <div key={world} className={`album-scene scene-${world}`} aria-hidden={world==='experience'?undefined:true} data-composition={world}>
    <div className="album-grain"/>
    {world==='projects'&&<>
      <ProjectRain layer="ambient" active={active} reducedMotion={reducedMotion}/>
      <div className="scene-panel project-plate"><ProjectRain layer="plate" active={active} reducedMotion={reducedMotion}/><span className="plate-index">03</span><span className="plate-caption">MULTIMODAL<br/>EVALUATION</span><div className="project-title"><CutTitle title="EVAL" reducedMotion={reducedMotion}/><span>STUDIO</span></div><span className="plate-foot">BUILD — EVALUATE — ITERATE</span></div>
      <div className="scene-panel project-edge"><span>DATA / GENERATION / REVIEW</span></div>
    </>}
    {world==='research'&&<ResearchDossierScene/>}
    {world==='studio'&&<StudioLobbyWall/>}
    {world==='life'&&<LifeScene active={active} reducedMotion={reducedMotion}/>}
    <div className="scene-shade"/>
  </div>;
}

export function AlbumForeground({world}:{world:SectionId}) {
  return <div className={`album-foreground foreground-${world}`} aria-hidden="true">
    <span className="foreground-caption">{world==='projects'?'AI CODING / CREATIVE TOOLS':world==='research'?'QUESTIONS WORTH ASKING':world==='experience'?'FROM FINANCE TO AI':world==='studio'?'DRAW / MOVE / PLAY':'PLACES / BOOKS / SOUNDS'}</span>
    <span className="foreground-number">{({experience:'01',research:'02',projects:'03',studio:'04',life:'05'})[world]}<i>/05</i></span>
  </div>;
}
