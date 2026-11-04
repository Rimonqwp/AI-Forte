# 歌曲相关讨论区域与内部流程核对（2026-11-04）

final result: passed

## 视觉来源与证据

- Source visual truth：`design-reference/song-discussions.png`，用户 Comment 1 的第二张附件，原图 765 × 413 px，sRGB。已从本次用户附件保存原图，未重绘参考图。
- 实现：`http://127.0.0.1:4173/static/classroom/#scores?q=周杰伦` → 晴天练习弹窗 → 相关讨论。使用当前 Codex 内置浏览器验证。
- 证据目录：`/Users/rimon/.codex/visualizations/2026/11/04/01a1a5c3-fdbe-7b72-a2fc-286f9c49b922/`。
- 完整对照：`discussion-comparison-final.png`，左为原图，右为浏览器实际渲染区域，两者均 765 px 宽，不缩放；列表细节并排见 `discussion-comparison-focused.png`。已打开两张组合图进行核对。
- 参考宽度：CSS viewport 1034 × 1255，DPR 1；原始浏览器截图 `discussions-765-viewport-final.png` 为 1034 × 1255 px。裁取 x201/y205、765 × 440 px，得到 `discussions-reference-width-final.png`，无密度换算。
- 桌面：1895 × 1255 CSS px、DPR 1，讨论区域约 1395 px 宽。`discussions-desktop-final.png`、`discussion-thread-desktop-final.png`、`discussion-compose-desktop-final.png` 分别记录列表、帖子正文和发帖表单。
- 手机：390 × 844 CSS px、DPR 1，`discussions-mobile-viewport.png` 和 `discussion-thread-mobile.png`。使用 CDP 原始截图；浏览器通用截图在设备模拟时会缩小画面，因此未把其缩略图作为手机视觉证据。已恢复原桌面视口。

## 视觉五项与迭代

- 字体：沿用页面中文字体与棕色文字层级；标题、正文、作者、等级与互动数各自保持可读层次。
- 布局：三张等宽卡片，独立宽幅插画，分类紧邻热门讨论标题，四行紧凑列表；手机单列卡片，分类栏横向滑动。
- 配色：暖纸底、浅桃色边框、珊瑚色动作、浅紫等级与学习指导标签。图标使用现有 Phosphor 图标库。
- 图像：三张配图分别生成并保存提示词，复用现有独立头像；没有把参考截图作为整块界面或拼图使用。
- 文案：保留参考讨论题材、作者层级、示例互动数；歌曲名根据所选歌曲替换。补充明确的本机演示说明。
- 第一轮发现 P2：765 px 宽度下，热门列表的隐式网格最小尺寸把行撑到 795 px，右侧互动数被裁切。已改为 `minmax(0,1fr)` 并允许行收缩。第二轮每行 clientWidth/scrollWidth 均为 723 px，讨论容器 763/763 px，右侧计数完整。先前证据 `discussion-comparison-pass1.png`，修正后见两张 final 对照图。
- 同轮修正：参考宽度下收紧卡片上下间距、标题与卡片间隔，调整乐谱选择标签的粉桃色，增强列表标题字重。
- P3 余项：生成插画和头像不是参考图的逐像素副本；当前示例是《晴天》，参考是《稻香》。底部本机演示说明增加约 28 px 高度。这些差异在对照图中保留，不宣称像素完全相同。

## 交互与验证

- 分类“练习方法”仅显示两条匹配内容，恢复“全部”显示四条热门讨论。
- 精选卡及列表进入帖子正文，显示作者、正文、示例回复、相关帖子与乐谱版本入口；返回后仍在歌曲弹窗内。
- 点赞/取消、收藏/取消、写回复、引用回复均已实测。新增回复后列表计数从 268 变为 269；删除验证回复后恢复 268。
- 选择分类、填写标题和正文、发布讨论后进入新帖子；刷新重新打开歌曲详情后，新帖子与引用回复仍存在。测试帖子与回复已通过页面自身删除操作清理。
- 修正发帖分类的可访问名称。讨论视图切换后聚焦标题；点赞按钮保持稳定组件身份，避免状态更新后丢失焦点。
- 手机单列卡片和帖子详情均无横向溢出；分类栏可原生横向滑动。
- 切换稻香/晴天后讨论标题跟随歌曲，原“周杰伦”搜索 URL 不变；Escape 关闭后可重新打开弹窗。
- 浏览器控制台最终 error 列表为空。最终构建通过，现有 Sites worker 测试 4/4 通过。
- 边界：这次是浏览器本机可操作演示，未接入真实社区服务、登录或多人共享数据。示例人数与历史互动数均有演示标识。

---

# 乐谱页面视觉核对

final result: passed

## 最新修正：恢复原主页，乐谱页跟随主页

用户澄清风格来源应为原主页。已撤回 `0f71a1c` 对主页、搜索面板顺序及默认搜索值的修改，保持原主页完整 480px 大横幅与五个学习入口。乐谱页只复用主页的介绍区，五个入口仍留在主页。

- Source visual truth：此前原主页截图 `home-banner-before.png`，以及恢复后的主页 `restored-original-home.png`；文件位于 `/Users/rimon/.codex/visualizations/2026/11/03/01a19f38-75ed-7de0-9e51-28a653d94f88/`。
- 同目录 `restored-home-style-library.png` 为乐谱页完整视图，`home-source-comparison.png` 同时显示两页的介绍区域。浏览器 ICC 转为 sRGB 后截取相同区域，不缩放。
- Desktop：CSS viewport 1379 × 1255、DPR 1、11px 滚动条；两页介绍区均 x0/y54、1368 × 361px。标题、搜索面板、旋转学习提示卡及原始插画画布的 bounding rect 全部相同。原主页的完整 hero 仍为 1368 × 480px。
- Mobile：CSS viewport 390 × 844；两页介绍区均 x0/y69、379 × 427px；搜索面板均 x23/y237.9375、333 × 191px。两页均无横向溢出；原主页五个学习入口仍在。
- 修正内容：撤回较矮的乐谱风格及单独移动的学习入口；恢复原大标题、三条说明、搜索面板标题、热门词在输入框上方的顺序、链接帮助文字与四条学习提示。乐谱页使用相同主页 CSS 和素材，插画画布保持原高并独立裁切，避免缩放人物。
- 视觉五项：字体与字号、介绍区尺寸与间距、棕色/珊瑚与纸面配色、原插画画布、全部固定文案均沿用原主页。搜索词随当前结果变化，属于预期内容差异。
- 交互：乐谱页搜索“晴天”得到 1 条；搜索建议展开前后全部介绍元素位置不变；手机导航可返回主页。Vite 构建通过，现有打包测试 4/4 通过。
- 网络盘重新连接后，修改已保存回原仓库，并同步本机运行副本。仅提交本次修改，原先未提交的结果页、导航代码与生成素材继续保留。

## 历史核对：此前按乐谱页统一的方案（已被上述修正替代）

用户标注首页顶部，要求与乐谱页宽度、高度及内容一致。现在由 `SearchBanner` 在两页共用同一实例；原首页高横幅替换为乐谱页插画、标题、搜索框、热门词和提示卡，五个学习入口独立放在下方。保留搜索建议、本地历史、键盘选择和音乐链接处理。

- Source visual truth：现有乐谱页横幅与本次浏览器标注；原首页截图 `/Users/rimon/.codex/visualizations/2026/11/03/01a19f38-75ed-7de0-9e51-28a653d94f88/home-banner-before.png`。
- 实现：`http://127.0.0.1:4174/static/classroom/#`，已刷新用户当前标签。
- 同尺寸完整页面：同目录 `home-banner-home.png`、`home-banner-library.png`；局部合并对照：`home-banner-comparison.png`，同时包含首页与乐谱页顶部的 1368 × 244px 横幅。
- 桌面 CSS viewport 1379 × 1255、DPR 1，11px 原生滚动条，实际内容宽 1368px；不缩放，仅截取同样的横幅区域，ICC 统一为 sRGB。
- 实测两页横幅都是 x0/y50、1368 × 244；内部内容、标题行、搜索面板、输入框、热门词及旋转提示卡的 bounding rect 全部一致。记录见同目录 `home-banner-metrics.json`。
- 手机 CSS viewport 390 × 844、内容宽 379px：两页横幅都是 379 × 213；搜索面板都是 x14/y130、351 × 122。没有横向溢出。手机截图 `home-banner-mobile-home.png`，五个学习入口仍在。
- 迭代：最初首页顶部 361px、完整旧 hero 480px，与 244px 乐谱横幅不一致（P1）。替换共享组件后修复；首次共享输入框继承旧表单 39px 高度和小字号（P2），已改成与乐谱形式一致的桌面 40px/17px 字号；重新捕获并比较后无待处理 P0/P1/P2。
- 五项视觉检查：字体/字号使用共享标题与输入样式；布局间距由同一组件保证；颜色与纸面边框一致；两页引用相同独立插画素材；标题、提示卡和六个热门词完全一致，输入值跟随当前搜索条件。
- 交互：搜索“晴天”得到 1 条结果；搜索建议展开后横幅仍为 244px，不移动插画；Esc 关闭，历史记录可见；手机导航可往返首页与乐谱页。
- 最终生产页没有 console error/warn；Vite 构建通过，现有打包测试 4/4 通过。仅暂存本次 App 修改块，先前未提交的导航/结果页代码及素材保留。

## 上次乐谱页原图核对（保留记录）

日期：2026-11-03。范围：参考图中的乐谱搜索页面及独立图片交付。

## 对照与归一化

- Source visual truth：`design-reference/score-library.png`，1448 × 1086 px。
- 构建版：`http://127.0.0.1:4174/static/classroom/#scores?q=周杰伦`。
- Implementation screenshot：`/Users/rimon/.codex/visualizations/2026/11/03/01a19f38-75ed-7de0-9e51-28a653d94f88/score-library/final-desktop.png`。
- 参考状态：周杰伦、全部谱型、全部筛选、综合推荐、论坛热门。构建版同状态；数据为实际 10 首演示曲目，未伪造参考图的 128 条。
- CSS viewport：1459 × 1086，devicePixelRatio 1。浏览器原生滚动条占 11px，因此页面内容宽度为 1448px。全页截图 1448 × 1347，取顶部 1086px；不缩放内容。将浏览器截图自带的 Skia ICC profile 转为 sRGB 后与参考图合成，避免错误的颜色偏差。
- Full-view comparison evidence：同目录 `comparison-final.png`，左右分别是源图、实现。
- Focused comparison evidence：同目录 `comparison-hero.png`、`comparison-card.png`、`comparison-forum.png`，检查横幅、密集卡片文字/按钮、论坛缩略图/讨论列表。
- 响应式证据：同目录 `mobile.png`，390px 宽完整页面；另检查 1024px 平板宽度。

## 发现与迭代记录

1. 初始对照 `comparison-before.png`：P1 横幅女孩与多张封面构图偏离；P2 筛选栏约 753px 高，参考约 694px；P2 论坛约 258px 高，参考约 228px。保留先前未提交的组件及生成图，新增独立素材与限定于乐谱页的样式覆盖。
2. `iteration-1.png`：接入源图独立封面与论坛缩略图；消除重复的热门、播放与时长叠层。剩余 P2：继承的按钮最小高度、讨论行高度和分组间距导致侧栏与论坛过高；横幅左图被底图覆盖。
3. `iteration-2.png`：调整图层、分组高度、卡片间距、论坛行高。侧栏实际 250 × 694px；乐谱面板位于 x295/y291，1113 × 544px；论坛 x302/y843，1106 × 228px。主要区域比例及首屏密度已对齐。
4. 构建后重新打开页面，按上述滚动条宽度与 ICC 规则归一化，再做全页及局部对照。未发现待处理的 P0/P1/P2；剩余细微字号、图标与装饰差异列为 P3。

## 必检视觉面

- Fonts/typography：标题使用本地马善政字体，界面采用已有苹方/宋体体系；卡片标题、作者、难度、操作行的层级及换行均已检查。源图是栅格设计，小字字形、字重和抗锯齿并非逐像素一致，属于 P3。
- Spacing/layout rhythm：50px 页头、244px 横幅、250px 侧栏、桌面五列两行、论坛及讨论区均保留；手机两列，筛选分为两列。390px 和 1024px 均无横向页面溢出，分类横向滚动。
- Colors/tokens：奶油纸面、珊瑚主按钮、棕色正文、橙/紫乐器标识、金色星级一致；已检查选中、收藏、焦点状态。截图色彩在比较前转为 sRGB。
- Image quality/fidelity：19 张源图素材独立无重采样提取；1 张内置 Image Gen 无标签备选独立保留。封面、论坛、女孩、钢琴使用实际位图，图标使用既有 Phosphor 图标库。中央墙面仍沿用先前生成横幅，其笔触与小植物位置有 P3 细微差异。素材没有被整页截图替代，输入、筛选与操作仍可用。
- Copy/content：歌曲、歌手、社区主题与主要筛选保留；计数由真实演示数据决定。现有“乐普”导航名称及页尾保留，未覆盖先前页面工作。插画谱和练习音阶的演示性质由既有弹窗说明。

## 交互与构建验证

- 搜索“晴天”得到 1 条；不存在的歌曲得到 0 条及空结果提示，恢复推荐回到 10 条。
- 吉他筛选得到 4 条；清空筛选、当前条件移除、难度升序及排序同步可用。
- 收藏切换 aria-pressed；曲谱预览、进入练习、音阶试听/暂停均可用。
- 论坛钢琴分类显示 1 张相关作品，热门恢复 3 张；讨论和作品入口可用。
- 首页与乐谱页往返、手机完整页面和滚动分类检查通过；无丢失图片。
- 最终构建版新浏览器标签的 error/warn 日志均为空。开发复制期间的临时 HMR 重载失败通过完整刷新及新构建页验证已消除。
- Vite production build 通过；`prepare-sites-build.mjs` 通过；既有 Sites 打包测试 4/4 通过。未部署、未推送。

## 实施清单

- [x] 逐张拆图、记录坐标、保存生成备选与完整提示词。
- [x] 接入页面并修复 P1/P2 布局差异。
- [x] 同尺寸完整与局部对照、手机和平板检查。
- [x] 核对真实界面交互、构建和控制台。
- [x] 仅提交本次新增素材、样式、入口导入与文档；原先未提交的页面实现保持原状。

## 后续细化（P3）

源图小字和浏览器字体渲染、谱型图标及标题旁装饰可进一步贴近；中央墙面插画不是逐像素相同。本次完成可交互复刻与素材拆分，不将其表述为像素完全一致。


## 2026-11-04 Arrangement practice workspace

Source: the user's inline 稻香 practice reference (934 × 552), plus two follow-up annotated screenshots explicitly requiring the practice screen inside the existing song dialog and its song metadata merged into the original top 52px toolbar. The selected card is the 晴天 piano beginner arrangement.

Final browser evidence:
- `/Users/rimon/.codex/visualizations/2026/11/04/01a1a644-4fdf-7630-8bde-b5afa14e8b9e/practice-desktop.png` (1830 × 1255)
- `/Users/rimon/.codex/visualizations/2026/11/04/01a1a644-4fdf-7630-8bde-b5afa14e8b9e/practice-mobile.png` (390 × 844)

State: 晴天, piano beginner, first page, day theme, staff notation. Screenshots use one physical pixel per CSS pixel. The browser reserves an 11px native scrollbar gutter. Full-view comparison uses the original inline reference and the two subsequent layout annotations. Focused header inspection confirms one 52px row, with return action, title, performer, version facts, practice count, favorite and right-side close.

Comparison history:
1. Initial full-viewport implementation was rejected. Replaced it with content inside `.detail-overlay-frame`, retaining the search background and the existing dialog boundaries.
2. Duplicate metadata row was rejected. Moved the practice heading into the original top row; removed its duplicate caption and the extra row below.
3. The relocated heading initially clipped under the original toolbar. Corrected overflow and stacking and verified every header control is visible, with the close button at the right.
4. Five complete systems display on desktop; the reading toolbar and score scroll within their own regions on mobile.

Browser interactions: card → practice content; staff/number/chord views; next/previous page; play with elapsed-time advancement; pause/stop; font/zoom; night/day; metronome; automatic following; speed; browser-local favorite; Return to Score List and Escape. Returning preserves the existing search URL. Final console inspection found no warnings/errors. Build and four Sites worker/packaging checks pass. Printing, fullscreen and clipboard browser dialogs were not exercised.

Intentional content differences: song and version metadata correspond to the selected 晴天 arrangement. Notes, captions and synthesized audio are original sight-reading demonstrations, labeled “谱面演示 · 非原曲”; a full song score and recording evaluation are not connected. The reference paper texture and detailed engraving differ slightly; this is not a claim of pixel-identical score content.

final result: passed
