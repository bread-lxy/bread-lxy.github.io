import type { BgmTrack } from '../content/bgm';

export type BgmAnalysis = {
  version: 1; trackId: string; audioSha256: string;
  fps: number; duration: number; bands: number[][]; values: number[][];
};

/** Optional decoration must never prevent normal BGM playback. */
export function validBgmAnalysis(value: unknown, track: BgmTrack): value is BgmAnalysis {
  if (!value || typeof value !== 'object' || !track.asset || !track.analysis) return false;
  const data = value as BgmAnalysis;
  if (data.version !== 1 || data.trackId !== track.id || data.audioSha256 !== track.asset.sha256 || data.audioSha256 !== track.analysis.audioSha256) return false;
  if (data.fps !== 30 || !Number.isFinite(data.duration) || data.duration <= 0 || data.duration > 3600) return false;
  if (!Array.isArray(data.bands) || data.bands.length !== 5 || !data.bands.every(band => Array.isArray(band) && band.length === 2 && Number.isFinite(band[0]) && Number.isFinite(band[1]) && band[0] >= 0 && band[1] > band[0] && band[1] <= 11025)) return false;
  if (!Array.isArray(data.values) || data.values.length !== 5) return false;
  const count = Math.round(data.duration * data.fps);
  return Math.abs(count / data.fps - data.duration) < 1e-6 && data.values.every(band => Array.isArray(band) && band.length === count && band.every(v => Number.isInteger(v) && v >= 0 && v <= 255));
}

/** Interpolate measured samples; never invents motion in silence. */
export function sampleBgmBand(data: BgmAnalysis, band: number, seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds >= data.duration || !data.values[band]) return 0;
  const frame = seconds * data.fps, index = Math.floor(frame), fraction = frame - index;
  const values = data.values[band], a = values[index] ?? 0, b = values[index + 1] ?? a;
  return (a + (b - a) * fraction) / 255;
}
