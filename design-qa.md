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

## 2026-11-06 — 账号资料：选定第 3 版直接编辑

final result: passed

Source visual truth: `/Users/rimon/.codex/generated_images/01a1add3-e1c2-79f0-822b-8e65d109e504/exec-7e487286-3ee0-46e8-b16b-7b82f163e3a0.png` (third displayed image selected by the user).
Implementation: `http://127.0.0.1:4173/static/classroom/#scores?q=周杰伦`, account settings → account profile.
Evidence directory: `/Users/rimon/.codex/visualizations/2026/11/06/account-profile/`.
Final screenshot: `12-final-preview.png`; desktop comparison capture: `09-final-desktop.png` (same visual output; final code adds a namespaced React key).
Viewport: desktop 1845×1242 CSS px and captured pixels, effective density 1. Source 1529×1029 px, proportionally normalized to 1845×1242 for comparisons; mobile 390×844 CSS px/pixels. Account values are masked email and current nickname. Initial unchanged form intentionally disables Save; the source mock shows an enabled Save, a state handled when a draft changes.
Full-view comparison evidence: `03-comparison-before.jpg`, `05-comparison-after.jpg`, `10-final-comparison.jpg` (source left, implementation right). Focused, readable controls comparison: `06-controls-comparison.jpg`, `11-final-controls.jpg`. Opened and inspected combined source/implementation images, not just separate screenshots. Mobile: `07-editor-mobile.png` and post-fix `08-mobile-actions.png`.

Findings and comparison history:
- [P2, resolved] First capture used noticeably smaller main typography and compressed vertical spacing. Increased heading to 46px, description to 22px, field text to 22px, section title to 30px, account row to 18px. Increased avatar/name gaps and footer spacing; post-fix comparisons show the selected single-column hierarchy with actions aligned at the bottom.
- [P2, resolved] Mobile email and Show action initially wrapped onto separate rows. Updated flex sizing so email and control share one row; `08-mobile-actions.png` confirms readable information, reachable actions, stable top close button and no clipped form controls.
- [P2, resolved] Console reported duplicate sibling UID keys after adding UID-scoped settings remount. Namespaced the dialog key to `settings-${uid}`. Reloaded and reopened; log timestamps remained the two earlier entries, with no additional errors after the fix.
- No remaining actionable P0/P1/P2 issues.

Required fidelity surfaces:
- Typography: Songti heading, PingFang/system UI text, dark brown readable hierarchy. Main form fields and actions match the selected composition; existing sidebar typography retained. P3: system font rendering and smaller secondary copy differ slightly from the raster mock.
- Spacing/layout: preserved existing 1440×960 maximum dialog, sidebar/topbar, portrait + avatar control, aligned label/input, separate provider section, bottom Cancel/Save. Reduced form minimum height after initial comparison to avoid an unnecessary desktop scrollbar. Mobile uses single column and internal vertical scrolling; final action row is reachable and close remains visible.
- Color/tokens: warm #fffcf7 paper, #603d30 ink, terracotta primary action, fine warm dividers. Unchanged Save is intentionally muted/disabled; editing enables it.
- Imagery: reused the existing separately generated score/sprout PNG and original brand emblem. No flattened UI image or handcrafted decorative drawing. Google uses the same Phosphor GoogleLogo family as the existing sign-in UI, with the established monochrome brown treatment instead of the mock's multicolor logo. P3: existing book illustration is paler than the generated concept.
- Copy/content: follows the selected edit surface. Added explicit avatar file limits and browser-only/UID-scoped storage explanation; Google email and sign-in method remain read-only. New strings include English and Traditional Chinese translations. No profile brand signature or staff footer remains in this latest selected design.

Primary interactions checked in the in-app browser: name changes enable Save; Cancel restores the name and disables Save; whitespace-only name produces an alert without sending a write; selecting a real PNG generates a JPEG preview and enables Save; Cancel restores the original avatar; email Show/Hide toggles; security navigation opens and returns; Escape closes and returns focus to profile trigger; search URL remains intact. Mobile internal scrolling reaches all actions. Desktop viewport override reset and profile preview left open.

Validation: production build passed; 27 targeted tests passed (profile editor, account data, auth flow, cloud state and Sites packaging). Save success, name normalization, UID isolation, switched sessions, failed remote writes, failed browser storage, SQL synchronization warning and invalid files are exercised with injected adapters. No live account nickname was changed for testing; live Firebase write and cross-device propagation were not exercised. Avatars remain local to this browser per account and are not sent to Google or Cloud SQL. No backend changes/deployment were needed.

Implementation checklist: complete. Follow-up P3 polish is limited to secondary typography, the paler existing illustration and provider logo color; no task-blocking differences remain.


## 2026-11-06 — 注释扩展：手机号和邮箱绑定

final result: passed

Scope/source: the user's account-information annotation requests phone-number and email binding on the previously selected inline profile editor. Existing visual truth remains `/Users/rimon/.codex/generated_images/01a1add3-e1c2-79f0-822b-8e65d109e504/exec-7e487286-3ee0-46e8-b16b-7b82f163e3a0.png`, with these requested information rows added. Baseline implemented surface: `/Users/rimon/.codex/visualizations/2026/11/06/account-profile/12-final-preview.png`.
Implementation route: `http://127.0.0.1:4173/static/classroom/#scores?q=周杰伦`, account settings / profile.
Evidence directory: `/Users/rimon/.codex/visualizations/2026/11/06/account-bindings/`.
Desktop captures `01-desktop.png`, `02-phone-panel.png`, `03-email-validation.png`, `08-desktop-1845.png`: 1845×1242 CSS px and image pixels, density 1. Secondary default desktop capture `07-desktop-final.png`: 1280×720. Mobile captures `04-mobile-rows.png`, `05-mobile-fixed.png`, `06-mobile-email.png`: 390×844 CSS px/image pixels, density 1. Temporary viewport override reset at completion.
Full-view evidence: opened and inspected `09-surface-comparison.jpg` (baseline left/new top state right, same desktop size). Focused comparison: `10-information-comparison.jpg` aligns the account-information section, using different internal scroll positions to bring each section into view; no type or image scaling. Added rows and longer content/internal scrolling are intentional consequences of the annotation. Existing shell, identity editing, illustration, and sidebar remain aligned.

Findings/history:
- [P2, resolved] Initial mobile row placed email information and actions beside one another, forcing the masked domain onto multiple short lines (`04-mobile-rows.png`). Changed the mobile row to a two-column icon/content grid with actions in a full-width second row. `05-mobile-fixed.png` and `06-mobile-email.png` confirm readable email and working form controls; Google status fits on one line.
- [P2, resolved] Moved validation messages directly after the relevant expanded panel, so phone errors no longer appear beyond the email row. Independent binding buttons use type=button; the profile form validates its own fields manually so an unfinished email draft cannot block nickname editing.
- No remaining P0/P1/P2 visual findings. P3: third-party reCAPTCHA has its own visual style; it is kept inside its verification panel, with contained overflow on narrow screens.

Required fidelity surfaces: Songti/PingFang typography and existing brown-on-paper colors retained; new rows use 15–16px main labels, compact supporting copy, existing Phosphor outline icons, warm dividers and outline actions. Desktop provider/email information remains grouped; mobile actions no longer squeeze contact information. Original raster score/sprout illustration and branding are reused unchanged. Copy now separates provider login from current verified email, clearly states that bindings take effect after verification, and includes Simplified/Traditional Chinese and English strings. No fake statuses, extra cards, new dialogs or new images were introduced.

Browser checks: expand/collapse phone and email panels, correct focus on the new input, existing verified email disables a redundant verification request, invalid phone and invalid email show actionable validation without sending, real reCAPTCHA widget renders, new account rows remain masked by default, desktop/mobile internal scrolling reaches actions, and email panel fits at 390px. No real SMS or verification email was sent, and no existing binding was changed. Latest browser error log was empty. An earlier tab encountered a stale connection error; a fresh in-app tab successfully loaded the same local URL and was retained for preview.

Validation: production build passed; 38 tests passed across binding service, profile editor, account/auth/cloud state and packaging. Injected SDK tests verify no phone binding before a correct confirmation, invalid/expired-code failure behavior, international number validation, UID preservation and switched-session rejection, existing-phone protection, verify-before-email-update without prematurely changing email, reauthentication, token/profile refresh and refresh retry. These are SDK-adapter tests, not a claim of live delivery.

Integration limits: Firebase administrator credentials were unavailable for the read-only project-config check. Phone provider enablement, SMS region/quota/billing configuration and real message delivery remain unverified; unavailable-provider errors are shown honestly. Cloud authentication settings were not changed and nothing was deployed. Existing Google credentials are retained when linking a phone or verifying a new account email. Email verification returns via the provider-hosted handler to the current profile and refreshes the authenticated state; this real email-return trip has not been exercised.

Implementation references: https://firebase.google.com/docs/auth/web/phone-auth ; https://firebase.google.com/docs/reference/js/auth#linkwithphonenumber ; https://firebase.google.com/docs/reference/js/auth#verifybeforeupdateemail .
Implementation checklist: complete for the requested local UI and SDK integration; live delivery validation requires an enabled Firebase project and user-controlled test contacts.

## 2026-11-06 — 绑定入口改为独立小弹窗

final result: passed

Source: the user's latest annotation explicitly requests a separate popup when clicking the phone/email action buttons. Baseline surface `/Users/rimon/.codex/visualizations/2026/11/06/account-bindings/08-desktop-1845.png`; the existing profile, row layout and visual language remain the source for surrounding UI. Implementation is the same local search route / account settings, now with a top-level phone or email dialog.
Evidence folder: `/Users/rimon/.codex/visualizations/2026/11/06/binding-modal/`. Desktop `04-phone-final.png`: 1845×1242 CSS px/image pixels, density 1. Mobile `03-mobile-email-stable.png`: 390×844 CSS px/image pixels, density 1. The initial screenshot immediately following viewport resize (`02-mobile-email.png`) was a transient compositor frame and was rejected; the stable recapture confirms readable dialog dimensions. No image density rescaling was required. Combined baseline/implementation comparison `05-modal-comparison.jpg` was opened and inspected; the appearance of a centered popup and additional dimming is the requested change, not unintended layout drift. The standalone full-resolution phone and mobile email images were also inspected for field labels, focus outlines, button hit areas and content wrapping.

Findings/history:
- [P2, resolved] The browser's default Tab traversal did not reliably return from the last control to the first. Added explicit first/last Tab and Shift+Tab handling inside the top dialog, then verified both directions remain inside it.
- [P2, resolved] Escape must not bubble to the parent account settings dialog. The popup stops keyboard propagation and handles Escape itself. Browser verification confirms only the popup closes and focus returns to the triggering row button.
- No remaining P0/P1/P2 findings. P3: third-party reCAPTCHA retains its own visual style; existing contained overflow remains available on narrow screens.

Fidelity surfaces: preserved the established Songti headings, PingFang UI text, warm paper, brown ink and outline controls. New 560px maximum modal has a sticky heading/close action, compact field padding, warm border and restrained shadow. Both phone and email fields use the existing validation and send/confirm controls. Mobile layout fits the email field and actions without clipping. Existing raster art and brand images remain unchanged; icons use the existing Phosphor family. Copy changes are limited to the dialog close label, Cancel in place of inline Collapse, and removal of a repeated email explanation. Close-label translations cover all three UI languages.

Browser checks: both buttons open separate dialogs; initial focus enters the field; Tab/Shift+Tab stay within the popup; close button, Cancel, Escape and backdrop click close only the upper dialog; trigger focus returns; the underlying settings scroll position compares equal before and after opening/closing; invalid email still displays its error in the popup; real reCAPTCHA renders inside the phone popup; desktop and 390px mobile layouts verified. The parent account profile and search URL are preserved, and background profile scrolling is locked while editing. Latest console error log was empty. Temporary viewport override reset and phone popup left open for review.

Production build and 11 existing binding-service tests passed. No real verification message was sent and no account contact information was changed. This task changes presentation and keyboard/modal lifecycle only; previously recorded live-delivery and Firebase-configuration verification limits remain unchanged.

## 2026-11-06 — 保留独立弹窗背后的滚动条

final result: passed

用户明确要求打开手机/邮箱弹窗时保留原有背景滚动条，避免页面横向移动。本轮仅调整绑定弹窗的滚动锁定方式，字体、颜色、素材、文案及弹窗布局均未修改。基线 `/Users/rimon/.codex/visualizations/2026/11/06/binding-modal/04-phone-final.png`；修复截图 `/Users/rimon/.codex/visualizations/2026/11/06/binding-scrollbar/04-final.png`。两者均为同一搜索路由、账号资料、手机弹窗、1845×1242 CSS/图片像素，密度 1，无缩放。打开并检查了同目录 `05-comparison.jpg`（完整页面对照）与 `06-scrollbar-detail.jpg`（右侧滚动条及内容边缘对照）。

[P2, resolved] 原逻辑把 `.settings-scroll` 从 auto 改成 hidden，实测 clientWidth 从 1187 增至 1202px，内容左边缘从 477.5 移至 485px。移除该 overflow 切换，使用原生模态的背景隔离，并仅在背景滚动容器上阻止 wheel/touchmove；关闭时移除监听。输入及返回按钮的 focus 使用 preventScroll。

浏览器实测邮箱弹窗打开前、打开后、对背景滚轮操作后、关闭后，背景 clientWidth 均为 1187px，滚动条宽度均为 15px，内容宽度均为 1100px，左边缘均为 477.5px，scrollTop 均为 154。关闭后滚轮可将背景正常滚至 0，证明锁定已解除。手机绑定弹窗也确认保留 15px 滚动条、auto overflow 和相同内容宽度。最终画面滚动条在遮罩下仍可见；无遗留 P0/P1/P2。最新控制台错误为空，生产构建通过。此低影响交互修复以实际浏览器尺寸/滚动行为验证，没有新增实现镜像测试；触摸阻止路径未在真实触屏设备上测试。未发送真实短信或邮件。

## 2026-11-06 — 手机号默认香港区号

final result: passed

按用户注释将手机号输入状态初值设为 `+852 `，实际预填而非仅显示示例占位符；保留编辑其他国际区号的能力。生产构建通过；刷新后在当前内置浏览器打开绑定手机窗口，截图确认初始显示 +852，输入未禁用。证据：`/Users/rimon/.codex/visualizations/2026/11/06/phone-default/preview.png`，1845×1242。该修改仅涉及初始字段值，布局、样式、验证及发送逻辑均未改变，无视觉 P0/P1/P2；未发送验证码。

## 2026-11-06 — 登录密码与邮箱密码登录

final result: passed (local implementation and isolated SDK tests; live credential changes not exercised)

Source: 用户要求在账号资料增加密码功能，沿用现有账号信息行及独立弹窗。基线为上方手机/邮箱绑定页面和用户最新注释；本轮新增密码行及必要登录入口，保留纸色、宋体标题、棕色文字、Phosphor 图标和原有设置外壳，没有新增素材或更换设计方向。

证据目录 `/Users/rimon/.codex/visualizations/2026/11/06/account-password/`：`06-profile.png` 为当前账号资料密码行，`01-desktop.png` 为设置密码弹窗，1280×720 CSS/图片像素，密度 1；`02-mobile.png` 为 390×844 的实际弹窗。手机无横向溢出，弹窗边框宽 341px，内部 scrollWidth 339px，字段及操作均完整可见。已逐张打开检查字体、对齐、遮罩、焦点框、留白和按钮。`03-change-fixture.png` 及 `04-login-fixture.png` / `05-login-actions.png` 为直接使用相同组件的隔离测试页面，用于检查已有密码字段、重置入口和访客登录表单；该页面无真实认证回调，不代表线上密码已设置。临时测试文件在检查后删除。登录表单超出短视口时可在对话框内滚动，Tab 到登录按钮会将操作滚入视口。恢复默认视口后，将实际设置密码弹窗留在预览中供查看。

浏览器检查：两个新密码输入默认 type=password 且为空；点击空表单仅显示 8–128 字符的本地错误；Tab 从最后操作回到关闭按钮，焦点仍在弹窗内；Escape 只关闭上层弹窗并返回密码行。实际打开前后 settings-scroll 的 scrollTop 均 549、clientWidth 均 952、offsetWidth 均 967，overflowY 保持 auto，原 15px 滚动条可见。最后控制台无错误。未输入或更改真实密码，未触发 Google 重新验证，未发送重置邮件。

服务逻辑：初次设置在重新验证 Google 后关联同一 UID；已设置时先校验当前密码再更新；校验已验证邮箱、两次输入、8–128 字符及 Firebase 密码策略。错误旧密码、邮箱未验证、策略失败、身份切换均不会继续写入。访客密码登录先备份待合并记录，使用 signIn 而非注册或将凭据错误关联至访客。密码仅存在组件临时状态及 SDK 请求中，不写入 localStorage 或 SQL 资料。

验证：生产构建通过（保留现有包大小及 Firebase 混合导入警告）；账号密码、绑定、认证流程、资料、云状态及 Sites 共 48 项测试全部通过。修复测试发现的缺失当前密码绕过校验问题。无遗留视觉 P0/P1/P2。Firebase Email/Password 提供商线上启用状态、真实密码设置/登录及邮件送达未验证；界面对未启用方式显示明确错误，不模拟成功。实现依据 [Firebase 账号关联](https://firebase.google.com/docs/auth/web/account-linking)、[用户密码管理](https://firebase.google.com/docs/auth/web/manage-users) 和 [密码认证](https://firebase.google.com/docs/auth/web/password-auth) 官方文档。

## 2026-11-06 — 登录与安全改为登录记录

final result: passed (current session + browser-local history)

用户最新注释要求将原“登录与安全”页改成登录 log。沿用注释中的设置外壳、暖纸色、棕色文字和细线图标；侧栏、面包屑、标题及资料页底部入口统一改为“登录记录”。原关联账号和 Google 安全说明区域替换为当前会话卡、最近登录列表及真实空状态；密码和联系方式仍由账号资料管理。当前会话使用 Firebase authTime 与 signInProvider，真实登录成功回调记录时间、方式及浏览器推测的系统/浏览器名称；刷新、令牌刷新、绑定重新验证不新增历史。不存令牌、密码、邮箱、原始 User-Agent、IP 或位置。

范围在页面明确说明：成功登录历史仅保存在此浏览器，按 UID 分开，最多 50 条；不覆盖其他设备、失败尝试或功能接入前的完整历史。已有会话可立即显示其真实认证时间，不填充虚构历史。Firebase 时间语义依据 [IdTokenResult 文档](https://firebase.google.com/docs/reference/js/auth.idtokenresult#idtokenresultauthtime)，不是服务端完整审计记录。

证据目录 `/Users/rimon/.codex/visualizations/2026/11/06/login-history/`：`01-desktop.png` 为实际账号页面，1845×1242 CSS/图像像素、密度 1；`02-mobile.png` 为 390×844，内容 clientWidth 与 scrollWidth 同为 342px，无横向溢出。已打开检查两种视口下的层级、内边距、时间显示、当前会话状态、空状态及底部范围说明，保留原外壳布局。实际已读取当前 Google 会话的认证时间，历史为真实空状态。`03-fixture-desktop-list.png` 为 1280×720 的隔离测试列表，`04-fixture-mobile-list.png` 为 390×844；这些使用相同组件及仅内存的模拟记录，没有写入真实账号历史。手机列表将时间移至设备信息下方，保持可读性；错误读取后点击重试恢复当前会话信息。临时测试页面在检查后删除。

验证：38 项登录记录、Google/密码认证流程、绑定及 Sites 测试通过，覆盖 UID 隔离、50 条上限、去重排序、跨标签页合并、损坏或禁用存储、认证期间切换账号及原始令牌不落盘；生产构建通过，保留既有大小/混合导入警告。无视觉 P0/P1/P2；最终控制台无错误。恢复默认视口，真实登录记录页留在浏览器。未退出、重新登录或更改用户凭据；没有部署服务端审计系统。

## 2026-11-06 — 资料自动保存并移除底部操作

final result: passed

按最新两处注释，移除“绑定通过验证即时生效，无需点击保存修改”说明，以及包含登录记录、取消、保存修改的整个资料页底部操作栏。显示名称在失焦或非输入法组合状态下按 Enter 时自动保存；头像完成读取后立即保存。保存反馈放在对应字段旁，失败保留名称并提供重试。切换栏目、Escape 或背景关闭时如仍在保存，成功后继续原操作；失败则留在原页。去掉原底栏撑高布局及废弃样式；其余外壳、插画、行布局、字体和配色沿用用户截图。手机号、邮箱、密码仍需各自完成验证操作，侧栏仍可访问登录记录。

证据目录 `/Users/rimon/.codex/visualizations/2026/11/06/profile-autosave/`：`02-desktop.png` 为真实账号资料，1845×1242 CSS/图片像素、密度 1；浏览器确认 `.binding-footnote` 和 `.profile-editor-footer` 节点数量均为 0。`03-mobile.png` 为 390×844，内容 clientWidth 与 scrollWidth 同为 342px，无横向溢出。已逐张打开检查移除后的底部留白、账号绑定行及手机布局；未更改真实用户的显示名称、头像或凭据。

自动保存用相同 AccountSettings 组件和隔离 UID 的临时页面验证，保存回调仅模拟、不调用真实资料写入；`01-fixture-saved.png` 记录成功反馈。实际浏览器验证名称失焦只提交一次、保存后同步侧栏名称、空名称不提交、未变更名称不重复提交、选择 PNG 后自动调用头像保存、保存过程中请求切换栏目会在成功后继续、模拟网络失败保留原输入和原栏目、重试后成功，以及编辑时按 Escape 会先保存再关闭。临时页面已删除。现有资料保存、绑定与 Sites 共 19 项测试和生产构建通过；保留既有构建警告。无遗留视觉 P0/P1/P2，真实页面控制台无错误，已恢复默认视口。未新增只复述实现的单元测试，交互以组件浏览器检查验证。

## 2026-11-06 — 最近浏览插画仪表板

final result: passed

用户 Comment 1 的第二张附件（1536 × 1024）为本次视觉来源。复刻范围是最近浏览内容区域；保留现有共享账号弹窗、账号数据和其他设定页面。原图中的示例曲目数量与统计数字由真实浏览记录和本地前台停留时长替代，不向真实账号注入示例数据。

### 视觉核对与修正

- 字体：标题和曲目名采用宋体衬线字体，正文保留系统中文字体，时长数字使用 Georgia。标题 30px、列表标题 23px，手机收至 25px / 20px；数字与单位保持层级。
- 间距：226px 插画统计横幅、69px 推荐条、44px 搜索框、88px 圆角列表。已修正刷新后旧最近浏览选择器覆盖新网格的问题；已缩短图表宽度，避免与右侧乐谱插画重叠。
- 配色：暖白纸面、浅桃色横幅、棕色正文、陶土色收藏与描边按钮。暗色模式有对应文字与边框规则。
- 图像：内置 image_gen 生成独立耳机/书本/乐谱/花枝背景，保留中心可编辑区域。已有曲目封面与 Phosphor 图标复用；没有将整页扁平化。插画细节和曲目封面与附件存在 P3 素材差异，共享弹窗仍保留现有边距和尺寸。
- 内容：统计、进度、曲目总数、日期、收藏状态来自本地数据；推荐根据最近浏览艺人从已有曲库选择。音色播放明确标识为练习演示。新增文案包含繁中和英文翻译。

### 浏览器证据

使用 Codex 应用内浏览器。桌面 1536 × 1024、手机 390 × 844；DPR 1。四行视觉状态通过临时独立测试 UID 验证，未覆盖用户记录。证据目录：`/Users/rimon/.codex/visualizations/2026/11/06/01a1b0d9-7070-7503-aca3-7d01aadd9e8f/`。

- `recent-desktop-final.jpg`：完整桌面四行状态，逐项与本次附件核对。较早的 CDP PNG 因浏览器合成重复而弃用，不作为视觉证据。
- `recent-mobile-final.jpg`、`recent-mobile-rows.jpg`：统计区域与列表操作。手机滚动容器 scrollWidth/clientWidth 均为 342px，列表宽 306px，无内容横向溢出。
- 已交互验证：关键词过滤、无匹配、推荐展开/收起、行内播放/暂停、收藏切换、键盘移除单条、清空后的零统计与空列表。

### 代码验证

工作区 node_modules 的 Vite 启动脚本调用 `node.exe`，在 macOS 不能直接构建。将改动同步至现有 macOS 预览副本 `/private/tmp/fyp-classroom.su7Tyg`，构建及 Sites 包装检查通过；历史/时长测试 8 项通过。保留工作区依赖目录。统计测试覆盖本地日期、连续天数、周图、账号隔离、清空和存储失败。未验证线上部署与跨设备统计（统计本来仅限当前浏览器）。

## 2026-11-09 — 按指定参考图实现完整登录页

final result: passed

本轮以用户指定的 `D:/Project/FYP/classroom/design-reference/login-page.png` 为视觉来源，覆盖此前紧凑邮箱优先弹窗的布局要求。实现位于 `classroom/src/AuthDialog.jsx` 和 `classroom/src/login-page.css`，预览为 `http://127.0.0.1:4173/static/classroom/?login=1`。页面使用真实 React 文案和表单，Google 在上、邮箱密码在下，保留已有 Firebase 认证与账号数据流程。没有部署。

### 比较条件与证据

证据目录：`D:/Project/FYP/classroom/design-reference/login-qa/`。

- 原图为 1448 × 1086；主要实现证据 `desktop-final.png` 同为 1448 × 1086，CSS 视口 1448 × 1086、DPR 1，无密度缩放。比较状态均为简体中文、浅色、空表单、同意已勾选、记住我未勾选、无错误、无菜单。
- 主比较在不连接 Firebase 的临时组件页面完成，避免为了获得访客外观退出真实账号。`comparison-final.jpg` 将原图与上述实现放在同一画布内；`comparison-form.jpg` 和 `comparison-type-art.jpg` 为表单、标题与插画区域的放大并排比较。三张比较图均已打开检查，而非只检查文件存在。
- `real-page-final.png` 是真实页面、同一 1448 × 1086 CSS 视口，账号仍登录。浏览器截图工具返回 1438 × 1079 像素；该图用于真实集成检查，不用于严格等像素主比较。右上角真实头像/昵称与参考图访客按钮的差异是预期状态差异。
- 响应式证据：`tablet-final.png` 为 768 × 1024；`mobile-final.png`、`mobile-bottom-final.png`、`mobile-english-final.png`、`mobile-dark-final.png` 均为 390 × 844。1024 × 900 CSS 视口的最终真实页面为 `medium-final.png`（工具返回 1014 × 891）；已检查其完整标题及两栏间距。
- `login-error.png` 和 `reset-feedback.png` 记录隔离回调下的失败与重置成功反馈。验证完成后已删除临时 `_login-qa.html`、`_login-qa.jsx`。
- 真实页面已恢复浏览器默认视口并留在应用内浏览器，`preview-default.png` 是最终打开状态（1280 × 720 CSS，工具返回 1270 × 714）。短视口允许登录页面正常纵向滚动。

### 发现、修正与后续比较

1. [P2，已修正] 初版标题字形、标题与插画间距、表单纸色与参考有明显偏差。调整 Ma Shan Zheng 标题尺寸/行高、插画层定位与卡片透明度，细化按钮和输入框尺寸。前序证据为 `desktop-first.png`、`comparison-first.jpg`、`desktop-second.png`；修正后见最终完整和局部比较，桌面主卡片保持 1112 × 596，参考视口中位置为 x150/y274。
2. [P2，已修正] 平板上的插画/功能项拥挤，1024px 故事标题发生裁切。调整中等宽度标题字号和行高，缩小人物并将其左移；768px 功能项改为紧凑两列。前序 `tablet.png`、`medium.png` 与最终 `tablet-final.png`、`medium-final.png` 对照，最终没有遮挡表单或裁切标题。
3. [P2，已修正] 手机英文卖点和品牌文字换行不稳，深色输入框仍过亮。增加英文断行和移动端品牌约束，补齐深色控件背景与边框。前序 `mobile-english.png`、`mobile-dark.png`，后序分别为对应 `*-final.png`。所测视口没有横向页面溢出。
4. [P2，已修正] 全页登录包含第二个共享导航，需要独立菜单 ID，并避免 Escape 穿透到背景导航；账号设置入口需要先关闭登录层。新增 ID 前缀和设置回调，实际验证菜单、设置、Escape、焦点与背景交互恢复。

没有遗留可执行的 P0/P1/P2 问题。

### 五项保真检查

- 字体与排版：手写标题复用现有 Ma Shan Zheng，正文使用既有中文系统字体，主标题、故事标题、表单标题和小字层级清楚；检查了中文与英文的行高、换行及小屏可读性。与参考原始手写字形的少量笔画差别列为 P3。
- 间距与布局：保持 60px 共享导航、全幅教室背景、标题/三个卖点、两栏大卡片及底部四项概览；主表单约 416px 宽，输入框、分隔线、选项行和珊瑚色提交按钮依照参考排列。手机把表单移到插画之前，保留正常滚动和关闭入口。
- 颜色与视觉样式：采用暖奶油、桃粉纸面、棕色文字、珊瑚按钮、淡暖描边。已根据并排图调整右侧纸色与边框；焦点、错误、禁用和深色模式均有清晰反馈。没有新增与本项目无关的配色体系。
- 图像质量：五次独立 ImageGen 调用生成教室背景、女孩/尤克里里/猫/沙发前景、春日小岛、手绘下划线和月桂枝，透明素材边缘与裁切已检查；每张保存原始提示词和 SHA-256。标准图标使用 Phosphor，Google 标识复用官方 FirebaseUI 资源。未用整页截图、CSS 绘画或自制 SVG 替代界面。共享品牌按用户更新后的芽与音符标识保留。
- 文案与内容：主要标题、卖点、功能项、Google/邮箱登录、记住我、找回密码及底部概览对应原图。统计数字增加小型“示例”说明，不伪装真实用户规模。服务条款弹层明确为演示使用说明；已有账号身份、收藏等继续使用实际数据。没有恢复 GitHub 或 Apple 入口。

### 交互与代码验证

- 隔离组件验证：邮箱/密码必填、密码显隐、失败后清空密码、错误提示、同意校验、Google 回调携带 google.com 与 remember=true、密码回调携带 remember=false、重置成功及禁用反馈；Tab/Shift+Tab 聚焦循环、嵌套弹层 Escape、手机菜单 Escape、关闭后焦点/滚动/背景交互恢复均通过。
- 真实页面验证：登录页导航可打开乐谱搜索；在已有搜索 URL 打开预览后按 Escape，只去掉 login 参数并保留原搜索 hash；账号菜单可从登录页进入实际账号设定，退出设定后搜索状态不变。没有点击打卡、退出登录或发送邮件，没有输入或更改真实凭据。
- 真实页面最终控制台 error/warn 列表为空。临时开发期间的旧 HMR 错误不作为最终状态；本地 Vite 服务已恢复并留在 4173 端口。
- 本轮生产构建及 Sites/Firebase 构建打包通过。账号密码、认证流程、账号数据、登录记录与 Sites 共 33 项现有测试通过；保留现有 Firebase 混合导入与包体积警告。样式修正后已完成最终构建，没有新增只复述实现的测试。
- 真实 Google 登录、真实密码登录、跨会话持久化及重置邮件送达未在用户账号上执行；已有认证服务由现有测试及隔离 UI 回调检查覆盖，不能据此声称线上认证链路已经完整实测。

### 接受的差异与后续微调

[P3] ImageGen 重绘在花枝、衣褶、人物表情、下划线笔触和局部背景亮度上与原图存在差别，图标轮廓及手写字体亦非逐像素相同。当前共享品牌、可用的关闭按钮、统计示例标签及窄屏重排是有意适配。没有将“1:1”解释成一张不可交互的整页图片。

完成清单：独立素材及提示词齐全；桌面完整/局部比较通过；平板/手机/英文/深色检查通过；真实页面导航与返回通过；既有账号保持；临时验证文件删除；预览保留。后续可按用户反馈继续微调 P3 视觉细节。
