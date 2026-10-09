"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { filterArt, homeConfig, itemById, itemsForSection, profile, projectStatus, safeContentUrl, sectionById, type ContentItem, type SectionConfig } from "../content/site";
import type { SectionId } from "./world-machine";

type Actions = { onOpen: (item: ContentItem) => void; onSection: (section: SectionId, collection?: string) => void };
export function Cover({ kind, compact = false }: { kind: string; compact?: boolean }) {
  const label = kind === "eval-studio" ? <>EVAL<br />STUDIO<span className="cover-flow">DATA → GENERATE → REVIEW</span></> : kind === "studio" ? <>ART<span className="cover-amp">&</span>MOTION</> : kind === "housing-expectations" ? <>What shapes<br /><em>expectations?</em><span className="cover-flow">CITIES / RESEARCH PAPER</span></> : kind === "life" ? <>LIFE<br /><em>in fragments.</em></> : kind === "experience" || kind === "sand-ai" ? <>ALONG<br /><em>the way.</em></> : <>BUILD.<br /><em>Explore.</em></>;
  return <span aria-hidden="true" className={`editorial-cover cover-${kind} ${compact ? "cover-compact" : ""}`}><span className="cover-line" /><span className="cover-label">{label}</span><span className="cover-registration">X / L — PERSONAL COLLECTION</span></span>;
}
export function MediaView({ item, detail = false }: { item: ContentItem; ordinal?: number; detail?: boolean }) {
  const [failed, setFailed] = useState(false);
  const source = safeContentUrl(item.media?.src), poster = safeContentUrl(item.media?.poster);
  useEffect(() => setFailed(false), [source, poster]);
  if (!failed && detail && item.kind === "video" && item.source === "local" && source) return <video className="content-media detail-media" src={source} poster={poster} controls playsInline preload="none" onError={() => setFailed(true)} aria-label={item.media?.alt || item.title} />;
  const imageSource = item.kind === "video" ? poster : source;
  if (!failed && imageSource) return <img className={`content-media ${detail ? "detail-media" : ""}`} src={imageSource} alt={item.media?.alt || item.title} loading="lazy" decoding="async" width={item.media?.width || 1200} height={item.media?.height || 900} onError={() => setFailed(true)} />;
  if (failed) return <span className="media-empty" role="status">素材暂时无法加载</span>;
  if (item.kind === "image" || item.kind === "video") return <span className="media-empty">{item.kind === "video" && item.source === "external" && safeContentUrl(item.href) ? "外部视频 · 打开详情观看" : "素材尚未收录"}</span>;
  return <Cover kind={item.id} />;
}
export function Modal({ title, onClose, children, className = "", opener }: { title: string; onClose: () => void; children: ReactNode; className?: string; opener?: HTMLElement | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow = "hidden";
    const animations: Animation[] = [];
    if (dialog && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const visual=dialog.querySelector<HTMLElement>('.detail-visual');
      const source=opener?.querySelector<HTMLElement>('.feature-image,.preview-cover');
      if(visual && source) {
        const from=source.getBoundingClientRect(), to=visual.getBoundingClientRect();
        if(from.width && to.width && from.bottom>0 && from.top<innerHeight) animations.push(visual.animate([
          {transformOrigin:'top left',transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`,opacity:.45},
          {transformOrigin:'top left',transform:'none',opacity:1}
        ],{duration:300,easing:'cubic-bezier(.2,.7,.3,1)'}));
      }
      const copy=dialog.querySelector('.item-copy,.contact-copy');
      if(copy)animations.push(copy.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:240,easing:'ease-out'}));
    }
    return () => { animations.forEach(animation=>animation.cancel()); dialog?.close(); document.body.style.overflow = previous; if (opener?.isConnected && !opener.closest('[hidden]')) opener.focus({preventScroll:true}); };
  }, [opener]);
  return <dialog ref={ref} className={`item-overlay ${className}`} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><article className="item-sheet"><header className="dialog-top"><span>{title}</span><button type="button" autoFocus onClick={onClose} aria-label="关闭详情">关闭 ×</button></header>{children}</article></dialog>;
}
export function ItemDialog({ item, onClose, opener, onRelated }: { item: ContentItem; world?: SectionConfig; onClose: () => void; opener: HTMLElement | null; onRelated?: (item: ContentItem)=>void }) {
  const href = safeContentUrl(item.href);
  const creative = item.kind === "image" || item.kind === "video";
  return <Modal title={item.title} onClose={onClose} opener={opener} className={creative ? "creative-detail" : "case-detail"}>
    <div className="detail-layout" style={{"--item-accent":item.accent,"--accent":item.accent} as CSSProperties}>
      <div className="detail-visual"><MediaView key={item.id} item={item} detail /></div>
      <div className="item-copy"><p className="eyebrow">{item.eyebrow} {item.year && ` / ${item.year}`}</p><h2>{item.title}</h2><p className="detail-summary">{item.description}</p>
        {item.kind === "project" && <span className="status-label">{projectStatus[item.status]}</span>}{item.kind === "research" && <span className="status-label">{item.role}</span>}
        <div className="tags">{item.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
        {creative ? <details className="art-notes"><summary>作品说明与制作信息</summary>{item.details?.map(d=><div key={d.label}><h3>{d.label}</h3><p>{d.text}</p></div>) || <p>{item.description}</p>}</details> : item.details?.map(d=><section className="case-note" key={d.label}><h3>{d.label}</h3><p>{d.text}</p></section>)}
        {href && <a className="text-link external-work-link" href={href} target="_blank" rel="noopener noreferrer">{item.linkLabel || (item.kind === "video" ? "观看视频" : "查看来源")} ↗</a>}
        {onRelated && !!item.relatedIds?.length && <div className="related-links"><span className="eyebrow">关联内容</span>{item.relatedIds.map(id=>itemById[id] && <button key={id} onClick={()=>onRelated(itemById[id])}>{itemById[id].title} ↗</button>)}</div>}
      </div>
    </div>
  </Modal>;
}
export function SectionHeading({ section }: { section: SectionConfig }) {
  return <header className="section-heading"><p className="eyebrow">{section.index} / {section.kicker}</p><h1 tabIndex={-1} data-view-heading>{section.label}<em>{section.english}</em></h1><p>{section.intro}</p></header>;
}
function BlockHeading({ index, title, english, children }: { index: string; title: string; english: string; children?: ReactNode }) {
  return <header className="block-heading"><div><span className="eyebrow">{index} / {english}</span><h2>{title}</h2></div>{children}</header>;
}
function ItemLink({ item, onOpen, scope, large=false }: { item: ContentItem; onOpen: Actions["onOpen"]; scope: string; large?: boolean }) {
  return <button type="button" className={`feature-entry ${large ? "feature-large" : ""}`} onClick={()=>onOpen(item)} data-focus-key={`${scope}-${item.id}`} style={{"--item-accent":item.accent} as CSSProperties}>
    <span className="feature-image"><MediaView item={item}/><span className="image-open">查看案例 ↗</span></span><span className="feature-caption"><small>{item.eyebrow}</small><strong>{item.title}</strong><span>{item.description}</span></span>
  </button>;
}
export function HomeOverview({onOpen,onSection,onResume,onContact}:Actions & {onResume:()=>void;onContact:()=>void}) {
  return <div className="home-overview" id="selected" tabIndex={-1} data-focus-key="home-selected"><section className="editorial-block selected-block"><BlockHeading index="01" title="不同切面，同一个我。" english="SELECTED FRAGMENTS"><span className="block-note">项目、研究，还有画面里的表达。</span></BlockHeading>
    <div className="selected-leads"><ItemLink item={itemById["eval-studio"]} onOpen={onOpen} scope="home" large/><button className="studio-feature" onClick={()=>onSection("studio")} data-focus-key="home-studio"><Cover kind="studio"/><span className="feature-caption"><small>PERSONAL CREATION</small><strong>画面里的另一面 ↗</strong><span>插画、手书与动态影像</span></span></button></div>
    <div className="selected-minor"><button className="research-teaser" onClick={()=>onOpen(itemById["housing-expectations"])} data-focus-key="home-paper"><small>CITIES / 共同第一作者</small><strong>我们如何形成<br/>对房价的预期？</strong><span>行为金融 · 计量研究 ↗</span></button><button className="project-teaser" onClick={()=>onOpen(itemById["bili-summary"])} data-focus-key="home-bili"><small>PERSONAL PROJECT</small><strong>视频 → 文字<br/>→ 新的理解</strong><span>B 站视频 AI 总结 ↗</span></button><button className="life-teaser" onClick={()=>onSection("life")} data-focus-key="home-life"><small>OFF THE CLOCK</small><strong>书页、声音，<br/>与沿途的风景。</strong><span>生活记录 ↗</span></button></div>
  </section>
  <section className="editorial-block journey-block"><BlockHeading index="02" title="一路走来" english="ALONG THE WAY"><button className="text-link" onClick={()=>onSection("experience")} data-focus-key="home-experience">完整经历 ↗</button></BlockHeading><div className="journey-layout"><div className="education-summary">{["ruc","cbs"].map((id,index)=>{const item=itemById[id];return <div key={id}>{index>0&&<hr/>}<strong>{item.title}</strong><p>{item.kind==="experience"&&item.role}</p><span>{item.year} · {item.tags.join(" / ")}</span></div>;})}<button className="text-link" onClick={onResume} data-focus-key="home-resume">精简履历 ↗</button></div><div className="journey-list">{homeConfig.experienceIds.map(id=>{const item=itemById[id];return <button key={id} onClick={()=>onOpen(item)} data-focus-key={`home-${id}`}><time>{item.year}</time><strong>{item.title}<i>↗</i></strong><p>{item.description}</p></button>;})}</div></div></section>
  <section className="editorial-block home-studio"><BlockHeading index="03" title="保持创作" english="OUTSIDE THE BRIEF"><button className="text-link" onClick={()=>onSection("studio")} data-focus-key="home-studio-all">进入创作集 ↗</button></BlockHeading><div className="studio-index"><button onClick={()=>onSection("studio","original")} data-focus-key="home-illustration"><span>01 / ILLUSTRATION</span><strong>线条与想象</strong><p>同人 · OC · 原创 · 速写</p><i>↗</i></button><button onClick={()=>onSection("studio","motion")} data-focus-key="home-motion"><span>02 / MOTION</span><strong>让画面继续</strong><p>手书 · meme · AI 影像</p><i>↗</i></button></div><p className="quiet-note">作品集正在整理；也可以先到 <a href={profile.bilibili} target="_blank" rel="noopener noreferrer">B 站看看 ↗</a></p></section>
  <section className="editorial-block home-life"><BlockHeading index="04" title="生活的余白" english="LIFE IN FRAGMENTS"/><LifeIndex onSection={onSection}/></section>
  <section className="contact-section"><p className="eyebrow">NICE TO MEET YOU</p><h2>聊聊下一件<br/><em>有意思的事。</em></h2><div><button className="contact-action" onClick={onContact} data-focus-key="home-contact">联系我 ↗</button><button className="text-link" onClick={onResume}>查看精简履历</button></div></section></div>;
}
export function LifeIndex({onSection}:Pick<Actions,"onSection">) {
  return <div className="life-index">{[{id:"travel",en:"PLACES",title:"沿途",desc:"旅行与影像"},{id:"books",en:"PAGES",title:"页间",desc:"阅读与随记"},{id:"music",en:"SOUNDS",title:"耳畔",desc:"喜欢的音乐"}].map((entry,i)=><button className={`life-index-${entry.id}`} key={entry.id} onClick={()=>onSection("life",entry.id)} data-focus-key={`life-${entry.id}`}><span>0{i+1} / {entry.en}</span><strong>{entry.title}</strong><p>{entry.desc}</p><i>↗</i></button>)}</div>;
}
export function ExperienceView({onOpen}:Pick<Actions,"onOpen">) {
  const entries=itemsForSection("experience");
  return <div className="experience-view"><div className="education-grid">{entries.filter(i=>i.kind==="experience"&&i.category==="education").map(item=><button key={item.id} onClick={()=>onOpen(item)} data-focus-key={`experience-${item.id}`}><span className="eyebrow">{item.eyebrow} / {item.year}</span><h2>{item.title}</h2><p>{item.description}</p><span className="text-link">查看经历 ↗</span></button>)}</div><h2 className="subheading">实习经历 <span>INTERNSHIPS</span></h2><div className="experience-timeline">{entries.filter(i=>i.kind==="experience"&&i.category==="internship").map(item=><article key={item.id}><time>{item.year}</time><div><button onClick={()=>onOpen(item)} data-focus-key={`experience-${item.id}`}><h3>{item.title} ↗</h3></button><span>{item.kind==="experience"&&item.role}</span><p>{item.description}</p><div className="related-links">{item.relatedIds?.map(id=><button key={id} onClick={()=>onOpen(itemById[id])} data-focus-key={`experience-related-${id}`}>{itemById[id].title} ↗</button>)}</div></div></article>)}</div></div>;
}
export function ResearchView({onOpen}:Pick<Actions,"onOpen">) {
  return <div className="research-view">{itemsForSection("research").map(item=><article key={item.id} className={item.kind==="research"&&item.researchType==="paper"?"paper-feature":"research-row"}><div><span className="eyebrow">{item.eyebrow}</span><h2>{item.title}</h2><p>{item.description}</p><span className="research-role">{item.kind==="research"&&item.role} {item.year&&` / ${item.year}`}</span><button className="text-link" onClick={()=>onOpen(item)} data-focus-key={`research-${item.id}`}>研究内容与方法 ↗</button></div>{item.kind==="research"&&item.researchType==="paper"?<Cover kind="housing-expectations"/>:<span className="research-tags">{item.tags.join(" / ")}</span>}</article>)}</div>;
}
export function ProjectsView({onOpen}:Pick<Actions,"onOpen">) {
  return <div className="project-grid">{itemsForSection("projects").map(item=><div key={item.id}><ItemLink item={item} onOpen={onOpen} scope="projects"/>{item.kind==="project"&&<span className="status-label">{projectStatus[item.status]}</span>}</div>)}</div>;
}
const studioFilters=[{id:"all",label:"全部"},{id:"original",label:"原创 / OC"},{id:"fan-art",label:"同人"},{id:"study",label:"练习"},{id:"motion",label:"视频"},{id:"play",label:"趣味实验"}];
export function StudioView({onOpen,onSection,initialFilter="all"}:Actions&{initialFilter?:string}) {
  const filter=studioFilters.some(f=>f.id===initialFilter)?initialFilter:"all";
  const [collection,setCollection]=useState("all"),[character,setCharacter]=useState("all");
  const records=itemsForSection("studio");
  const filtered=filterArt(records,filter,collection,character);
  const collections=[...new Set(records.filter(i=>i.kind==="image"&&i.category==="fan-art").map(i=>i.collection).filter(Boolean))];
  const characters=[...new Set(records.flatMap(i=>i.characterIds||[]))];
  return <div className="studio-view"><div className="filter-line" aria-label="创作分类">{studioFilters.map(f=><button key={f.id} aria-pressed={filter===f.id} onClick={()=>{onSection("studio",f.id==="all"?undefined:f.id);}}>{f.label}</button>)}</div>{filter==="fan-art"&&collections.length>0&&<label className="collection-filter">按原作 <select value={collection} onChange={e=>setCollection(e.target.value)}><option value="all">全部</option>{collections.map(c=><option key={c} value={c}>{c}</option>)}</select></label>}{filter==="play"&&characters.length>0&&<label className="collection-filter">按角色 <select value={character} onChange={e=>setCharacter(e.target.value)}><option value="all">全部</option>{characters.map(c=><option key={c}>{c}</option>)}</select></label>}
    {filtered.length?<StudioMedia records={filtered} onOpen={onOpen}/>:<div className="studio-empty"><Cover kind="studio"/><div role="status"><h2>{filter==="all"?"作品集，整理中。":"这一类作品尚未收录。"}</h2><p>插画与影像会陆续放在这里。</p><a className="text-link" href={profile.bilibili} target="_blank" rel="noopener noreferrer">先到 B 站看看 ↗</a></div></div>}
  </div>;
}
export function StudioMedia({records,onOpen}:{records:ContentItem[];onOpen:Actions["onOpen"]}) {
  const images=records.filter(i=>i.kind==="image"), videos=records.filter(i=>i.kind==="video");
  return <>{images.length>0&&<div className="studio-gallery">{images.map(item=><ItemLink key={item.id} item={item} onOpen={onOpen} scope="studio"/>)}</div>}{videos.length>0&&<div className="motion-program"><h2 className="subheading">动态影像 <span>MOTION PROGRAM</span></h2>{videos.map((item,index)=><button className="motion-row" key={item.id} onClick={()=>onOpen(item)} data-focus-key={`studio-${item.id}`}><span className="motion-poster"><MediaView item={item}/><i aria-hidden="true">▶</i></span><span className="motion-info"><small>{String(index+1).padStart(2,"0")} / {item.year}</small><strong>{item.title}</strong><span>{item.tags.join(" / ")}</span><p>{item.description}</p></span><b aria-hidden="true">↗</b></button>)}</div>}</>;
}
export function LifeRecords({records,onOpen}:{records:ContentItem[];onOpen:Actions["onOpen"]}) {
  const travel=records.filter(i=>i.kind==="archive"&&i.category==="travel"), books=records.filter(i=>i.kind==="archive"&&i.category==="books"), music=records.filter(i=>i.kind==="archive"&&i.category==="music"), other=records.filter(i=>i.kind==="archive"&&i.category==="culture");
  return <div className="life-records">{travel.length>0&&<section className="travel-story"><h2 className="subheading">沿途 <span>PHOTO STORIES</span></h2>{travel.map(item=><ItemLink key={item.id} item={item} onOpen={onOpen} scope="life"/>)}</section>}{books.length>0&&<section className="book-index"><h2 className="subheading">页间 <span>READING INDEX</span></h2>{books.map(item=><button key={item.id} onClick={()=>onOpen(item)} data-focus-key={`life-${item.id}`}><strong>{item.title} ↗</strong><span>{item.tags.join(" · ")}</span><p>{item.description}</p><time>{item.year}</time></button>)}</section>}{music.length>0&&<section className="track-list"><h2 className="subheading">耳畔 <span>LISTENING NOTES</span></h2>{music.map((item,i)=><button key={item.id} onClick={()=>onOpen(item)} data-focus-key={`life-${item.id}`}><small>{String(i+1).padStart(2,"0")}</small><span><strong>{item.title}</strong><p>{item.description}</p></span><b>↗</b></button>)}</section>}{other.map(item=><ItemLink key={item.id} item={item} onOpen={onOpen} scope="life"/>)}</div>;
}
export function LifeView({onOpen,onSection,collection}:Actions&{collection?:string}) {
  const active=collection || "all";
  const records=itemsForSection("life").filter(i=>active==="all" || i.kind==="archive"&&i.category===active);
  return <div><LifeIndex onSection={onSection}/><div className="filter-line" aria-label="生活分类">{[{id:"all",label:"全部"},{id:"travel",label:"旅行"},{id:"books",label:"阅读"},{id:"music",label:"音乐"},{id:"culture",label:"其他"}].map(f=><button key={f.id} aria-pressed={active===f.id} onClick={()=>onSection("life",f.id==="all"?undefined:f.id)}>{f.label}</button>)}</div>{records.length?<LifeRecords records={records} onOpen={onOpen}/>:<p className="empty-results" role="status">这部分记录尚未收录。留一点空间，给接下来的风景。</p>}</div>;
}
export function ResumeView({onOpen}:Pick<Actions,"onOpen">) {
  return <article className="resume-view"><header><p className="eyebrow">CURRICULUM VITAE</p><h1 tabIndex={-1} data-view-heading>{profile.name} <span>{profile.englishName}</span></h1><p>{profile.school} / {profile.identity}</p><a href={`mailto:${profile.email}`}>{profile.email}</a></header><section><h2>教育与交换</h2>{itemsForSection("experience").filter(i=>i.kind==="experience"&&i.category==="education").map(item=><div className="resume-row" key={item.id}><strong>{item.title}</strong><time>{item.year}</time><p>{item.description}</p></div>)}</section><section><h2>实习经历</h2>{itemsForSection("experience").filter(i=>i.kind==="experience"&&i.category==="internship").map(item=><div className="resume-row" key={item.id}><strong>{item.title}</strong><time>{item.year}</time><p>{item.description}</p></div>)}</section><section><h2>精选项目与研究</h2>{["eval-studio","housing-expectations","bili-summary","yama"].map(id=><button key={id} className="resume-row" onClick={()=>onOpen(itemById[id])} data-focus-key={`resume-${id}`}><strong>{itemById[id].title} ↗</strong><p>{itemById[id].description}</p></button>)}</section><section><h2>方法与工具</h2><p>以 Python 完成数据处理、建模与自动化；在 Codex / Cursor 协作下实现应用，并通过测试、调试和浏览器检查验证结果。</p></section></article>;
}
export function ContactDialog({onClose,opener}:{onClose:()=>void;opener:HTMLElement|null}) {
  return <Modal title="联系卢雪莹" onClose={onClose} opener={opener} className="contact-dialog"><div className="contact-copy"><p className="eyebrow">SAY HELLO</p><h2>很高兴认识你。</h2><a href={`mailto:${profile.email}`}>{profile.email} ↗</a><div><a href={profile.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href={profile.bilibili} target="_blank" rel="noopener noreferrer">Bilibili ↗</a></div></div></Modal>;
}
