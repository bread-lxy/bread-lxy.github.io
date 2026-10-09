"use client";
import { useEffect, useRef, useState } from 'react';
import { canPlayBgm } from '../content/bgm';
import type { useAudioController } from './use-audio';
import { BgmTitle } from './BgmTitle';
import './bgm-player.css';

export type BgmController = ReturnType<typeof useAudioController>;
export const formatBgmTime = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, '0')}:${Math.floor(Math.max(0, seconds) % 60).toString().padStart(2, '0')}`;
const statusLabels = { off: 'READY', paused: 'PAUSED', playing: 'PLAYING', loading: 'LOADING', error: 'LOAD ERROR', blocked: 'TAP TO PLAY', unavailable: 'NO AUDIO' };

function TransportIcon({ name }: { name: 'play' | 'pause' | 'previous' | 'next' }) {
  return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
    {name === 'play' ? <path d="M4 2h2v2h3v2h3v4H9v2H6v2H4z" /> : name === 'pause' ? <path d="M3 2h4v12H3zm6 0h4v12H9z" /> : name === 'previous' ? <path d="M2 2h2v12H2zm10 0h2v12h-2v-2H9v-2H6V6h3V4h3z" /> : <path d="M12 2h2v12h-2zM2 2h2v2h3v2h3v4H7v2H4v2H2z" />}
  </svg>;
}

export function BgmPlayer({ audio, reducedMotion, blocked = false }: { audio: BgmController; reducedMotion: boolean; blocked?: boolean }) {
  const [open, setOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [showStrip, setShowStrip] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const { bgm, currentTrack: track } = audio;
  const playable = !!track && canPlayBgm(track);
  const playing = bgm.status === 'playing';
  const playbackRequested = bgm.requested && bgm.status !== 'blocked';
  const playableCount = audio.tracks.filter(canPlayBgm).length;
  if ((bgm.requested || playing) && !showStrip) setShowStrip(true);
  if (blocked && open) { setOpen(false); setLicenseOpen(false); }
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  const transport = () => bgm.status === 'blocked' || bgm.status === 'error' ? audio.playBgm() : audio.toggleBgm();
  const playbackLabel = bgm.requested && bgm.status !== 'blocked' ? '暂停背景音乐' : bgm.status === 'error' ? '重试背景音乐' : '播放背景音乐';
  if (!track) return null;
  // Delegated Escape/arrow handling for the native controls, not an interactive group.
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
  return <div ref={root} role="group" aria-label="背景音乐" className="bgm-player" data-state={bgm.status} data-reduced-motion={reducedMotion} data-strip-visible={open || showStrip}
    onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape' && open) { event.preventDefault(); close(); } }}
    onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <button ref={trigger} className="bgm-trigger" type="button" aria-label="背景音乐开关" aria-pressed={playbackRequested} disabled={!playable} title={playbackLabel}
      onClick={() => { setOpen(false); setLicenseOpen(false); setShowStrip(true); transport(); }}>BGM <i>{playbackRequested ? 'ON' : 'OFF'}</i></button>
    {!blocked && (open || showStrip) && <div className={`bgm-dock ${open ? 'is-open' : ''}`}>
      <div className="bgm-strip">
        <span className={`bgm-meter ${playing ? '' : 'is-idle'}`} aria-hidden="true"><i /><i /><i /></span>
        <div className="bgm-summary">
          <BgmTitle text={track.title} reducedMotion={reducedMotion} />
          <span className="bgm-byline"><span>{track.artist}</span><span>INSTRUMENTAL</span></span>
        </div>
        <button className="bgm-disclosure" type="button" aria-label={open ? '收起音乐详情' : '展开音乐详情'} aria-expanded={open} aria-controls="bgm-panel" onClick={() => setOpen(value => !value)}>{open ? '−' : '+'}</button>
      </div>
      <span className="bgm-status-label" aria-live="polite">{statusLabels[bgm.status]}</span>
      <div className="bgm-strip-meta">
        <div className="bgm-compact-transport" role="group" aria-label="音乐播放控制">
          <button type="button" disabled={!playableCount} onClick={() => audio.stepTrack(-1)} aria-label="上一首" title="上一首"><TransportIcon name="previous" /></button>
          <button className="bgm-play" type="button" disabled={!playable} aria-label={playbackLabel} title={playbackLabel} onClick={transport}><TransportIcon name={playbackRequested ? 'pause' : 'play'} /></button>
          <button type="button" disabled={!playableCount} onClick={() => audio.stepTrack(1)} aria-label="下一首" title="下一首"><TransportIcon name="next" /></button>
        </div>
        <button type="button" aria-expanded={open && licenseOpen} aria-controls="bgm-license" onClick={() => { setLicenseOpen(!open || !licenseOpen); setOpen(true); }}>来源 / 许可 ↗</button>
      </div>
      {(bgm.status === 'error' || bgm.status === 'blocked') && <p className="bgm-compact-message" role="status">{bgm.status === 'error' ? '加载失败 · 点击播放重试' : '请再次点击播放'}</p>}
      {open && <section className="bgm-panel" id="bgm-panel" aria-label="背景音乐控制">
        <div className="bgm-panel-heading"><span>LISTENING ROOM</span><button type="button" onClick={close} aria-label="关闭音乐面板">×</button></div>
        {licenseOpen && <div className="bgm-license" id="bgm-license"><strong>音乐来源与使用条件</strong><p>{track.licenseNote}</p><p>本页不代表作者背书，不提供音源下载。</p><div><a href={track.sourceUrl} target="_blank" rel="noopener noreferrer">作者发布页 ↗</a><a href="https://piapro.jp/license/pc/icon" target="_blank" rel="noopener noreferrer">Piapro 使用条件 ↗</a></div></div>}
        <div className="bgm-timeline"><input aria-label="歌曲进度" type="range" min="0" max={bgm.duration || 1} step="0.1" value={Math.min(bgm.position, bgm.duration || 1)} disabled={!bgm.duration} onChange={event => audio.seekBgm(Number(event.target.value))}/><div><time>{formatBgmTime(bgm.position)}</time><time>{formatBgmTime(bgm.duration)}</time></div></div>
        <label className="bgm-volume"><span>VOL.</span><input aria-label="背景音乐音量" type="range" min="0" max="1" step="0.01" value={bgm.volume} onChange={event => audio.setBgmVolume(Number(event.target.value))}/><output>{Math.round(bgm.volume * 100).toString().padStart(2, '0')}</output></label>
        {(bgm.status === 'error' || bgm.status === 'blocked' || !playable) && <p className="bgm-message" role="status">{!playable ? '官方音源待接入。可先查看曲目来源。' : bgm.status === 'blocked' ? '浏览器暂停了音频，请点击播放。' : '音频未能加载，请重试或查看来源。'}</p>}
        <div className="bgm-list-heading"><span>TRACKLIST</span><span>{playableCount.toString().padStart(2, '0')} READY / LOOP</span></div>
        <ol className="bgm-tracklist">{audio.tracks.map((item, index) => <li key={item.id}>
          <button type="button" disabled={!canPlayBgm(item)} aria-current={item.id === track.id ? 'true' : undefined} onClick={() => audio.selectTrack(item.id)} aria-label={`播放 ${item.title}`}>
            <span className="bgm-track-number">{(index + 1).toString().padStart(2, '0')}</span>
            <span><strong lang="ja">{item.title}</strong><small>{item.artist} · {item.version}</small></span>
            <span className="bgm-track-state">{!canPlayBgm(item) ? '待接入' : item.id === track.id && playing ? '▶' : '↗'}</span>
          </button>
          {!canPlayBgm(item) && <a className="bgm-pending-source" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">官方来源 ↗</a>}
        </li>)}</ol>
      </section>}
    </div>}
  </div>;
}
