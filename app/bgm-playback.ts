import type { BgmTrack } from '../content/bgm';

export type BgmStatus = 'off' | 'paused' | 'loading' | 'playing' | 'blocked' | 'error' | 'unavailable';
export type BgmSnapshot = { trackId: string; status: BgmStatus; position: number; duration: number; volume: number; requested: boolean };
export type BgmSound = {
  load: () => unknown;
  play: (id?: number) => number;
  pause: (id?: number) => unknown;
  unload: () => unknown;
  duration: () => number;
  seek: (position?: number, id?: number) => unknown;
  volume: (volume: number) => unknown;
  once: (event: string, callback: () => void) => unknown;
};
export type BgmSoundOptions = {
  src: string[]; html5: boolean; preload: boolean; autoplay: boolean; loop: boolean; volume: number;
  onload: () => void; onplay: (id: number) => void; onend: () => void;
  onloaderror: () => void; onplayerror: () => void;
};
type CreateSound = (options: BgmSoundOptions) => BgmSound;

// A single owner for BGM, independent of React renders/world navigation.
// The generation token also invalidates pending dynamic imports and late Howler events.
export class BgmPlayback {
  private sound: BgmSound | null = null;
  private soundId: number | undefined;
  private generation = 0;
  private requestVersion = 0;
  private hidden = false;
  private resumeAfterVisibility = false;
  private disposed = false;
  private videoActive = false;
  private listeners = new Set<() => void>();
  private snapshot: BgmSnapshot;
  private tracks: readonly BgmTrack[];
  private playable: (track: BgmTrack) => boolean;
  private loadFactory: () => Promise<CreateSound>;
  private save: (key: string, value: string) => void;
  constructor(
    tracks: readonly BgmTrack[],
    playable: (track: BgmTrack) => boolean,
    loadFactory: () => Promise<CreateSound>,
    save: (key: string, value: string) => void = () => {},
  ) {
    this.tracks = tracks; this.playable = playable; this.loadFactory = loadFactory; this.save = save;
    const track = tracks[0];
    this.snapshot = { trackId: track?.id ?? '', status: track && playable(track) ? 'off' : 'unavailable', position: 0, duration: 0, volume: .25, requested: false };
  }
  getSnapshot = () => this.snapshot;
  // Read the actual Howler playhead without notifying React/store subscribers.
  // Its public seek(id) getter also freezes naturally during buffering.
  readVisualFrame = (): BgmSnapshot => {
    const value = this.sound && this.soundId !== undefined ? this.sound.seek(this.soundId) : this.snapshot.position;
    return { ...this.snapshot, position: typeof value === 'number' && Number.isFinite(value) ? value : this.snapshot.position };
  };
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<BgmSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  restore(trackId: string | null, volume: string | null) {
    if (trackId && this.tracks.some(track => track.id === trackId)) this.select(trackId);
    if (volume !== null && volume.trim() !== '' && Number.isFinite(Number(volume))) this.setVolume(Number(volume));
    // A saved selection is not permission to start audio on a new visit.
  }
  private current() { return this.tracks.find(track => track.id === this.snapshot.trackId); }
  private release() {
    this.generation++;
    const previous = this.sound;
    this.sound = null; this.soundId = undefined;
    previous?.unload();
  }
  async play() {
    const track = this.current();
    if (this.disposed || this.hidden || this.videoActive) return;
    if (!track || !this.playable(track)) { this.update({ status: 'unavailable', requested: false }); return; }
    const request = ++this.requestVersion;
    if (this.snapshot.status === 'error') this.release();
    this.update({ requested: true, status: 'loading' });
    if (this.sound) {
      this.soundId = this.sound.play(this.soundId);
      return;
    }
    const generation = this.generation;
    try {
      const createSound = await this.loadFactory();
      if (this.disposed || generation !== this.generation || request !== this.requestVersion || !this.snapshot.requested || this.hidden) return;
      const live = () => !this.disposed && generation === this.generation && this.sound === sound;
      const sound: BgmSound = createSound({
        src: [track.asset!.src], html5: true, preload: false, autoplay: false, loop: false, volume: this.snapshot.volume,
        onload: () => { if (live()) this.update({ duration: sound.duration() }); },
        onplay: (id) => {
          if (!live()) return;
          this.soundId = id;
          if (!this.snapshot.requested || this.hidden || this.videoActive) { sound.pause(id); return; }
          this.update({ status: 'playing', duration: sound.duration() });
        },
        onend: () => {
          if (!live() || !this.snapshot.requested || this.hidden) return;
          this.step(1, true);
        },
        onloaderror: () => { if (live()) { this.requestVersion++; this.update({ status: 'error', requested: false }); } },
        onplayerror: () => {
          if (!live() || !this.snapshot.requested) return;
          this.update({ status: 'blocked' });
          sound.once('unlock', () => {
            if (live() && this.snapshot.requested && !this.hidden && !this.videoActive) this.soundId = sound.play(this.soundId);
          });
        },
      });
      this.sound = sound;
      // With preload:false Howler queues play(), but does not start load().
      // Both calls happen only in this user-requested playback path.
      sound.load();
      this.soundId = sound.play();
    } catch {
      if (!this.disposed && generation === this.generation && request === this.requestVersion) this.update({ status: 'error', requested: false });
    }
  }
  pause() {
    this.requestVersion++;
    this.resumeAfterVisibility = false;
    this.poll();
    const wasLoading = this.snapshot.status === 'loading';
    const wasIdle = this.snapshot.status === 'off';
    this.update({ requested: false, status: this.current() && this.playable(this.current()!) ? (wasIdle ? 'off' : 'paused') : 'unavailable' });
    // Howler may have queued a play during loading. Unload cancels that queue.
    if (wasLoading) this.release(); else this.sound?.pause(this.soundId);
  }
  toggle() { if (this.snapshot.requested) this.pause(); else void this.play(); }
  select(trackId: string, start = false) {
    const track = this.tracks.find(value => value.id === trackId);
    if (!track || this.disposed) return;
    this.requestVersion++; this.resumeAfterVisibility = false; this.release();
    this.save('personal-archive-bgm-track', track.id);
    this.update({ trackId, position: 0, duration: 0, requested: false, status: this.playable(track) ? 'off' : 'unavailable' });
    if (start) void this.play();
  }
  step(direction: number, start = this.snapshot.requested) {
    const available = this.tracks.filter(this.playable);
    if (!available.length) return;
    const index = available.findIndex(track => track.id === this.snapshot.trackId);
    this.select(available[(Math.max(0, index) + direction + available.length) % available.length].id, start);
  }
  seek(position: number) {
    if (!this.sound || !this.snapshot.duration || !Number.isFinite(position)) return;
    const next = Math.max(0, Math.min(this.snapshot.duration, position));
    this.sound.seek(next, this.soundId); this.update({ position: next });
  }
  setVolume(volume: number) {
    if (!Number.isFinite(volume)) return;
    const next = Math.max(0, Math.min(1, volume));
    this.sound?.volume(next); this.update({ volume: next });
    this.save('personal-archive-bgm-volume', String(next));
  }
  poll() {
    if (!this.sound) return;
    const value = this.soundId === undefined ? 0 : this.sound.seek(this.soundId);
    if (typeof value === 'number' && Number.isFinite(value)) this.update({ position: value });
  }
  setHidden(hidden: boolean) {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    if (hidden) {
      const resume = this.snapshot.status === 'playing';
      this.pause(); this.resumeAfterVisibility = resume;
    } else if (this.resumeAfterVisibility) {
      this.resumeAfterVisibility = false; void this.play();
    }
  }
  setVideoActive(active: boolean) {
    if (active === this.videoActive) return;
    this.videoActive = active;
    if (active) this.pause(); // Video completion never auto-resumes background music.
  }
  pageHide() { this.pause(); this.release(); }
  dispose() { this.pause(); this.disposed = true; this.release(); this.listeners.clear(); }
}
