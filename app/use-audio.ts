"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeContentUrl, type AudioConfig } from "../content/site";
import { canPlayBgm, visibleBgmTracks } from '../content/bgm';
import { BgmPlayback, type BgmSnapshot } from './bgm-playback';
import { initialDialogueBlipCursor, stepDialogueBlip } from './dialogue-blip';
type HowlInstance = import("howler").Howl;
type DialogueVoice = { sounds: HowlInstance[]; canPlay: () => boolean };

function makeWavDataUri(notes: number[], beatSeconds: number, volume = 0.16) {
  const sampleRate = 11025;
  const samplesPerBeat = Math.floor(sampleRate * beatSeconds);
  const sampleCount = notes.length * samplesPerBeat;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, sampleCount * 2, true);

  for (let noteIndex = 0; noteIndex < notes.length; noteIndex += 1) {
    const frequency = notes[noteIndex];
    for (let local = 0; local < samplesPerBeat; local += 1) {
      const position = noteIndex * samplesPerBeat + local;
      const envelope = Math.min(local / 120, (samplesPerBeat - local) / 180, 1);
      const tone = frequency === 0 ? 0 : Math.sign(Math.sin((2 * Math.PI * frequency * position) / sampleRate));
      const overtone = frequency === 0 ? 0 : Math.sin((4 * Math.PI * frequency * position) / sampleRate) * 0.22;
      view.setInt16(44 + position * 2, Math.max(-1, Math.min(1, tone * 0.7 + overtone)) * envelope * volume * 32767, true);
    }
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 4096) binary += String.fromCharCode(...bytes.subarray(index, index + 4096));
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function useAudioController(config?: AudioConfig) {
  const [sfxEnabled, setSfxEnabled] = useState(false);
  const [bgm, setBgm] = useState<BgmSnapshot>({
    trackId: visibleBgmTracks[0]?.id ?? '', status: 'unavailable', position: 0, duration: 0, volume: .25, requested: false,
  });
  const engineRef = useRef<BgmPlayback | null>(null);
  const soundsRef = useRef<Record<string, HowlInstance> | null>(null);
  const pendingRef = useRef<Promise<Record<string, HowlInstance> | null> | null>(null);
  const voiceRef = useRef<DialogueVoice | null>(null);
  const voicePendingRef = useRef<Promise<DialogueVoice | null> | null>(null);
  const voiceGeneration = useRef(0);
  const dialogueCursor = useRef({ ...initialDialogueBlipCursor });
  const sfxIntent = useRef(false);
  const mounted = useRef(false);
  const generation = useRef(0);
  const sourceRef = useRef(config);
  useEffect(() => { sourceRef.current = config; }, [config]);
  // World changes may replace interface sounds, but never touch BGM.
  const sourceKey = JSON.stringify({ select: config?.select, confirm: config?.confirm, tap: config?.tap });
  const save = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* optional */ } };

  const disposeVoice = useCallback(() => {
    voiceGeneration.current++;
    voiceRef.current?.sounds.forEach(sound => sound.unload());
    voiceRef.current = null;
    voicePendingRef.current = null;
    dialogueCursor.current = { ...initialDialogueBlipCursor };
  }, []);

  useEffect(() => {
    mounted.current = true;
    const engine = new BgmPlayback(visibleBgmTracks, canPlayBgm, async () => {
      const { Howl } = await import('howler');
      return options => new Howl(options);
    }, save);
    engineRef.current = engine;
    const unsubscribe = engine.subscribe(() => setBgm(engine.getSnapshot()));
    try {
      sfxIntent.current = localStorage.getItem('personal-archive-sfx') === 'on';
      setSfxEnabled(sfxIntent.current);
      engine.restore(localStorage.getItem('personal-archive-bgm-track'), localStorage.getItem('personal-archive-bgm-volume'));
    } catch { /* blocked storage must not block playback */ }
    setBgm(engine.getSnapshot());
    const disposeSfx = () => {
      generation.current++;
      Object.values(soundsRef.current || {}).forEach(sound => sound.unload());
      soundsRef.current = null; pendingRef.current = null;
    };
    const visibility = () => {
      engine.setHidden(document.hidden);
      if (document.hidden) voiceRef.current?.sounds.forEach(sound => sound.stop());
    };
    const pageHide = () => { engine.pageHide(); disposeSfx(); disposeVoice(); };
    // Capture non-bubbling media events. Decorative muted previews don't interrupt BGM.
    const activeVideos = new Set<HTMLMediaElement>();
    const syncVideos = () => {
      document.querySelectorAll('video').forEach(video => {
        if (!video.paused && !video.ended && !video.muted) activeVideos.add(video);
        else activeVideos.delete(video);
      });
      for (const video of activeVideos) if (!video.isConnected || video.paused || video.ended || video.muted) activeVideos.delete(video);
      engine.setVideoActive(activeVideos.size > 0);
    };
    document.addEventListener('play', syncVideos, true);
    document.addEventListener('pause', syncVideos, true);
    document.addEventListener('ended', syncVideos, true);
    document.addEventListener('volumechange', syncVideos, true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        if (engine.getSnapshot().status === 'playing') engine.poll();
        // A video dialog can be removed without a pause event.
        if (activeVideos.size) syncVideos();
      }
    }, 250);
    return () => {
      mounted.current = false; unsubscribe(); engine.dispose(); engineRef.current = null; disposeSfx(); disposeVoice();
      window.clearInterval(timer);
      document.removeEventListener('play', syncVideos, true); document.removeEventListener('pause', syncVideos, true);
      document.removeEventListener('ended', syncVideos, true); document.removeEventListener('volumechange', syncVideos, true);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pageHide);
    };
  }, [disposeVoice]);

  useEffect(() => {
    generation.current++;
    Object.values(soundsRef.current || {}).forEach(sound => sound.unload());
    soundsRef.current = null; pendingRef.current = null;
  }, [sourceKey]);

  const ensureSfx = useCallback(async () => {
    if (soundsRef.current) return soundsRef.current;
    if (pendingRef.current) return pendingRef.current;
    const token = generation.current;
    pendingRef.current = (async () => {
      const { Howl } = await import('howler');
      if (!mounted.current || token !== generation.current) return null;
      const source = (name: 'select' | 'confirm' | 'tap', notes: number[], beat: number) => {
        const url = safeContentUrl(sourceRef.current?.[name]);
        return url ? { src: [url] } : { src: [makeWavDataUri(notes, beat)], format: ['wav'] };
      };
      const sounds = {
        select: new Howl({ ...source('select', [660], .07), volume: .3, preload: false }),
        confirm: new Howl({ ...source('confirm', [440, 660, 880], .08), volume: .35, preload: false }),
        tap: new Howl({ ...source('tap', [880, 0, 740], .055), volume: .25, preload: false }),
      };
      soundsRef.current = sounds; return sounds;
    })().catch(() => null).finally(() => { if (token === generation.current) pendingRef.current = null; });
    return pendingRef.current;
  }, []);

  // Dialogue has its own small sample pool. World-specific UI sounds may be
  // replaced without cutting off the speaking voice.
  const ensureVoice = useCallback(async () => {
    if (voiceRef.current) return voiceRef.current;
    if (voicePendingRef.current) return voicePendingRef.current;
    const token = voiceGeneration.current;
    voicePendingRef.current = (async () => {
      const { Howl, Howler } = await import('howler');
      if (!mounted.current || !sfxIntent.current || token !== voiceGeneration.current) return null;
      const sounds = ['a', 'b', 'c'].map(variant => new Howl({
        src: [`/audio/sfx/dialogue-blip-${variant}.wav`], format: ['wav'], volume: .18, preload: true,
      }));
      let resumePending: Promise<void> | null = null;
      const voice = { sounds, canPlay: () => {
        if (!Howler.usingWebAudio || Howler.ctx?.state === 'running') return true;
        // Howler can suspend an idle context. Resume it without queueing any
        // old character; a later, still-visible glyph may sound once ready.
        if (Howler.ctx && !resumePending) {
          resumePending = Howler.ctx.resume().catch(() => {}).finally(() => { resumePending = null; });
        }
        return false;
      } };
      voiceRef.current = voice;
      return voice;
    })().catch(() => null).finally(() => { if (token === voiceGeneration.current) voicePendingRef.current = null; });
    return voicePendingRef.current;
  }, []);

  useEffect(() => {
    if (sfxEnabled) void ensureVoice();
  }, [ensureVoice, sfxEnabled]);

  const playDialogueBlip = useCallback((character: string, index: number, lineId: string) => {
    if (!sfxIntent.current || document.hidden) return;
    const next = stepDialogueBlip(dialogueCursor.current, character, index, lineId, performance.now());
    dialogueCursor.current = next.cursor;
    if (next.variant === null) return;
    const voice = voiceRef.current;
    if (!voice) { void ensureVoice(); return; }
    const sound = voice.sounds[next.variant];
    // Never queue old characters while assets load or a browser awaits unlock.
    if (voice.canPlay() && sound.state() === 'loaded') sound.play();
  }, [ensureVoice]);

  const playSfx = useCallback(async (name: 'select' | 'confirm' | 'tap') => {
    if (!sfxIntent.current || document.hidden) return;
    const sounds = await ensureSfx();
    if (!sounds || soundsRef.current !== sounds || !mounted.current || !sfxIntent.current || document.hidden) return;
    const sound = sounds[name];
    sound.off('load');
    const play = () => {
      if (mounted.current && sfxIntent.current && !document.hidden && soundsRef.current === sounds) { sound.stop(); sound.play(); }
    };
    if (sound.state() === 'loaded') play();
    else { sound.once('load', play); if (sound.state() === 'unloaded') sound.load(); }
  }, [ensureSfx]);

  const toggleSfx = useCallback(() => {
    const next = !sfxIntent.current;
    sfxIntent.current = next; setSfxEnabled(next); save('personal-archive-sfx', next ? 'on' : 'off');
    if (next) void playSfx('confirm');
    else {
      Object.values(soundsRef.current || {}).forEach(sound => { sound.off('load'); sound.stop(); });
      disposeVoice();
    }
  }, [disposeVoice, playSfx]);
  const toggleBgm = useCallback(() => engineRef.current?.toggle(), []);
  const playBgm = useCallback(() => { void engineRef.current?.play(); }, []);
  const pauseBgm = useCallback(() => engineRef.current?.pause(), []);
  const selectTrack = useCallback((id: string) => engineRef.current?.select(id, true), []);
  const stepTrack = useCallback((direction: number) => engineRef.current?.step(direction), []);
  const seekBgm = useCallback((position: number) => engineRef.current?.seek(position), []);
  const setBgmVolume = useCallback((volume: number) => engineRef.current?.setVolume(volume), []);
  const readBgmFrame = useCallback(() => engineRef.current?.readVisualFrame() ?? null, []);
  return {
    sfxEnabled, bgmEnabled: bgm.requested, bgmState: bgm.status, bgm,
    tracks: visibleBgmTracks, currentTrack: visibleBgmTracks.find(track => track.id === bgm.trackId) ?? visibleBgmTracks[0],
    playSfx, playDialogueBlip, toggleSfx, toggleBgm, playBgm, pauseBgm, selectTrack, stepTrack, seekBgm, setBgmVolume, readBgmFrame,
  };
}
