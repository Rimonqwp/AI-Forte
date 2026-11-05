# Design QA — 小谱音乐教室

## 2026-11-04 — 歌曲详情与玩家编配版本

final result: passed

Latest user clarification — Start Practice is a content-only overlay: verified at 1947 × 1255 and 390 × 844. The search URL is unchanged, the overlay has zero copied site headers and zero instructional hero banners, and the existing results remain behind the backdrop. Repeat-open measurement retains scrollY=100, results top=438 and width=1680. Closing after a guitar filter preserves 4 results and the selected filter. Nested sheet preview Escape closes only the inner dialog; closing the outer dialog restores body scrolling. On phone the panel spans y=12–832, scrolls internally and keeps its close button visible after 1146px of internal scrolling. Evidence: `docs/classroom/qa/song-detail-overlay.jpg` and `song-detail-overlay-mobile.jpg`. This user-requested floating presentation supersedes the standalone layout only for Start Practice; cover/preview routes remain available.

### Visual truth and comparison scope

- Source: `classroom/design-reference/song-detail.jpg`; normalized visible source: `classroom/design-reference/song-detail-visible.png`.
- Original attachment is 1448 × 1086; page content is visible through y=697 and the remaining area is black. Comparison uses the complete visible 1448 × 697 region, not a recreated black footer.
- Prototype: `http://127.0.0.1:4173/static/classroom/#song?id=rice`; matching initial state: all 8 versions, 最热推荐, no active filters or favorites.
- CSS viewport and screenshot: 1448 × 1086 at 1 pixel per CSS pixel. The first 697 pixels are compared without scaling. Native scrollbar reduces available layout width by 11px; that small right-edge difference is accounted for rather than treated as density drift.
- Full-view evidence: `docs/classroom/qa/detail-comparison-v1.jpg` and `detail-comparison-final.jpg` contain source and implementation together. Focused evidence: `detail-focused-final.jpg` compares version heading, filters and first cards together.
- Final desktop: `song-detail-desktop-final.jpg`; actual Sunny entry: `song-detail-preview.jpg`; phone: `song-detail-mobile.jpg`; working sheet preview: `song-detail-score-dialog.jpg`. All are under `docs/classroom/qa/`.

### Comparison history and fixes

1. **P2 — Desktop spacing drift.** Initial capture used the inherited 54px header, a slightly wider instructional strip and 227px version cards; the first row began at y=488. Scoped header height to 48px, aligned the banner introduction and x210 content start, and adjusted card line heights/padding. Final first card begins at y=478 and ends at y=697, matching the reference visible row.
2. **P2 — Image delivery/crop.** Initial live capture held a cached missing fingerstyle thumbnail; the first hero cropped the girl/cat, and the ukulele staff was too narrow. Regenerated the shallow-banner composition and ukulele snippet as separate images, finished syncing all files, and reloaded. Final reference capture has zero missing images; the actual Sunny route also uses a separately generated title cover instead of a magnified search thumbnail.
3. **P2 — Responsive sorting label.** At 768px the sort label could be orphaned above its options. Grouped label and options in one responsive wrapper. Phone and tablet remain two-column version grids with no horizontal overflow; 390px card buttons fit within their cards.
4. **P2 — Small type/copy.** Corrected the teacher certification text and aligned brand sizing, version title weight and statistics sizing. Post-fix evidence is the final full/focused comparison.

### Required fidelity surfaces

- **Typography:** Existing local Ma Shan Zheng matches the brush-style hero; PingFang SC/Songti fallbacks match the dense Chinese UI hierarchy. Headings, body text, certification, counts and four original version titles are present as real text. Exact source font rasterization is not available; small brush-stroke and antialiasing differences remain P3.
- **Spacing/layout:** Shallow hero, 160px side navigation, song cover/facts, three advice cards and four arrangement cards per desktop row follow the source. Version row y=478–697 matches. Phone, tablet and normal desktop sizes have no viewport overflow.
- **Color/tokens:** Warm ivory/peach surfaces, brown text, coral primary controls and green/pink/purple recommendation groups preserve the source roles. Generated watercolor tones and minor control highlight differences remain P3.
- **Images:** Eleven final independent built-in image_gen assets: hero, two song covers, four portraits and four notation strips. No page flattening, sprite sheet or hand-drawn code substitute. Prompts and dimensions are in `classroom/public/assets/song-detail/manifest.json`. Generated art is coherent but differs from original pixels; no exact-pixel identity is claimed.
- **Content:** Selected song title, artist/date and cover follow the clicked song. There are eight actual demo versions, and filtered counts reflect visible data. The hidden black reference region is not interpreted as content. Community figures, notation and audio are clearly marked as demonstrations.

### Interaction and runtime verification

Search → Sunny → return to original query → Rice passed. Guitar gives 4 versions; adding four-star difficulty gives 1; incompatible five-line notation gives a real empty state; clearing restores 8. Newest sorting, favorite toggle, sheet preview, changing to 85 BPM, starting/pausing practice sound and Escape close passed. Related discussion and four-course sections switch correctly. Browser warning/error log is empty. Final production build and four Sites packaging/static-route checks passed. Measurements and results: `docs/classroom/qa/song-detail-checks.json`.

### Follow-up polish

P3 only: generated portraits and hero poses differ from the reference illustration, small glyph rasterization differs, and mobile is a responsive interpretation because no mobile detail reference was supplied. There are no remaining actionable P0/P1/P2 findings in the visible target scope. The page is a frontend experience; the generated snippets are not complete original-song scores, and demo counts/replies are not backed by community services.

### Implementation checklist

- [x] Selected visual target captured and normalized.
- [x] Independent generated assets and exact prompts saved in the repository.
- [x] Full and focused visual comparisons reviewed after fixes.
- [x] Entry/return/version-selection core journey tested in the browser.
- [x] Desktop, phone and tablet layouts checked.
- [x] Production build and existing package checks passed.
- [x] Local preview retained for the user.

---

final result: passed

## Latest annotation — swap popular search and help text; even row spacing

final result: passed

Reordered the hero search panel to heading, popular search chips, search form, then supported-input help text. Replaced fixed/minimum panel heights and per-child vertical margins with content-sized flex layout, 10px gaps on desktop/tablet and 8px gaps on phone. Applied balanced panel padding and compact help line height. Existing hero heights and whole-group vertical centering are preserved.

Production build passed. Browser checks at 1362, 768, 360 and 390px verify the four-row order, exactly matching 10/10/10px or 8/8/8px gaps, all rows contained, no horizontal overflow and equal outer spaces above/below the hero introduction. Clicking the popular search chip 晴天 returns exactly 晴天; clearing restores all six scores. Browser warning/error log is empty. Preview source and integrated static output are synchronized.

Evidence in `docs/classroom/qa/`: `search-order-spacing-before.jpg`, `search-order-spacing-after.jpg`, `search-order-spacing-390.jpg`, and `search-order-spacing-checks.json`.

## Latest annotation — preserve hero height and center the introduction

final result: passed

Restored original hero heights after the user's correction: 480px desktop, 520px tablet, 640px compact tablet and 633px phone. The removed recommendation strip remains absent. Grouped the title, promise line and search form into one flex container that centers vertically above the five learning entry cards. Decorative music/heart icons now follow the heading.

At the 1362px desktop view the group has matching 57.77px spaces above and below; title top moves from 55px to approximately 101.77px in the page, and the search panel top to 191.23px. At 1600/1024px the same top/bottom spaces match; tablet uses approximately 80.16px and phone 68.06px. Measurements at 1600, 1024, 768, 640 and 390px confirm equal top/bottom spaces within 0.02px, a 10px title/search gap, all five learning cards contained, no recommendation bar and no horizontal overflow.

Production build passed. Search for 晴天 returns the matching score and clearing restores the home state. Browser warning/error log is empty. Before / after desktop evidence: `docs/classroom/qa/hero-centered-before.jpg` and `hero-centered-after.jpg`; phone: `hero-centered-390.jpg`; measurements: `hero-centered-checks.json`. Source and compiled static pages are synchronized with the local preview.

## Latest annotation — remove popular learning recommendation strip

final result: passed

Removed the entire popular learning recommendation strip from React and deleted its unused styles. Closed its former vertical space by moving the five learning entries and following content upward (64px on desktop; 68px on tablet; 70px on phone), with the responsive hero height adjusted accordingly. Existing five learning entries and panel spacing remain.

Production build passed. Browser checks at 1362, 768, 640 and 390px confirm zero recommendation strips, five learning entry cards, no overlap with search, all cards within the hero, no horizontal overflow and no missing images. Browser warning/error log is empty. Before / after screenshots: `docs/classroom/qa/remove-recommendations-before.jpg` and `remove-recommendations-after.jpg`; measurements: `remove-recommendations-checks.json`. Preview source and integrated static output are synchronized.

## Latest annotation — match title top spacing to the side inset

final result: passed

Scores and community panel titles now have the same actual visible top gap as the horizontal content inset. Added responsive top padding and replaced fixed-height centered heading rows with content-sized rows plus bottom padding, removing their additional blank space above the title. The final measured top / left gaps match exactly in both panels: 25 / 25px at 1362px, 19 / 19px at 1024px, 15 / 15px at 768px, and 11 / 11px at 390px (including the 1px panel border). Before this change the desktop top gaps were only 7px and 4px.

Production build passed. Browser measurements at those four widths confirm matching gaps and no horizontal page overflow; results are saved in `docs/classroom/qa/panel-title-spacing-checks.json`. Before / after screenshots: `panel-title-spacing-before.jpg` and `panel-title-spacing-after.jpg` in the same folder. Browser warning/error log is empty. Workspace, local preview source and integrated static output are synchronized.

## Latest annotation — shared content width and panel padding

final result: passed

Unified the header, learning recommendation bar, five learning entries, score grid and community content on one shared responsive inner container. Kept the full-width hero illustration and existing visual styling. Scores and community now use identical horizontal panel padding; their borders are included in the shared inner-width calculation. Removed the independent header width, feature offset and breakpoint-specific container margins.

At the user's 1362px desktop viewport, all five content regions now run from x57 to x1305 (1248px wide); both lower panels run from x32 to x1330. Shared outer gutters / panel padding adapt to 32 / 24px on desktop, 24 / 18px on smaller desktops, 20 / 14px on tablet, and 12 / 10px on phone. The recommendation row can scroll within its middle region on compact tablets. Phone learning cards use equal minimum-zero grid tracks, slightly taller cards and wrapped descriptions so long copy cannot widen the grid.

Browser measurements at 1600, 1024, 901, 768, 640, 390 and 360px confirm identical inner left/right edges across all five regions, no page or container overflow, all learning icons and descriptions contained, and zero missing images. Measurements are retained in `docs/classroom/qa/container-width-checks.json`. Before / after desktop views: `container-width-before.jpg` and `container-width-after.jpg`; phone evidence: `container-width-390.jpg`.

Guitar filter still returns exactly 晴天 and 稻香; clearing restores all six scores. Browser warning/error log is empty. Production build passed; existing static route / packaging checks passed (4/4). Workspace and local preview styles match; compiled output synced to `app/static/classroom/` and `app/static/index.html`.

## Latest annotation — score filters and responsive background seam

final result: passed

Moved the complete score-type group from hero search into the popular scores section, immediately below its heading. All five types plus More remain available, wrap on phone widths and retain existing filter behavior. Search panel now fits its remaining content.

Fixed the responsive hero image height to cover the section plus crop allowance at every breakpoint. Feathered its bottom boundary into the existing paper canvas; at narrow widths the stronger fade also removes the painted desk edge that became a horizontal band when enlarged/cropped.

Evidence: `docs/classroom/qa/filters-seam-before.png` and `filters-seam-after.png`, normalized matching 1368 × 1159 captures, combined and visually reviewed in `filters-seam-comparison.jpg`. Narrow views `filters-seam-640.png` and `filters-seam-390.png` were opened and reviewed; wide and tablet captures at 1600 and 768 are retained. Text, fonts, palette, existing images and icon sizing preserved; filter placement, search panel height and background blend are intentional changes. No visible horizontal image boundary in the final narrow views.

Browser verification: no filter group remains in hero; exactly one in scores. Guitar selects exactly 晴天 and 稻香, clear restores scores. Six category buttons present at wide/tablet/narrow/phone widths, no group or page horizontal overflow. Browser warning/error log empty. Production build passed and integrated static files updated. No actionable P0/P1/P2 issues remain for this scoped update.

## Latest annotation — smaller, contained icons

final result: passed

The user requested all five hand-drawn icons to be smaller and avoid exceeding their cards. Updated CSS only; image art, text, colors, interactions and desktop card grid retained.

- Desktop icon boxes reduced from 126 × 78 to 100 × 52 CSS pixels and moved inside the card (top 2px). Tablet uses 88 × 50; phone uses 72 × 40.
- Adjusted card top padding and description line height so icons and labels do not overlap or leave the card. At 601–750px the five cards use two rows to preserve readable widths.
- Initial tablet check found the last two descriptions exceeded the card bottom. Reduced responsive description font/line-height and prevented wrapping; rechecked successfully.
- Browser measurements at 1368, 1024, 768, 640 and 390px: all five image boxes inside their cards, no image/title overlap, all descriptions contained, no page horizontal overflow.
- Compared matching 1368 × 1159 before/after captures together in `docs/classroom/qa/icons-size-comparison.png`; visually reviewed tablet and phone screenshots. Fonts/copy/colors/art direction preserved. Only sizes, spacing and responsive grid placement changed intentionally.
- Evidence: `icons-size-before.png`, `icons-size-after.png`, `icons-size-768.png`, `icons-size-390.png`, `icons-size-detail.png` in the QA folder.
- Production build passed, compiled files synced to existing static homepage, preview refreshed and retained. No remaining P0/P1/P2 findings for this update.

## Latest browser annotation — five hand-drawn icons

final result: passed

The user requested all five learning entry images to become hand-drawn icons. This intentionally supersedes the original glossy icon appearance, while preserving the original page layout.

- Before evidence: `docs/classroom/qa/handdrawn-icons-before.png`.
- Updated production screenshot: `docs/classroom/qa/handdrawn-icons-after.png`.
- Both captures: 1368 × 1159 pixels and CSS viewport, density 1, identical home state; no normalization needed.
- Opened and reviewed combined full-view `handdrawn-icons-comparison.jpg` and focused `handdrawn-icons-comparison-detail.png`.
- All five are individually generated transparent PNGs: music book, metronome, play tablet, trophy, headphones/heart. Each uses organic brown outlines and flat pastel accents. Old artwork is retained under its original filenames. Active source references use `feature-*-handdrawn-v2.png`.
- Typography / copy: unchanged; all five original titles and descriptions remain readable.
- Spacing / layout: all five image elements retain 126 × 78 CSS size and original x/y positions (y385 at this viewport); card dimensions, grid and section positions are unchanged.
- Color: existing card palette retained; the five icons share brown outlines and complementary lilac, coral and honey accents.
- Image quality: all five loaded in the actual production browser, real alpha channels checked, no clipping or white/image backgrounds. Removed the former CSS drop-shadow halo.
- Interaction: reading icon/card opens the reading course dialog, close works; console warning/error list empty.
- Validation: production build passed; all five built PNGs match source asset hashes. Built HTML/JS/CSS and assets integrated into the project.
- No actionable P0/P1/P2 findings. The updated hand-drawn style is the requested intentional change.

## Comparison target and evidence

- Source visual truth: `docs/classroom/reference/design.png`, supplied screenshot, 1448 × 1086 pixels.
- Final implementation: `http://127.0.0.1:4173/static/classroom/`, production Vite build (not dev/HMR).
- Implementation screenshot: `docs/classroom/qa/desktop-final.png`, 1448 × 1086 pixels, CSS viewport 1448 × 1086, device density 1. No scaling normalization is needed for the final pair.
- State: home, all six scores, recommended community feed, no modal or menus, no filters/favorites/check-in changes.
- Combined full comparison opened and reviewed: `docs/classroom/qa/comparison-final.jpg`.
- Combined focused comparisons opened and reviewed: `comparison-score-detail.jpg` and `comparison-community-detail.jpg`; hero comparison also saved as `comparison-hero.jpg` in the same folder.
- Mobile: 390 × 844 CSS viewport, `docs/classroom/qa/mobile-final.png`; no mobile source design was supplied, so mobile is a responsive adaptation.

## Findings

No remaining actionable P0/P1/P2 findings in the requested visual prototype. This passing result covers visual implementation and the bounded frontend interactions below; it does not claim pixel-identical generated art or production service integrations.

### Required fidelity surfaces

1. Fonts / typography: matched brush-style Chinese display heading using local Ma Shan Zheng; Chinese UI uses PingFang SC / Microsoft YaHei with appropriate weight. Restored bold hierarchy, 24px search heading, 22px main section headings, 21px feature headings and 18px score titles. Small exact glyph-shape differences remain P3.
2. Spacing / layout: verified DOM rectangles at the reference viewport: search x434 y138 w610 h198; features x136 y405 w1184 h107; scores x65 y524 w1318 h284; community x65 y814 w1318 h260. Page measures 1448 × 1086 with no overflow. Six slightly asymmetric grid tracks reproduce source card widths. Mobile grid min-width and heading wraps corrected.
3. Colors / tokens: checked peach/cream watercolor canvas, coral controls, brown text, lilac/peach/pink/yellow learning cards, purple instrument labels, orange ratings, warm panel borders and light shadows against the reference. Buttons are HTML controls, with inset highlights and matching selected/hover states.
4. Image quality / fidelity: all 17 used raster assets generated separately with built-in image_gen and placed in the UI. Hero revised from the exact supplied crop to preserve girl/cat/piano scale. Five feature illustrations have real alpha. Six landscape/notation covers, three community artworks, avatar and page texture are present and load. Generic UI icons use Phosphor, not handcrafted SVG/emoji/CSS art. Remaining brush detail, notation and portrait differences are expected regenerated-art differences classified P3. The UI is not a flattened screenshot.
5. Copy / content: navigation, headline, promise strip, search text, score names, instruments, difficulty, forum tabs/discussions/counts and primary actions match the supplied design. Interactive dialogs add prototype content not specified by the source. Generated cover notation is illustrative, not a validated transcription.

## Comparison history

- Iteration 1, blocked: first full-page capture was 1433 × 1101 due screenshot/full-page behavior and excess page height; not used for a final pixel judgment. DOM inspection found excess score metadata height, overly wide hero heading, thin synthetic font weights and low hero subjects. Corrected score metadata flow and height, section rhythm, hero typography, fonts and custom icon scale.
- Iteration 2, blocked: lossless same-size 1448 × 1086 capture (`implementation-v2-lossless.png`) revealed remaining hero composition drift. Generated v2 shrank the subjects too far; it was not selected. Switched to v3 generated by editing the exact reference crop with UI removal, preserving subject placement. Corrected rounded Chinese UI typography and supplied standard decorative music/heart icons.
- Responsive iteration, blocked: 390 × 844 capture (`mobile-v1.png`) exposed 566px page width from the community grid/tab min-content width. Set feed/grid minimum widths to zero, made the tab row horizontally scrollable and wrapped the title into coherent lines. Rechecked document width 390, missing images 0. Dialog focus trapping, Escape dismissal and mobile navigation were verified.
- Final iteration: clipped thin generated edge strips through the hero image crop, rebuilt the production artifact and recaptured. Opened the source and final screenshot together in full and focused comparisons. All major regions align with the reference, no clipping, no missing images, no browser errors. Final result passed with P3 regenerated-art/font differences.

## Interaction evidence

- Search 晴天: one result 晴天.
- Guitar filter: exactly 晴天 and 稻香, clear restores all six.
- Favorite 小星星: aria-pressed true and saved modal state updates.
- Preview / practice: score dialog opens, audio Play toggles to Pause, tempo keyboard adjustment 80 → 81 BPM, playback can stop; `practice-player.png` saved. This validates browser playback controls and scheduling, not an independent speaker recording.
- Lessons: marking the first rhythm lesson completed updates the completed state.
- Forum 吉他弹唱 tab: displays the one matching guitar post.
- Demo publishing: submitting 我的第一首练习曲 creates a visible post and success notice; reset on reload verified.
- Check-in: 每日打卡 changes to 已打卡.
- Mobile: navigation opens, lesson opens, dialog receives focus, Escape closes it, no page-level horizontal overflow.
- Final production artifact: opens correct title and all images; production hashed JS loads; score dialog opens and closes; browser warn/error log empty.

## Build / integration

- `npm run build`: passed.
- `npm run test:sites`: 4 passed, 0 failed (static asset routing, SPA fallback, missing API/write behavior, required packaging files).
- Built artifacts copied to `app/static/classroom/` and `app/static/index.html`.
- Previous homepage preserved at `app/static/transcribe.html`; transcription backend and `/v2` implementation unchanged.
- Existing pre-task `.gitignore` modification and `.DS_Store` were left untouched.

## Follow-up polish (P3)

- Generated illustration brush strokes, feature art and notation are intentionally regenerated and differ from original source pixels.
- Exact proprietary/unknown source font and portrait variants are not available; nearest local type and one coherent generated avatar are used.
- User-supplied reference contains only the desktop view; mobile composition follows the same hierarchy rather than a separate exact mock.

## Implementation checklist

- [x] All independent requested raster assets present with saved prompts.
- [x] Desktop composition and focused components compared at matching density.
- [x] Responsive overflow fixed and visually checked.
- [x] Primary bounded frontend interactions verified in browser.
- [x] Production build and existing package checks pass.
- [x] Local preview remains running, final screenshot and source assets saved.


## 2026-11-05 — 搜索卡片：已选方案 1「纸感书签」

final result: passed

### 对照范围与证据

用户选择本轮第一张生成图；原图保存为 `classroom/design-reference/score-card-bookmark-selected.png`，对应生成文件 `exec-1da8756b-5961-4f26-8e3b-d88a903d7ccc.png`。仅修改搜索结果卡片，保持原五列网格、歌曲封面、数据来源及功能。

目标图为 1642×958 的三卡片概念图；组件对照裁取第一张卡片的 502×637 区域，统一缩放到 275px 宽。实现截图来自当前 Codex 内置浏览器，CSS 视口 2024×1242、DPR 1；原始截图 2013×1235，按实际截图/视口比例裁取对应卡片。当前卡片 DOM 尺寸为 266.59×336.59px。未将整页与三卡片概念图比较。

并排证据位于 `docs/classroom/qa/score-card-bookmark/comparison-v1.png` 和 `comparison-final.png`，左为目标、右为实际；配套 `reference-card.png`、`card-v1.jpg`、`card-final.jpg` 和 `mobile.jpg`。已打开并检查最终对照及手机截图。完整浏览器调试截图保留在私有 `.runtime/qa/score-card-bookmark/`。

### 修正与复核

1. P2：第一轮标题、歌手字号和纵向留白偏小，卡片高度约 310px。调整衬线标题、字号、行高与信息/按钮间距后，达到约 337px，与等宽参考约 338px 接近；最终并排图已复核。
2. P2：原有 `score-reference.css` 的同优先级规则覆盖了局部尺寸。将规则限定在搜索页卡片内，提高选择器精度，恢复选定方案的封面比例、间距与按钮高度。
3. P2：纸边的三值 mask-position 在内置浏览器中被丢弃，手机操作区曾被裁切。改为有效的双值位置 `0 calc(100% + 24px)` 后重新截图，28px 手机按钮完整显示；桌面边缘也重新对照。

### 必查视觉项

- 字体：真实中文 UI 文本；Songti SC / STSong 衬线歌曲名，正文沿用现有字体。桌面标题 27px，窄屏 18px；元数据不再挤成单行小字。长标题用省略号保留卡片高度。生成图与系统字体的字形/抗锯齿差异列为 P3。
- 布局：横向封面、标题/歌手/收藏、细横线、乐器与总次数间的竖线、等高双按钮顺序一致。桌面内边距和约 2.25 的封面比例接近等宽目标。手机将总次数标签和值堆叠，保持阅读和按钮空间。
- 颜色：暖纸底 #fffaf3、深棕标题 #58281a、珊瑚主按钮 #f1876d、细暖色分隔线。实际主按钮 computed background 为 rgb(241,135,109)。生成图曝光/纹理及截图色彩观感有 P3 差异，没有逐像素一致的声明。
- 图片：保留每首歌已有的插画与谱面，没有将生成方案截图作为界面。新增独立透明 PNG 纸边，使用真实 alpha 遮罩及已有不透明纸纹完成自然轮廓；精确提示保存在 `classroom/public/assets/score-card/paper-edge.prompt.md`。自然纸边曲线与生成图不完全相同，属于 P3。
- 内容：歌曲名、歌手、收藏、乐器、总次数和两个操作均保留；示例标识在歌手旁；数据仍为原演示次数，没有重新加入难度星级。

### 功能、响应式与构建

- 在当前内置浏览器验证：开始练习打开所选歌曲弹窗，关闭后查询 URL 不变；预览进入对应歌曲详情，返回恢复原搜索 URL。
- 收藏独立切换，不触发练习弹窗；验证后恢复原收藏状态。键盘 Tab 可进入两项操作。
- 2024px、1024px、390px、360px 均检查了元数据及操作区；十张卡片均无横向溢出，360px 页面 scrollWidth=360。
- Vite 生产构建通过，四项 Sites 包装/静态路由测试通过；浏览器错误日志为空。现有 Vite 大包/静态和动态混合导入提示不影响本次页面运行。

没有遗留 P0/P1/P2 问题。P3：生成图与系统字形、纸边和图片色彩呈现的细微差异；手机布局为选定桌面方案的响应式适配。


## 2026-11-05 — 注释微调：收短纸感卡片信息区

final result: passed

用户要求将封面下方的信息区向上收紧、整体稍短；本次按这条新反馈调整留白，不以之前 337px 卡高为固定目标。桌面信息区从 218px 降至 194px，卡片从 336.59px 降至 312.59px；封面、字号、36px 桌面按钮均保持原尺寸。收紧顶部/底部 padding、歌手与分隔线/操作之间的 margin，手机端同步轻量缩减间距。

同一内置浏览器、2024×1242 视口下的修改前后对照已打开检查：`docs/classroom/qa/score-card-bookmark/compact-comparison.png`（左为修改前、右为修改后）；当前卡片为 `compact-card.jpg`。字体、颜色、现有封面/纸边和文案均沿用已通过方案；视觉变动仅为垂直节奏。

十张卡片桌面及 360px 手机端的元数据/操作区均无横向溢出，手机按钮距纸面底部仍有 11px 空间，纸边遮罩未裁切操作区。生产构建通过。无遗留 P0/P1/P2；此次无需重测未修改的账号和后端流程。


## 2026-11-05 — 修复红圈中的底部纸边不可见

final result: passed

最新截图明确圈出选定方案中间上提、左右下垂的纸张底部，而非普通圆角。之前素材的可见轮廓仅约 3% 画布高度，80px 渲染后起伏约 2px，因此此前将其作为 P3 接受不符合用户的当前要求；本轮将可见底边作为 P2 修复。

新增独立透明遮罩 `paper-edge-visible.png`（2172×724 RGBA，精确提示在同名 prompt.md）：中部 alpha 轮廓约 66.4%，左右约 81%，64px 渲染时起伏约 9–10px。使用真实栅格 alpha 显示纸边，保持暖纸色并增强轻阴影。原素材保留。将 6px 内部间距移到按钮下方，为纸边让出显示区：桌面卡片仍为 266.59×312.59px，信息区仍为 194px，按钮下余量由 17px 增至 23px；没有恢复之前被撤回的缩窄/圆角修改。

在当前内置浏览器重新启动 4173 Vite 服务并刷新，确认不再显示服务停止时缓存的旧样式。桌面视口 1845×1242；以实际截图/视口比例裁取组件。已打开并检查 `visible-edge-comparison.png`（旧效果/修复后）和 `visible-edge-reference.png`（选定图底部/实际底部）并排证据，纸边轮廓清晰；补充 `visible-edge-card.jpg` 与 `visible-edge-mobile.jpg`。

360px 视口十张卡片的元数据和按钮无溢出；手机信息区保持 147px，按钮下方保留 17px，截图确认纸边不裁切按钮。字体、颜色、封面和文案沿用已通过的选定方案。生产构建通过。浏览器日志保留一条预览连接时的 Vite WebSocket 断连记录；本轮通过可用的 HTTP 页面手动刷新，已核对最新 64px 遮罩和真实截图，不将旧缓存或热更新状态作为验证依据。没有遗留 P0/P1/P2；实际生成轮廓与概念图的细微曲线/字形差异仍是 P3。
