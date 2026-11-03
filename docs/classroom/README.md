# 小谱音乐教室：设计图还原

原图：`reference/design.png`（1448 × 1086）。

## 页面和代码

- 已集成首页：`app/static/index.html`。现有 FastAPI 根路由直接显示新首页。
- 独立构建页面：`app/static/classroom/index.html`。
- 原有旋律转谱页面保留在 `app/static/transcribe.html`；现有 `/v2` 整曲工作台和后端代码保留。
- React 源码：`classroom/src/App.jsx`、`classroom/src/styles.css`。
- 本地正式构建预览：http://127.0.0.1:4173/static/classroom/ 。

## 图片与完整提示词

17 张页面素材分别使用内置 image_gen 生成，最终均保存于 `app/static/classroom/assets/`，源项目副本位于 `classroom/public/assets/`。

| 用途 | 文件 |
| --- | --- |
| 主插画 | `hero-classroom-v3.png` |
| 纸质背景 | `page-paper.png` |
| 五个学习入口 | `feature-reading-handdrawn-v2.png`、`feature-rhythm-handdrawn-v2.png`、`feature-sing-handdrawn-v2.png`、`feature-trophy-handdrawn-v2.png`、`feature-community-handdrawn-v2.png` |
| 六张乐谱封面 | `score-star.png`、`score-sunny.png`、`score-confession.png`、`score-night.png`、`score-castle.png`、`score-rice.png` |
| 三张社区缩略图 | `community-piano.png`、`community-guitar.png`、`community-vocal.png` |
| 头像 | `avatar-musician.png` |

每个生成素材的完整最终提示词在同目录的 `.prompt.md` 文件中，封面和社区组分别在 `score-assets.prompts.md` 和 `community-assets.prompts.md` 中。完整清单见 `manifest.json`。保留早期主插画版本以便回退；当前只使用 v3。

所有文字、搜索、导航、标签、按钮、收藏状态、难度星级和社区计数均为真实 HTML/React 元素，整页没有作为背景截图使用。普通界面图标采用 Phosphor React；标题使用 Ma Shan Zheng，正文使用系统中文字体。

字体来源：https://github.com/google/fonts/tree/main/ofl/mashanzheng 。图标来源：https://github.com/phosphor-icons/react 。

## 预览与构建

```sh
cd classroom
npm install
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
npm run build
npm run test:sites
```

开发地址为 `/static/classroom/`。本次运行的 Node 位于 `/Users/rimon/.local/share/fyp-design-tools/node-v22.16.0-darwin-arm64/bin/`，可加入 PATH 使用。

为避免 SMB 网络卷上安装海量依赖文件，本次实际安装、构建和运行位于 `/Users/rimon/.local/share/fyp-design-tools/classroom-preview/`。工作区源代码和最终构建已同步保存。若继续修改，修改 `classroom/` 内源码并在此构建，或先同步到该本地预览副本。

`npm run build` 后，将 `dist/client/` 内容复制到 `app/static/classroom/`，并将其 `index.html` 复制到 `app/static/index.html`，即可更新现有 FastAPI 首页。

## 交互范围

已实现歌曲搜索、热门搜索、乐器筛选、空结果提示、收藏、曲谱预览、练习速度、浏览器音频试听、课程进度、下拉菜单、每日打卡、论坛分类、点赞、讨论、演示发布表单、手机导航、弹窗焦点和 Escape 关闭。

搜索框点击或聚焦后，在其正下方展开热门搜索、搜索历史和匹配乐谱。歌曲名、歌手、乐器及谱种随输入即时匹配，点击条目回填并筛选下方乐谱；支持上下方向键、Enter 选择，以及 Escape、点击外部关闭。搜索历史仅保存在当前浏览器的 localStorage，按最近使用排序、去重、保留 8 条，支持逐条删除和清空，刷新后保留；首次使用显示真实空状态。面板在桌面及手机上覆盖下方内容，内部滚动，不改变原来的 hero 高度。

搜索结果条目只显示歌曲名和歌手，不显示右侧乐器文字。主视觉插画由独立的 `hero-art-frame` 裁切，hero 始终允许浮层溢出，避免展开/关闭搜索面板时切换 overflow 导致背景滚动偏移和跳动。

社区发布、点赞、收藏、打卡和课程进度为当前页面状态，刷新后重置；没有连接社区后端。小星星试听播放熟悉的公共领域旋律，其他曲目使用练习音阶。生成的封面乐谱是视觉素材，不是可核验的正式教学曲谱。音乐 URL 入口会提示进入已有 8000 端口转谱工作台；本次没有启动或验证该 Python 服务和云端转谱流程。

## 验证记录

正式构建和 4 项打包/静态路由检查通过。浏览器验证结果及逐轮对照见项目根目录 `design-qa.md`；截图在 `docs/classroom/qa/`。生成插画的笔触、音符、少量字形和原设计有细节差异，不能声称逐像素完全一致。

## 最新图标调整

五个学习入口现已按用户批注替换为统一的平面手绘图标。素材与各自提示词清单见 `handdrawn-icons.md`。
