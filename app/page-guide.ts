/** First-visit page guide. Keep this independent from each world's dialogue. */
export const PAGE_GUIDE_STEPS = [
  {
    id: "welcome",
    text: "你好！初次见面（如果不是初次，那我很荣幸了）这里是我的网站哦。要我带你逛逛吗？",
  },
  {
    id: "character",
    text: "我是卢雪莹，这个会动的角色是用我的形象做的，嗯...有点自恋了吧？",
  },
  {
    id: "selector",
    text: "啊对了，你可以点击旁边的目录或者滚动鼠标或者按上下键切换栏目哦。快试试！",
  },
  {
    id: "audio",
    text: "右上角可以开启/关闭音乐和音效哦。但是术力口可能会很吵。",
  },
  {
    id: "lobby",
    text: "在主页这里看不见什么内容对吧？",
  },
  {
    id: "face",
    text: "因为这里要展示我，哈哈！你可以点一下我的脸或者兔耳朵...",
  },
  {
    id: "reaction",
    text: "没有发生什么，对吧？只是给你看看我做了这个脸部动画的效果^ ^",
  },
  {
    id: "enter",
    text: "好啦，如果你想要看具体内容，切换到【对应的目录】，再次点击目录【对应的标题】，或点击对话框右侧的【进入】。进入详情页后，点左上角【HOME】就可以返回这里啦。",
  },
] as const;

export const PAGE_GUIDE_CHOICES = [
  { label: "好呀", action: "continue" },
  { label: "算球", action: "close" },
] as const;

/** The guide never wraps back to its opening line. */
export function nextGuideStep(index: number): number | null {
  if (!Number.isInteger(index) || index < 0 || index >= PAGE_GUIDE_STEPS.length - 1) return null;
  return index + 1;
}
