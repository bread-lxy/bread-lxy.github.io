import type { ContentItem } from './site';

/** The two site-recording studies used by VIDEO and its decorative lobby wall. */
export const studioFilmSamples: ContentItem[] = [
  {
    primarySection:'studio',eyebrow:'LAYOUT SAMPLE',year:'',tags:[],accent:'#deff36',
    id:'sample-motion-home',slug:'sample-motion-home',kind:'video',source:'local',
    title:'角色与场景',description:'本站首页角色交互实录，非正式 MV 作品。',
    media:{src:'/publication/samples/homepage-demo.webm',poster:'/publication/samples/homepage-tv.jpg',alt:'首页角色与场景实录'},
  },
  {
    primarySection:'studio',eyebrow:'LAYOUT SAMPLE',year:'',tags:[],accent:'#b9efff',
    id:'sample-motion-character',slug:'sample-motion-character',kind:'video',source:'local',
    title:'表情与动作',description:'本站角色表情与动作实录，非正式 MV 作品。',
    media:{src:'/publication/samples/character-demo.webm',poster:'/publication/samples/character-tv.jpg',alt:'角色表情与动作实录'},
  },
];
