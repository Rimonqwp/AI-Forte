# 五个手绘图标

根据用户浏览器批注，将识谱入门、节奏训练、跟弹跟唱、音乐比赛、作品社区五个入口全部替换为同组手绘 icon。

生成方式：内置 image_gen，每张分别生成。统一风格为不规则棕色画笔轮廓、简洁平面形状、少量淡彩和真实透明背景。图标位置、卡片文字和交互保持原有布局。新文件均位于 `app/static/classroom/assets/`，源项目副本位于 `classroom/public/assets/`；旧图标保留以便回退。

| 入口 | 图标文件 | 完整生成提示词 |
| --- | --- | --- |
| 识谱入门 | feature-reading-handdrawn-v2.png | feature-reading-handdrawn-v2.prompt.md |
| 节奏训练 | feature-rhythm-handdrawn-v2.png | feature-rhythm-handdrawn-v2.prompt.md |
| 跟弹跟唱 | feature-sing-handdrawn-v2.png | feature-sing-handdrawn-v2.prompt.md |
| 音乐比赛 | feature-trophy-handdrawn-v2.png | feature-trophy-handdrawn-v2.prompt.md |
| 作品社区 | feature-community-handdrawn-v2.png | feature-community-handdrawn-v2.prompt.md |

五张均为 1448 × 1086 RGBA PNG，已检查真实透明通道，在页面以原有图标位置与尺寸显示。

验证：正式构建通过；浏览器确认五张均加载、图标位置与尺寸保持一致、入口点击正常、无控制台错误。页面截图为 `qa/handdrawn-icons-after.png`，局部效果为 `qa/handdrawn-icons-detail.png`。
