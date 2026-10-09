import type { SectionId } from "../app/world-machine";
import type { CharacterPoseId } from "../app/character/types";
export type { CharacterAction, CharacterAssets, CharacterRendererProps } from "../app/character/types";

export type ContentMedia = { src: string; alt: string; poster?: string; width?: number; height?: number };
export type AudioConfig = { bgm?: string; select?: string; confirm?: string; tap?: string };
type BaseItem = {
  id: string; slug: string; primarySection: SectionId; title: string; eyebrow: string;
  year: string; tags: string[]; description: string; accent: string; contribution?: string;
  media?: ContentMedia; href?: string; linkLabel?: string; relatedIds?: string[];
  details?: Array<{ label: string; text: string }>; characterIds?: string[]; collection?: string;
};
export type ImageItem = BaseItem & { kind: "image"; category: "fan-art" | "original" | "study" };
export type VideoItem = BaseItem & { kind: "video"; source: "local" | "external" };
export type ProjectItem = BaseItem & { kind: "project"; status: "in-use" | "implemented" | "prototype" | "contribution" };
export type ArchiveItem = BaseItem & { kind: "archive"; category: "books" | "travel" | "music" | "culture" };
export type ExperienceItem = BaseItem & { kind: "experience"; category: "education" | "internship"; organisation: string; role: string };
export type ResearchItem = BaseItem & { kind: "research"; researchType: "paper" | "exploration"; role: string };
export type ContentItem = ImageItem | VideoItem | ProjectItem | ArchiveItem | ExperienceItem | ResearchItem;
export type SectionConfig = {
  id: SectionId; index: string; label: string; english: string; kicker: string; intro: string;
  accent: string; secondary: string; pose: CharacterPoseId; background: "burst" | "halftone" | "grid" | "paper";
  previewId?: string; previewTitle: string; previewDetail: string; audio?: AudioConfig;
};
export type WorldConfig = SectionConfig;
export const profile = {
  name: "卢雪莹", englishName: "Xueying Lu", initials: "XL",
  school: "中国人民大学 · 金融工程", identity: "AI 实践 / 研究 / 视觉创作",
  email: "lxy1220@ruc.edu.cn", github: "https://github.com/bread-lxy",
  bilibili: "https://space.bilibili.com/17795482",
};
const mint = "#75efcc", pink = "#ff5aae", violet = "#b49aff", blue = "#8ec6ff";
export const items: ContentItem[] = [
  {id:"ruc",slug:"ruc",primarySection:"experience",kind:"experience",category:"education",organisation:"中国人民大学",role:"财政金融学院 · 金融工程",title:"中国人民大学",eyebrow:"EDUCATION",year:"2022.09 入学",tags:["金融工程","国家奖学金"],description:"在金融工程的训练中，连接数学、数据分析与真实问题。",accent:blue,relatedIds:["housing-expectations"],details:[{label:"学习背景",text:"财政金融学院金融工程专业背景，获国家奖学金。"}]},
  {id:"cbs",slug:"cbs",primarySection:"experience",kind:"experience",category:"education",organisation:"哥本哈根商学院",role:"交换学习",title:"哥本哈根商学院",eyebrow:"EXCHANGE",year:"2024.09 — 2024.12",tags:["Copenhagen","OpenInnovation"],description:"与跨国团队探索城市水治理，参加 Sustainable Cities 项目并向 Ramboll 展示方案。",accent:blue,details:[{label:"交换与协作",text:"在 OpenInnovation 项目中，将可持续城市问题转化为方案，并与不同背景的同学共同完成展示。"}]},
  {id:"sand-ai",contribution:"参与多模态评测、评测平台建设与创意技术原型开发。",slug:"sand-ai",primarySection:"experience",kind:"experience",category:"internship",organisation:"Sand AI / VidMuse",role:"AI Agent 评测与工程实习",title:"Sand AI / VidMuse",eyebrow:"INTERNSHIP",year:"2026.04 — 2026.08",tags:["多模态评测","AI Coding"],description:"围绕 AI 视频 Agent，参与多模态评测、评测平台建设与创意技术原型开发。",accent:mint,relatedIds:["eval-studio","yama","director"],details:[{label:"工作内容",text:"建设评测工作台，组织可复现的模型比较，协作完成模型接入与创意工具原型。工程实现使用 Codex / Cursor 协作，并通过测试与浏览器检查验证改动。"}]},
  {id:"huatai",slug:"huatai",primarySection:"experience",kind:"experience",category:"internship",organisation:"华泰证券",role:"金融工程组实习",title:"华泰证券",eyebrow:"INTERNSHIP",year:"2025.11 — 2026.02",tags:["量化研究","Python"],description:"开展 CTA 策略回测与异常收益诊断，构建 ETF 持有人分类和数据复核流程。",accent:blue,details:[{label:"个人工作",text:"拆解策略规则、复核回测结果，诊断仓位机制导致的收益失真；使用 Python 建立可追溯的数据分类流程。"}]},
  {id:"baidu",slug:"baidu",primarySection:"experience",kind:"experience",category:"internship",organisation:"百度智能云",role:"AI 应用战略研究实习",title:"百度智能云",eyebrow:"INTERNSHIP",year:"2025.06 — 2025.09",tags:["AI 应用","行业研究"],description:"研究 AI 云产品、竞争策略与行业需求，将业务场景与云服务、模型能力进行匹配。",accent:blue,details:[{label:"研究视角",text:"围绕客户、应用场景、产品能力与竞争策略组织研究，分析教育、游戏等行业的 AI 应用路径。"}]},
  {id:"guotai",slug:"guotai",primarySection:"experience",kind:"experience",category:"internship",organisation:"国泰君安证券",role:"家电组行业研究实习",title:"国泰君安证券",eyebrow:"INTERNSHIP",year:"2024.08 — 2025.02",tags:["财务建模","行业研究"],description:"参与家电行业研究，搭建财务预测、DCF 估值与敏感性分析模型。",accent:blue},
  {id:"esg",slug:"esg",primarySection:"experience",kind:"experience",category:"internship",organisation:"北京 ESG 研究院",role:"数据分析助理",title:"北京 ESG 研究院",eyebrow:"INTERNSHIP",year:"2024.07 — 2024.10",tags:["数据分析","ESG"],description:"使用 Python 采集、清洗与对齐评级数据，分析评级差异并制作可视化研究材料。",accent:blue},
  {id:"housing-expectations",contribution:"Cities 共同第一作者，研究住房价格预期的形成机制。",slug:"housing-expectations",primarySection:"research",kind:"research",researchType:"paper",role:"共同第一作者",title:"住房价格预期中的认知偏差",eyebrow:"CITIES · PUBLISHED PAPER",year:"2026",tags:["行为金融","计量研究"],description:"基于家庭调查数据，研究住房价格预期中的赌徒谬误。",accent:violet,href:"https://doi.org/10.1016/j.cities.2026.106853",linkLabel:"阅读论文",details:[{label:"论文",text:"The Gambler’s Fallacy in Housing Price Expectations: Evidence from China. Cities, 171, 106853."},{label:"个人贡献",text:"共同第一作者。参与变量构建、计量建模、稳健性检验与结果可视化。"},{"label":"方法","text":"基于 CHFS 微观家庭数据，使用 Logit、Probit 与 2SLS 检验价格预期偏差及风险态度机制。"}]},
  {id:"worldquant",slug:"worldquant",primarySection:"research",kind:"research",researchType:"exploration",role:"量化因子研究",title:"从信号到可复现的因子实验",eyebrow:"WORLDQUANT BRAIN CHALLENGE",year:"2024.12 — 2025.02",tags:["量化因子","Challenge 金奖"],description:"围绕量价、交易与新闻数据研究因子，以 Python 自动化实验提交和结果整理。",accent:violet,details:[{label:"研究边界",text:"结果来自平台历史回测，不代表实盘收益，也不作为投资建议。"}]},
  {id:"tennis",slug:"tennis",primarySection:"research",kind:"research",researchType:"exploration",role:"数学建模",title:"网球比赛的动量与转折点",eyebrow:"MATHEMATICAL MODELING",year:"",tags:["LSTM","CVAE","MCM H 奖"],description:"构建比赛动量与时序特征，探索比赛转折点预测。",accent:violet,details:[{label:"方法",text:"以差分动量和波动标签构建比赛特征，使用时序模型探索比赛状态的变化。"}]},
  {id:"pricing",slug:"pricing",primarySection:"research",kind:"research",researchType:"exploration",role:"数学建模",title:"商超采购与定价的联合优化",eyebrow:"OPERATIONS RESEARCH",year:"",tags:["时间序列","线性规划","北京市一等奖"],description:"连接销售、成本与损耗数据，研究补货和定价策略。",accent:violet},
  {id:"eval-studio",contribution:"在 AI Coding 协作下建设多模态评测工作台，串联数据、生成与盲评。",slug:"eval-studio",primarySection:"projects",kind:"project",status:"in-use",title:"Eval Studio",eyebrow:"MULTIMODAL EVALUATION",year:"2026",tags:["AI Coding","评测平台","Sand AI"],description:"连接评测集、批量生成、盲评与统计洞察的多模态评测工作台。",accent:mint,relatedIds:["sand-ai","yama"],details:[{label:"问题",text:"评测工作分散在表格与脚本中，数据、生成结果和评审结论难以关联与复用。"},{"label":"个人工作","text":"在 AI Coding 协作下建设 React / TypeScript 工作台及服务端，整合评测集管理、模型生成、随机匿名盲评、统计分析与任务恢复。"},{"label":"结果与边界","text":"实习期间投入团队使用，将评测素材、模型结果与评审结论连接在同一工作流。"}]},
  {id:"bili-summary",slug:"bili-summary",primarySection:"projects",kind:"project",status:"implemented",title:"B 站视频 AI 总结",eyebrow:"VIDEO → KNOWLEDGE",year:"",tags:["Python","FastAPI","个人项目"],description:"把音频获取、语音转写、摘要与结果展示连成一条可运行的应用链路。",accent:mint,href:"https://github.com/bread-lxy/read-sum-vedio-from-bili",linkLabel:"查看公开源码",details:[{label:"实现",text:"拆分转写、摘要和展示模块，支持本地／云端转写、多模型接入，并使用 Docker Compose 进行服务编排。"},{"label":"容错","text":"对转写与摘要分别设计降级路径，处理模型配置缺失与长视频任务。"}]},
  {id:"news-agent",slug:"news-agent",primarySection:"projects",kind:"project",status:"implemented",title:"AI 资讯与日程 Agent",eyebrow:"PERSONAL WORKFLOW",year:"",tags:["n8n","工具调用","个人项目"],description:"将资讯、日历与飞书连接成定时工作流，整理信息并输出结构化建议。",accent:mint,details:[{label:"实现",text:"按资讯、日程和综合建议拆分工作流，以字段约束和模板保持结果结构一致。"}]},
  {id:"yama",slug:"yama",primarySection:"projects",kind:"project",status:"contribution",title:"Yama · Agent 行为评测",eyebrow:"AGENT EVALUATION",year:"2026",tags:["Tool Mock","规则校验","参与建设"],description:"将工具模拟、确定性校验与模型评分组织成可复现的行为测试。",accent:mint,relatedIds:["sand-ai","eval-studio"],details:[{label:"个人贡献",text:"参与评测框架建设、Case 设计与 Judge 可靠性分析，强调硬规则优先、失败可追溯。"}]},
{id:"director",slug:"director",primarySection:"projects",kind:"project",status:"prototype",title:"3D 导演台",eyebrow:"CREATIVE TOOL PROTOTYPE",year:"2026",tags:["AI Coding","镜头构图","创意工具"],description:"在浏览器里调整角色、动作与机位，将场景预演连接到创作流程。",accent:mint,relatedIds:["sand-ai"],details:[{label:"个人工作",text:"通过 AI Coding 协作实现对象编辑、动作调整、机位构图与截图回传，并完成协议接入和定向验证。"},{"label":"项目状态","text":"已实现并完成 review / preview，处于预上线调试阶段。"}]},
  {id:"personal-archive",slug:"personal-archive",primarySection:"projects",kind:"project",status:"implemented",title:"这个个人主页",eyebrow:"ART × CODE",year:"2026",tags:["AI Coding","交互角色","个人项目"],description:"将原创角色、实时表情与编辑式内容组合成一个可以探索的个人空间。",accent:pink,media:{src:"/character/hero-v2/poster.png",alt:"个人主页中使用的原创角色，AI 辅助创作",width:1024,height:1024},details:[{label:"创作方式",text:"使用 AI 辅助完成角色视觉与工程实现。角色采用分层网格动画，不是 Cubism Live2D 模型。"},{"label":"交互",text:"角色跟随主题变化，保留点击反馈、表情与低性能设备的静态降级。"}]},
];
export const sections: SectionConfig[] = [
  {id:"experience",index:"01",label:"经历",english:"EXPERIENCE",kicker:"EDUCATION / INTERNSHIPS",intro:"从金融工程出发，在研究、行业与 AI 实践之间拓宽视野。",accent:blue,secondary:mint,pose:"rest",background:"grid",previewId:"sand-ai",previewTitle:"从金融，到 AI 实践",previewDetail:"教育、交换与实习中的探索。"},
  {id:"research",index:"02",label:"研究",english:"RESEARCH",kicker:"QUESTIONS / METHODS / EVIDENCE",intro:"从一个问题出发，用数据、建模和可复现的实验寻找答案。",accent:violet,secondary:blue,pose:"rest",background:"grid",previewId:"housing-expectations",previewTitle:"研究价格背后的预期",previewDetail:"Cities · SSCI · JCR Q1"},
  {id:"projects",index:"03",label:"项目",english:"PROJECTS",kicker:"BUILD / EVALUATE / ITERATE",intro:"将想法变成可以使用、检验和继续迭代的工具。",accent:mint,secondary:pink,pose:"signal",background:"burst",previewId:"eval-studio",previewTitle:"Eval Studio",previewDetail:"多模态评测工作台"},
  {id:"studio",index:"04",label:"创作",english:"STUDIO",kicker:"ILLUSTRATION / MOTION",intro:"插画、手书与动态影像。工作之外，也用画面表达想法。",accent:pink,secondary:violet,pose:"reach",background:"halftone",previewTitle:"画面里的另一面",previewDetail:"插画 / 同人 / OC / 手书 / AI 影像"},
  {id:"life",index:"05",label:"生活",english:"LIFE",kicker:"PLACES / BOOKS / SOUNDS",intro:"在不同的地方、书页和声音里，留下日常的切片。",accent:"#efc879",secondary:pink,pose:"lean",background:"paper",previewTitle:"生活，不止一种取景",previewDetail:"旅行 / 阅读 / 音乐"},
];
export const sectionById = Object.fromEntries(sections.map(s=>[s.id,s])) as Record<SectionId,SectionConfig>;
export const itemById = Object.fromEntries(items.map(i=>[i.id,i])) as Record<string,ContentItem>;
export const homeConfig = { featuredIds:["eval-studio","housing-expectations","bili-summary"], experienceIds:["sand-ai","huatai","baidu"] };
export const itemsForSection = (section: SectionId) => items.filter(i=>i.primarySection===section);
export const findItem = (section: SectionId, slug: string) => items.find(i=>i.primarySection===section && i.slug===slug);
export const projectStatus = { "in-use":"实习期间投入使用", implemented:"已实现", prototype:"预上线原型", contribution:"参与建设" };
export function filterPlayground(records: ContentItem[], characterId: string) {
  return characterId==="all" ? records : records.filter(i=>i.characterIds?.includes(characterId));
}
export function filterArt(records: ContentItem[], category: string, collection="all", character="all") {
  return filterPlayground(records.filter(i=>(i.kind==="image" || i.kind==="video") &&
    (category==="all" || (category==="motion" ? i.kind==="video" : category==="play" ? i.collection==="play" : i.kind==="image" && i.category===category)) &&
    (collection==="all" || i.collection===collection)),character);
}
export function safeContentUrl(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("/") && !value.startsWith("//") && !/[\\\r\n]/.test(value)) return value;
  try {
    const url = new URL(value);
    return ["https:","http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
