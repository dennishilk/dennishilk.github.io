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
