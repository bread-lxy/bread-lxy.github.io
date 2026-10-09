"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { itemById, profile, sectionById, sections, type ContentItem } from "../content/site";
import { findPublicationItem, readingTarget } from '../content/publication';
import { DEFAULT_WORLD, createInitialState, createWheelGate, parseLocation, routeHash, siteReducer, stepWorld, type SectionId, type SiteRoute } from "./world-machine";
import { HeroCharacter } from "./character/HeroCharacter";
import { heroCharacterAssets } from "../content/character";
import type { CharacterAction } from "./character/types";
import { useAudioController } from "./use-audio";
import { ContactDialog } from "./ContentViews";
import "./character/character.css";
import { AlbumScene, AlbumForeground } from './AlbumScene';
import { ResearchDossierContinuation } from './ResearchDossierScene';
import { useLineNavigation } from './use-line-navigation';
import { useBgmRhythm } from './use-bgm-rhythm';
import { homeScenes, albumTiming } from '../content/home-scenes';
import { addAlbumSlide } from './album-transition';
import { addStudioSceneSwitch, involvesStudio } from './studio-transition';
import { addResearchPaperDrop, addResearchSceneSwitch, involvesResearch } from './research-transition';
import './album.css';
import { Publication, PublicationMediaDialog, findPublicationMedia } from './Publication';
import { CharacterAwakeningOpening } from './CharacterAwakeningOpening';
import type { TitleRiftPhase } from './TitleRiftOpening';
import { RpgSettings } from "./RpgSettings";
import { RpgDialogue } from './RpgDialogue';
import { PageGuideDialogue } from './PageGuideDialogue';
import { AlbumWordmark } from './AlbumWordmark';
import { useExperienceHandover, syncExperienceHandover, wordmarkLayoutEvent } from './use-experience-handover';
import { settleExperienceViewport } from './ExperienceNotes';
import './experience.css';
import './wordmark-handover.css';
import './experience-stage.css';
import './rpg.css';
import './wordmark-stage.css';
import { BgmPlayer } from './BgmPlayer';
import './experience-desktop.css';
import { ExperienceDesktop, ExperienceDesktopBackdrop } from './ExperienceDesktop';
import { ExperienceAquatic } from './ExperienceAquatic';
import { involvesExperience, snapshotExperience, type SceneTransitionContext } from './experience-transition';
import { addLifeSettle, freezeLifeSnapshot, involvesLife } from './life-motion';
import './life-scene.css';
export { MediaView, ItemDialog } from "./ContentViews";
gsap.registerPlugin(useGSAP);

type ReadingRoute = Exclude<SiteRoute, {kind:"item"}>;
type EntryPhase = TitleRiftPhase | "lobby";
type Entry = { key: string; scroll: number; focus?: string; version?:2; hash?:string; mediaId?:string; world?:SectionId };
const entryState = (): Entry | undefined => history.state?.portfolio;
const routeUrl = (route: SiteRoute) => location.pathname + location.search + routeHash(route);
function useReducedMotion() {
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{const query=matchMedia("(prefers-reduced-motion: reduce)");const update=()=>setReduced(query.matches);update();query.addEventListener("change",update);return()=>query.removeEventListener("change",update);},[]);
  return reduced;
}
const previewSwitchDuration=(from:SectionId,to:SectionId)=>{
  const transition:SceneTransitionContext={from,to,direction:1};
  return involvesResearch(transition)?albumTiming.researchPreview:involvesStudio(transition)?albumTiming.studioPreview:albumTiming.preview;
};

export function PersonalArchive() {
  const rootRef=useRef<HTMLElement>(null), selectorRef=useRef<HTMLElement>(null), transitionRef=useRef<HTMLDivElement>(null);
  const timelineRef=useRef<gsap.core.Timeline|null>(null), busyRef=useRef(false);
  const sceneTimelineRef=useRef<gsap.core.Timeline|null>(null), entranceRef=useRef<gsap.core.Timeline|null>(null);
  const openingRevealed=useRef(false),entryFocusPending=useRef(false);
  const autoGuideArmed=useRef(false),guideReturnFocus=useRef<HTMLElement|null>(null);
  const entrancePlayed=useRef(false), previewUntil=useRef(0);
  const wordmarkColor=useRef<string|null>(null);
  const sceneFrameRef=useRef<HTMLDivElement>(null),outgoingFrameRef=useRef<HTMLDivElement>(null),researchCoverRef=useRef<HTMLDivElement>(null),slideDirection=useRef<1|-1>(1);
  const windowFrameRef=useRef<HTMLDivElement>(null),outgoingWindowsRef=useRef<HTMLDivElement>(null);
  const sceneBackdropRef=useRef<HTMLDivElement>(null),wallpaperRef=useRef<HTMLDivElement>(null);
  const aquaticForegroundRef=useRef<HTMLDivElement>(null);
  const sceneTransition=useRef<SceneTransitionContext|null>(null);
  const [characterStatus,setCharacterStatus]=useState('loading');
  const [greetingBusy,setGreetingBusy]=useState(true);
  const [scenePhase,setScenePhase]=useState('idle');
  const wheelGate=useRef(createWheelGate()), touchRef=useRef<{x:number;y:number}|null>(null), ignoreClickUntil=useRef(0);
  const openerRef=useRef<HTMLElement|null>(null), contactOpener=useRef<HTMLElement|null>(null);
  const pendingRestore=useRef<{scroll:number;focus?:string;heading?:boolean;target?:string;handover?:boolean}|null>(null);
  const routeRef=useRef<SiteRoute>({kind:"home"});
  const lastLocation=useRef(""), serial=useRef(0), chibiButtonRef=useRef<HTMLButtonElement>(null);
  const previewWorld=useRef<SectionId>(DEFAULT_WORLD);
  const homeMomentumUntil=useRef(0);
  const restoringLocation=useRef(false), locationInitialized=useRef(false);
  const [route,setRoute]=useState<SiteRoute>({kind:"home"}),[view,setView]=useState<ReadingRoute>({kind:"home"});
  const [state,dispatch]=useReducer(siteReducer,undefined,createInitialState);
  // Keep the server and first client render identical.  Hash deep links are
  // promoted to the lobby in the mount effect below, avoiding a hydration
  // mismatch while preserving direct section links.
  const [entryPhase,setEntryPhase]=useState<EntryPhase>("boot");
  const interactionRef=useRef({mode:state.mode,entryPhase});
  useLayoutEffect(()=>{interactionRef.current={mode:state.mode,entryPhase};},[state.mode,entryPhase]);
  const [cue,setCue]=useState<{action:CharacterAction;id:number}>({action:"idle",id:0});
  const [ready,setReady]=useState(false),[scrolled,setScrolled]=useState(false),[notice,setNotice]=useState("");
  const [highContrast,setHighContrast]=useState(false),[reducedMotionOverride,setReducedMotionOverride]=useState(false);
  const [chibiOpen,setChibiOpen]=useState(false),[contactOpen,setContactOpen]=useState(false);
  const [guideOpen,setGuideOpen]=useState(false),[guideEpoch,setGuideEpoch]=useState(0),[guideStep,setGuideStep]=useState(1);
  const [mediaItem,setMediaItem]=useState<ContentItem|null>(null);
  const mediaCache=useRef(new Map<string,ContentItem>());
  const systemReducedMotion=useReducedMotion();
  const reducedMotion=systemReducedMotion||reducedMotionOverride;
  useExperienceHandover(rootRef,reducedMotion,ready,state.activeWorld);
  useLineNavigation(selectorRef,state.activeWorld,reducedMotion);
  const activeSection=sectionById[state.activeWorld];
  const scene=homeScenes[state.activeWorld];
  const audio=useAudioController(activeSection.audio);
  const isHome=view.kind==="home";
  useBgmRhythm(selectorRef,audio.currentTrack,audio.readBgmFrame,audio.bgmState==='playing'&&audio.bgm.volume>0,isHome&&entryPhase==='lobby'&&state.mode==='lobby'&&!mediaItem&&!contactOpen,reducedMotion);

  useEffect(()=>{
    try {
      setHighContrast(localStorage.getItem("personal-archive-high-contrast")==="on");
      setReducedMotionOverride(localStorage.getItem("personal-archive-reduced-motion")==="on");
    } catch { /* local preferences are optional */ }
  },[]);
  useEffect(()=>{
    const locked=entryPhase!=="lobby"&&route.kind==="home";
    document.body.classList.toggle("rpg-entry-lock",locked);
    return()=>document.body.classList.remove("rpg-entry-lock");
  },[entryPhase,route.kind]);
  useLayoutEffect(()=>{
    const locked=entryPhase!=="lobby"&&route.kind==="home";
    const siblings=Array.from(rootRef.current?.children??[]).filter((node):node is HTMLElement=>node instanceof HTMLElement&&!node.hasAttribute('data-entry-overlay'));
    siblings.forEach(node=>{node.inert=locked;});
    return()=>siblings.forEach(node=>{node.inert=false;});
  },[entryPhase,route.kind]);
  const cueCharacter=useCallback((action:CharacterAction)=>setCue(previous=>({action,id:previous.id+1})),[]);
  const captureScene=useCallback((next:SectionId,direction?:1|-1)=>{
    const host=outgoingFrameRef.current,source=sceneFrameRef.current?.firstElementChild;
    if(!host||!source||reducedMotion)return;
    const previous=homeScenes[state.activeWorld];
    const clone=source.cloneNode(true) as HTMLElement;
    // cloneNode copies canvas elements but not their painted pixels. Preserve
    // one frozen project-rain frame while the original scene slides away.
    const liveRain=source.querySelectorAll<HTMLCanvasElement>('[data-project-rain] canvas');
    clone.querySelectorAll<HTMLCanvasElement>('[data-project-rain] canvas').forEach((canvas,index)=>{
      const original=liveRain[index];
      if(!original)return;
      canvas.width=original.width;
      canvas.height=original.height;
      canvas.getContext('2d')?.drawImage(original,0,0);
    });
    const desktop=windowFrameRef.current?.querySelector<HTMLElement>('.experience-desktop');
    const directionValue=direction|| (sections.findIndex(s=>s.id===next)>sections.findIndex(s=>s.id===state.activeWorld)?1:-1);
    sceneTransition.current={from:state.activeWorld,to:next,direction:directionValue};
    const desktopTransition=involvesExperience(sceneTransition.current);
    const materialTransition=desktopTransition||involvesLife(sceneTransition.current)||involvesStudio(sceneTransition.current)||involvesResearch(sceneTransition.current);
    outgoingWindowsRef.current?.replaceChildren();
    if(state.activeWorld==='experience'&&desktop&&outgoingWindowsRef.current){
      outgoingWindowsRef.current.appendChild(snapshotExperience(desktop,rootRef.current!.querySelector('.album-stage')!));
    }
    if(materialTransition){
      for(const frame of [host,outgoingWindowsRef.current])if(frame){
        frame.style.width=source.clientWidth+'px';frame.style.height=source.clientHeight+'px';
      }
      // The stationary backdrop owns solid color; the departing artwork does not.
      clone.querySelector('.scene-shade')?.remove();
    }
    // Covers may have different heights. Keep the outgoing scenery at its
    // actual pre-click size, including the mobile desktop's measured offsets.
    clone.style.width=`${source.clientWidth}px`;
    clone.style.height=`${source.clientHeight}px`;
    for(const name of ['--experience-record-height','--experience-dialogue-height']){
      const value=getComputedStyle(source).getPropertyValue(name);
      if(value)clone.style.setProperty(name,value);
    }
    // cloneNode does not retain CSS animation time. Freeze only decorative paper
    // poses at the painted instant; the original character canvas is never cloned.
    const livePapers=source.querySelectorAll<HTMLElement>('.dossier-surface');
    clone.querySelectorAll<HTMLElement>('.dossier-surface').forEach((paper,index)=>{
      paper.style.transform=getComputedStyle(livePapers[index]).transform;
      paper.style.animation='none';
    });
    freezeLifeSnapshot(source,clone);
    const liveTvs=source.querySelectorAll<HTMLElement>('[data-studio-tv-drop]');
    clone.querySelectorAll<HTMLElement>('[data-studio-tv-drop]').forEach((screen,index)=>{
      const live=liveTvs[index];
      if(!live)return;
      const painted=getComputedStyle(live);
      screen.style.transform=painted.transform;
      screen.style.opacity=painted.opacity;
    });
    const liveResearchPapers=source.querySelectorAll<HTMLElement>('[data-research-drop]');
    clone.querySelectorAll<HTMLElement>('[data-research-drop]').forEach((paper,index)=>{
      const live=liveResearchPapers[index];
      if(!live)return;
      const painted=getComputedStyle(live);
      paper.style.transform=painted.transform;
      paper.style.opacity=painted.opacity;
    });
    clone.setAttribute('aria-hidden','true');
    // Interactive scenery is a visual snapshot only. No duplicate IDs, focus,
    // handlers or half-finished record masks survive into the departing frame.
    clone.inert=true;
    clone.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    clone.querySelectorAll('.exp-window-outline').forEach(node=>node.remove());
    clone.querySelectorAll<HTMLElement>('.exp-window').forEach(node=>{node.style.transform='none';node.style.opacity='1';node.style.clipPath='none';});
    for(const [name,value] of Object.entries(previous.palette))clone.style.setProperty(`--hero-${name}`,value);
    clone.style.setProperty('--hero-texture',`url(${previous.texture})`);
    clone.style.background=materialTransition?'transparent':previous.palette.ink;
    host.replaceChildren(clone);
    slideDirection.current=directionValue;
  },[state.activeWorld,reducedMotion]);
  const cancelTransition=useCallback(()=>{
    timelineRef.current?.kill();timelineRef.current=null;busyRef.current=false;
    if(transitionRef.current) gsap.set(transitionRef.current,{display:"none",pointerEvents:"none"});
    sceneTimelineRef.current?.progress(1);previewUntil.current=0;
  },[]);
  const savePosition=useCallback(()=>{
    const entry=entryState();
    if(entry) {
      const focus=(document.activeElement as HTMLElement|null)?.closest<HTMLElement>("[data-focus-key]")?.dataset.focusKey;
      history.replaceState({...history.state,portfolio:{...entry,scroll:scrollY,focus:focus||entry.focus,world:previewWorld.current}},"");
    }
  },[]);
  const closeGuide=useCallback((restoreFocus=true)=>{
    setGuideOpen(false);
    const prior=guideReturnFocus.current;
    guideReturnFocus.current=null;
    if(restoreFocus)requestAnimationFrame(()=>{
      const target=prior?.matches('.world-tab')
        ? selectorRef.current?.querySelector<HTMLElement>('.world-tab.is-active') ?? prior
        : prior;
      if(target?.isConnected)target.focus({preventScroll:true});
    });
  },[]);
  const startGuide=useCallback((returnFocus?:HTMLElement|null)=>{
    autoGuideArmed.current=false;
    guideReturnFocus.current=returnFocus??document.activeElement as HTMLElement|null;
    setGuideStep(1);
    setGuideEpoch(previous=>previous+1);
    setGuideOpen(true);
  },[]);
  const restoreLobby=useCallback((world:SectionId,reveal=true)=>{
    previewWorld.current=world;
    dispatch({type:"RETURN_HOME",world});
    if(reveal)setEntryPhase("lobby");
    wheelGate.current=createWheelGate(performance.now());
  },[]);
  const applyLocation=useCallback((restore=true)=>{
    let parsed=parseLocation(location.hash);
    let nextRoute=parsed.route;
    let routeNotice="";
    if(nextRoute.kind==="item"&&!findPublicationItem(nextRoute.section,nextRoute.slug)) {
      routeNotice="这条内容尚未收录，已为你打开所属专题。";
      nextRoute={kind:"section",section:nextRoute.section};
      parsed={route:nextRoute,canonicalHash:routeHash(nextRoute)};
    }
    // Native hash links can copy the old entry's state. Restore only when that
    // state's canonical destination matches; otherwise this is a fresh anchor.
    const stored=entryState(),matching=stored?.version===2&&stored.hash===parsed.canonicalHash,canRestore=restore&&matching;
    const entry:Entry=matching?stored!:{key:`portfolio-${Date.now()}-${++serial.current}`,scroll:0,version:2,hash:parsed.canonicalHash};
    if(location.hash!==parsed.canonicalHash || !matching) history.replaceState({...history.state,portfolio:entry},"",routeUrl(nextRoute));
    const signature=entry.key+"|"+parsed.canonicalHash;
    if(lastLocation.current===signature && restore) return;
    const wasInitialized=locationInitialized.current;
    locationInitialized.current=true;
    restoringLocation.current=true;
    setNotice(routeNotice);
    lastLocation.current=signature;
    const base:ReadingRoute=nextRoute.kind==="item"?{kind:"section",section:nextRoute.section}:nextRoute;
    routeRef.current=nextRoute;
    setRoute(nextRoute);setView(base);setContactOpen(false);setChibiOpen(false);
    setMediaItem(entry.mediaId?findPublicationMedia(entry.mediaId)||mediaCache.current.get(entry.mediaId)||null:null);
    const initialHome=!wasInitialized&&base.kind==="home";
    const world=initialHome?DEFAULT_WORLD:base.kind==="section"?base.section:entry.world??previewWorld.current;
    previewWorld.current=world;
    if(base.kind==="home"&&(initialHome||!canRestore||entry.scroll<=2)) restoreLobby(world,wasInitialized);
    else {setEntryPhase("lobby");dispatch({type:"OPEN_CONTENT",world});}
    pendingRestore.current=initialHome?{scroll:0}:canRestore?{scroll:entry.scroll,focus:entry.focus}:{scroll:0,target:readingTarget(nextRoute),heading:!restore};
  },[restoreLobby]);
  const navigate=useCallback((next:SiteRoute, options:{replace?:boolean;fromTransition?:boolean;target?:string;handover?:boolean}={})=>{
    if(!options.fromTransition) cancelTransition();
    autoGuideArmed.current=false;
    if(next.kind!=="home")closeGuide(false);
    savePosition();
    const entry:Entry={key:`portfolio-${Date.now()}-${++serial.current}`,scroll:0,version:2,hash:routeHash(next),world:previewWorld.current};
    if(options.replace) history.replaceState({...history.state,portfolio:entry},"",routeUrl(next));
    else history.pushState({portfolio:entry},"",routeUrl(next));
    applyLocation(false);
    if(options.target) pendingRestore.current={scroll:0,target:options.target};
    if(options.handover&&pendingRestore.current)pendingRestore.current.handover=true;
  },[applyLocation,cancelTransition,closeGuide,savePosition]);
  const onSection=useCallback((section:SectionId,collection?:string)=>navigate({kind:"section",section,...(collection?{collection}:{})}),[navigate]);
  const returnHome=useCallback(()=>{closeGuide(false);navigate({kind:"home"});},[closeGuide,navigate]);
  const openItem=useCallback((item:ContentItem)=>{navigate({kind:"item",section:item.primarySection,slug:item.slug});void audio.playSfx("confirm");},[navigate,audio.playSfx]);
  const openMedia=useCallback((item:ContentItem)=>{
    savePosition();openerRef.current=document.activeElement as HTMLElement|null;mediaCache.current.set(item.id,item);
    const entry:Entry={...entryState(),key:`portfolio-${Date.now()}-${++serial.current}`,scroll:scrollY,version:2,mediaId:item.id};
    history.pushState({portfolio:entry},'',routeUrl(routeRef.current));applyLocation();
  },[savePosition,applyLocation]);
  const closeMedia=useCallback(()=>{if(entryState()?.mediaId)history.back();else setMediaItem(null);},[]);
  const openContact=()=>{closeGuide(false);contactOpener.current=document.activeElement as HTMLElement|null;setContactOpen(true);setChibiOpen(false);};
  const rememberWorld=useCallback((world:SectionId)=>{
    try { localStorage.setItem("personal-archive-last-world",world); } catch { /* private browsing may deny local storage */ }
  },[]);
  const completeBoot=useCallback(()=>setEntryPhase(previous=>previous==="boot"?"title":previous),[]);
  const measureOpeningCharacter=useCallback(()=>{
    const rect=rootRef.current?.querySelector('.character-poster')?.getBoundingClientRect();
    return rect&&rect.width>0?{x:rect.left,y:rect.top,size:rect.width}:undefined;
  },[]);
  const paintOpeningScene=useCallback((ui:number,characterReady:boolean)=>{
    const root=rootRef.current;if(!root)return;
    root.style.setProperty('--awakening-ui',String(ui));
    root.dataset.characterReady=String(characterReady);
  },[]);
  const prepareLobby=useCallback(()=>{
    setEntryPhase("entering");
    void audio.playSfx("confirm");
  },[audio.playSfx]);
  const completeEntry=useCallback(()=>{
    openingRevealed.current=true;entryFocusPending.current=true;
    restoreLobby(state.activeWorld);
  },[restoreLobby,state.activeWorld]);
  useEffect(()=>{
    if(entryPhase!=="lobby"||!entryFocusPending.current)return;
    const frame=requestAnimationFrame(()=>{selectorRef.current?.querySelector<HTMLElement>(`[data-world="${state.activeWorld}"]`)?.focus({preventScroll:true});entryFocusPending.current=false;});
    return()=>cancelAnimationFrame(frame);
  },[entryPhase,state.activeWorld]);
  const toggleHighContrast=useCallback(()=>setHighContrast(previous=>{
    const next=!previous;
    try { localStorage.setItem("personal-archive-high-contrast",next?"on":"off"); } catch {}
    return next;
  }),[]);
  const toggleReducedMotion=useCallback(()=>setReducedMotionOverride(previous=>{
    const next=!previous;
    try { localStorage.setItem("personal-archive-reduced-motion",next?"on":"off"); } catch {}
    return next;
  }),[]);
  const onResume=()=>navigate({kind:"resume"});
  const onGuideStepChange=useCallback((step:number)=>setGuideStep(step+1),[]);
  const toggleGuide=()=>{
    if(guideOpen){closeGuide(false);return;}
    const opener=document.activeElement as HTMLElement|null;
    if(!isHome||state.mode!=="lobby"||scrollY>2)navigate({kind:"home"});
    startGuide(opener);
  };

  useEffect(()=>{
    const previous=history.scrollRestoration;history.scrollRestoration="manual";
    if(!locationInitialized.current)autoGuideArmed.current=parseLocation(location.hash).route.kind==="home";
    applyLocation();setReady(true);
    const read=()=>{cancelTransition();applyLocation();};
    let frame=0;
    const scroll=()=>{
      // A native touch fling can outlive an explicit HOME click. Drop only that
      // old inertia; every NEW input releases the guard before native scrolling.
      if(performance.now()<homeMomentumUntil.current&&scrollY>0){window.scrollTo({top:0,behavior:'instant'});syncExperienceHandover();return;}
      if(frame)return;frame=requestAnimationFrame(()=>{
        frame=0;setScrolled(scrollY>60);
        if(!restoringLocation.current&&!pendingRestore.current&&!busyRef.current&&interactionRef.current.entryPhase==="lobby"){
          if(scrollY<=2&&interactionRef.current.mode==="content"&&!entryState()?.mediaId){
            // Natural return updates this history entry, never the stack or focus.
            const home:SiteRoute={kind:"home"};
            const entry:Entry={...entryState(),key:entryState()?.key??`portfolio-${Date.now()}-${++serial.current}`,scroll:0,version:2,hash:"",world:previewWorld.current};
            history.replaceState({...history.state,portfolio:entry},"",routeUrl(home));
            lastLocation.current=entry.key+"|";
            routeRef.current=home;setRoute(home);setView(home);setChibiOpen(false);
            restoreLobby(previewWorld.current);
          }else if(scrollY>2&&(document.getElementById('experience')?.getBoundingClientRect().top??Infinity)<innerHeight*.6){
            dispatch({type:'OPEN_CONTENT',world:previewWorld.current});
          }
        }
        savePosition();
      });
    };
    const releaseHome=()=>{homeMomentumUntil.current=0;};
    const newInputs=['wheel','touchstart','pointerdown','keydown'] as const;
    newInputs.forEach(event=>addEventListener(event,releaseHome,{passive:true,capture:true}));
    addEventListener("popstate",read);addEventListener("hashchange",read);addEventListener("scroll",scroll,{passive:true});
    return()=>{history.scrollRestoration=previous;removeEventListener("popstate",read);removeEventListener("hashchange",read);removeEventListener("scroll",scroll);newInputs.forEach(event=>removeEventListener(event,releaseHome,true));cancelAnimationFrame(frame);};
  },[applyLocation,cancelTransition,restoreLobby,savePosition]);
  useEffect(()=>{
    if(ready&&(state.mode!=="lobby"||route.kind!=="home"))autoGuideArmed.current=false;
    if(guideOpen&&(view.kind!=="home"||state.mode!=="lobby")){
      const frame=requestAnimationFrame(()=>closeGuide(false));
      return()=>cancelAnimationFrame(frame);
    }
  },[ready,state.mode,route.kind,view.kind,guideOpen,closeGuide]);
  useEffect(()=>{
    if(!ready||!autoGuideArmed.current||entryPhase!=="lobby"||state.mode!=="lobby"||route.kind!=="home"||scenePhase!=="idle"||guideOpen)return;
    const start=()=>{
      if(!autoGuideArmed.current||routeRef.current.kind!=="home"||interactionRef.current.mode!=="lobby")return;
      const selected=selectorRef.current?.querySelector<HTMLElement>('.world-tab.is-active');
      startGuide(selected);
    };
    if(!greetingBusy||characterStatus==="fallback"){
      const frame=requestAnimationFrame(start);
      return()=>cancelAnimationFrame(frame);
    }
    // Character media failures must not leave the first-visit guide pending forever.
    const timeout=window.setTimeout(start,4000);
    return()=>window.clearTimeout(timeout);
  },[ready,entryPhase,state.mode,route.kind,scenePhase,guideOpen,greetingBusy,characterStatus,startGuide]);
  useEffect(()=>{
    if(!guideOpen)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.stopPropagation();closeGuide();}};
    addEventListener("keydown",close);
    return()=>removeEventListener("keydown",close);
  },[guideOpen,closeGuide]);
  useLayoutEffect(()=>{
    const restore=pendingRestore.current;
    if(!restore)return;
    const frame=requestAnimationFrame(()=>{
      pendingRestore.current=null;
      if(restore.handover&&!reducedMotion&&restore.target==='experience'){
        const destination=document.getElementById('experience');
        if(destination){
          const top=destination.getBoundingClientRect().top+scrollY-parseFloat(getComputedStyle(destination).scrollMarginTop||'0');
          const position={y:scrollY};busyRef.current=true;
          // Animate only native scroll. The same wordmark handover responds to a
          // click and to a wheel; user input may interrupt without a forced replay.
          restoringLocation.current=false;
          timelineRef.current=gsap.timeline({onComplete:()=>{busyRef.current=false;destination.focus({preventScroll:true});settleExperienceViewport();savePosition();}})
            .to(position,{y:top,duration:.9,ease:'power2.inOut',onUpdate:()=>{window.scrollTo({top:position.y,behavior:'instant'});syncExperienceHandover();}});
          return;
        }
      }
      if(restore.target) { const destination=document.getElementById(restore.target); if(restore.target==='home'){homeMomentumUntil.current=performance.now()+1000;window.scrollTo({top:0,behavior:'instant'});if(restore.heading)selectorRef.current?.querySelector<HTMLElement>(`[data-world="${previewWorld.current}"]`)?.focus({preventScroll:true});}else{homeMomentumUntil.current=0;destination?.scrollIntoView({behavior:"instant"});destination?.focus({preventScroll:true});settleExperienceViewport();} restoringLocation.current=false;syncExperienceHandover();setScrolled(scrollY>60); return; }
      homeMomentumUntil.current=0;
      window.scrollTo({top:restore.scroll,behavior:"instant"});
      restoringLocation.current=false;
      syncExperienceHandover();
      settleExperienceViewport();
      const visibleElements=Array.from(document.querySelectorAll<HTMLElement>("[data-focus-key]"));
      const target=restore.focus?visibleElements.find(e=>e.dataset.focusKey===restore.focus&&!e.closest("[hidden]")):null;
      if(target)target.focus({preventScroll:true});
      else if(restore.heading) document.querySelector<HTMLElement>(view.kind==="home"?".hero-name":"[data-reading-view] [data-view-heading]")?.focus({preventScroll:true});
      setScrolled(scrollY>60);
    });
    return()=>cancelAnimationFrame(frame);
  },[route,view,reducedMotion,savePosition]);
  useEffect(()=>{
    if(!ready)return;
    // Body reveals retain their own ScrollTriggers. Remeasure only after actual
    // upstream layout changes, never on the wordmark's scroll/paint frames.
    let frame=0;
    const refresh=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;ScrollTrigger.refresh();});};
    addEventListener(wordmarkLayoutEvent,refresh);refresh();
    return()=>{removeEventListener(wordmarkLayoutEvent,refresh);cancelAnimationFrame(frame);};
  },[ready]);
  useEffect(()=>{
    const interrupt=()=>{if(routeRef.current.kind==='section'&&routeRef.current.section==='experience'&&busyRef.current){timelineRef.current?.kill();busyRef.current=false;}};
    const keyboard=(event:KeyboardEvent)=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))interrupt();};
    addEventListener('wheel',interrupt,{passive:true});addEventListener('touchstart',interrupt,{passive:true});addEventListener('pointerdown',interrupt,{passive:true});addEventListener('keydown',keyboard);
    return()=>{removeEventListener('wheel',interrupt);removeEventListener('touchstart',interrupt);removeEventListener('pointerdown',interrupt);removeEventListener('keydown',keyboard);};
  },[]);
  useEffect(()=>()=>{timelineRef.current?.kill();},[]);
  useEffect(()=>{
    if(!chibiOpen)return;
    const close=(e:KeyboardEvent)=>{if(e.key==="Escape"){setChibiOpen(false);if(matchMedia('(max-width:1100px)').matches)document.querySelector<HTMLElement>('.pub-guide-toggle')?.focus();else chibiButtonRef.current?.focus();}};
    const outside=(e:PointerEvent)=>{if(!(e.target as HTMLElement).closest(".chibi-guide,.pub-guide-toggle"))setChibiOpen(false);};
    addEventListener("keydown",close);addEventListener("pointerdown",outside);
    return()=>{removeEventListener("keydown",close);removeEventListener("pointerdown",outside);};
  },[chibiOpen]);

  useGSAP(()=>{
    const clearSnapshots=()=>{
      for(const frame of [outgoingFrameRef.current,outgoingWindowsRef.current])if(frame){
        frame.replaceChildren();frame.style.removeProperty('width');frame.style.removeProperty('height');
      }
      sceneFrameRef.current?.parentElement?.removeAttribute('data-experience-transition');
      sceneFrameRef.current?.parentElement?.removeAttribute('data-life-transition');
      sceneFrameRef.current?.parentElement?.removeAttribute('data-studio-transition');
      sceneFrameRef.current?.parentElement?.removeAttribute('data-research-transition');
      if(researchCoverRef.current)gsap.set(researchCoverRef.current,{clearProps:'transform,opacity,visibility,backgroundColor'});
      sceneTransition.current=null;
    };
    // The cover remains mounted in the continuous page; a body hash must not
    // disable explicit world previews after the reader scrolls back to it.
    if(!ready||entryPhase!=="lobby"){clearSnapshots();previewUntil.current=0;setScenePhase('idle');return;}
    const wordmarkInk=state.activeWorld==='research'?'#ffffff':scene.palette.accent;
    if(reducedMotion){wordmarkColor.current=wordmarkInk;clearSnapshots();entrancePlayed.current=true;previewUntil.current=0;setScenePhase('idle');return;}
    if(openingRevealed.current&&!entrancePlayed.current){entrancePlayed.current=true;wordmarkColor.current=wordmarkInk;setScenePhase('idle');return;}
    const entrance=!entrancePlayed.current;
    entrancePlayed.current=true;
    setScenePhase(entrance?'enter':'preview');
    const transition=sceneTransition.current;
    const researchSwitch=!entrance&&involvesResearch(transition);
    const studioTransition=!entrance&&involvesStudio(transition);
    const studioArrival=!entrance&&!transition&&state.activeWorld==='studio';
    const researchArrival=state.activeWorld==='research'&&(entrance||transition?.to==='research');
    if(researchSwitch)sceneFrameRef.current?.parentElement?.setAttribute('data-research-transition','true');
    const duration=entrance?albumTiming.entrance:researchSwitch?albumTiming.researchPreview:studioTransition||studioArrival?albumTiming.studioPreview:albumTiming.preview;
    if(!entrance)previewUntil.current=performance.now()+duration*1000;
    const desktopTransition=!entrance&&involvesExperience(transition);
    const lifeTransition=!entrance&&involvesLife(transition);
    const timeline=gsap.timeline({id:'album-preview',onComplete:()=>{clearSnapshots();previewUntil.current=0;entranceRef.current=null;setScenePhase('idle');}});
    // A background tab / overloaded frame must not leave controls half-painted.
    const deadline=window.setTimeout(()=>timeline.progress(1),duration*1000+80);
    sceneTimelineRef.current=timeline;
    if(entrance){
      timeline.fromTo('.scene-panel',{xPercent:index=>index%2?95:-85,yPercent:index=>index%2?-10:7},{xPercent:0,yPercent:0,duration:.95,stagger:0,ease:'power3.out',clearProps:'transform'},0);
      if(researchArrival&&sceneFrameRef.current)addResearchPaperDrop(timeline,sceneFrameRef.current,.18);
    }
    else if(sceneFrameRef.current?.firstElementChild&&outgoingFrameRef.current){
      if(researchSwitch&&transition&&researchCoverRef.current&&sceneBackdropRef.current){
        addResearchSceneSwitch(timeline,{
          oldFrame:outgoingFrameRef.current,
          newFrame:sceneFrameRef.current,
          cover:researchCoverRef.current,
          backdrop:sceneBackdropRef.current,
          fromInk:homeScenes[transition.from].palette.ink,
          toInk:scene.palette.ink,
          enteringResearch:transition.to==='research',
          leavingExperience:transition.from==='experience',
          enteringExperience:transition.to==='experience',
          oldWindows:outgoingWindowsRef.current,
          newWindows:windowFrameRef.current,
          wallpaper:wallpaperRef.current,
          aquaticForeground:aquaticForegroundRef.current,
        },duration);
      }else if(studioTransition||studioArrival){
        sceneFrameRef.current.parentElement?.setAttribute('data-studio-transition','true');
        addStudioSceneSwitch(timeline,outgoingFrameRef.current,sceneFrameRef.current,state.activeWorld==='studio',duration);
        if(transition)timeline.fromTo(sceneBackdropRef.current,
          {backgroundColor:homeScenes[transition.from].palette.ink},
          {backgroundColor:scene.palette.ink,duration:duration*.72,ease:'power1.inOut',clearProps:'backgroundColor'},0);
        if(lifeTransition)sceneFrameRef.current.parentElement?.setAttribute('data-life-transition','true');
        if(desktopTransition&&transition){
          sceneFrameRef.current.parentElement?.setAttribute('data-experience-transition','true');
          timeline.fromTo([wallpaperRef.current,aquaticForegroundRef.current],
            {opacity:transition.from==='experience'?1:0},
            {opacity:transition.to==='experience'?1:0,duration:duration*.72,ease:'power1.inOut',clearProps:'opacity'},0);
          if(outgoingWindowsRef.current)timeline.to(outgoingWindowsRef.current,{opacity:0,duration:.3,ease:'power1.inOut',clearProps:'opacity'},0);
          if(transition.to==='experience'&&windowFrameRef.current)
            timeline.fromTo(windowFrameRef.current,{opacity:0},{opacity:1,duration:.55,ease:'power1.out',clearProps:'opacity'},.18);
        }
      }else{
        addAlbumSlide(timeline,outgoingFrameRef.current,sceneFrameRef.current,sceneFrameRef.current.firstElementChild,slideDirection.current,duration);
        if(lifeTransition&&transition){
          sceneFrameRef.current.parentElement?.setAttribute('data-life-transition','true');
          if(!desktopTransition){
            timeline.fromTo(sceneBackdropRef.current,{backgroundColor:homeScenes[transition.from].palette.ink},{backgroundColor:scene.palette.ink,duration,ease:'power1.inOut',clearProps:'backgroundColor'},0);
            const shade=sceneFrameRef.current.querySelector('.scene-shade');
            if(shade)timeline.fromTo(shade,{opacity:0},{opacity:1,duration:.2,clearProps:'opacity'},duration-.2);
          }
        }
        if(desktopTransition&&transition&&windowFrameRef.current?.firstElementChild&&outgoingWindowsRef.current){
          // Identical frame/inner motion in the higher window layer: wordmark stays behind it.
          addAlbumSlide(timeline,outgoingWindowsRef.current,windowFrameRef.current,windowFrameRef.current.firstElementChild,slideDirection.current,duration);
          sceneFrameRef.current.parentElement?.setAttribute('data-experience-transition','true');
          timeline.fromTo(sceneBackdropRef.current,{backgroundColor:homeScenes[transition.from].palette.ink},{backgroundColor:scene.palette.ink,duration,ease:'power1.inOut',clearProps:'backgroundColor'},0)
            .fromTo([wallpaperRef.current,aquaticForegroundRef.current],{opacity:transition.from==='experience'?1:0},{opacity:transition.to==='experience'?1:0,duration,ease:'power1.inOut',clearProps:'opacity'},0);
          const shade=sceneFrameRef.current.querySelector('.scene-shade');
          if(shade)timeline.fromTo(shade,{opacity:0},{opacity:1,duration:.2,clearProps:'opacity'},duration-.2);
        }
      }
    }
    if(state.activeWorld==='life'&&sceneFrameRef.current)addLifeSettle(timeline,sceneFrameRef.current,duration);
    timeline.fromTo('.album-foreground',{x:150,opacity:0},{x:0,opacity:1,duration:researchSwitch?.48:.65,ease:'power3.out',clearProps:'transform,opacity'},entrance?.55:researchSwitch?.41:.15);
    // SplitText's staggered from/to rhythm, adapted to our original SVG masks.
    // Only inner parts animate here; the measured outer box belongs to scroll.
    const ink=rootRef.current?.querySelector('.album-home .wordmark-ink');
    const parts=rootRef.current?.querySelectorAll('.album-home .wordmark-part');
    const previousColor=wordmarkColor.current||wordmarkInk;
    wordmarkColor.current=wordmarkInk;
    if(researchSwitch&&transition){
      const flight=rootRef.current?.querySelector('.album-home .album-wordmark-flight');
      if(flight)timeline.set(flight,{mixBlendMode:transition.from==='research'?'difference':'normal'},0)
        .set(flight,{mixBlendMode:transition.to==='research'?'difference':'normal'},.4)
        .set(flight,{clearProps:'mixBlendMode'},duration);
    }
    if(ink&&parts?.length){
      if(entrance)timeline.fromTo(parts,{yPercent:36,opacity:0},{yPercent:0,opacity:1,duration:.65,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'},.4);
      else{
        timeline.set(ink,{color:previousColor},0)
          .to(parts,{yPercent:-slideDirection.current*12,opacity:0,duration:.14,stagger:.025,ease:'power2.in'},0)
          .set(ink,{color:wordmarkInk},researchSwitch?.4:.17)
          .fromTo(parts,{yPercent:slideDirection.current*28,opacity:0},{yPercent:0,opacity:1,duration:researchSwitch?.48:.53,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'},researchSwitch?.41:.2)
          .set(ink,{clearProps:'color'},researchSwitch?.94:.8);
      }
    }
    if(entrance){
      entranceRef.current=timeline;
      timeline.fromTo('.album-character-placement',{x:120,scale:.96},{x:0,scale:1,duration:.95,ease:'power3.out',clearProps:'transform'},.12);
    }else timeline.fromTo('.preview-copy',{y:18,opacity:.3},{y:0,opacity:1,duration:.5,clearProps:'transform,opacity'},researchSwitch?.41:.1);
    const settle=()=>{if(desktopTransition||lifeTransition||researchArrival||researchSwitch)timeline.progress(1);};
    const visibility=()=>{if(document.hidden)settle();};
    addEventListener('resize',settle);document.addEventListener('visibilitychange',visibility);
    if(document.hidden)settle();
    return()=>{clearTimeout(deadline);timeline.kill();entranceRef.current=null;removeEventListener('resize',settle);document.removeEventListener('visibilitychange',visibility);};
  },{scope:rootRef,dependencies:[state.activeWorld,reducedMotion,ready,entryPhase],revertOnUpdate:true});
  useEffect(()=>{
    const settle=()=>{if(entranceRef.current){entranceRef.current.progress(1);cueCharacter('idle');}};
    for(const event of ['wheel','pointerdown','keydown','touchstart']) window.addEventListener(event,settle,{passive:true,capture:true});
    return()=>{for(const event of ['wheel','pointerdown','keydown','touchstart']) window.removeEventListener(event,settle,true);};
  },[cueCharacter]);
  const preview=useCallback((direction:1|-1,focus=false)=>{
    if(interactionRef.current.entryPhase!=="lobby"||state.mode!=="lobby"||busyRef.current||performance.now()<previewUntil.current||routeRef.current.kind!=="home")return;
    const next=stepWorld(state.activeWorld,direction);
    captureScene(next,direction);
    previewUntil.current=reducedMotion?0:performance.now()+previewSwitchDuration(state.activeWorld,next)*1000;
    previewWorld.current=next;rememberWorld(next);
    dispatch({type:"PREVIEW",direction});cueCharacter("preview");void audio.playSfx("select");
    if(focus)requestAnimationFrame(()=>selectorRef.current?.querySelector<HTMLElement>(`[data-world="${next}"]`)?.focus({preventScroll:true}));
  },[state.mode,state.activeWorld,cueCharacter,audio.playSfx,reducedMotion,captureScene,rememberWorld]);
  useEffect(()=>{
    if(!guideOpen)return;
    const arrows=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||!['ArrowUp','ArrowDown'].includes(event.key))return;
      if(interactionRef.current.entryPhase!=="lobby"||interactionRef.current.mode!=="lobby"||routeRef.current.kind!=="home")return;
      const target=event.target;
      if(target instanceof Element&&target.closest('.world-selector,[role="dialog"],[data-world-input-island],input,textarea,select,[contenteditable="true"]'))return;
      event.preventDefault();
      preview(event.key==='ArrowDown'?1:-1);
    };
    addEventListener('keydown',arrows);
    return()=>removeEventListener('keydown',arrows);
  },[guideOpen,preview]);
  const confirm=useCallback((target:SectionId=state.activeWorld)=>{
    // Explicit navigation is not a preview input: it remains available after
    // natural scrolling and interrupts a background preview immediately.
    if(interactionRef.current.entryPhase!=="lobby"||busyRef.current)return;
    sceneTimelineRef.current?.progress(1);previewUntil.current=0;
    previewWorld.current=target;rememberWorld(target);
    dispatch({type:"SELECT_WORLD",world:target});
    busyRef.current=true;dispatch({type:"CONFIRM"});cueCharacter("confirm");void audio.playSfx("confirm");
    const finish=()=>navigate({kind:"section",section:target},{fromTransition:true});
    if(target==='experience'){
      navigate({kind:'section',section:target},{fromTransition:true,handover:!reducedMotion});
      busyRef.current=false;return;
    }
    if(reducedMotion||!transitionRef.current){finish();busyRef.current=false;return;}
    timelineRef.current=gsap.timeline({onComplete:()=>{busyRef.current=false;}})
      .set(transitionRef.current,{display:"grid",pointerEvents:"auto",clipPath:"polygon(-25% 0,0 0,-25% 100%,-50% 100%)"})
      .to(transitionRef.current,{clipPath:"polygon(0 0,125% 0,100% 100%,0 100%)",duration:albumTiming.confirm/2,ease:"power3.inOut"})
      .call(finish)
      .to(transitionRef.current,{clipPath:"polygon(125% 0,150% 0,125% 100%,100% 100%)",duration:albumTiming.confirm/2,ease:"power3.inOut"})
      .set(transitionRef.current,{display:"none",pointerEvents:"none"});
  },[state.activeWorld,cueCharacter,audio.playSfx,navigate,reducedMotion,rememberWorld]);
  useEffect(()=>{
    const selector=selectorRef.current;
    const lobby=selector?.closest<HTMLElement>(".album-home");
    const wheel=(event:WheelEvent)=>{
      if(entryPhase!=="lobby"||state.mode!=="lobby"||routeRef.current.kind!=="home"||mediaItem||contactOpen||event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
      if(event.target instanceof Element&&event.target.closest('[data-world-input-island]'))return;
      event.preventDefault();
      const direction=wheelGate.current(performance.now(),event.deltaY*(event.deltaMode===1?16:1));
      if(busyRef.current||performance.now()<previewUntil.current)return;
      if(direction)preview(direction);
    };
    lobby?.addEventListener("wheel",wheel,{passive:false});
    return()=>lobby?.removeEventListener("wheel",wheel);
  },[preview,state.mode,entryPhase,mediaItem,contactOpen]);
  const touchStart=(event:TouchEvent<HTMLElement>)=>{if(event.touches.length!==1){touchRef.current=null;return;}const t=event.touches[0];touchRef.current={x:t.clientX,y:t.clientY};};
  const touchEnd=(event:TouchEvent<HTMLElement>)=>{
    if(!touchRef.current)return;
    const t=event.changedTouches[0],dx=t.clientX-touchRef.current.x,dy=t.clientY-touchRef.current.y;touchRef.current=null;
    if(Math.abs(dx)>52&&Math.abs(dx)>Math.abs(dy)*1.25){ignoreClickUntil.current=Date.now()+500;preview(dx<0?1:-1);}
  };
  const currentItem=activeSection.previewId?itemById[activeSection.previewId]:undefined;

  return <main ref={rootRef} className={`site-shell album-site publication-site mode-${state.mode} world-${state.activeWorld} ${scrolled?"is-scrolled":""} ${highContrast?"rpg-high-contrast":""} ${guideOpen?"page-guide-active":""}`} data-ready={ready} data-route={route.kind} data-entry-phase={entryPhase} data-reduced-motion={reducedMotion} data-scene-phase={scenePhase} data-guide-step={guideOpen?guideStep:undefined} style={{"--accent":activeSection.accent,"--secondary":activeSection.secondary,"--hero-ink":scene.palette.ink,"--hero-paper":scene.palette.paper,"--hero-accent":scene.palette.accent,"--hero-muted":scene.palette.muted,"--hero-texture":`url(${scene.texture})`,"--face-x":`${scene.desktop.faceX}%`,"--face-y":`${scene.desktop.faceY}%`,"--camera-scale":scene.desktop.scale,"--mobile-scale":scene.mobile.scale,"--mobile-face-x":`${scene.mobile.faceX}%`,"--mobile-face-y":`${scene.mobile.faceY}%`} as CSSProperties}>
    {entryPhase!=="lobby"&&isHome&&<CharacterAwakeningOpening phase={entryPhase} reducedMotion={reducedMotion} highContrast={highContrast} posterUrl={heroCharacterAssets.posterUrl} backgroundUrl={homeScenes[DEFAULT_WORLD].texture} onBootComplete={completeBoot} onPrepareLobby={prepareLobby} onEntryComplete={completeEntry} onSceneFrame={paintOpeningScene} measureCharacter={measureOpeningCharacter}/>}
    <noscript><style>{`.album-site .site-header{background:#20271e;color:#f6f1df}[data-entry-overlay]{display:none!important}.album-site[data-entry-phase]> :not([data-entry-overlay]){visibility:visible}`}</style></noscript>
    <a className="skip-link" href="#experience" onClick={e=>{e.preventDefault();onSection('experience');}}>跳过首屏，浏览内容</a>
    <header className="site-header"><button className="brand-lockup" onClick={returnHome} aria-label="返回首页" data-focus-key="header-home">LU<span> / HOME</span></button><nav className="header-actions" aria-label="常用入口"><button onClick={onResume} data-focus-key="header-resume">简历 <span>↗</span></button><button onClick={openContact} data-focus-key="header-contact">联系 <span>↗</span></button><button type="button" className="page-guide-trigger" onClick={toggleGuide} aria-label="页面引导" aria-expanded={guideOpen} aria-controls="page-guide-panel" data-focus-key="header-guide"><span className="page-guide-label-full">页面引导</span><span className="page-guide-label-compact" aria-hidden="true">引导</span></button><div className="audio-controls" aria-label="声音控制"><button aria-pressed={audio.sfxEnabled} onClick={audio.toggleSfx} aria-label={`界面音效 ${audio.sfxEnabled?"开启":"关闭"}`}>SFX <i>{audio.sfxEnabled?"ON":"OFF"}</i></button><BgmPlayer audio={audio} reducedMotion={reducedMotion} blocked={!!mediaItem||contactOpen}/><RpgSettings bgmEnabled={audio.bgmEnabled} sfxEnabled={audio.sfxEnabled} reducedMotion={reducedMotion} highContrast={highContrast} onToggleBgm={()=>void audio.toggleBgm()} onToggleSfx={()=>void audio.toggleSfx()} onToggleReducedMotion={toggleReducedMotion} onToggleHighContrast={toggleHighContrast}/></div></nav></header>
    <div className="home-surface" id="home">
     <div className="cover-pin"><div className="cover-art">
      <section className="hero-lobby album-home" aria-label="个人介绍与主题选择" data-model-state={characterStatus}>
       <div className="album-stage">
        <div className="album-scene-hold"><div className="album-scene-backdrop" ref={sceneBackdropRef}><div className="experience-wallpaper-layer" ref={wallpaperRef}><ExperienceDesktopBackdrop><ExperienceAquatic foregroundHost={aquaticForegroundRef} preload={entryPhase!=='boot'} active={state.activeWorld==='experience'&&entryPhase==='lobby'&&state.mode==='lobby'} paused={scenePhase!=='idle'||!!mediaItem||contactOpen} reducedMotion={reducedMotion} highContrast={highContrast}/></ExperienceDesktopBackdrop></div></div><div className="album-scene-stack"><div className="album-scene-frame outgoing-scene" ref={outgoingFrameRef} aria-hidden="true" inert/><div className="album-scene-frame" ref={sceneFrameRef}><AlbumScene world={state.activeWorld} reducedMotion={reducedMotion} active={entryPhase==='lobby'&&state.mode==='lobby'&&scenePhase==='idle'&&!mediaItem&&!contactOpen}/></div></div></div>
        <div className="research-scene-cover" ref={researchCoverRef} aria-hidden="true" inert/>
        <div className="album-wordmark-flight"><AlbumWordmark/></div>
        {/* The renderer owns viewport/visibility pausing, independently of hash. */}
        <div className="album-character-flight"><div className="album-character-placement"><HeroCharacter pose={activeSection.pose} world={state.activeWorld} expression={scene.expression} action={cue.action} actionId={cue.id} active={!mediaItem&&!contactOpen} entranceReady={entryPhase==="lobby"} preloadReady={entryPhase==='title'||entryPhase==='entering'} posterHandoff={entryPhase!=='lobby'||openingRevealed.current} assets={heroCharacterAssets} reducedMotion={reducedMotion} onStatusChange={setCharacterStatus} onGreetingBusy={setGreetingBusy} onInteract={()=>void audio.playSfx("tap")}/></div></div>
        <div className="experience-window-track"><div className="experience-window-frame outgoing-windows" ref={outgoingWindowsRef} aria-hidden="true" inert/><div className="experience-window-frame current-windows" ref={windowFrameRef}><div className="experience-window-inner">{state.activeWorld==='experience'&&<ExperienceDesktop reducedMotion={reducedMotion} active={entryPhase==='lobby'&&state.mode==='lobby'&&scenePhase==='idle'&&!mediaItem&&!contactOpen} animateEntrance={entryPhase==='entering'}/>}</div></div></div>
        <div className="experience-aquatic-foreground" ref={aquaticForegroundRef} aria-hidden="true" inert/>
       </div>
        <div className="hero-identity"><h1 className="hero-name" tabIndex={-1}>{profile.name}</h1><p className="hero-kicker">{profile.school}</p><p className="identity-subline">{profile.identity}</p></div>
        <AlbumForeground world={state.activeWorld}/>
        <div className="selector-block">
        <nav ref={selectorRef} className="world-selector" aria-label="主题选曲" aria-describedby="selector-help" onTouchStart={touchStart} onTouchEnd={touchEnd} onTouchCancel={()=>{touchRef.current=null;}} onKeyDown={event=>{
          if(event.ctrlKey||event.metaKey||event.altKey)return;
          if(["ArrowRight","ArrowDown","ArrowLeft","ArrowUp"].includes(event.key)){event.preventDefault();if(!event.repeat)preview(["ArrowRight","ArrowDown"].includes(event.key)?1:-1,true);}
          if(event.key==='Enter'){event.preventDefault();if(!event.repeat)confirm();}
        }}>{sections.map(section=><button type="button" className={`world-tab ${section.id===state.activeWorld?"is-active":""}`} data-world={section.id} key={section.id} data-focus-key={`selector-${section.id}`} aria-pressed={section.id===state.activeWorld} data-preview-active={section.id===state.activeWorld} onClick={event=>{
          if(event.detail>0&&Date.now()<ignoreClickUntil.current)return;
          if(interactionRef.current.entryPhase!=="lobby"||busyRef.current||performance.now()<previewUntil.current)return;
          if(section.id===state.activeWorld){confirm();return;}
          captureScene(section.id);
          previewUntil.current=reducedMotion?0:performance.now()+previewSwitchDuration(state.activeWorld,section.id)*1000;
          previewWorld.current=section.id;rememberWorld(section.id);
          dispatch({type:'SELECT_WORLD',world:section.id});cueCharacter('preview');void audio.playSfx('select');
        }}><span className="world-music-fill" aria-hidden="true"/><span className="track-index">{section.index}</span><span className="track-name"><b>{section.label}</b><small>{section.id==='research'&&section.id===state.activeWorld?'Cities · SSCI · JCR Q1':section.english}</small></span><span className="track-mark" aria-hidden="true">{section.id===state.activeWorld?'↗':'·'}</span></button>)}<button className="mobile-enter" onClick={()=>confirm()} aria-label={`进入${activeSection.label}专题`}>进入 <span>↗</span></button></nav>
        <p className="selector-help" id="selector-help"><span className="selector-help-desktop">点击 / ↑↓ 切换 · 再点当前 / ENTER 进入</span><span className="selector-help-mobile">点击 / 左右滑动切换 · 再点当前进入</span></p>
        <div className="hero-preview"><button className="current-preview" onClick={()=>currentItem?openItem(currentItem):onSection(activeSection.id)} data-focus-key="hero-preview"><span className="preview-copy"><strong>{activeSection.previewTitle}</strong><span>{state.activeWorld==='experience'?`${(itemById['sand-ai'] as {organisation:string}).organisation} 等 5 段实习`:activeSection.previewDetail}</span><b>{currentItem?"查看内容":"进入专题"} <i>↗</i></b></span></button></div>
        </div>
        <div className={`rpg-dialogue-stage ${guideOpen?"page-guide-stage":""}`} aria-label={guideOpen?"页面引导与行动":"世界说明与行动"}>
          {guideOpen ? <PageGuideDialogue
            key={guideEpoch}
            reducedMotion={reducedMotion}
            onStepChange={onGuideStepChange}
            onChoice={()=>void audio.playSfx('select')}
            onClose={()=>closeGuide()}
            onTypeCharacter={audio.playDialogueBlip}
          /> : <RpgDialogue world={state.activeWorld} reducedMotion={reducedMotion} onTypeCharacter={audio.playDialogueBlip}/>}
          <div className="rpg-action-rail" role="group" aria-label="世界行动">
            <button type="button" className="is-active" onClick={()=>confirm()} data-focus-key="rpg-enter">进入</button>
          </div>
        </div>
        <div className="hero-bottom"><button onClick={()=>navigate({kind:'section',section:'experience'},{handover:!reducedMotion})} data-focus-key="browse-home">向下浏览 ↓</button></div>
      </section>
     </div></div>
     {isHome&&state.activeWorld==='research'&&<ResearchDossierContinuation/>}
    </div>
    <div className="publication-masthead" aria-label="正文页眉"><AlbumWordmark target/></div>
    <div className="transition-wipe" ref={transitionRef} aria-hidden="true"><span>{activeSection.index} / {activeSection.label}</span><b>{activeSection.english}</b></div>
    {notice&&<p className="route-notice" role="status">{notice}</p>}
    <Publication onSection={onSection} onItem={openItem} onMedia={openMedia} onContact={openContact} onGuide={()=>setChibiOpen(v=>!v)} guideOpen={chibiOpen} reducedMotion={reducedMotion} active={state.mode==='content'} previewBlocked={!!mediaItem||contactOpen}/>
    {(scrolled||!isHome)&&<aside className={`chibi-guide avatar-guide ${chibiOpen?"is-open":""}`}><div id="quick-menu" className="chibi-menu" hidden={!chibiOpen}><p>想去哪个世界？</p><button onClick={returnHome}>HOME / 返回首页</button>{sections.map(s=><button key={s.id} onClick={()=>onSection(s.id)}>{s.index} — {s.label}</button>)}<button onClick={onResume}>简历 ↗</button><button onClick={openContact}>联系 ↗</button></div><button ref={chibiButtonRef} className="chibi-character avatar-character" onClick={()=>setChibiOpen(v=>!v)} aria-expanded={chibiOpen} aria-controls="quick-menu" aria-label="快捷目录"><span className="avatar-crop"><img src={heroCharacterAssets.posterUrl} alt="原创角色头像导览"/></span><i>{chibiOpen?'×':'目录'}</i></button></aside>}
    {mediaItem&&<PublicationMediaDialog key={mediaItem.id} item={mediaItem} onClose={closeMedia} opener={openerRef.current}/>}
    {contactOpen&&<ContactDialog onClose={()=>setContactOpen(false)} opener={contactOpener.current}/>}
    <footer className="site-footer"><span><b>XUEYING LU</b> / PERSONAL SPACE</span><span>文字与原创内容 © 卢雪莹 · 素材权利归各自权利人</span><button onClick={returnHome}>回到首页 ↑</button></footer>
  </main>;
}
