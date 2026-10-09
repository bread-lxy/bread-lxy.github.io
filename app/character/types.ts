export type CharacterPoseId = "reach" | "lean" | "signal" | "rest";
export type CharacterAction = "idle" | "enter" | "preview" | "confirm" | "tap";
export type CharacterAssets = {
  posterUrl: string; psdUrl: string; settingsUrl?: string;
  accessories?: Array<{ layer: string; root: [number, number]; tip: [number, number]; width: number; amplitude: number }>;
};
export type CharacterRendererProps = {
  pose: CharacterPoseId; action: CharacterAction; actionId: number; active: boolean;
  /** Hold the one-time greeting and live pose while the title masks the scene. */
  entranceReady?: boolean;
  /** Load behind the title, without advancing physics or showing the mesh. */
  preloadReady?: boolean;
  /** After the approved pixel opening, settle source-poster expression into idle. */
  posterHandoff?: boolean;
  assets: CharacterAssets; reducedMotion: boolean;
  expression?: {tilt:number;brow:number;eyes:number};
  world?:'experience'|'research'|'projects'|'studio'|'life';
  onGreetingBusy?: (busy:boolean)=>void;
  onStatusChange?: (status:"loading"|"ready"|"fallback"|"reduced") => void;
  onInteract?: (region: "head" | "ear") => void;
};
