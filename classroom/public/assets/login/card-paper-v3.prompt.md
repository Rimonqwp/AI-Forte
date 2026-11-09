# card-paper-v3.png

- 日期：2026-11-09。
- 工具：内置 ImageGen；逐张单独调用，未使用 CLI。
- 参考：`classroom/design-reference/login-mirrored-reference.png`（用户最新附图，1448 × 1086 px）。
- transparent_background: `false`。
- 保留生成结果的原始像素；真实 UI 由 React 渲染。

完整原始提示词（其中尺寸为请求值，实际输出见 README）：

```text
Use case: precise-object-edit.
Asset type: blank illustrated PAPER BACKGROUND for a coded login card, portrait 555x875 composition.
Input image: reference. Recreate ONLY the softly textured ivory/peach paper surface and noninteractive decorative art INSIDE the left login panel, with ALL actual UI and all text removed. The card border and corner rounding will be done by CSS; fill this rectangular image right to its edges with paper.
Keep these decorative shapes in their reference positions relative to the panel: near the upper-left (x=0..210,y=60..170), a delicate golden musical staff of four fine flowing curves with a tiny golden eighth-note; a very pale irregular layered paper edge traverses the card around y=255, cream over warm peach; along the very bottom (y=820..875), several overlapping rounded pale peach paper hills with soft watercolor texture. The entire MIDDLE from y=280 to y=800 must be nearly uniform quiet pale ivory #fff8f0 with subtle paper grain so real text/inputs can be placed over it. Overall warm soft cream, extremely pale peach, light orange, matched to the provided card.
REMOVE the logo, name, headings, tagline, hearts, kitten and sprout, Google mark, divider rules, buttons, form fields, toggles, text, laurel, and all other UI. No words, no letters, no watermark. No room outside the paper panel. No border, no shadow, no rounded rectangle drawn. One individual card paper background asset only.
```
