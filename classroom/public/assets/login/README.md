# 登录页独立素材

当前页面依据用户最新的 `design-reference/login-mirrored-reference.png`（1448 × 1086）实现：女孩、睡猫与钢琴在左，登录卡片在右。卡片内文字、品牌和表单维持正常阅读方向。原先的大标题、功能介绍卡片和底部统计已移除。

## 当前使用

以下图片于 2026-11-09 逐张调用内置 ImageGen 生成，输出复制到本目录；未使用 CLI，也未将整页截图当作界面。

| 文件 | 实际尺寸 | 格式 | 完整提示词 |
| --- | --- | --- | --- |
| [mirrored-room-v3.png](mirrored-room-v3.png) | 1491 × 1055 | RGB PNG | [提示词](mirrored-room-v3.prompt.md) |
| [cat-peek-v3.png](cat-peek-v3.png) | 1683 × 935 | RGBA PNG | [提示词](cat-peek-v3.prompt.md) |
| [card-paper-v3.png](card-paper-v3.png) | 999 × 1575 | RGB PNG | [提示词](card-paper-v3.prompt.md) |
| [laurel-v2.png](laurel-v2.png) | 845 × 1862 | RGBA PNG | [提示词](laurel-v2.prompt.md) |
| [cherry-foreground.png](cherry-foreground.png) | 1448 × 1086 | RGBA PNG | [提示词](cherry-foreground.prompt.md) |

- `mirrored-room-v3.png` 是连续的音乐教室插画背景，包含女孩、尤克里里、睡猫、钢琴、地毯和书本；不包含导航或登录控件。
- `cat-peek-v3.png` 是卡片上的探头小猫与嫩芽透明装饰。
- `card-paper-v3.png` 只含纸张纹理、淡色音符线条和底部纸浪，不含文字或控件。
- `cherry-foreground.png` 是后续按浏览器批注单独调用内置 ImageGen 生成的透明樱花枝，在镜像构图的卡片上方跨过边框；随屏幕收小，不遮挡品牌文字，也不拦截点击。
- `laurel-v2.png` 是先前单独生成的清晰月桂枝，继续在底部说明两侧镜像复用。
- `google.svg` 为 [FirebaseUI 官方 Google 图标](https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg)。
- 品牌复用 `../brand/puyadao-sprout-icon.png`；界面图标使用 Phosphor，手写欢迎标题复用 Ma Shan Zheng。

通过 `?login=1` 可直接打开页面。Google 与邮箱登录继续使用现有 Firebase 逻辑；记住我开关初始开启，与新参考图一致，关闭后使用会话持久化。密码显隐、密码找回和页脚服务说明可操作。打开/关闭页面不会退出已有账号。

插画为依据参考生成的独立素材，笔触和局部细节与原图存在差异。

## 旧版素材存档

以下首版素材保留原文件，当前页面已不再使用其构图：

| 文件 | 实际尺寸 | 原始提示词 |
| --- | --- | --- |
| [classroom-background.png](classroom-background.png) | 1491 × 1055 | [提示词](classroom-background.prompt.md) |
| [girl-ukulele-cat.png](girl-ukulele-cat.png) | 1176 × 1337 | [提示词](girl-ukulele-cat.prompt.md) |
| [spring-island.png](spring-island.png) | 1942 × 809 | [提示词](spring-island.prompt.md) |
| [handdrawn-underline.png](handdrawn-underline.png) | 2172 × 724 | [提示词](handdrawn-underline.prompt.md) |
| [laurel.png](laurel.png) | 768 × 2048 | [提示词](laurel.prompt.md) |
