import assert from "node:assert/strict";
import test from "node:test";
import { PAGE_GUIDE_CHOICES, PAGE_GUIDE_STEPS, nextGuideStep } from "../app/page-guide.ts";

const copy = [
  "你好！初次见面（如果不是初次，那我很荣幸了）这里是我的网站哦。要我带你逛逛吗？",
  "我是卢雪莹，这个会动的角色是用我的形象做的，嗯...有点自恋了吧？",
  "啊对了，你可以点击旁边的目录或者滚动鼠标或者按上下键切换栏目哦。快试试！",
  "右上角可以开启/关闭音乐和音效哦。但是术力口可能会很吵。",
  "在主页这里看不见什么内容对吧？",
  "因为这里要展示我，哈哈！你可以点一下我的脸或者兔耳朵...",
  "没有发生什么，对吧？只是给你看看我做了这个脸部动画的效果^ ^",
  "好啦，如果你想要看具体内容，切换到【对应的目录】，再次点击目录【对应的标题】，或点击对话框右侧的【进入】。进入详情页后，点左上角【HOME】就可以返回这里啦。",
];

test("page guide keeps the approved eight beats and only the two approved copy edits", () => {
  assert.equal(PAGE_GUIDE_STEPS.length, 8);
  assert.deepEqual(PAGE_GUIDE_STEPS.map((step) => step.text), copy);
  assert.equal(new Set(PAGE_GUIDE_STEPS.map((step) => step.id)).size, 8);
});

test("page guide advances linearly and ends rather than looping", () => {
  for (let index = 0; index < 7; index += 1) {
    assert.equal(nextGuideStep(index), index + 1);
  }
  assert.equal(nextGuideStep(7), null);
});

test("the opening offers one continuation and one genuine exit", () => {
  assert.deepEqual([...PAGE_GUIDE_CHOICES], [
    { label: "好呀", action: "continue" },
    { label: "算球", action: "close" },
  ]);
});
