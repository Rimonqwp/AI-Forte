# Design QA — 小谱音乐教室

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
