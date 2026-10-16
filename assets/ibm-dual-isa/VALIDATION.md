# Validation — 2026-10-16

## Executed and passed

- `node --test tests/ibm-dual-isa*.test.mjs tests/museum-*.test.mjs tests/blog-rss.test.mjs tests/jurassic-blog.test.mjs tests/apollo-11-*.test.mjs tests/imsai-8080-*.test.mjs tests/jurassic-park-sgi.test.mjs` — **134 passed, 0 failed**. Includes 19 new model/publication tests and existing museum, article, RSS, Apollo, IMSAI and SGI regression checks.
- `node scripts/test-ibm-dual-isa-browser.mjs` — both languages; all eleven cores and functional inspectors; context retention; arithmetic, memory byte order, taken/untaken branches, invalid operands, run/pause/reset; service request/response; four architecture comparisons; keyboard core selection; reduced motion; exhibit and article widths **320, 390, 768, 1440, 2048**; all ten article figures decoded; no JavaScript or missing-asset errors. Chromium headless-shell, local static HTTP server, off-origin requests blocked.
- `node scripts/test-museum-catalog-browser.mjs` — bilingual search/filter/reset, hardware category, unchanged Apollo pair, offline/no-JavaScript links, background geometry and reduced-motion behavior, twelve responsive combinations.
- `node scripts/test-imsai-8080-browser.mjs` — existing bilingual front panel, CPU demos, keyboard and WarGames scenarios.
- `node scripts/test-jurassic-park-sgi-browser.mjs` — existing bilingual 3D filesystem, real file viewer, camera preservation, recovery and offline controls.
- `node scripts/test-jurassic-blog-browser.mjs` — existing bilingual article figures, TOCs, language/exhibit links and responsive layout.
- `node scripts/audit-seo.mjs` — **0 validation errors**, no missing sitemap entries, duplicate sitemap URLs, missing titles/descriptions/alt attributes or broken crawlable internal links.
- `git diff --check` — clean.

Browsers use `/tmp/headless/chrome-headless-shell-linux64/chrome-headless-shell` through each script's documented executable environment variable. No Firefox or Safari run is claimed.

## Existing regression limitation

The optional `scripts/test-apollo-11-browser.mjs` fails its existing **English 320 px horizontal-overflow assertion**. This was independently reproduced from an unmodified `git archive a32887a2` baseline in `/tmp/dual-isa-apollo-baseline`, at the same assertion (line 22). The present change does not modify the Apollo exhibit. Its automated model/integration/UI tests pass as part of the 134-test run. The optional Apollo browser suite is not reported as passing.

## Publication/model checks

Two complete new articles (approximately 2,570 English and 2,242 German generated words), reciprocal localized links, canonical/hreflang, BlogPosting and breadcrumb JSON-LD, local social previews, dates, RSS and sitemaps are generated through the existing publication pipeline. Article date: 2026-10-16. Final images: four genuine localized WebP browser captures, six original localized SVG diagrams, two localized 1200×630 PNG social cards (about 544 KiB combined).

No real IBM or Arm hardware, binary execution, banking service, trained fraud model, measured processor performance or commercial launch date is asserted by these tests.
