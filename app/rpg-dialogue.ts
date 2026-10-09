import type { SectionId } from "./world-machine";

/** A single, intentionally small line for the lobby's RPG-style guide. */
export type RpgDialogueLine = {
  id: string;
  /** The speaker label shown in the pixel panel. */
  speaker: string;
  /** The world this line belongs to, kept on the line for easy filtering. */
  world: SectionId;
  /** The English world label shown beside the speaker. */
  worldLabel: string;
  /** Placeholder copy can be replaced without changing the component. */
  text: string;
};

export type RpgDialogueLines = readonly RpgDialogueLine[];

/** Wrap in either direction, including empty/single-line fixtures. */
export function cycleDialogueIndex(index: number, lineCount: number) {
  if (lineCount <= 0 || !Number.isFinite(index)) return 0;
  return ((Math.trunc(index) % lineCount) + lineCount) % lineCount;
}

export const rpgWorldLabels: Record<SectionId, string> = {
  experience: "EXPERIENCE",
  research: "RESEARCH",
  projects: "PROJECTS",
  studio: "STUDIO",
  life: "LIFE",
};

// Keep lobby copy in data so a future writing pass does not touch interaction code.
export const rpgDialogueBySection = {
  experience: [
    {
      id: "experience-01",
      speaker: "XUEYING",
      world: "experience",
      worldLabel: rpgWorldLabels.experience,
      text: "我身后悬浮的网页上是我的教育和实习经历哦。需要详细了解一下的话，可以点右侧的【进入】。不过在此之前...",
    },
    {
      id: "experience-02",
      speaker: "XUEYING",
      world: "experience",
      worldLabel: rpgWorldLabels.experience,
      text: "...先看看金鱼好吗！",
    },
    {
      id: "experience-03",
      speaker: "XUEYING",
      world: "experience",
      worldLabel: rpgWorldLabels.experience,
      text: "想想这一切像是机缘巧合、又像是注定的宿命...接下来的路在哪里，还无法得知呢。",
    },
  ],
  research: [
    {
      id: "research-01",
      speaker: "XUEYING",
      world: "research",
      worldLabel: rpgWorldLabels.research,
      text: "这里是做过的科研。如果你能来看看原文的话，我会非常非常荣幸的TT",
    },
    {
      id: "research-02",
      speaker: "XUEYING",
      world: "research",
      worldLabel: rpgWorldLabels.research,
      text: "发过一篇SSCI JCR Q1的文章，超级感谢潘老师呀❤",
    },
    {
      id: "research-03",
      speaker: "XUEYING",
      world: "research",
      worldLabel: rpgWorldLabels.research,
      text: "其实我还蛮喜欢科研的，尤其是闷头捣鼓一些东西，但有时候感觉和实务有点割裂（啊...）",
    },
  ],
  projects: [
    {
      id: "projects-01",
      speaker: "XUEYING",
      world: "projects",
      worldLabel: rpgWorldLabels.projects,
      text: "这里是一些在实习/日常中搓的网站一类的。点进来看一眼，给我增加一个访问量呗~~",
    },
    {
      id: "projects-02",
      speaker: "XUEYING",
      world: "projects",
      worldLabel: rpgWorldLabels.projects,
      text: "vibe coding是真的好东西啊，有种我是全栈的错觉了（打飞）",
    },
    {
      id: "projects-03",
      speaker: "XUEYING",
      world: "projects",
      worldLabel: rpgWorldLabels.projects,
      text: "确实在搭建的过程、以及用户的反馈中接触学习到很多！但还是菜的一批啊...",
    },
  ],
  studio: [
    {
      id: "studio-01",
      speaker: "XUEYING",
      world: "studio",
      worldLabel: rpgWorldLabels.studio,
      text: "其实我一直觉得画画是我人生永恒的主线...不是说能画出什么太好的东西来，而是画画本身就是感受与和这个世界交互的一种方式吧。",
    },
    {
      id: "studio-02",
      speaker: "XUEYING",
      world: "studio",
      worldLabel: rpgWorldLabels.studio,
      text: "关于视频，我喜欢用ae古法手搓，并做一些完全没必要的扣帧行为。",
    },
    {
      id: "studio-03",
      speaker: "XUEYING",
      world: "studio",
      worldLabel: rpgWorldLabels.studio,
      text: "门外汉、无意义的瞎涂...想要画出想画的东西，随心所欲地起舞吧——“沉迷这一场，永远玩不完的游戏”。",
    },
    {
      id: "studio-04",
      speaker: "XUEYING",
      world: "studio",
      worldLabel: rpgWorldLabels.studio,
      text: "线条、疏密、虚实、软硬的对比，黑白的交替，不同层次的节奏，理性客观基础上感性主观的加工",
    },
  ],
  life: [
    {
      id: "life-01",
      speaker: "XUEYING",
      world: "life",
      worldLabel: rpgWorldLabels.life,
      text: "在遥远的、童话中的北欧做一场大梦吧，一起去更多、更远的地方吧...！",
    },
    {
      id: "life-02",
      speaker: "XUEYING",
      world: "life",
      worldLabel: rpgWorldLabels.life,
      text: "巴塞罗那海边的老人，你还记得那天一起看日出的我吗？在沙滩上为我雕刻的名字被潮汐带走了吗？",
    },
    {
      id: "life-03",
      speaker: "XUEYING",
      world: "life",
      worldLabel: rpgWorldLabels.life,
      text: "文学、文字、诗...立体的梦境、呓语、图书馆、迷宫、镜子、潮湿的拉美、跃动的火光、夏天、蝉、灯塔切碎海浪、太阳、太阳...",
    },
  ],
} satisfies Record<SectionId, RpgDialogueLines>;

/** Upper-case alias for consumers that prefer constants for content tables. */
export const RPG_DIALOGUE_BY_SECTION = rpgDialogueBySection;

export function getRpgDialogueLines(world: SectionId): RpgDialogueLines {
  return rpgDialogueBySection[world];
}
