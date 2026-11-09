# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Learning entry icon direction

The user requested all five learning entry icons (reading, rhythm, sing-along, competition, community) to use a consistent flat hand-drawn doodle style: organic pencil/fineliner outlines, sparse pastel accents, transparent backgrounds. Preserve the existing five-card layout and subjects. Avoid glossy, dimensional, rendered or sculpted icon styling for these entries.

Keep all five learning icons smaller and fully inside their cards, with clear space above the title. Use responsive sizes for desktop, tablet and phone; avoid negative icon top offsets.

Keep score-type filters in the popular scores section. The responsive hero illustration must cover the section height and blend into the page background without a visible horizontal seam.

## Shared page alignment

Use one responsive content container for the header, five learning entries, score grid and community content. Align their actual inner left and right edges. Keep the hero illustration full width. Scores and community panels share the same horizontal padding; derive the shared inner width from the outer container minus panel padding and borders. Adjust gutters through shared CSS variables at breakpoints, rather than independent widths, margins or horizontal offsets.

Scores and community panel titles need visible space above them. Match the actual visible gap above the title row to the left and right content inset at every breakpoint. Use the shared panel inset for top padding and let title rows size to their contents with bottom padding, rather than vertically centering them in fixed-height rows that add extra space above the title.

The user removed the entire popular learning recommendation strip from the hero. Keep it absent and retain the five learning entry cards. Preserve the original hero height (480px desktop, 520px tablet, 640px compact tablet, 633px phone); do not shorten the hero when removing the strip. Center the heading, promises and search panel together vertically in the area above the learning cards, using a flex container rather than independent top offsets.

The hero search panel order is: heading, popular search chips, search input/button, then supported-input help text. Keep a consistent 10px vertical gap on desktop and 8px on phone, with content-sized panel height and no extra child margins. Preserve vertical centering of the whole hero introduction.

## Footer

The user requested a footer below the community section. Keep it consistent with the warm paper palette, shared content alignment and hand-drawn music theme, with working learning/community shortcuts and a return-to-top action.

## Score labels and community controls

Use compact paper-style labels with a small icon for score badges, replacing glossy pills. Keep all community category tabs grouped at the left with consistent gaps and horizontal scrolling on narrow screens. Remove the publish-performance button from the community section heading, as requested by the user.

Score cards must show artist credits below each song title; identify traditional songs and instrumental composers accurately. Give the title, artist, instrument, difficulty and action rows clear vertical spacing and comfortable top and bottom padding. Artist names must also be searchable.

Place the instrument badge and difficulty stars on the same card metadata row, with the instrument on the left and difficulty on the right, vertically centered on the same horizontal line. The user clarified that centering means aligning the vertical centers, not centering the whole group horizontally. Keep the row fitting on desktop and phone.

The header needs a little extra top and bottom breathing room: increase its established height by 10px, keeping controls vertically centered.

Place score-type filters and community category tabs beside their respective section titles, replacing the descriptive subtitle copy. On narrower screens, wrap categories onto a full-width second header row with scrolling as needed.

Keep the vertical document scrollbar visible and slim, using warm paper and muted brown colors consistent with the page. Support Firefox and WebKit/Chromium scrollbar styling without intercepting native wheel or touch scrolling.

## Search suggestions

Clicking or focusing the hero search field opens a panel directly below it. Keep its sections ordered as popular search terms, the user's search history, then results matched to the current input. Match song titles, artist credits and instruments as the user types. Use real browser-local search history, retain it across reloads, and provide individual deletion and clearing. Suggestion selections must fill the field and apply the search. Preserve the existing collapsed hero layout and allow the panel to overlay the content below without clipping on desktop or phone.

Search suggestion rows show the song title and artist, without instrument labels such as piano or guitar on the right.

Opening and closing search suggestions must keep the hero illustration and surrounding page stationary. Keep the hero's overflow behavior stable; clip only the illustration in its own non-scrolling frame, rather than toggling the hero between hidden and visible overflow.

## Score library reference

The score search body follows `design-reference/score-library.png`: a 250px filter sidebar, five-column score grid at the reference desktop width, without related forum recommendations below. Keep each illustration and thumbnail as a separate asset under `public/assets/score-library/`; do not flatten the page into a screenshot. The original home design is the source of truth for the library banner: preserve the home heading, promises, search panel order, note card and illustration. Match the home introduction dimensions at every breakpoint. The five learning entry cards remain on home. Counts must reflect the actual available demo data.

The complete score results area (filter sidebar and score grid) must begin below the full hero artwork, never overlap it. The library hero must reserve its complete responsive art height in normal flow; keep the introduction content at its original height. Leave a 4px gap after the artwork at every breakpoint. Move the sidebar and results together with their top edges aligned.

The score results main area must stay transparent over the shared page background; do not add a separate tiled paper texture or leaf background. Reuse the home hero artwork and preserve its complete responsive art frame height so its curved lower edge and fade remain visible above the results.

Remove the current-filters summary strip from the results panel. Keep the sorting dropdown directly after the score-type buttons, next to the piano-score tab on desktop. On narrow screens the title may occupy its own row; keep score types and sorting adjacent with horizontal scrolling for the score types.

Give score-card text areas comfortable vertical spacing: 11px top and 14px bottom padding, with visible gaps between title, artist, metadata and buttons. Let cards grow with their contents rather than enforcing the old fixed height.

The results sidebar shows difficulty, style and key only. Omit the instrument section and duplicate sidebar sorting controls. Difficulty keeps the All option and uses one to five stars without visible level-name text, while retaining accessible button names. On phones give difficulty the full sidebar width so the five-star option fits. Size the sidebar to its contents.

Do not show the related forum and discussion recommendation section on the score results page.

## Song detail and community arrangements

Clicking a score result opens a responsive song detail page following `design-reference/song-detail-visible.png`: shallow illustrated instructional banner, left navigation, song cover and facts, three recommendation cards, then four arrangement cards per row on desktop. Preserve this hierarchy and the source reference proportions. Generate every new illustration, portrait, cover and notation thumbnail separately with built-in image_gen; keep each asset and its exact prompt in `public/assets/song-detail/`. Never flatten the page or use a collage as multiple assets. Keep actual UI text, selectors, sorting, favorites and navigation in React.

Route song details through `#song?id=...`; titles and covers must correspond to the selected song, and return navigation preserves the search URL. Keep generated notation and community counts clearly labeled as demonstrations. The version selection flow, filter empty states and sheet preview controls must work on desktop and mobile.

The user clarified that Start Practice opens only the song detail content panel as a floating dialog over the existing search results. Do not duplicate the detail header or instructional hero in that dialog, change the search URL, or discard search/filter state. Provide a close button that remains visible during internal scrolling, Escape close, background scroll locking, focus containment, and correctly nested sheet-preview dialogs. Cover/preview navigation may keep the standalone song-detail route.

Arrangement status tags use compact paper labels with a thin outline, an ink-colored left edge, pale semantic backgrounds and dark readable text. Give official recommendations sage, popular coral, new arrivals teal, advanced lilac, featured sand, beginner leaf and light practice blue. Use matching outline icons instead of the repeated filled crown. Keep labels clear of author portraits on desktop and phone.

In the song information panel, show supported instruments derived from all available arrangement versions, independent of active filters. Show full instrument names for up to three instruments; for more, show icons with accessible names and hover labels. Keep this information visible in both the standalone detail page and practice dialog.

Version status labels must sit inside the card with a visible gap below the top border. Shift the rest of the card content down with them and preserve space between labels and author portraits on desktop and phone.

Keep the arrangement versions section directly on the page background without an outer card, border or rounded panel. Retain the individual version cards. Separate the song information above from the versions below with a thin warm divider and comfortable spacing on desktop and phone.

Search result cards open the practice version dialog when clicking their cover, text or unused space. Keep preview and favorite controls independent so their clicks do not also open practice. Use the home page paper badge appearance and matching semantic icons for result cover tags.

In the practice version dialog, place Return to Search Results at the top left on the same row as the close button at the top right. Keep both controls outside the internally scrolling content so they remain visible.

Give the practice dialog exit controls a dedicated 52px toolbar in normal layout, with 12px of equal top and bottom padding around the 28px buttons. Vertically center both controls within it. The scrolling content begins immediately below the toolbar, with no additional top padding or gap.

Song details use one continuous scroll: song information, arrangement versions, related discussions and similar songs all stay rendered in that order. Sidebar actions scroll to their sections without replacing content or changing the search URL. Use transparent active navigation with a thin outline and right-align all counts. Increase vertical breathing room around arrangement statistics; omit the separate View Score action and open the score preview from the card or its accessible title control instead.

Each arrangement card shows exactly two rows of the existing demonstration notation. Keep its description a concise single-line sentence with ellipsis on narrow cards, without the old multi-line minimum height.

Related discussions and similar songs continue directly on the detail page background, without enclosing cards, rounded outlines or separate fills. Separate each section with the same thin warm horizontal divider used between song information and versions, with comfortable responsive spacing.

The related-discussions section now follows `design-reference/song-discussions.png`: heading with overlapping avatars and a publish action, three illustrated featured posts, then category filters and four compact hot-discussion rows. The user clarified that the outer discussion container must remain borderless and transparent, without rounding or shadow, and start with the same thin warm top divider as the other sections. Keep the individual discussion cards. Discussions and similar songs share the same content edges and divider treatment. Open posts and the composer inside the discussions section, preserving the song dialog and search URL. Support category filtering, replies and quoted replies, likes, bookmarks, creating posts and deleting one's local demo posts/replies. Clearly label example community counts and browser-local persistence; do not imply a live community backend. Post titles follow the selected song.

In the practice dialog, put all four song-section navigation buttons in the fixed top toolbar between Return to Search Results and Close. Remove the dialog's left sidebar and let content span the available width. Preserve the 52px toolbar and keep exit controls visible; on narrow screens scroll the navigation horizontally within the same row. Keep the standalone detail page's sidebar.

Keep equal responsive horizontal insets around the complete song detail content, including the practice dialog. Popular discussions initially show 20 rows; Show More appends 20 rows and category changes reset to the first 20. Omit the separate discussion demo disclaimer below this list; retain the existing overall demo disclosure and local-storage guidance in publishing flows.

Omit the related-courses section and its song-section navigation entry from both the standalone detail page and practice dialog. Similar songs follow discussions directly.

Allow selecting the original singer or a specific cover singer before filtering arrangements of the same song. Keep performer credits separate from community arranger credits, show them on cards and score previews, combine singer selection with existing filters and sorting, and clear it with the other filters. Clearly label illustrative cover singers as demo data.

The user removed the singer-selection explanatory sentence, the entire similar-song recommendations section (including its navigation entry), and the overall demo-data footer sentence. Keep these absent from standalone song details and the practice dialog. Retain the inline demo labels on illustrative cover singers and score previews. This supersedes the earlier similar-song and overall-disclosure layout instructions.

## Arrangement practice workspace

Clicking an arrangement card replaces the content area INSIDE the existing song detail dialog with a practice workspace matching the supplied 稻香 practice reference: compact song header, notation and reading toolbar, warm paper score with five staff systems, side page controls, and a bottom transport bar. Keep the search page visible around the existing dialog, preserve its outer toolbar and close control, and do not open a fullscreen overlay or a second floating dialog. Preserve the selected song and arrangement credits, and return to the existing version list without losing search or filter state. Render notation with a music engraving library; keep exercise notation and synthesized playback clearly identified as demonstrations until actual song scores are connected.

The practice header (Return to Score List, song title, performer, version metadata and favorite) belongs in the existing top 52px dialog toolbar beside the close button. Do not show a second song header below it.

Keep difficulty text and stars out of the practice top toolbar, and omit its favorite button. Place the performer at the right, immediately before the practice count. Keep the bottom-player favorite control.

Show the selected arrangement author prominently in the practice top toolbar next to the song/version metadata, labeled 编配, including on narrow screens. Derive this credit from the chosen version rather than the original performer.

Practice controls now use theme-matched custom popover menus for notation and practice mode; notation has one trigger, with choices inside. Remove the font-size controls, retain zoom, and omit the mood text beside tempo. Show the singer directly before the arranger credit in the centered header; omit the former right-side singer badge. Render all notation continuously in a vertically scrolling score area with no page arrows or page count. Automatic following scrolls to the current system. Metronome opens a themed panel with live BPM, a 40–180 slider, increment/decrement and a separate playback toggle; hovering its trigger or panel allows mouse-wheel BPM adjustment without scrolling the score. Support outside dismissal, Escape, keyboard selection and narrow-screen positioning. This supersedes the earlier paginated score and right-side singer guidance.


## Header menus and languages

All header popovers (profile, courses and language) close on outside pointer interaction, focus leaving the popover and Escape; only one may be open at a time. Show the user name in the profile trigger with at most four grapheme clusters, followed by exactly `.....` when longer; preserve the full name in its title and accessible name. Keep the vocal-course navigation item removed. Replace the header search shortcut with a language selector for 简体中文, 繁體中文 and English, retain the selection across reloads, and keep the selector accessible on phones. Translate interface labels independently of song names, artist credits, user names and filter values.

Learning notifications open in a paper-style popover anchored below the header bell, reusing the shared outside-click, focus-leave and Escape dismissal and exclusive-open behavior. Keep the notification content and score-discovery action inside this popover instead of opening a modal. Keep the bell and popover usable on phones.

On desktop, center the main navigation as one compact group in the header, sized to its labels with consistent gaps. Do not stretch it across the available header width or distribute links with space-between. Keep account actions aligned to the right and retain the mobile navigation layout.

The site brand is 谱芽岛 and its tagline is 让喜欢的歌，在指尖靠岸。. Apply this identity consistently to the header, footer, browser title, metadata and welcome notices, including language variants.


## Account login

The account login now follows the user's selected `design-reference/login-page.png` as a full-page illustrated experience. This supersedes the earlier compact email-first dialog: keep the shared navigation, handwritten headline and promises, a translucent two-column panel with the ukulele girl and sleeping cat at left, Google sign-in first at right, then email/password, consent, Remember Me, password reset and the coral submit button, followed by the reference statistics with discreet demo labels. Preserve the site's shared sprout/note brand identity. Keep GitHub and Apple absent. Render real text, form controls and Phosphor icons; use the five separate ImageGen assets and their exact prompt files in `public/assets/login/`, never a flattened screenshot. On phones show the form before the illustration; on tablets keep the illustration and feature tiles clear of the form. Support language, dark appearance, nested help dialogs, focus containment, Escape and returning to the original page. `?login=1` opens this view for preview without signing the current user out.

Keep login backed by the existing Firebase project. Preserve anonymous favorites and progress when upgrading or merging into an existing account, password login/reset, real signed-in identity, logout and UID-isolated caches. Remember Me chooses browser-local or session-only Firebase persistence without storing a password or delaying the initial Google popup. The terms dialog is explicitly demo usage guidance until real service terms are provided; reference statistics are not claims about actual user counts.

Google sign-in must use `puyadao.top` as the Firebase `authDomain`, so the Google account chooser displays the site domain instead of the Firebase project hostname. Keep the matching Google OAuth redirect URI `https://puyadao.top/__/auth/handler` configured before changing or deploying the frontend.

Account menus must omit the signed-in learning-record sync status sentence; keep the user name, email and account actions.


## Navigation transitions

The user requested gentle transitions on the main header navigation. Keep subtle hover and focus feedback, smooth active-item changes, and a fading/sliding instrument-course menu with a rotating chevron. Preserve the compact navigation layout, keyboard dismissal and inert closed-menu controls, and disable motion for prefers-reduced-motion.


## Search card practice totals

Show 总次数 on the right of the instrument badge in search score cards, replacing the difficulty label and stars. Keep only this one practice-count display, without a separate count row above the action buttons. Share the count source with song details, implement selected generated option 1 (纸感书签): keep the landscape cover, warm cream paper and serif song titles, then a thin divider, an instrument badge and inline total count separated by a vertical rule, and equal-height outline Preview / coral Start Practice pills. Use the generated paper-edge raster for the clearly visible raised-center/wavy paper bottom shown in the selected image; the user means this paper silhouette when referring to the corners, not standard rounded corners. Keep its visible contour around 8px with a soft edge shadow, and preserve the compact information-area height. Place 示例 beside the artist, preserve all interactions, and keep the five-column results grid. At narrow widths the count may stack its label above the value to stay readable without overflow.

Keep the paper-card information area compact as clarified by the user: reduce vertical padding and gaps around the artist, divider and buttons, keeping the landscape cover, existing type sizes and button hit areas.

Reduce search-result card typography slightly: keep song titles, artist credits, instrument labels, practice totals and action text compact, with readable small labels on phones. This supersedes the earlier instruction to keep existing type sizes. Preserve card spacing and button hit areas.

Add 账号设定 to signed-in profile menus, opening a paper-style account details and language settings dialog. Separate logout from the regular actions with an inset warm divider and balanced space above and below; keep the divider independent of the button hover background.

Expand account settings using the supplied Discord reference: a wide dialog with persistent left navigation and a separate scrolling right content area, account identity at the top of the sidebar, and a persistent top-right close button. Keep the warm paper theme. Provide working Account Details, Sign-in & Security and Language sections; use compact horizontal navigation on phones. Preserve search state, focus containment, Escape closing and focus return.

The settings sidebar also includes My Favorites (shared song favorites), My Scores (saved arrangement versions and recent practice) and Recently Viewed. Read actual account favorites, keep recent views/practice isolated per UID in browser storage with a 50-entry cap, and link each entry back to its song or exact arrangement. Provide library search, favorite controls, empty states and history removal. Do not invent uploaded scores or prepopulate browsing history.

Make the account settings dialog and right content area more spacious on desktop (1440px maximum width, 960px maximum height, 1000px content width). Sidebar navigation selection uses a warm outline with a transparent background; keep hover transparent too. Preserve the compact phone layout.

Account profile decoration follows selected generated option 3 (岛屿留白): unboxed identity row with brand signature, small upper-right open-score/sprout island illustration, outline icons beside profile fields, and a pale musical-staff footer. Keep existing profile data and controls, spacious layout and transparent outlined sidebar selection. Use standalone generated raster assets, not a flattened mock.

Use the icon-only version of selected latest logo option 1 (芽与音符, sprout/note above a simple island arc) in the profile identity signature and settings sidebar footer. The user explicitly removed the three-character wordmark; display only the shared transparent graphical emblem, with accessible brand alt text and the existing footer tagline. Keep the mobile icon compact.

Settings sidebar footer now pairs the standalone graphical logo on the left with two stacked text rows on the right: brand name 谱芽岛 above the existing tagline. Follow the user’s supplied three-box layout sketch. This restores the name only in the sidebar footer; the profile signature remains icon-only.

The latest selected account-profile concept is the third displayed design from 2026-11-06: an inline editor with an avatar change control, display-name field, compact read-only provider/email information and Cancel/Save actions. This supersedes the earlier profile identity signature and musical-staff footer. Preserve the settings shell and sidebar branding; keep the small upper-right score/sprout artwork. Name edits use account authentication; uploaded avatars currently stay in this browser per UID, which must be stated visibly.

Account information now includes separate Google sign-in, phone-number and verified-email rows. Expand verification inline within the existing profile panel. Phone linking requires a real SMS code and reCAPTCHA; email changes apply only after the recipient follows the verification link. Show actual Firebase binding/verification state, mask contact details by default, keep Google connected, and never simulate a successful binding from browser storage. On phones place row actions below the information so email addresses remain readable.

Phone/email action buttons now open a separate small modal above account settings, superseding inline verification expansion. Keep the underlying profile and its scroll position intact. Provide a close button, Cancel, Escape and backdrop closing, contain focus in the top dialog and return it to the triggering binding button. Escape must close only the binding dialog while it is open. Preserve existing verification and resend logic.

Opening phone/email dialogs must preserve any existing background scrollbar visibly and keep the profile content width and scroll position unchanged. Do not lock the background by switching the settings scroller to overflow:hidden. Use modal inertness and background-only gesture blocking; restore normal scrolling on close and return focus without scrolling.

The phone-binding input defaults to an actual editable +852 country code followed by a space, not only a placeholder. Users may replace it with another international country/region code.

Account information also includes a separate login-password row with set/change actions in the existing independent modal. Require a verified email, confirm the new password twice, reauthenticate Google before linking an initial password to the same UID, and verify the current password before updates. Keep Google login available, provide email/password sign-in and reset-email entry points, and never persist passwords in browser storage or profile data. Preserve the background scrollbar and scroll position for password dialogs too.

The former Sign-in & Security section is now Login History (登录记录), including its sidebar, breadcrumb and profile-footer entry. Show the active Firebase session's authentication time and sign-in method, plus UID-isolated browser-local successful sign-in history capped at 50 entries. Clearly state the browser-only scope; do not invent past events, failed attempts, IP addresses, locations or cross-device coverage. Use authTime rather than token issuance/refresh time and do not log page refreshes or provider reauthentication as new sign-ins. Password/contact management stays in Account Details.

Account Details now saves profile edits automatically, superseding the former Cancel/Save footer. Remove the entire profile footer (including its Login History shortcut) and the binding footnote about not needing Save Changes. Save valid display names on blur or Enter and save avatars immediately after decoding; show saving/saved/error feedback next to each field, with name-save retry. If leaving during an in-flight save, complete the requested navigation/close only after success and retain failed edits. Keep the sidebar Login History entry and existing verified phone/email/password dialogs.

Keep the display-name field and its inline editing/automatic-save feedback beside the avatar, above the avatar change controls, as one responsive identity row. Do not repeat a separate name editor below it.

Explain before password setup, inside the password dialog and after success that the verified linked email plus the new password can sign into the same account; Google sign-in remains available.

The profile avatar itself is the accessible change-avatar button, with a small camera badge. Remove the separate avatar button and upload-help block beside the name; retain upload constraints in the avatar tooltip and keep reading/save/error feedback available. This supersedes the previous separate avatar-controls layout.

Place language and display preferences in Account Details below account information; remove the separate Language sidebar entry. Provide working light/dark/system appearance, reading text size and reduced-motion controls, saved per browser with immediate feedback. Respect operating-system appearance changes when System is selected, retain readable notation and original artwork, and keep preference controls responsive.

The preferences divider must follow the final account-binding row with the same bottom spacing as the preceding binding rows. Do not add a separate top margin to preferences that doubles the whitespace below Login Password.

## Custom dropdowns

Use theme-matched custom dropdowns throughout the classroom instead of browser-native select menus, including filters, sorting, publishing forms, playback speed and account preferences. Preserve menus that are already custom. Keep keyboard selection, outside/focus dismissal, Escape closing only the menu, form values, light/dark appearance and narrow-screen positioning working.


## Recent browsing rows

The user selected a borderless recent-history row with thin warm separators, a larger landscape cover, song title and artist on the left, then browsing time, favorite heart and an outlined 查看乐谱 action on the right. Apply this only to Recently Viewed, retaining the existing settings shell and library toolbar. Show Today/Yesterday for recent dates, keep older dates explicit, and preserve opening, favorites and individual history removal. Keep the remove control available on hover, keyboard focus and touch; stack row information and actions cleanly on narrow screens.

The user requested smaller Account Details heading/subtitle text and more compact Recently Viewed rows. Reduce recent-row cover size, title/artist/time/action typography, icon size and vertical spacing across desktop and phone layouts, while preserving the existing row structure and comfortable action hit areas. This supersedes the earlier larger-cover sizing preference.

## Profile menu shortcuts

Keep the header profile menu limited to My Favorites, 设定 (Settings), and Sign Out. Remove its learning-plan and check-in entries. My Favorites opens the existing account settings dialog directly on its Favorites section; Settings opens Account Details. Use the shorter Settings label in the standalone song-page profile menu too.

## Illustrated recent browsing dashboard

The user selected an illustrated Recently Viewed dashboard reference: peach headphone-and-score statistics banner, total preview time and goal progress, streak/count/average metrics with a seven-day chart, a compact artist recommendation strip, and rounded score rows with cover/title, sound demo, duration, timestamp, favorite and View Score. This supersedes the earlier borderless recent-row treatment only for Recently Viewed. Keep the shared settings shell and real account-isolated browser history; never seed example visits or fabricated statistics into a real account. Track foreground score-detail viewing time locally, label synthesized audio as a sound demonstration, and preserve search, recommendations, favorites, individual removal, clearing and responsive layouts.

The user removed the entire Recently Viewed artist recommendation strip, including its expandable recommendations. Keep it absent; place the search toolbar directly below the preview statistics banner with a comfortable gap.

The Recently Viewed statistics background was regenerated for the 谱芽岛 theme: warm watercolor paper, ukulele and music books on a small island at the left, a sheet-music paper boat and sprouts at the right, with the center kept quiet for live statistics. Keep decorative artwork clear of the text and chart.

Keep the Today preview-duration badge on the same header row as 近 7 天预览时长, vertically centered with that heading. Do not lift the badge with a negative top margin.

## Shared brand logo

The user designated the settings sidebar signature as the site's brand identity. Reuse `public/assets/brand/puyadao-sprout-icon.png` in the main navigation, page footer and browser favicon. In the header and footer, place the transparent sprout/note emblem to the left of two stacked lines: 谱芽岛 and 让喜欢的歌，在指尖靠岸。. Keep the warm serif wordmark, responsive icon sizes, existing navigation actions and shared content alignment; do not substitute a generic music-note icon for the brand.

## Settings identity card

The settings sidebar identity follows the user's compact reference: a larger circular avatar with a pale ring, bold account name, a purple Lv.6 badge beside 音乐学习者, and a right chevron. The user explicitly approved Lv.6 as a UI example, not a real account level; identify it in its tooltip and accessible label without persisting fake level data. Keep the actual account name and photo. Make the whole identity area open Account Details through the existing save-aware navigation, preserve long-name truncation, and keep the close button clear on phones. The user's follow-up removed the card fill: keep its background transparent in normal and hover states in both themes, with no resting border or shadow; retain accessible focus feedback and the avatar/badge treatments.

## Illustrated login page

The user's latest login reference is `design-reference/login-mirrored-reference.png`, superseding the earlier two-column benefit-card design. Mirror the room composition: girl, sleeping cat and piano on the left, one tall login card on the right, with all UI text reading normally. At 1448 × 1086 the card is 555 × 875 at x838/y145. Keep its brand, handwritten welcome, subtitle, small peeking cat, Google action, email/password fields, Remember Me switch, password reset and coral submit in that order. Omit the old hero headline, benefits and statistics. Generate missing raster assets individually with built-in ImageGen and save each exact prompt under `public/assets/login/`; keep actual controls in React and reuse the shared sprout brand. The Remember Me switch initially matches the reference's on state and still controls real persistence. On phones center the card, prevent horizontal overflow and keep the header clear of the brand. `?login=1` opens the page without signing out the current account; closing it restores the normal account header.

Keep the login card's complete brand group horizontally centered at every breakpoint, without compensating left margins. Cherry blossoms must extend from the background over the card's upper outer corner in the mirrored composition, using a separate transparent foreground asset. Keep blossoms clear of the brand text and close control; decorative overlays must not intercept pointer input.
