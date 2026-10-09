import type { SectionId } from '../app/world-machine';
import type { WorldPose } from '../app/character/performance';

export type HomeScene = {
  composition: 'personal-desktop' | 'research-spread' | 'industrial' | 'crt-wall' | 'paper-memories';
  palette: { ink: string; paper: string; accent: string; muted: string };
  texture: string;
  layers: readonly string[];
  desktop: { faceX: number; faceY: number; scale: number };
  mobile: { faceX: number; faceY: number; scale: number };
  expression: WorldPose;
  coverLine: string;
};
export const albumTiming = { entrance: 1.3, preview: .8, studioPreview: .95, researchPreview: .95, confirm: .55 } as const;

/** Homepage art direction is deliberately independent of content, routing and media. */
export const homeScenes: Record<SectionId, HomeScene> = {
  experience: {
    composition:'personal-desktop', palette:{ink:'#9DBBFF',paper:'#251F33',accent:'#4D23CD',muted:'#414477'},
    texture:'/album/paper.jpg', layers:['exp-window-browser','exp-window-notepad','exp-window-photo','exp-window-files','exp-window-notice'], desktop:{faceX:75,faceY:31,scale:.96}, mobile:{faceX:50,faceY:29,scale:.98},
    expression:{tilt:-.22,brow:.03,eyes:1},coverLine:'EDUCATION / INTERNSHIPS',
  },
  research: {
    composition:'research-spread',palette:{ink:'#121a1d',paper:'#edf1ed',accent:'#b9efff',muted:'#b5c4c8'},
    texture:'/album/paper.jpg',layers:['research-drop-cities','research-drop-worldquant','research-drop-tennis','research-drop-pricing'],desktop:{faceX:67,faceY:30,scale:1.06},mobile:{faceX:50,faceY:29,scale:1.03},
    expression:{tilt:-.06,brow:-.12,eyes:.87},coverLine:'QUESTIONS / METHODS / EVIDENCE',
  },
  projects: {
    composition:'industrial',palette:{ink:'#171c1a',paper:'#f2f0df',accent:'#deff36',muted:'#bac2ac'},
    texture:'/album/metal.jpg',layers:['project-plate','project-edge'],desktop:{faceX:66,faceY:30,scale:1},mobile:{faceX:50,faceY:29,scale:1},
    expression:{tilt:.045,brow:-.08,eyes:.94},coverLine:'BUILD / EVALUATE / ITERATE',
  },
  studio: {
    composition:'crt-wall',palette:{ink:'#08090e',paper:'#e9e7ea',accent:'#b4bdd4',muted:'#a6a6b3'},
    texture:'/publication/tv-wall/dust-wall.webp',layers:['studio-lobby-ground','studio-lobby-cables','studio-lobby-tv'],desktop:{faceX:71,faceY:29,scale:.91},mobile:{faceX:51,faceY:29,scale:.92},
    expression:{tilt:.16,brow:.14,eyes:1},coverLine:'ILLUSTRATION / MOTION',
  },
  life: {
    composition:'paper-memories',palette:{ink:'#eeeee5',paper:'#404b52',accent:'#87929e',muted:'#5b6870'},
    texture:'/album/paper.jpg',layers:['life-paper-stage','life-marks','life-jelly'],desktop:{faceX:65,faceY:33,scale:.9},mobile:{faceX:50,faceY:29,scale:.94},
    expression:{tilt:.22,brow:.10,eyes:.96},coverLine:'PLACES / BOOKS / SOUNDS',
  },
};
