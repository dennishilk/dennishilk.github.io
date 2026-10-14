# Museum directory

Scoped to `/museum/` only. Existing exhibit pages and their applications are unchanged.
All 18 original exhibit destinations and the story / real-hardware links remain.

The static HTML provides crawlable links and full English fallback. Every catalog
label also has German copy. The site-wide language control remains responsible
for language selection; the catalog observes the document's language and updates
its own skipped subtree, keeping filters and results in sync. Native German
exhibit destinations are selected when that existing route is available.

JavaScript enhances the static grid with case-insensitive, accent-insensitive
multi-term search across both languages and keywords, combined with one selected
topic. Reset, clear, Escape, a live result count, and a no-results state are included.
Controls stay hidden without JavaScript. No exhibit runtime is loaded here.
Fonts reuse the existing locally bundled, licensed JetBrains Mono assets.

Verified in Chrome Headless Shell 141: English/German switching and native-route
selection; topic/search combinations; empty-state reset and input focus; clear
and Escape; offline filtering; 18 visible static exhibits without JavaScript;
no horizontal overflow at 320, 390, 768, 1024, 1440 and 2048 px in both languages;
zero uncaught page errors. Desktop and mobile screenshots were visually reviewed.
At 1440 px, all exhibit cards measure 164 px high. Reduced-motion CSS disables
hover movement and cursor animation.

Automated catalog, exhibit-integration, bilingual, localization and sitemap
regressions pass. The SEO audit reports zero validation errors. Historical
card-copy snapshots were replaced with destination/availability checks for the
new catalog. Existing noindex boundary checks permit the site's current follow
policy; the C64 incoming-link test checks the museum catalog's preserved link.

Reproduce browser checks with an installed Chromium-based browser:

```sh
MUSEUM_CATALOG_BROWSER=/path/to/chrome node scripts/test-museum-catalog-browser.mjs
node --test tests/museum-catalog.test.mjs
```

Optional `MUSEUM_CATALOG_QA_DIR` selects the screenshot directory. Otherwise QA
images are temporary. The harness aborts external decorative/font requests;
local bundled fonts and all site scripts remain available.

## A little more universe for Nebby

The overview explicitly opts into the existing homepage `stars.js` perspective
starfield via `data-museum-atmosphere="subtle"`. A route + body-class + attribute
guard permits only `/museum/` and its `index.html` alias. Every other non-homepage
route still removes the decorative canvas before allocating particles or starting
an animation. No exhibit pages or laboratory implementations are edited.

The homepage keeps its original 200 cyan particles, projection, speed and DPR.
The overview reuses that renderer with 140 particles (70 below 700 px), slow
movement, at most 24 draw updates/second (16 on mobile), and DPR capped at 1.25.
Scoped CSS keeps it behind the existing content, disables pointer events and
fades it toward the catalog. The body's existing background and card styling
remain unchanged. No particle library or external assets are added.

Reduced motion draws a static starfield with no animation loop, including when
the preference changes at runtime. Hidden tabs and page departure cancel the
loop; visibility/BFCache return resumes one loop only when motion is permitted.

Unit tests cover opt-in isolation, homepage behavior, density, frame limits,
resize, hidden tabs, page lifecycle and live reduced-motion changes. Browser
acceptance also checks painted pixels, layering, pointer pass-through, unchanged
card geometry and a stable reduced-motion canvas. Four representative exhibit
routes are checked for absent star canvases; all catalog interactions and both
languages retain their previous checks.

Release validation: 106 targeted regression tests pass; SEO audit has zero
validation errors. Chrome Headless Shell 141 passes the enhanced bilingual
responsive browser suite with no page errors. A 1.05-second idle sample produced
21 decorative draw updates and zero long tasks. This bounded local sample is
not a hardware-wide benchmark. Desktop/mobile screenshots were inspected.
