# Mission 11 — Chernobyl Unit 4

Implemented 16 October 2026. Publication target: `origin/main` only; Worldnode is
manually deployed by Dennis.

## Deliverables

- EN exhibit: `/museum/chernobyl-control-room/`
- DE exhibit: `/de/museum/chernobyl-kontrollraum/`
- EN article: `/blog/chernobyl-rbmk-skala-control-room/` (2,843 words incl. captions)
- DE article: `/de/blog/tschernobyl-rbmk-skala-kontrollraum/` (2,716 words incl. captions)
- Five calm stations, ten inspection topics, four view options and eleven
  automatic/manual historical chapters.
- SKALA, DREG, PRIZMA and separate protection roles; recorded vs retrospectively
  calculated state explicitly distinguished.
- Six localized article figures, source SVGs, genuine implementation captures,
  optimized WebP variants and two 1200×630 social cards.
- First-person school-probe memory includes asking the caretaker, yellow
  lettering and the visual comparison from a neighbouring town. IMIS history
  is sourced separately; no historical probe identity is asserted.
- Catalog and search/filter integration: 24 exhibits, including two hardware
  and architecture entries. Existing exhibit order retained relative to one
  another. Five museum-blog stories in both localized indexes.
- Canonical, reciprocal EN/DE/x-default, Open Graph, Twitter cards,
  LearningResource/BlogPosting/BreadcrumbList, RSS and sitemaps.

## Validation actually run

1. `node --test --test-concurrency=1 tests/chernobyl.test.mjs
   tests/museum-bilingual-coverage.test.mjs tests/ibm-dual-isa*.test.mjs
   tests/museum-catalog.test.mjs tests/museum-blog.test.mjs
   tests/blog-rss.test.mjs tests/jurassic-blog.test.mjs
   tests/museum-seo.test.mjs tests/sitemaps.test.mjs
   tests/seo-sitemap-generator.test.mjs`
   — **94 passed, 0 failed**.
2. `node scripts/test-chernobyl-browser.mjs --capture`
   — PASS in existing Chromium, both languages, five stations, inspectors,
   view options, complete automatic sequence, pause/resume/manual navigation,
   last-step bounds, restart, direct links, history, keyboard and no-JS fallback.
   Viewports: 320, 375, 768, 1024, 1440. No overflow or console/page/HTTP errors.
3. `node scripts/test-chernobyl-browser.mjs --articles`
   — PASS; repeats interaction checks and adds visibility pause, real image
   decoding, localized article switch and article widths 320/375/768/1440.
4. `MUSEUM_CATALOG_BROWSER=<existing Chromium>
   node scripts/test-museum-catalog-browser.mjs`
   — PASS; bilingual filters, search/reset, destinations, offline/no-JS,
   responsive widths and unchanged catalog geometry. Zero page errors.
5. `node scripts/audit-seo.mjs`
   — **0 validation errors**; 1,039 indexable pages and 1,039 unique sitemap URLs;
   no broken crawlable internal links, missing image alt attributes or language
   mismatches. This checks local publication, not remote website deployment.
6. `node scripts/generate-blog-rss.mjs --check`
   — PASS: 43 articles per language.
7. `git diff --check` — clean.

Browser QA used the existing runtime Playwright and existing headless Chromium.
No browser was installed. The test HTTP servers close after their runs. Desktop
and narrow-layout screenshots, original section/monitoring diagrams, sequence
capture and social graphics were visually inspected.

## Limits

A deterministic, local presentation, not a physical reactor model or SKALA
emulator. The core diagram and panel are interpretive; no numerical peak power,
continuous historic telemetry, exact control-room geometry, historical software
screen or total casualty counter is claimed. Report-supported facts,
reconstructions and schematic graphics are separately marked. INSAG-7 is the
principal technical basis; NEA supplies context and UNSCEAR consequences.
See `assets/chernobyl-control-room/README.md` for sources and model boundaries.
