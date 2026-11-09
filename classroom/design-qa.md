# 登录卡片樱花前景与品牌居中核对（2026-11-09）

final result: passed

- 来源：用户本次浏览器批注1要求让背景樱花伸入卡片，批注2要求卡片顶部品牌整体水平居中。沿当前镜像构图和标记处背景外缘叠加花枝；原参考仍为 `design-reference/login-mirrored-reference.png`。
- 预览：`http://127.0.0.1:4173/static/classroom/?login=1`，简体中文、浅色、空表单。修改前证据 `design-reference/login-qa/cherry-brand-before.png`；最终桌面 `cherry-brand-desktop.png`，两者 CSS viewport 均1704 × 1310、DPR 1，实际截图均1694 × 1302。
- 对照证据：将前后截图等比例归一化至1704 × 1310后生成 `cherry-brand-comparison.jpg`；卡片上方局部并排为 `cherry-brand-focused.jpg`，两张均已打开对照。最终局部 `cherry-brand-detail.png` 保留了花枝、卡片边框、品牌和标题上下文。
- 字体：维持品牌原有字号、字重、行距；仅移除各断点左侧补偿 margin。品牌两个子项的联合边界中心与卡片中心在桌面、768px平板和360px手机均相差0px。
- 间距：卡片位置、尺寸、表单行距及标题位置保留。新增花枝为绝对定位，跨卡片上方边框；手机和平板同步缩小，未引入横向溢出。
- 配色：原纸张、暖棕品牌文字和按钮配色保持一致；前景花枝沿用教室原图的粉白花瓣、暖棕树枝和橄榄绿叶片。
- 图像：`public/assets/login/cherry-foreground.png` 单独调用内置 ImageGen 生成，1448 × 1086 RGBA，alpha范围0–255，原始提示词同目录保存。装饰图片不包含文字或控件，pointer-events:none，位于卡片之上、关闭按钮之下。
- 文案：未改动页面文案或认证逻辑；装饰图 alt 为空并 aria-hidden，不增加屏幕阅读器噪音。
- 响应式证据：`cherry-brand-mobile.png` 为360 × 800 CSS视口，`cherry-brand-tablet.png` 为768 × 1024 CSS视口。已检查花枝不遮品牌/标题，品牌居中，输入控件可见。桌面和平板通过 elementFromPoint 确认关闭按钮命中；浏览器 error 日志为空。
- 验证：`npm run build` 通过；保留既有 Firebase 混合导入和bundle大小提示。此次未修改认证状态、用户资料、服务端逻辑，也未为局部可逆样式增加重复实现测试。
- 发现：最终前后对照未发现需要修正的P0/P1/P2；花枝为参考图风格的独立重绘素材，局部笔触差异按P3记录。预览已恢复默认桌面尺寸并保持打开。

---

# 镜像布局登录页核对（2026-11-09）

final result: passed

## 来源与对照证据

- 用户最新参考：`design-reference/login-mirrored-reference.png`，1448 × 1086 px。用户要求将原图左侧登录 UI 移到右侧，场景镜像，文字维持正常阅读；此参考取代先前的双栏功能介绍方案。
- `design-reference/login-qa/mirrored-target.png` 是仅供 QA 的布局推导图：背景左右翻转，导航保留正常方向，再把原图 x55/y145 的 555 × 875 登录卡片平移至 x838/y145；该图片不作为网站素材。
- 实现：`http://127.0.0.1:4173/static/classroom/?login=1`，简体中文、浅色、空表单、记住我开启。浏览器会话真实存在，但登录页以独立登录入口显示，不退出已有账号。
- 桌面 CSS viewport 为 1448 × 1086、devicePixelRatio 为 1。浏览器截图 `mirrored-desktop-final.png` 实际输出 1438 × 1079；按整幅图比例归一化为 1448 × 1086 的 `mirrored-desktop-normalized.png` 后比较。未以截图返回尺寸当作 CSS 尺寸。
- 完整并排对照：`mirrored-comparison-final.jpg`，左侧布局推导图、右侧实际实现，均 1448 × 1086；已打开并检查。
- 卡片局部并排：`mirrored-panel-comparison.jpg`，左为原图卡片 x55/y145、右为实现 x838/y145，均 555 × 875；已打开并检查字体、输入框、开关和按钮。
- 证据均位于 `design-reference/login-qa/`。手机最终截图 `mirrored-mobile-final.png` 和英文截图 `mirrored-mobile-english.png` 对应 CSS 360 × 800，返回 350 × 778；平板 `mirrored-tablet-final.png` 对应 CSS 768 × 1024，返回 758 × 1011。响应式检查按 DOM 尺寸判断溢出，未据缩小后的位图误报尺寸。

## 五项视觉核对

- 字体：欢迎标题使用现有 Ma Shan Zheng，桌面 52px/65px，手机 43px/57px；表单使用既有中文 UI 字体。邮箱分隔文字用暖色宋体。补齐欢迎、Google 按钮、邮箱登录、提交、说明及插画替代文字的英文/繁体翻译。英文手机检查后已恢复简体中文。
- 布局与间距：桌面卡片实际 x837.98/y145、宽555/高875，与要求的右侧布局相符。Google 按钮 x883.98/y449，输入框分别 y597/y677、高56；提交按钮 y823、高70。原图对应 Google y447、输入 y597/y676、提交 y821，主要行距和顺序已对齐。删去旧版主标题、功能介绍和底部统计。手机居中显示完整表单，平板保留左插画/右卡片。
- 配色与表面：保留奶油纸张、珊瑚按钮、暖棕文字和细桃色描边；卡片使用独立生成纸张纹理及底部纸浪，62px 圆角由 CSS 实现；实际控件为 React/HTML。
- 素材：连续音乐教室背景、探头小猫、卡片纸张分别单独调用内置 ImageGen 生成，保存原始像素及透明度。原有月桂的清晰版本继续复用。没有用截图模拟表单；没有将 UI 文字镜像。花枝、衣褶、猫与笔触为生成素材的预期差异。品牌按仓库约定保留现有嫩芽图形，属于已知产品约束。
- 内容：文案与新参考一致，包括“欢迎回来！”、“继续你的音乐学习之旅”、“继续使用 Google”、“邮箱登录”、“记住我”、“忘记密码？”与“开始登录”。原来的服务条款说明保留在页脚说明入口；没有增加旧版统计或功能列表。

## 发现及修正历史

1. 初轮新版已完成正确的右侧几何布局，证据为 `mirrored-desktop-first.png`。窄屏英文核对发现探头小猫顶部与副标题末尾接近，按 P2 处理。
2. 将小猫装饰桌面 top 调为203px、手机调为183px，保留正文及 Google 按钮的位置。最终桌面、手机中文及手机英文截图均重新捕获，小猫位于副标题下方，不遮挡文字。
3. 最终并排对照未发现尚需修正的 P0/P1/P2。P3：部分音符/眼睛图标采用 Phosphor 的最接近样式；少量装饰小笔触与生成插画局部存在差异。导航和卡片采用项目原有品牌，而非参考图中的通用音符标识。以上差异未伪称为逐像素相同。

## 交互与验证

- 空表单提交触发原生必填校验，并聚焦邮箱；未发送真实账号或测试账号登录请求。
- 密码显示/隐藏切换输入类型；记住我为有标签的原生 switch，能够开关，继续将选择传给真实登录持久化逻辑。
- 忘记密码打开原有找回弹窗；Escape 仅关闭上层弹窗并恢复登录页面。未发送密码重置邮件；`mirrored-reset.png` 保存了打开状态。
- 页脚说明可打开服务条款并关闭。主登录窗口关闭后清除 login 查询参数、解除 root inert，真实账号头像仍存在；重新打开不会退出账号。
- 360px 手机及768px 平板无表单横向溢出、无缺失图片；英文手机布局可用，语言已恢复原值。未将成功认证或重置邮件投递声明为已验证。
- 浏览器 error 日志为空。`npm run build` 通过，`npm run test:sites` 4/4 通过；保留已有 Firebase 混合导入及 bundle 大小提示。`git diff --check` 作为提交前检查。

## 实施清单

- [x] 场景在左、登录 UI 在右，所有文字正常阅读。
- [x] 三张新素材逐张生成，图片和完整提示词保存在项目。
- [x] 桌面、手机、平板与英文手机核对，修正小猫遮字风险。
- [x] 保留真实认证接口、密码找回、开关、键盘关闭及账号会话。
- [x] 保持本地预览打开，不推送或部署。

---

# 设置侧栏账号卡片核对（2026-11-09）

final result: passed

## 视觉来源与证据

- Source visual truth：用户本次 Browser Comment 1 第二张附图（224 × 76 px）。原图在当前对话附件中，没有可用的本地源文件路径；未重绘参考图。第一张截图定位改动范围为设置侧栏顶部身份区域。
- 实现：`http://127.0.0.1:4173/static/classroom/#` → 设定 → 账号资料，当前账号登录状态、简体中文、浅色模式。
- 证据目录：`C:/Users/Rimon12/.codex/visualizations/2026/11/09/01a1bec5-c656-7b11-8df4-ff4d9c42e3ef/`。
- 桌面完整证据：`settings-identity-desktop.png`，CSS 视口 1704 × 1310、DPR 1，浏览器工具实际输出 1639 × 1260 px。按视口比例归一化为 `settings-identity-desktop-normalized.png`（1704 × 1310 px）后核对；上下文保留侧栏和账号资料内容。
- 局部证据：`settings-identity-card.png`，223 × 88 px，来自上述归一化截图 x134/y198 的裁剪，卡片实际 211 × 76 CSS px；包含 6px 四周余量。将此局部和用户附件在当前多模态对话中对照，未将它们描述为已生成并排拼图。忽略由现有 236px 侧栏产生的 13px 宽度差。
- 手机证据：`settings-identity-mobile.png`，360 × 900 CSS/图像 px，DPR 1。卡片 266 × 64 CSS px，右侧仍可访问关闭按钮；页面 scrollWidth 为 360px。

## 五项视觉核对与发现

- 字体：名称使用现有中文 UI 字体、16px/700；第二行 11px，等级和身份说明同线，长名称保留省略与完整 title。手机名称 15px。
- 间距：圆形头像、双行文字、右箭头采用固定/弹性/固定三列，头像 52px、卡片 76px 高；手机头像 44px，卡片收窄以让出关闭按钮。
- 配色：按用户随后明确要求去掉卡片填色，普通和悬停状态均为透明背景，取消常态边框与阴影；保留浅色头像环、深棕名称、浅紫等级与柔棕身份说明。深色模式同样透明。桌面和手机读取到 backgroundColor 为 rgba(0, 0, 0, 0)，boxShadow 为 none。
- 图像：使用当前账号真实头像及现有头像加载失败回退，没有将示例插画或示例昵称写入真实用户资料。此差异已在实现前向用户说明。
- 文案：保留真实昵称；按用户明确选择显示 `Lv.6` 界面示例和“音乐学习者”。等级提示和辅助名称说明示例性质，不写入账号等级数据；补齐繁体与英文翻译。
- 第一轮完成参考卡片后，用户追加要求去掉其底色；第二轮移除填色、常态边框和阴影，并重新捕获桌面、手机最终截图。最终无需要修改的 P0/P1/P2 差异。参考图的插画头像与“谱芽小岛主”属于示例身份，替换为真实账号信息是预期差异。P3：卡片宽度按现有侧栏适配，未扩大整栏。

## 交互与验证

- 从“我的收藏”通过身份卡片 Enter 返回“账号资料”；鼠标点击也通过既有 selectSection / leaveProfile 导航。
- 完整卡片是原生按钮，具备账号资料辅助名称、内容关联、键盘焦点轮廓。
- 手机关闭按钮与身份卡片不重叠，设置导航仍可横向滚动。
- 浏览器错误日志检查：空数组，无当前预览捕获的 error。
- `npm run build` 通过；保留项目既有 Firebase 混合导入及 bundle 大小提示。
- 未修改真实账号姓名、头像或认证信息；未为可逆样式调整新增实现镜像测试。

## 实施清单

- [x] 按附图实现头像、双行信息、等级和箭头，并按后续要求改为透明底色。
- [x] 验证点击及键盘导航，检查桌面和手机。
- [x] 保留原设置壳与账号数据，记录示例等级约定。

---

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


### Practice header annotation follow-up

Removed difficulty text, stars and the top favorite action. Moved performer into the right metadata group immediately before practice count; kept the bottom favorite action. Verified the rendered header text and DOM order in the existing 1830 × 1255 in-app preview. Source: three current user annotations. Screenshot: `/Users/rimon/.codex/visualizations/2026/11/04/01a1a644-4fdf-7630-8bde-b5afa14e8b9e/practice-header-simplified.png`. Production build passes.

final result: passed


### Arrangement author credit

Added “编配：{selected version author}” beside song/version facts in the existing top toolbar. Kept original-performer metadata at the right. Verified current piano version renders 编配：小谱老师, visible on desktop and narrow screens. Source: current user annotation; screenshot: `/Users/rimon/.codex/visualizations/2026/11/04/01a1a644-4fdf-7630-8bde-b5afa14e8b9e/practice-arranger-credit.png`. Production build passes.

final result: passed


### Continuous score and themed control menus

Source: the nine current browser annotations. Changes: removed font sizing and mood text; replaced three notation tabs and the native practice-mode select with single-trigger themed menus; moved singer immediately before arranger, removing the former singer badge; removed pagination and rendered all ten systems in one scroll area; replaced the hidden metronome input with an explicit themed BPM panel.

Evidence:
- `/Users/rimon/.codex/visualizations/2026/11/04/01a1a644-4fdf-7630-8bde-b5afa14e8b9e/practice-notation-menu.png`
- `/Users/rimon/.codex/visualizations/2026/11/04/01a1a644-4fdf-7630-8bde-b5afa14e8b9e/practice-metronome-panel.png`
- `/Users/rimon/.codex/visualizations/2026/11/04/01a1a644-4fdf-7630-8bde-b5afa14e8b9e/practice-custom-menu-mobile.png`

Visual comparison: warm paper, coral accents, thin warm outlines, rounded corners and selected checkmarks follow the existing interface. Popovers are anchored below notation and above mode/metronome, rendered outside clipping containers, and clamped to viewport edges. Night menus use the corresponding dark paper palette; fixed the inherited light header so night credits remain readable. Desktop inspected at 1830 × 1255 and mobile at 390 × 844, one physical pixel per CSS pixel. Mobile menus fit entirely inside the viewport and the toolbar wraps without covering exit controls.

Browser verification: notation menu selection, keyboard opening/Home/Enter, mode selection, Escape dismissing only the menu, mutual exclusion/outside dismissal, BPM slider Home/End (40/180), separate metronome start/stop, and real wheel adjustment (40 → 41). Continuous score has 10 engraved systems and no page/font controls. Manual wheel scroll reaches later systems (scrollTop 702); automatic following during later playback also reaches scrollTop 702 with total content height 1583 and viewport height 881. Stop returns the score to the top. Removed mood text and duplicate singer badge confirmed from DOM. Final browser warnings/errors: none. Production build passes.

final result: passed

## 账号中心、个人乐谱与浏览记录（2026-11-05）

- Source visual truth path: 本聊天 Comment 1 附加的 Discord 设置截图（1282 × 794 px）；用户只要求采用左侧导航、右侧内容的结构，保留谱芽岛已有主题，并随后增加收藏、乐谱、浏览记录。
- Implementation evidence directory: `/Users/rimon/.codex/visualizations/2026/11/05/01a1ab93-87c4-7753-ac6b-918ad387f288/`。
- Full-view comparison: `settings-reference-size.png` 为与附件相同的 1282 × 794 CSS viewport，截图同尺寸、DPR 1。对照聊天附件检查：236px 左侧身份/分组导航，右侧独立内容栏，顶部常驻关闭按钮、横向资料行和分割线。暖纸底、较圆窗口、已有背景与非 Discord 功能内容是本产品的有意适配。
- Desktop evidence: `settings-desktop.png`，1845 × 1242 CSS px，截图同尺寸、DPR 1；设置窗口 1160 × 800，内部可滚动，最近浏览为实际打开的歌曲。
- Mobile evidence: `settings-mobile.png`，360 × 844 CSS px，截图同尺寸、DPR 1。导航横向滚动，内容和窗口 clientWidth/scrollWidth 均为 327px，关闭按钮完整可见。
- Focused comparison: 同尺寸账户页截图中的侧栏、资料区均可清楚阅读，无需另裁缩略图；检查 42px 导航项、资料行标签/值的对齐与邮件遮挡按钮。手机截图单独检查导航滑动、搜索框、列表操作和长说明换行。
- Fonts/typography: 保留 PingFang SC/Microsoft YaHei，25px 内容标题，14px 导航/资料值，11–13px 辅助说明。手机号/密码等未接入字段未从参考图移植成虚假设置。
- Spacing/layout: 侧栏 236px，内容最大 780px，桌面内容 padding 48px，资料分隔与操作区域清晰。手机顶部导航、内容独立滚动，恢复桌面视口后布局正常。
- Colors/tokens: 暖纸底、棕色文字、珊瑚色动作、浅暖边线、叶绿色状态；复用现有产品配色，与 Discord 的灰白配色有意不同。
- Image quality: 复用实际账号头像/现有头像资产和独立乐谱缩略图，图标使用现有 Phosphor 库；无新增生成图或截图拼接。
- Copy/content: 账号资料、登录与安全、收藏、编配收藏、最近练习、最近浏览和语言均有独立内容。歌曲/编配收藏来自现有账号状态；浏览/练习记录只记录实际打开行为，并明确标注本浏览器保存、按 UID 隔离及最多 50 条。保留原谱例演示说明。
- Iteration P1: 全局 mobile `nav` 规则把新侧栏导航绝对定位到内容上方；显式重置设置导航定位、边框、阴影和换行，最终手机截图中导航与内容各自占正常布局空间。
- Iteration P2: 加入六个导航项后，移动网格的隐式最小宽度撑大内容并裁切；改为 `minmax(0,1fr)`，侧栏/导航允许收缩，实测无横向内容溢出。早期 `/tmp/fyp-settings-layout-mobile.png` 为问题证据，最终 `settings-mobile.png` 为修正后证据。
- Iteration P1: 账号 Provider 与消费账号状态的设置页形成循环依赖，延迟加载练习页出现空 context。将 Context/Hook 独立为 `account-context.js`，重新加载并验证搜索→版本选择→练习、个人中心→准确编配均正常。浏览器日志保留 12:18:04 UTC 修正前错误；修正后重放流程没有新增错误。
- Browser interactions: 六分区切换；搜索匹配/空结果；歌曲收藏加入和从个人中心取消（测试结束恢复原收藏）；具体编配收藏加入、列表显示和取消（恢复原收藏）；真实浏览/练习记录与去重；从最近练习返回原编配；语言切换 English、刷新保留并恢复简中；Escape 关闭后焦点返回头像，原搜索 URL 保留。未清除用户既有历史。
- Validation: 已同步当前修改至本地预览副本；副本生产构建及 27 项现有/新增 Node 测试通过，其中 4 项新增测试覆盖历史顺序、去重、账号/类型隔离、50 条上限和存储失败。
- Implementation checklist: 无待处理 P0/P1/P2。已恢复桌面视口，保留最近浏览页供查看。
- Follow-up polish: 浏览历史暂为本浏览器数据；没有把它描述成跨设备云端同步。未增加上传乐谱功能。

final result: passed

## 账号资料装饰：已选方案 3（2026-11-05）

- Source visual truth path: `/Users/rimon/.codex/generated_images/01a1ab93-87c4-7753-ac6b-918ad387f288/exec-f9a32181-d6af-4337-906f-914ea81c071a.png`，第三张实际展示的方案，用户回复“3”选择。源图 1529 × 1029 px。
- Implementation screenshots: `/Users/rimon/.codex/visualizations/2026/11/05/01a1ab93-87c4-7753-ac6b-918ad387f288/settings-option3-desktop.png`（1845 × 1242）；同目录 `settings-option3-reference-size.png`（1529 × 1029，与源图同尺寸）；`settings-option3-mobile.png`（360 × 844）。均为实际浏览器渲染，DPR 1，截图像素与 CSS 视口一致，未作密度缩放。手机使用 CDP 原始截图，避免通用截图的缩略显示。
- State: 已登录、账号资料分区、邮箱遮挡，其他导航保留原账户数据。
- Full-view comparison: 已在同次图像输入中查看源图和最终桌面实现，并查看参考尺寸实现。采用相同的无底色身份行、右上乐谱生芽岛屿、资料图标、底部五线谱和细分隔线。保留用户上一步指定的 1440 × 960 最大窗口，因此参考尺寸下的窗口比生成图占用更多屏幕；这是明确的既有尺寸约束，不以外围留白差异判断设计偏离。
- Focused comparison: 同尺寸截图中的标题/身份行、资料标签与值、底部纹样清楚可读；逐项核对，不需要再放大小图。左侧导航保留透明背景与细边框。
- Fonts and typography: 资料标题使用 Songti SC/STSong 衬线字体（34px），主体继续使用现有中文无衬线字体（14–15px），身份名称 23px；手机 28px 标题、13px 资料值。与生成图一致的衬线标题和编辑式层次，保留实际产品字号以维持可读性。
- Spacing and layout rhythm: 取消身份区域填色/外框；桌面 72px 头像、品牌签名和竖分隔线；资料行图标与标签对齐；安全说明保持独立一行。内容最大宽度 1100px，手机单列、装饰缩小，正文不横向溢出。
- Colors and tokens: 保留暖纸底、深棕正文、浅沙色线条、淡鼠尾草绿。装饰仅用低对比色，操作仍使用可读的品牌棕色。
- Image quality and assets: 两张独立透明 PNG，通过 image_gen 以已选方案为参考生成；实际头像与 Phosphor 图标继续使用原来源。无整页截图替代组件、无自绘 SVG 或渐变伪造插画。五线谱仅裁掉源图上下透明留白，不拉伸图案。
- Copy and content: 保留真实账号资料、邮箱遮挡/显示、登录方式、安全入口；新增品牌字样使用已有语言翻译，无新功能、指标或示例账户数据。
- Iteration P2: 第一轮岛屿插画在宽窗口中偏小；放大桌面插画容器到 440 × 250，使视觉占比接近已选方案；最终两张桌面截图记录修正结果。
- Browser interactions: 手机资料无横向溢出；邮箱显示→隐藏正常；安全入口切换到登录与安全；非资料分区不渲染资料装饰；切回账号资料正常。最后浏览器错误日志为空，桌面视口已恢复并保留预览。
- Validation: 同步当前修改的本地预览副本生产构建通过。未为纯样式/素材改动新增镜像测试。
- Implementation checklist: 无待处理 P0/P1/P2。
- Follow-up polish: 生成的独立插画保留原参考题材和线稿风格，细节不是逐像素复制；现有产品品牌图标与生成图略有不同，属于 P3，可后续微调。

final result: passed

## 设置品牌图形 Logo（2026-11-05）

用户选择最新 Logo 三方案中的第一张「芽与音符」，随后明确要求去掉三个中文字。以已选 Logo 为参考生成独立透明图形 `public/assets/brand/puyadao-sprout-icon.png`，账号资料身份行与侧栏底部共用，底部原标语保留。图形内容无中文字标，无拉伸；品牌名称仅保留在可访问的替代文本中。

浏览器检查：1845 × 1242 桌面两处 PNG 均成功加载，分别为 52 × 52 和 46 × 46；360 × 844 手机身份行使用 44 × 44 图形，现有移动布局隐藏侧栏底部，内容无横向溢出。证据位于 `/Users/rimon/.codex/visualizations/2026/11/05/01a1ab93-87c4-7753-ac6b-918ad387f288/settings-icon-only-desktop.png` 和同目录 `settings-icon-only-mobile.png`。桌面视口已恢复，预览副本生产构建通过。

final result: passed


## 最近浏览条目：按用户附图实现（2026-11-06）

- Source visual truth：用户本次标注附件中的横向乐谱条目；对应本聊天首张方案图 `/Users/rimon/.codex/generated_images/01a1b0a7-a5d6-7ef1-b033-9962a96cdb3f/exec-5d4a39fe-f48f-4c31-b612-611300916168.png`（1452 × 1083）。仅采用用户选择的条目区域，保留现有设置布局与搜索工具栏。
- Evidence root：`/Users/rimon/.codex/visualizations/2026/11/06/01a1b0a7-a5d6-7ef1-b033-9962a96cdb3f/recent-row/`。
- Full-view evidence：`desktop-final.png`，1762 × 1314 CSS px / screenshot px，DPR 1；`recent-panel-final.png` 为包含标题、工具栏、条目和说明的局部视图。已对照用户原界面确认此次变更限于最近浏览条目。
- Focused comparison：同次图像输入中打开 `reference-row.png` 与 `desktop-row-final.png`。前者从对应方案原图裁出 876 × 130，再统一到 904 × 134；后者为实际浏览器行的 904 × 132 裁图。生成图与实现的比例差已经归一；没有把截图作为 UI 素材。
- State：现有登录账号、最近浏览、实际歌曲《晴天》，原收藏状态在交互测试后恢复。测试打开歌曲会更新真实浏览时间，因此最终截图为今天 19:53，参考图为今天 19:38，属预期内容变化。
- Fonts/typography：24px 加粗产品字体歌名、18px 歌手和时间、17px 操作文本。第一轮发现 P2：宋体歌名与参考图的粗体不一致，已改为继承产品中文字体并重拍 `desktop-row-final.png`。最终无待处理 P0/P1/P2。
- Spacing/layout rhythm：904 × 132 条目，116 × 80 现有封面，28px 主要横向间距，44px 按钮高度，上下细分隔线，无卡片外框。窄屏将元信息与操作放第二行。
- Colors/tokens：继承暖纸底、棕色主体、浅暖分隔线与珊瑚棕操作色；最近浏览专属 CSS，其他收藏/乐谱条目仍使用原样式；提供夜间主题操作色。
- Image quality/assets：复用当前歌曲真实缩略图与 Phosphor 心形/箭头图标。封面原素材的乐谱细节与生成方案有轻微不同，属保留产品素材的预期差异。
- Copy/content：查看乐谱、今天/昨天提供简中/繁中/英文；旧日期按用户语言显示，跨年显示年份，精确浏览日期保留在 time 标记和提示中。
- Responsive evidence：`mobile-final.png` 为 390 × 844 CSS px / screenshot px，DPR 1，通过当前浏览器 CDP 原始截图保存。320px 内容/条目为 287/247px，390px 为 357/317px，900px 为 647/591px，各元素 scrollWidth 均等于 clientWidth；手机截图已打开检查。
- Browser interactions：收藏→取消收藏恢复初态；无匹配历史搜索→清空输入恢复条目；查看乐谱打开《晴天》版本选择，再回到最近浏览。单条移除保留键盘/悬停/触屏入口，未删除用户现有记录。浏览器 error 日志为空。
- Validation：变更同步到正在运行的本地预览副本；最终生产构建通过，现有 score-history 测试 4/4 通过。构建保留既有 chunk 大小及 Firebase 导入提示。
- Implementation checklist：无待处理 P0/P1/P2；保留当前最近浏览预览，未部署。
- Follow-up polish：不同系统的中文字体渲染可能有细微差别；未为纯样式更改新增实现镜像测试。

final result: passed
