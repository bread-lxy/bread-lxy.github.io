"use client";

import {useState,type CSSProperties} from 'react';
import {safeContentUrl} from '../content/site';
import {studioFilmSamples} from '../content/studio-media';
import './publication-tv.css';
import './studio-lobby.css';

type ScreenKind='home'|'character'|'snow'|'off';
type TvPosition={x:number;y:number;width:number;rotate:number;z:number};
type LobbyTvSlot={kind:ScreenKind;ratio:string;desktop:TvPosition;mobile:TvPosition};

/** Tight, hand-composed views of the same CRT cluster; mobile is not a scaled desktop canvas. */
export const studioLobbySlots:readonly LobbyTvSlot[]=[
  {kind:'home',ratio:'16/9',desktop:{x:30,y:25,width:37,rotate:-2.4,z:8},mobile:{x:-15,y:26,width:72,rotate:-3,z:8}},
  {kind:'character',ratio:'4/3',desktop:{x:72,y:20,width:29,rotate:2.7,z:7},mobile:{x:55,y:23,width:68,rotate:3,z:7}},
  {kind:'snow',ratio:'4/3',desktop:{x:41,y:-12,width:29,rotate:1.8,z:3},mobile:{x:47,y:-7,width:62,rotate:-2,z:3}},
  {kind:'off',ratio:'5/4',desktop:{x:18,y:-7,width:29,rotate:-3.6,z:2},mobile:{x:-20,y:4,width:66,rotate:3,z:2}},
  {kind:'snow',ratio:'4/3',desktop:{x:85,y:-10,width:24,rotate:4.2,z:2},mobile:{x:77,y:12,width:57,rotate:4,z:2}},
  {kind:'off',ratio:'4/3',desktop:{x:16,y:53,width:28,rotate:2.5,z:4},mobile:{x:-22,y:53,width:68,rotate:2,z:4}},
  {kind:'snow',ratio:'5/4',desktop:{x:56,y:57,width:32,rotate:-2.1,z:5},mobile:{x:32,y:57,width:72,rotate:-3,z:5}},
  {kind:'off',ratio:'4/3',desktop:{x:81,y:55,width:29,rotate:3.4,z:4},mobile:{x:74,y:61,width:65,rotate:2,z:4}},
  {kind:'snow',ratio:'4/3',desktop:{x:30,y:76,width:36,rotate:-2.8,z:3},mobile:{x:-16,y:78,width:78,rotate:-3,z:3}},
] as const;

function slotStyle(slot:LobbyTvSlot):CSSProperties{
  return {
    '--lobby-x':`${slot.desktop.x}%`,'--lobby-y':`${slot.desktop.y}%`,
    '--lobby-w':`${slot.desktop.width}%`,'--lobby-r':`${slot.desktop.rotate}deg`,
    '--lobby-z':slot.desktop.z,
    '--lobby-mx':`${slot.mobile.x}%`,'--lobby-my':`${slot.mobile.y}%`,
    '--lobby-mw':`${slot.mobile.width}%`,'--lobby-mr':`${slot.mobile.rotate}deg`,
    '--tv-ratio':slot.ratio,
  } as CSSProperties;
}

function LobbyScreen({slot,index}:{slot:LobbyTvSlot;index:number}){
  const [failed,setFailed]=useState(false);
  const poster=slot.kind==='home'?studioFilmSamples[0]?.media?.poster:slot.kind==='character'?studioFilmSamples[1]?.media?.poster:undefined;
  const src=safeContentUrl(poster);
  const signal=slot.kind==='off'?'tv-off':'tv-snow';
  return <div className={`studio-lobby-tv tv-empty ${signal} studio-lobby-tv-${index}`} style={slotStyle(slot)} data-studio-tv data-tv-order={index} data-signal={src?'sample':slot.kind}>
    <div className="studio-lobby-tv-inner" data-studio-tv-drop><div className="tv-bezel"><div className="tv-screen tv-signal">
      {src&&!failed&&<img src={src} alt="" decoding="async" loading="eager" onError={()=>setFailed(true)}/>}
      <span className="tv-glass"/>
    </div></div></div>
  </div>;
}

export function StudioLobbyWall(){
  return <div className="studio-lobby-wall" data-studio-lobby-wall aria-hidden="true">
    <div className="studio-lobby-ground"/>
    <div className="studio-lobby-cables"/>
    {studioLobbySlots.map((slot,index)=><LobbyScreen key={index} slot={slot} index={index}/>)}
  </div>;
}
