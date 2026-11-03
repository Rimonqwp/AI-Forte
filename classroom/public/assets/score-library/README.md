# 乐谱页面独立素材

原始参考图保存在 `classroom/design-reference/score-library.png`。本目录将图片分别保存，可逐个替换和下载，页面文字、输入框、筛选和卡片操作仍由界面代码实现。

共 20 张 PNG：19 张参考图原尺寸提取素材，以及 1 张 Image Gen 无标签备选。

- `hero-left.png`：左侧女孩、尤克里里、猫咪与窗边插画。
- `hero-piano.png`：右侧钢琴插画。
- `hero-wall.png`：干净墙面纹理，保留备用。
- `avatar.png`：原图头像，保留备用。
- `cover-sunny.png`：晴天。
- `cover-confession.png`：告白气球。
- `cover-rice.png`：稻香。
- `cover-fireworks.png`：烟花易冷。
- `cover-windmill.png`：七里香。
- `cover-nocturne.png`：夜曲。
- `cover-secret.png`：不能说的秘密。
- `cover-north.png`：一路向北。
- `cover-simple.png`：简单爱。
- `cover-clock.png`：反方向的钟。
- `forum-piano.png`、`forum-guitar.png`、`forum-vocal.png`：3 张论坛缩略图。
- `paper-texture.png`、`page-leaves.png`：页面纸纹与左下角树叶。
- `cover-sunny-clean.png`：内置 Image Gen 工具生成的无“热门”标签版本；为保留源图细节，页面选用原图提取版。

参考图是 1448 × 1086 像素，提取素材保留其原始清晰度，不虚增分辨率。论坛缩略图保留原图中的播放标识和时长，外层仍是可操作的播放按钮；页面不叠加重复标识。曲谱插画沿用现有演示性质，预览弹窗已有说明。

`source-assets.json` 记录每张图的边界。重新拆图可运行 `classroom/scripts/extract-score-library.py`（需要 Pillow）。生成版的完整提示词见 `cover-sunny-clean.prompt.md`。

视觉覆盖样式位于 `classroom/src/score-reference.css`，只作用于乐谱页。原有未提交的页面组件和素材保持原状，未纳入本次提交。

本次本机预览使用 `/Users/rimon/.codex/runtime/fyp-classroom-search` 的完整运行副本。代码和素材保存在网络仓库，后续源文件修改需要同步到运行副本才会出现在该预览中。
