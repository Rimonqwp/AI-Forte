# 登录页独立素材

2026-11-09，依据用户提供的登录页参考图逐张调用内置 ImageGen 生成，保留生成图片原始像素和透明度；并非从整页截图裁切出假 UI。字体、文案、图标、表单和导航由 React/CSS 渲染。

| 文件 | 实际尺寸 | 格式 | 原始提示词 |
| --- | --- | --- | --- |
| [classroom-background.png](classroom-background.png) | 1491 × 1055 | RGB PNG | [提示词](classroom-background.prompt.md) |
| [girl-ukulele-cat.png](girl-ukulele-cat.png) | 1176 × 1337 | 透明 PNG | [提示词](girl-ukulele-cat.prompt.md) |
| [spring-island.png](spring-island.png) | 1942 × 809 | 透明 PNG | [提示词](spring-island.prompt.md) |
| [handdrawn-underline.png](handdrawn-underline.png) | 2172 × 724 | 透明 PNG | [提示词](handdrawn-underline.prompt.md) |
| [laurel.png](laurel.png) | 768 × 2048 | 透明 PNG | [提示词](laurel.prompt.md) |

- `classroom-background.png`：窗景、花枝、钢琴、地毯与书本构成连续背景。
- `girl-ukulele-cat.png`：人物、尤克里里、睡猫与沙发构成一个透明前景。
- `spring-island.png`：小屋与樱花草地装饰。
- `handdrawn-underline.png`：两个标题复用的手绘下划线。
- `laurel.png`：页脚月桂枝，右侧镜像复用。
- `google.svg`：[FirebaseUI 官方 Google 图标](https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg)，直接复用官方资源。
- 品牌沿用网站现有 `../brand/puyadao-sprout-icon.png`；标准界面图标来自已安装的 Phosphor 图标库，手写标题复用 Ma Shan Zheng 字体。

生成插画在花枝、人物衣褶和笔触上保留细微差异，不是原图像素级切片。
