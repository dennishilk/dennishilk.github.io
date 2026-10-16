# Mission 10.1 validation — 2026-10-16

- **100 automated tests passed, 0 failed:** `node --test tests/ibm-dual-isa*.test.mjs tests/museum-*.test.mjs tests/blog-rss.test.mjs tests/jurassic-blog.test.mjs tests/sitemaps.test.mjs tests/seo-localization.test.mjs tests/seo-sitemap-generator.test.mjs`. Includes 23 dual-ISA computation/publication/station checks.
- **DE/EN Chromium browser acceptance passed:** default Architecture selection; exactly one visible panel; direct navigation to every station; all Previous/Next controls; manual ARIA tabs with arrows, Home/End, Enter/Space and proper focus; deep links, reload, hash navigation and browser Back/Forward; all eleven cores; retained selected core 07 and complete instruction state; retained service fields/request/response/phase and comparison choice; real interval cancellation when leaving CPU/service stations; explicit resume; independent reset; equivalent arithmetic, both branch paths and byte ordering.
- **Responsive browser checks:** each of the four stations at 320, 390, 768, 1440 and 2048 px in both languages, no horizontal overflow, reduced motion, local assets and zero console/page errors. Initial chip visibility checked at 1440×1000. Actual screenshots inspected on desktop/mobile; QA directory `/tmp/dual-isa-10-1-qa`.
- **No-JavaScript browser fallback:** all four informational sections and normal anchor links remain visible; research sources expand and the article link stays accessible.
- **Existing museum catalog browser acceptance passed:** bilingual filters/search/reset, offline and no-JavaScript links, reduced motion and twelve responsive combinations.
- **SEO audit:** `node scripts/audit-seo.mjs` — zero validation errors.
- **Scope verification:** `model.mjs` is byte-for-byte unchanged (SHA-256 `cc701fb4986b6ba9496ec5357dee2a7d2e3f5ffbd5e6bbfb037fc1180ab31d52`). Museum catalog, both published articles, their source fragments, existing illustrations, feeds and sitemaps are unchanged. Sources and scientific limitations remain available. The generator remains the HTML source of truth.

This mission uses the same documented educational computation limits. Navigation does not persist progress across a full reload or language change. Chromium headless-shell was exercised; no new Firefox or Safari browser pass is claimed. The earlier optional Apollo mobile-overflow finding below remains outside this exhibit's scope.

---

# Mission 10 original validation — 2026-10-16

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
