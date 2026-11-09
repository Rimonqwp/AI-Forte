# cherry-foreground.png

- 工具：内置 ImageGen，单张生成，未使用 CLI。
- 参考：`mirrored-room-v3.png` 右上角樱花。
- transparent_background: `true`，保留输出原始 alpha。
- 用途：登录卡片角上的前景花枝，跨过卡片边框但不拦截指针。

完整原始提示词：

```text
Use case: background-extraction.
Asset type: ONE transparent cherry-blossom foreground overlay for the top corner of the existing login card.
Input image: edit target/style reference. Extract and faithfully recreate ONLY a small branch of the pale pink cherry blossoms from the UPPER-RIGHT of this warm watercolor/anime music-room image, with genuine alpha transparency.
Composition: a slender warm brown branch ENTERS FROM THE UPPER-RIGHT canvas edge and reaches diagonally DOWN-LEFT. Several natural five-petaled cream and pale peach-pink cherry blossoms with warm coral centers, a few small olive-green leaves and fine twigs. Match the reference's exact delicate painted linework, soft sunset light, pastel colors, flower size and watercolor texture. Keep the lower-left end airy, with just one or two blossoms and a tiny twig. Dense cluster stays at the upper-right. Roughly 4:3 canvas, tight natural framing with small transparent margins, all flower tips visible.
Purpose: the branch will sit in front of the card's upper-right border and extend a little inside the paper, matching the mirrored reference composition. It must be a clean standalone flower cutout, no peach wall, no paper, no UI, no text, no character, no cat, no room, no logo, no border, no watermark, no glow. Preserve genuine transparent alpha; do not bake in a colored or white backdrop.
```
