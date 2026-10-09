"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { profile, sections, safeContentUrl, projectStatus, type ContentItem } from '../content/site';
import { publicationById, publicationItems, publishedIn } from '../content/publication';
import { studioFilmSamples } from '../content/studio-media';
import { routeHash, type SectionId } from './world-machine';
import { Modal } from './ContentViews';
import { ShaderExhibit } from './ShaderExhibit';
import { ScrollTitle } from './PublicationEffects';
import './publication.css';
import './publication-v2.css';
import {ExperienceNotes} from './ExperienceNotes';
import {PublicationTvWall} from './PublicationTvWall';
import './publication-tv.css';
import {IllustrationGallery} from './IllustrationGallery';

type Actions={onSection:(id:SectionId,collection?:string)=>void;onItem:(item:ContentItem)=>void;onMedia:(item:ContentItem)=>void;onContact:()=>void};
const plainClick=(event:MouseEvent<HTMLAnchorElement>,fn:()=>void)=>{if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();fn();}};
const itemUrl=(item:ContentItem)=>routeHash({kind:'item',section:item.primarySection,slug:item.slug});
const sampleBase={primarySection:'studio' as const,eyebrow:'LAYOUT SAMPLE',year:'',tags:[],accent:'#dfbaff',description:'排版样片，使用本站现有角色素材，不作为新增作品收录。'};
const artSamples:ContentItem[]=[
  {...sampleBase,id:'sample-character',slug:'sample-character',kind:'image',category:'original',title:'本站 OC · 排版样片',year:'20XX',media:{src:'/character/hero-v2/poster.png',alt:'本站已有 OC 角色图 · 排版样片',width:1024,height:1024}},
  {...sampleBase,id:'sample-art-pomegranate',slug:'sample-art-pomegranate',kind:'image',category:'study',title:'Branch with Pomegranate · 排版样片',year:'18 世纪',description:'Cleveland Museum of Art 馆藏版画，CC0。仅用于画廊排版演示，非本人作品。',href:'https://www.clevelandart.org/art/1941.280',linkLabel:'查看 CMA 馆藏与来源',media:{src:'/publication/samples/cma-pomegranate-study.jpg',alt:'石榴枝版画 · CMA CC0 排版样片，非本人作品',width:900,height:772}},
  {...sampleBase,id:'sample-art-pine',slug:'sample-art-pine',kind:'image',category:'study',title:'Pine Tree · 排版样片',year:'1847',description:'Jasper Francis Cropsey / National Gallery of Art，公共领域图像。仅用于画廊排版演示，非本人作品。',href:'https://www.nga.gov/artworks/56975-pine-tree',linkLabel:'查看 NGA 馆藏与来源',media:{src:'/publication/samples/nga-pine-study.jpg',alt:'Pine Tree 铅笔习作 · NGA 公共领域排版样片，非本人作品',width:600,height:1057}},
];
const filmSamples=studioFilmSamples;

function ChapterHeading({id,number,label,english,kicker}:{id:string;number:string;label:string;english:string;kicker:string}){
  return <header className="pub-heading" data-reveal>
    <div className="pub-heading-meta"><span>{number} / {label}</span><span>{kicker}</span></div>
    <h2 id={`${id}-title`} className="pub-display reveal-title" aria-label={`${label} / ${english}`}>
      {['experience','research','projects'].includes(id)?<><span aria-hidden="true">{Array.from(english).map((letter,i)=><span className="pub-letter" key={i} style={{'--letter':i} as CSSProperties}>{letter===' '?'\u00a0':letter}</span>)}</span><i aria-hidden="true">↘</i></>:<><ScrollTitle phrases={english.split(/(?=\s)/)} /><span className="pub-heading-translation" aria-hidden="true">{label}</span></>}
    </h2>
  </header>;
}
function ItemLinks({item}:{item:ContentItem}){
  const href=safeContentUrl(item.href);
  return href?<a className="pub-link" href={href} target="_blank" rel="noopener noreferrer">{item.linkLabel||'查看来源'}<span aria-hidden="true">↗</span></a>:null;
}
function Notes({item}:{item:ContentItem}){
  return <div className="pub-notes">{item.details?.map(note=><div className="pub-note" key={note.label}><h4>{note.label}</h4><p>{note.text}</p></div>)}</div>;
}
function MediaFigure({item,onMedia}:{item:ContentItem;onMedia:Actions['onMedia']}){
  const src=safeContentUrl(item.kind==='video'?item.media?.poster:item.media?.src);
  const imageRef=useRef<HTMLImageElement>(null);
  const [failedSrc,setFailedSrc]=useState<string|null>(null);
  const failed=!!src&&failedSrc===src;
  useLayoutEffect(()=>{
    const image=imageRef.current;
    if(src&&!failed&&image?.complete&&image.naturalWidth===0)setFailedSrc(src);
  },[src,failed]);
  if(!src)return null;
  return <figure className="pub-figure" data-reveal><button className="pub-media-button reveal-image" type="button" onClick={()=>onMedia(item)} data-focus-key={`media-${item.id}`} aria-label={`放大查看：${item.title}`}>
    {failed?<span className="pub-media-failed">图片暂时无法加载</span>:<img ref={imageRef} src={src} alt={item.media?.alt||item.title} width={item.media?.width||1200} height={item.media?.height||900} loading="lazy" decoding="async" onError={()=>setFailedSrc(src)}/>}
    <span className="pub-media-label">{item.kind==='video'?'播放':'放大'} ↗</span>
  </button></figure>;
}
function Research({onMedia}:Pick<Actions,'onMedia'>){
  return <section id="research" className="pub-chapter pub-research pub-anchor" tabIndex={-1} aria-labelledby="research-title" data-publication-section="research">
    <ChapterHeading id="research" number="02" label="研究" english="Research" kicker="QUESTIONS / METHODS / EVIDENCE"/>
    {publishedIn('research').map((item,i)=><article className={`pub-research-entry pub-anchor ${i===0?'research-lead':''}`} id={`item-${item.id}`} tabIndex={-1} data-content-id={item.id} key={item.id}>
      <div className="research-margin"><span>0{i+1}</span><p>{item.eyebrow}</p>{item.year&&<time>{item.year}</time>}</div>
      <div className="research-prose"><span className="research-authorship">{item.kind==='research'&&item.role}</span><h3>{item.title}</h3><p className="pub-intro">{item.description}</p><div className="research-metadata">{item.tags.map(t=><span key={t}>{t}</span>)}</div><Notes item={item}/><MediaFigure item={item} onMedia={onMedia}/><ItemLinks item={item}/></div>
    </article>)}
  </section>;
}
function Projects({onItem,onMedia,reducedMotion}:Pick<Actions,'onItem'|'onMedia'>&{reducedMotion:boolean}){
  return <section id="projects" className="pub-chapter pub-projects pub-anchor" tabIndex={-1} aria-labelledby="projects-title" data-publication-section="projects">
    <ChapterHeading id="projects" number="03" label="项目" english="Projects" kicker="BUILD / EXPERIMENT / CONTRIBUTE"/>
    {publishedIn('projects').map((item,i)=><article id={`item-${item.id}`} tabIndex={-1} className={`pub-project-entry pub-anchor ${item.id==='glsl-transitions'?'project-glsl':''}`} data-content-id={item.id} key={item.id}>
      <header className="project-identity"><span className="pub-small">0{i+1} / {item.eyebrow}</span><h3>{item.title}</h3><span className="pub-status">{item.kind==='project'&&projectStatus[item.status]}</span><div className="pub-tags">{item.tags.map(t=><span key={t}>{t}</span>)}</div></header>
      <div className="project-prose"><p className="pub-intro">{item.description}</p><Notes item={item}/><ItemLinks item={item}/></div>
      {item.id==='glsl-transitions'?<ShaderExhibit reducedMotion={reducedMotion}/>:<MediaFigure item={item} onMedia={onMedia}/>}
    </article>)}
  </section>;
}
function Studio({onMedia,reducedMotion,active,previewBlocked}:Pick<Actions,'onMedia'>&{reducedMotion:boolean;active:boolean;previewBlocked:boolean}){
  const real=publicationItems.filter(i=>i.primarySection==='studio');
  const images=real.filter(i=>i.kind==='image'),videos=real.filter(i=>i.kind==='video');
  return <section id="studio" tabIndex={-1} className="pub-chapter pub-studio pub-anchor" aria-labelledby="studio-title" data-publication-section="studio">
    <div className="studio-video-scene">
      <span id="studio-motion" className="pub-anchor studio-video-anchor"/><span id="studio-play" className="pub-anchor studio-video-anchor"/>
      <header className="studio-video-heading"><div className="studio-video-kicker"><span>04 / 创作</span></div><h2 id="studio-title">VIDEO</h2><div className="studio-video-meta"><span>手书/MEME</span><span>TOOLS：AE/PR/剪映</span><span>ps：传统古法特效/剪辑扣帧手艺人，AE自虐者</span></div></header>
      <PublicationTvWall records={videos.length?videos:filmSamples} onMedia={onMedia} reducedMotion={reducedMotion} active={active} previewBlocked={previewBlocked}/>
    </div>
    <IllustrationGallery items={images.length?images:artSamples} sample={!images.length} onMedia={onMedia} reducedMotion={reducedMotion} active={active}/>
  </section>;
}
const photoSamples=[
  {id:'landscape',src:'/publication/samples/landscape.jpg',width:1280,height:415},
  {id:'forest',src:'/publication/samples/forest.jpg',width:1280,height:1280},
  {id:'shore',src:'/publication/samples/shore.jpg',width:1280,height:956},
];
const lifeSamples:ContentItem[]=photoSamples.map((sample,i)=>({...sampleBase,id:`sample-${sample.id}`,slug:`sample-${sample.id}`,kind:'image',category:'study',title:`生活拼贴样片 ${i+1}`,description:'CC0 景物图片，仅用于验证排版；非个人旅行记录。',media:{src:sample.src,alt:'景物排版样片，非个人旅行记录',width:sample.width,height:sample.height}}));
const paperSamples:ContentItem[]=[
 {...sampleBase,id:'sample-pine',slug:'sample-pine',kind:'image',category:'study',title:'Pine Tree · 1847',description:'Jasper Francis Cropsey / National Gallery of Art，公共领域图像，仅作版式样片，非本人作品。',href:'https://www.nga.gov/artworks/56975-pine-tree',linkLabel:'馆藏与来源',media:{src:'/publication/samples/nga-pine-study.jpg',alt:'铅笔松树习作，公共领域版式样片，非本人作品',width:600,height:1057}},
 {...sampleBase,id:'sample-pomegranate',slug:'sample-pomegranate',kind:'image',category:'study',title:'石榴枝 · 18 世纪',description:'Cleveland Museum of Art / 彩色木刻版画，CC0，仅作版式样片，非本人作品。',href:'https://www.clevelandart.org/art/1941.280',linkLabel:'馆藏与来源',media:{src:'/publication/samples/cma-pomegranate-study.jpg',alt:'纸上石榴枝版画，公共领域版式样片，非本人作品',width:900,height:772}},
];
export const findPublicationMedia=(id:string)=>publicationById[id]||[...artSamples,...filmSamples,...lifeSamples,...paperSamples].find(i=>i.id===id);
function Life({onMedia}:Pick<Actions,'onMedia'>){
  const records=publishedIn('life');
  return <section id="life" tabIndex={-1} className="pub-chapter pub-life pub-anchor" aria-labelledby="life-title" data-publication-section="life">
    <ChapterHeading id="life" number="05" label="生活" english="Life, in pieces" kicker="PLACES / PAGES / SOUNDS"/>
    <div id="life-travel" className="pub-anchor"/><div id="life-books" className="pub-anchor"/><div id="life-music" className="pub-anchor"/><div id="life-culture" className="pub-anchor"/>
    {records.length?<div className="life-sheet life-sheet-real" id="life-sheet">{records.map((item,i)=><article key={item.id} className={`life-record pub-anchor paper-${item.paperLayout||(item.media?['wide','small','tall'][i%3]:'text')}`} tabIndex={-1} id={`item-${item.id}`} data-content-id={item.id}><span className="life-record-meta">{item.year} / {item.eyebrow}</span><MediaFigure item={item} onMedia={onMedia}/><h3>{item.title}</h3><p>{item.description}</p><Notes item={item}/><ItemLinks item={item}/></article>)}</div>:<>
      <div className="life-intro"><h3>日常的<br/><em>另一种取景。</em></h3><p>照片、纸上作品与随记的版式样片。<br/>非本人摄影、作品或生活记录。</p><span className="sample-notice">LAYOUT STUDY / 正式内容待收录</span></div>
      <div className="life-sheet" id="life-sheet">
       <img className="life-etching" src="/publication/samples/nga-pine-study.jpg" alt="" aria-hidden="true" loading="lazy"/>
       {[lifeSamples[0],paperSamples[0],lifeSamples[1],paperSamples[1],lifeSamples[2]].map((item,i)=><article className={`life-fragment life-fragment-${i}`} key={item.id}><MediaFigure item={item} onMedia={onMedia}/><div className="life-caption"><span>{['PLACES / 01','PENCIL / 02','COLOUR / 03','ON PAPER / 04','ALONG THE WAY / 05'][i]}</span><span>版式样片</span></div>{i===1||i===3?<p className="life-attribution">{i===1?'J. F. Cropsey · NGA / Public Domain':'Cleveland Museum of Art / CC0'}</p>:null}</article>)}
       <div className="life-paper-note life-paper-note-one"><span>01 / FIELD NOTES</span><h4>照片旁边，<br/>也留一点文字。</h4><p>随记正文待收录</p></div>
       <div className="life-paper-note life-paper-note-two"><span>02 / BETWEEN PAGES</span><h4>书页与声音</h4><p>书目、歌单与文字待收录</p><span className="life-page-number">— 05 —</span></div>
      </div>
      <div className="life-source-note"><span>样片来源</span><a href="https://www.nga.gov/artworks/56975-pine-tree" target="_blank" rel="noopener noreferrer">Pine Tree / NGA ↗</a><a href="https://www.clevelandart.org/art/1941.280" target="_blank" rel="noopener noreferrer">石榴枝 / CMA ↗</a><span>景物照片 / CC0</span></div>
    </>}
  </section>;
}

export function Publication({onSection,onItem,onMedia,onContact,onGuide,guideOpen,reducedMotion,active,previewBlocked}:Actions&{onGuide:()=>void;guideOpen:boolean;reducedMotion:boolean;active:boolean;previewBlocked:boolean}){
  const root=useRef<HTMLDivElement>(null);
  const [current,setCurrent]=useState<SectionId>('experience');
  useEffect(()=>{
    const node=root.current;if(!node)return;
    node.querySelectorAll<HTMLElement>('.pub-anchor[id]').forEach(e=>{e.tabIndex=-1;e.dataset.focusKey=`body-${e.id}`;});
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}},{rootMargin:'0px 0px -12% 0px',threshold:0});
    node.querySelectorAll('[data-reveal]').forEach(e=>observer.observe(e));
    const ambient=new IntersectionObserver(entries=>{for(const entry of entries)(entry.target as HTMLElement).dataset.inView=String(entry.isIntersecting);},{threshold:0});
    node.querySelectorAll('[data-publication-section]').forEach(e=>ambient.observe(e));
    const visibility=()=>{node.dataset.documentHidden=String(document.hidden);};visibility();document.addEventListener('visibilitychange',visibility);
    let frame=0;
    const update=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;let next:SectionId='experience';for(const s of node.querySelectorAll<HTMLElement>('[data-publication-section]'))if(s.getBoundingClientRect().top<200)next=s.dataset.publicationSection as SectionId;setCurrent(next);});};
    addEventListener('scroll',update,{passive:true});update();
    return()=>{observer.disconnect();ambient.disconnect();document.removeEventListener('visibilitychange',visibility);removeEventListener('scroll',update);cancelAnimationFrame(frame);};
  },[]);
  return <div ref={root} className="publication" data-current-section={current} data-reading-view data-reduced-motion={reducedMotion}><span id="selected" className="pub-anchor" tabIndex={-1}/>
    <nav className="publication-index" aria-label="正文目录"><span className="publication-index-label">CONTENTS /</span>{sections.map(s=><a href={routeHash({kind:'section',section:s.id})} key={s.id} aria-current={s.id===current?'location':undefined} onClick={e=>plainClick(e,()=>onSection(s.id))} data-focus-key={`reading-${s.id}`}><span>{s.index}</span>{s.label}</a>)}<span className="publication-index-end" aria-hidden="true">↙ SCROLL TO READ</span><button type="button" className="pub-guide-toggle" aria-label="快捷目录" aria-controls="quick-menu" aria-expanded={guideOpen} onClick={onGuide}><span><img src="/character/hero-v2/poster.png" alt=""/></span></button></nav>
    <ExperienceNotes onItem={onItem} reducedMotion={reducedMotion||previewBlocked}/><Research onMedia={onMedia}/><Projects onItem={onItem} onMedia={onMedia} reducedMotion={reducedMotion||previewBlocked}/>
    {/* Only the accepted creative/paper chapters retain V2 art direction. */}
    <div className="publication-v2"><Studio onMedia={onMedia} reducedMotion={reducedMotion} active={active} previewBlocked={previewBlocked}/><Life onMedia={onMedia}/></div>
    <section className="pub-contact" id="contact"><span className="pub-small">THANK YOU FOR READING / FIN.</span><h2>Let's talk<span>很高兴认识你。</span></h2><div><button className="pub-link" onClick={onContact} data-focus-key="publication-contact">联系我<span>↗</span></button><a className="pub-link" href={profile.github} target="_blank" rel="noopener noreferrer">GitHub<span>↗</span></a><a className="pub-link" href={`mailto:${profile.email}`}>{profile.email}<span>↗</span></a></div></section>
  </div>;
}

export function PublicationMediaDialog({item,onClose,opener}:{item:ContentItem;onClose:()=>void;opener:HTMLElement|null}){
  const [failed,setFailed]=useState(false);const src=safeContentUrl(item.media?.src),poster=safeContentUrl(item.media?.poster),href=safeContentUrl(item.href);
  return <Modal title={item.title} onClose={onClose} opener={opener} className="publication-media-dialog"><div className="publication-clean-media">
    {failed?<p role="status">素材暂时无法加载。请稍后重试。</p>:item.kind==='video'&&item.source==='local'&&src?<video src={src} poster={poster} controls playsInline autoPlay preload="metadata" onError={()=>setFailed(true)}/>:src&&item.kind!=='video'?<img src={src} alt={item.media?.alt||item.title} onError={()=>setFailed(true)}/>:href?<a className="pub-link" href={href} target="_blank" rel="noopener noreferrer">在原平台观看 ↗</a>:<p>媒体尚未收录。</p>}
  </div>{item.id.startsWith('sample-')&&<><p className="media-sample-note">{item.description}</p>{item.id.startsWith('sample-art-')&&href&&<a className="media-sample-source" href={href} target="_blank" rel="noopener noreferrer">{item.linkLabel||'查看馆藏与来源'} ↗</a>}</>}</Modal>;
}
