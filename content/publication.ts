import { items, type ContentItem } from './site.ts';
import type { SiteRoute, SectionId } from '../app/world-machine.ts';

export type PublicationItem = ContentItem & {
  ownerId?: string;
  /** Association is not a nested full-body owner. */
  associatedExperience?: string;
  presentation?: 'text-media' | 'visual-demo' | 'gallery' | 'photo-note';
  /** Art-directed paper placement; prose determines height, never a fixed crop. */
  paperLayout?: 'wide' | 'tall' | 'small' | 'text';
};
export const internshipIds = ['sand-ai', 'huatai', 'baidu', 'guotai', 'esg'] as const;
export const experienceOrder = ['ruc', 'cbs', ...internshipIds] as const;
export type ExperienceId = typeof experienceOrder[number];
type ExperienceNote = { english: [string,string]; field: string; sentences: string[]; projects?: string[] };
/** Public abridgments; original descriptions and details below remain unchanged. */
export const experienceNotes:Record<ExperienceId,ExperienceNote> = {
  ruc:{english:['Renmin','University'],field:'EDUCATION / BEIJING',sentences:['在中国人民大学财政金融学院学习金融工程，以数学与数据分析理解真实问题。','在校获国家奖学金。']},
  cbs:{english:['Copenhagen','Business School'],field:'EXCHANGE / COPENHAGEN',sentences:['交换期间参与 OpenInnovation 2024 Sustainable Cities 项目，关注城市水治理。','与跨国团队共同形成方案，并向 Ramboll 展示。']},
  'sand-ai':{english:['SandAI','VidMuse'],field:'MULTIMODAL / CREATIVE TECHNOLOGY',sentences:['围绕多模态生成构建评测集，分析模型表现与 Judge 判断的可靠性。','把评测、风格数据与创意工具实践连接起来，用 AI Coding 协作验证和实现想法。'],projects:['eval-studio','yama','director']},
  huatai:{english:['Huatai','Securities'],field:'QUANTITATIVE RESEARCH',sentences:['研究 CTA 策略，复核信号、仓位约束与回测结果，定位异常收益背后的机制。','整理 ETF 持有人数据，建立分类与人工复核流程。']},
  baidu:{english:['Baidu','AI Cloud'],field:'AI / INDUSTRY STRATEGY',sentences:['从客户需求与行业场景出发，研究 AI 云产品与竞争策略。','梳理教育、游戏等业务需求，匹配云基础设施与模型能力。']},
  guotai:{english:['Guotai Junan','Securities'],field:'EQUITY RESEARCH',sentences:['参与公司深度研究，结合访谈与经营数据拆解业务和行业变化。','搭建财务预测与估值模型，为投资判断提供量化支持。']},
  esg:{english:['Beijing','ESG Institute'],field:'DATA / SUSTAINABILITY',sentences:['采集并对齐多来源 ESG 评级数据，将分散信息整理为结构化数据集。','分析评级分布与机构间差异，形成可视化研究材料与政策简报。']},
};
// Public prose comes from the supplied internship drafts. Unconfirmed numerical
// claims and private URLs are intentionally not copied into this public model.
const prose: Record<string, NonNullable<ContentItem['details']>> = {
  'sand-ai': [
    {label:'Judge 可靠性校准',text:'将分镜规划任务拆成独立的测试场景，通过重复实验、成对比较与独立评分分析 Judge 的可靠性。发现硬规则失败样本被误判为通过，以及位置偏差、评分饱和等问题，据此强调硬规则优先、异常默认失败，并保留可追溯的判断依据。'},
    {label:'多模态评测与模型接入',text:'围绕人物一致性、多镜头叙事、复杂运镜、商品呈现和音频口型构建评测集，组织批量生成、技术检查、人工与 AI 评分、竞品比较及问题归因。将评测结论用于模型档位、降级路径、场景路由与上线适配。'},
    {label:'风格数据生产',text:'连接视觉素材采集、来源追踪、去重、风格聚类、盲审、字段校验、原创预览和线上入库，将流程沉淀为支持人工审核、断点恢复与下游重算的 Agent Skills。关注的不只是生成结果，也包括风格定义、证据质量和生产链路的可复用性。'},
  ],
  huatai:[
    {label:'CTA 策略研究',text:'拆解策略的信号生成、持仓周期与开平仓规则，基于 TBQuant 对不同期货标的开展日频及日内回测。从收益、回撤、Sharpe、交易频次和样本稳定性评估跨标的鲁棒性，并整理策略分层与组合建议。'},
    {label:'异常收益诊断',text:'使用 Python 复核回测结果和指标分布，定位复利加仓、仓位约束缺失等机制导致的极端仓位与收益失真。提出参数和规则调整建议，让回测结果更可解释，也更接近现实可执行的交易约束。'},
    {label:'ETF 数据工程',text:'构建 ETF 前十大持有人分类管线，结合关键词、机构名单与多源数据完成名称归一化、主体识别、持有规模测算和灰名单复核，输出可追溯、可复核、可迭代的分类明细与汇总数据。'},
  ],
  baidu:[
    {label:'AI 云竞品研究',text:'搭建“客户分层—应用场景—产品能力—竞争策略”的分析框架，跟踪主要云厂商的产品迭代、合作案例与行业策略，结合客户分布和收入结构进行横向比较，形成定期研究材料与专题报告。'},
    {label:'行业应用分析',text:'围绕在线教育、游戏等行业，梳理个性化学习、AI 助教、云游戏算力等需求。将客户业务与 IaaS、PaaS、模型能力相匹配，拆解落地路径与成本结构，识别商业化机会和差异化切入点。'},
  ],
  guotai:[
    {label:'财务模型搭建',text:'基于访谈和历史经营数据建立收入、成本与盈利假设，使用 Excel 搭建德昌股份、欧圣电气财务模型，覆盖盈利预测、DCF 估值与敏感性分析，为投资逻辑和估值判断提供量化支持。'},
    {label:'公司深度研究',text:'拆解公司的业务结构、技术优势与客户基础，对比海内外竞品，参与形成公司深度研究报告；持续跟踪行业出口、销售和促销数据，整理市场趋势与经营变化。'},
  ],
  esg:[
    {label:'数据采集与对齐',text:'使用 Python、Selenium 与 Edge WebDriver 搭建动态网页采集流程，整理上市公司 ESG 评级数据，完成页面解析、字段标准化和多源数据对齐，形成结构化分析数据集。'},
    {label:'评级差异研究',text:'从 E、S、G 子维度分析评级分布与相关性，通过披露缺失和评分关系探究不同机构评级差异的来源，将数据发现整理为可视化研究材料与政策简报。'},
  ],
  'eval-studio':[
    {label:'平台建设',text:'在 AI Coding 协作下，从零搭建并持续维护多模态评测工作台，将分散在表格与脚本中的评测流程连接起来。整合评测集管理、批量模型生成、随机匿名盲评、统计分析与任务恢复，持续支持团队的新模型评测和版本迭代。'},
    {label:'实现与使用',text:'使用 React / TypeScript 工作台及服务端连接评测素材、模型结果与评审结论。工程实现使用 Codex / Cursor 协作，并通过测试、调试与浏览器检查验证改动；实习期间投入团队使用。'},
  ],
  yama:[
    {label:'Agent 行为评测',text:'参与建设面向 Tool-using Agent / Skill 的声明式评测框架，将 YAML Case、工具调用模拟、确定性硬校验、LLM-as-Judge、重复实验与可追溯报告组织成可复现的行为测试链路。参与 Case 设计和 Judge 可靠性分析，强调硬规则优先与失败可追溯。'},
  ],
  director:[
    {label:'创意工具原型',text:'通过 AI Coding 协作实现浏览器端 3D 导演台，支持角色与场景资产导入、动作和骨骼调整、对象变换、机位构图及截图回传。完成协议接入、定向测试与浏览器验证，将场景预演连接到创作流程。'},
    {label:'项目状态',text:'已通过 review 和预览，处于预上线调试阶段。'},
  ],
};
const owners:Record<string,string>={'eval-studio':'sand-ai',yama:'sand-ai',director:'sand-ai'};
export const publicationItems:PublicationItem[] = items.map(item=>({
  ...item, ...(prose[item.id]?{details:prose[item.id]}:{}),
  associatedExperience:owners[item.id], presentation:item.id==='director'?'visual-demo':'text-media',
}));
publicationItems.push({
  id:'glsl-transitions',slug:'glsl-transitions',primarySection:'projects',kind:'project',status:'contribution',
  title:'让画面发生转变',eyebrow:'GLSL / OPEN SOURCE',year:'2026',tags:['GLSL','gl-transitions','开源贡献'],accent:'#deff36',
  description:'三个被 gl-transitions 合入的转场：旋转、信号干扰与条带错位。',presentation:'visual-demo',
  href:'https://github.com/gl-transitions/gl-transitions/pulls?q=is%3Apr+author%3Abread-lxy+is%3Amerged',linkLabel:'查看合入记录',
  details:[{label:'创作与贡献',text:'向 gl-transitions 提交 Revolve_Left、Drop_Zone_Flicker 与 StripDatamoshGlitch。下面直接运行合入的原始 shader；演示输入使用本站角色图与首屏截图，不代表三支独立影像作品。'}],
});
export const publicationById=Object.fromEntries(publicationItems.map(i=>[i.id,i])) as Record<string,PublicationItem>;
export const ownedBy=(id:string)=>publicationItems.filter(item=>item.ownerId===id);
export const publishedIn=(section:SectionId)=>publicationItems.filter(item=>item.primarySection===section&&!item.ownerId);
export function findPublicationItem(section:SectionId,slug:string){return publicationItems.find(i=>i.primarySection===section&&i.slug===slug);}
export function readingTarget(route:SiteRoute):string {
  if(route.kind==='home')return 'home';
  if(route.kind==='resume')return 'experience';
  if(route.kind==='item')return `item-${findPublicationItem(route.section,route.slug)?.id||route.section}`;
  if(route.collection)return `${route.section}-${route.collection}`;
  return route.section;
}
