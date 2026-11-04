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

The score search body follows `design-reference/score-library.png`: a 250px filter sidebar, five-column score grid at the reference desktop width, and related forum recommendations below. Keep each illustration and thumbnail as a separate asset under `public/assets/score-library/`; do not flatten the page into a screenshot. The original home design is the source of truth for the library banner: preserve the home heading, promises, search panel order, note card and illustration. Match the home introduction dimensions at every breakpoint. The five learning entry cards remain on home. Counts must reflect the actual available demo data.

The complete score results area (filter sidebar, score grid and related discussions) must begin below the full hero artwork, never overlap it. The library hero must reserve its complete responsive art height in normal flow; keep the introduction content at its original height. Leave a 4px gap after the artwork at every breakpoint. Move the sidebar and results together with their top edges aligned.

The score results main area must stay transparent over the shared page background; do not add a separate tiled paper texture or leaf background. Reuse the home hero artwork and preserve its complete responsive art frame height so its curved lower edge and fade remain visible above the results.

Remove the current-filters summary strip from the results panel. Keep the sorting dropdown directly after the score-type buttons, next to the piano-score tab on desktop. On narrow screens the title may occupy its own row; keep score types and sorting adjacent with horizontal scrolling for the score types.
