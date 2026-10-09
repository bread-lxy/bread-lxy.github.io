# 卢雪莹 · Personal Website

[在线访问](https://bread-lxy.github.io/)

以交互叙事呈现经历、研究、项目、创作与生活。五个主题场景连接同一份连续正文，栏目与作品链接定位到内容原文。

## 技术设计

- **静态发布**：React 19、TypeScript、vinext 与 Vite；构建时预渲染页面，由 GitHub Pages 托管静态产物。
- **角色与场景**：分层 PSD 素材在 Canvas / WebGL 中形成 2.5D 动画角色；GSAP 编排场景切换，OGL / GLSL 实现视觉效果。
- **内容与交互**：内容数据与视图分离；URL 锚点支持直达与返回；Howler 管理音频播放。
- **设备适配**：支持桌面和触屏操作、响应式布局与减少动态效果偏好；角色离屏时暂停动画。

## 本地运行

需要 Node.js 22.13.0 或更高版本。

```bash
npm ci
npm run dev
```

```bash
npm run build
npm run typecheck
npm test
```

`npm run build` 将静态站点生成到 `dist/client/`。推送到 `main` 后，GitHub Actions 会构建并发布到 GitHub Pages。
