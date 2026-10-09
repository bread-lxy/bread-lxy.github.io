/** Homepage scenery only. None of these samples claim to be personal work.
 * Artwork, paper edges and pencil marks are independent replacement slots.
 * Sources and generation prompts: docs/research/life-scene.md.
 */
export type LifePlacement = { x: number; y: number; width: number; rotation: number };
export type LifePaper = {
  id: string; src: string; aspect: string; crop: string;
  edge: 'deckle' | 'print' | 'rag'; depth: number; group: 0 | 1 | 2;
  desktop: LifePlacement; mobile?: LifePlacement;
};
export type LifeMark = {
  id: string; src: string; desktop: LifePlacement; mobile?: LifePlacement; opacity: number;
};
export type LifeSwimConfig = {
  period:number; phase:number; crossing:number; rest:number;
  /** Bell-center corridor (% of scene width); no horizontal patrol/return path. */
  corridor:readonly [number,number]; mobileCorridor?:readonly [number,number];
};
export const lifeJellyAtlas = {src:'/life/jellyfish-swim.png',columns:4,rows:3,frames:12,width:36,height:54} as const;
export type LifeJellyfish = {
  id:string;src:string;layer:'back'|'front';desktop:LifePlacement;mobile?:LifePlacement;
  tint:number;swim:LifeSwimConfig;
};
export type LifeSceneConfig = {
  texture: string;
  fibers: string;
  papers: readonly LifePaper[];
  marks: readonly LifeMark[];
  jellyfish: readonly LifeJellyfish[];
};

export const lifeScene: LifeSceneConfig = {
  texture: '/album/paper.jpg',
  fibers: '/life/paper-fibers.webp',
  papers: [
    {id:'pine',src:'/publication/samples/nga-pine-study.jpg',aspect:'.72',crop:'50% 48%',edge:'deckle',depth:4,group:0,desktop:{x:40,y:13,width:20,rotation:-2},mobile:{x:2,y:28,width:30,rotation:-3}},
    {id:'pomegranate',src:'/publication/samples/cma-pomegranate-study.jpg',aspect:'.95',crop:'50% 50%',edge:'rag',depth:3,group:1,desktop:{x:30,y:32,width:15,rotation:1.5},mobile:{x:74,y:27,width:27,rotation:2}},
    {id:'shore',src:'/publication/samples/shore.jpg',aspect:'1.12',crop:'50% 58%',edge:'print',depth:6,group:2,desktop:{x:38,y:59,width:18,rotation:-1},mobile:{x:2,y:41,width:27,rotation:-2}},
    {id:'city',src:'/publication/samples/landscape.jpg',aspect:'1.25',crop:'50% 50%',edge:'print',depth:2,group:1,desktop:{x:81,y:19,width:13,rotation:2}},
    {id:'forest',src:'/publication/samples/forest.jpg',aspect:'.83',crop:'58% 50%',edge:'deckle',depth:3,group:2,desktop:{x:85,y:39,width:14,rotation:-2.5}},
    {id:'pine-detail',src:'/publication/samples/nga-pine-study.jpg',aspect:'1.3',crop:'50% 70%',edge:'rag',depth:1,group:0,desktop:{x:32,y:13,width:10,rotation:1}},
  ],
  marks: [
    {id:'path',src:'/life/pencil-path.webp',desktop:{x:23,y:7,width:24,rotation:-7},mobile:{x:64,y:11,width:39,rotation:12},opacity:.34},
    {id:'window',src:'/life/pencil-window.webp',desktop:{x:78,y:10,width:17,rotation:7},opacity:.38},
    {id:'stars',src:'/life/pencil-stars.webp',desktop:{x:5,y:61,width:19,rotation:-13},mobile:{x:73,y:46,width:28,rotation:4},opacity:.4},
    {id:'note',src:'/life/pencil-note.webp',desktop:{x:27,y:78,width:20,rotation:-8},opacity:.46},
  ],
  jellyfish: [
    {id:'far',src:'/life/jellyfish-pixel.png',layer:'back',desktop:{x:90,y:9,width:4.5,rotation:0},tint:0,
      swim:{period:3.4,phase:.58,crossing:88,rest:4,corridor:[94,90]}},
    {id:'near',src:'/life/jellyfish-pixel.png',layer:'front',desktop:{x:37,y:55,width:7,rotation:0},mobile:{x:82,y:38,width:14,rotation:0},tint:20,
      swim:{period:3,phase:0,crossing:72,rest:3,corridor:[39,44],mobileCorridor:[91,89]}},
  ],
};
