import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SECTION_IDS } from "../app/world-machine.ts";
import { cycleDialogueIndex, getRpgDialogueLines } from "../app/rpg-dialogue.ts";

test("all sixteen first-person world lines match the approved copy and order", () => {
  const approved = {
    experience: [
      "我身后悬浮的网页上是我的教育和实习经历哦。需要详细了解一下的话，可以点右侧的【进入】。不过在此之前...",
      "...先看看金鱼好吗！",
      "想想这一切像是机缘巧合、又像是注定的宿命...接下来的路在哪里，还无法得知呢。",
    ],
    research: [
      "这里是做过的科研。如果你能来看看原文的话，我会非常非常荣幸的TT",
      "发过一篇SSCI JCR Q1的文章，超级感谢潘老师呀❤",
      "其实我还蛮喜欢科研的，尤其是闷头捣鼓一些东西，但有时候感觉和实务有点割裂（啊...）",
    ],
    projects: [
      "这里是一些在实习/日常中搓的网站一类的。点进来看一眼，给我增加一个访问量呗~~",
      "vibe coding是真的好东西啊，有种我是全栈的错觉了（打飞）",
      "确实在搭建的过程、以及用户的反馈中接触学习到很多！但还是菜的一批啊...",
    ],
    studio: [
      "其实我一直觉得画画是我人生永恒的主线...不是说能画出什么太好的东西来，而是画画本身就是感受与和这个世界交互的一种方式吧。",
      "关于视频，我喜欢用ae古法手搓，并做一些完全没必要的扣帧行为。",
      "门外汉、无意义的瞎涂...想要画出想画的东西，随心所欲地起舞吧——“沉迷这一场，永远玩不完的游戏”。",
      "线条、疏密、虚实、软硬的对比，黑白的交替，不同层次的节奏，理性客观基础上感性主观的加工",
    ],
    life: [
      "在遥远的、童话中的北欧做一场大梦吧，一起去更多、更远的地方吧...！",
      "巴塞罗那海边的老人，你还记得那天一起看日出的我吗？在沙滩上为我雕刻的名字被潮汐带走了吗？",
      "文学、文字、诗...立体的梦境、呓语、图书馆、迷宫、镜子、潮湿的拉美、跃动的火光、夏天、蝉、灯塔切碎海浪、太阳、太阳...",
    ],
  };
  assert.deepEqual(SECTION_IDS, Object.keys(approved));
  assert.equal(Object.values(approved).reduce((sum, lines) => sum + lines.length, 0), 16);
  for (const world of SECTION_IDS) {
    const lines = getRpgDialogueLines(world);
    assert.deepEqual(lines.map(({ text }) => text), approved[world], world);
    assert.deepEqual(lines.map(({ id }) => id), approved[world].map((_, index) => `${world}-0${index + 1}`), world);
    assert.ok(lines.every((line) => line.world === world && line.speaker === "XUEYING"), world);
  }
  assert.equal(cycleDialogueIndex(4, getRpgDialogueLines("studio").length), 0);
});

test("RPG entry keeps a single ENTER and separate handoff callbacks", async () => {
  const page = await readFile(new URL("../app/TitleRiftOpening.tsx", import.meta.url), "utf8");
  const archive = await readFile(new URL("../app/PersonalArchive.tsx", import.meta.url), "utf8");
  assert.ok(page.includes('>ENTER</span>'));
  assert.doesNotMatch(page, /继续浏览|开始探索|READY|MEMORY SLOT/);
  assert.match(page, /onPrepareLobby/);
  assert.match(page, /onEntryComplete/);
  assert.match(archive, /node.inert=locked/);
  assert.match(archive, /personal-archive-reduced-motion/);
  assert.match(archive, /data-entry-phase=\{entryPhase\}/);
  assert.match(archive, /lobby\?\.addEventListener\("wheel"/);
});

test("audio preferences remain independently switchable", async () => {
  const audio = await readFile(new URL("../app/use-audio.ts", import.meta.url), "utf8");
  assert.match(audio, /const next = !sfxIntent\.current/);
  assert.match(audio, /const toggleBgm = useCallback\(\(\) => engineRef\.current\?\.toggle\(\), \[\]\)/);
  assert.match(audio, /personal-archive-bgm-volume/);
  assert.doesNotMatch(audio, /getItem\(['"]personal-archive-bgm['"]\)/);
});

test("dialogue cycles in both directions, including empty and single-line lists", () => {
  assert.equal(cycleDialogueIndex(3, 3), 0);
  assert.equal(cycleDialogueIndex(-1, 3), 2);
  assert.equal(cycleDialogueIndex(7, 3), 1);
  assert.equal(cycleDialogueIndex(-7, 3), 2);
  for (const count of [0, 1]) for (const index of [-1, 0, 1, 100]) assert.equal(cycleDialogueIndex(index, count), 0);
  assert.equal(cycleDialogueIndex(NaN, 3), 0);
});

test("RPG stylesheet preserves readable controls and reduced-motion fallback", async () => {
  const css = await readFile(new URL("../app/rpg.css", import.meta.url), "utf8");
  const entry = await readFile(new URL("../app/rpg-entry.css", import.meta.url), "utf8");
  assert.match(entry, /height:76px/);
  assert.match(css, /\.rpg-action-rail button\{[^}]*min-height:64px/);
  assert.match(css, /\.rpg-dialogue__next\{[^}]*width:44px/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css, /url\([^)]*(undertale|deltarune|needy)/i);
});
