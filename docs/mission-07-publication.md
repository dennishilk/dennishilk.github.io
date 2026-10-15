# Mission 07 — Computer Museum meets the blog

Publication date: 15 October 2026. Publication authorized; GitHub main only.
Worldnode deployment remains manual.

## Published pages

| Language | Article | Route |
| --- | --- | --- |
| EN | The IMSAI 8080: The Real Computer Behind WarGames (1983) | `/blog/imsai-8080-wargames-computer/` |
| DE | IMSAI 8080: Der echte Computer hinter WarGames (1983) | `/de/blog/imsai-8080-wargames-computer/` |
| EN | The Apollo 11 Guidance Computer: How It Helped Land on the Moon | `/blog/apollo-11-guidance-computer-moon-landing/` |
| DE | Apollo 11: Wie ein kleiner Computer die Mondlandung unterstützte | `/de/blog/apollo-11-computer-mondlandung/` |

Each language page contains about 1,900–2,400 words, excluding site navigation.
Source fragments and editorial metadata live in `content/museum-blog/`.
`node scripts/build-museum-blog.mjs` rebuilds all four pages using the existing
localized blog navigation, article layout, TOCs, footer and styles.

## Search intent and integration

IMSAI targets the question “what computer was used in WarGames?”, with real
8080 architecture, an eight-switch example, a six-byte working program and
substantial discussion of real communications versus fictional systems.
Apollo targets how the guidance computer supported the landing, with word/byte
and clock distinctions, DSKY, Luminary, P63/P64/P66 and 1201/1202 recovery.
No keyword-volume, traffic, ranking or rich-result claims are made.

Both indexes contain a category using their existing guide-card components.
The indexes' ItemList metadata and article BlogPosting metadata remain the RSS
source of truth. Both feeds now contain 40 articles. The existing sitemap
architecture owns **both languages in `sitemap-blog.xml`**, reached through
`sitemap-index.xml`; duplicate entries were not added to `sitemap-de.xml`.
The SEO generator now derives missing blog lastmod dates from actual editorial
JSON-LD dates and preserves all previously recorded dates. This also fills the
missing dates on four previously published blog pages using their own metadata.

Reciprocal EN/DE/x-default, canonical URLs, dates, BlogPosting, BreadcrumbList,
Open Graph and Twitter metadata are supplied. No FAQ rich-result markup was
added. The two articles cross-link; IMSAI links to the existing WOPR routes,
and Apollo links to the actual Apollo DSKY routes. Both main exhibit builders
retain a contextual, localized backlink in their educational/source sections.
No catalog layout, simulator runtime, CPU, bonus logic or exhibit CSS changed.

## Evidence and images

Article sources list Intel's September 1975 manual, the IMSAI supplier's
firsthand production account, Computer History Museum, NASA's Apollo 11
Mission Report, Lunar Surface Journal, NASA's computer hardware/software
history, MIT history, the equipment familiarization manual and Virtual AGC.
The pinned local Luminary provenance and original source headers remain intact.
The alarm timeline was checked against the original mission report; the 8080
example was checked against Intel documentation and executed on our interpreter.
The article does not imply that the film's monitor effects ran on the visible
IMSAI, or that our landing model executes historical AGC code.

Visual provenance is in `assets/blog/computer-museum/README.md`: actual existing
IMSAI capture, Dennis's Apollo cockpit/source screenshots and DSKY crop,
six localized original SVG diagrams, four 1200×630 social images. Alt text,
captions, reserved dimensions, image language disclosure and lazy loading are
included. No movie imagery or unlicensed third-party photographs were added.

## Validation

- Full `node scripts/audit-seo.mjs`: **0 validation errors** (also 0 at baseline).
- 111 tests passed, 0 failed: museum-blog publication, RSS, localization,
  sitemap generation/coverage, museum bilingual coverage/SEO, Intel 8080 CPU,
  bonus and integration, Apollo physics, DSKY, source provenance, actual UI
  handlers in the existing DOM harness, viewport math and integration.
- The new six-byte program executes three instructions, stores 42 at 0200,
  and halts. Historical Executive excerpt matches the stored original file.
- Rebuilding articles is deterministic; all four social PNGs are 1200×630.
- `git diff --check` clean. Diagrams, social cards and supplied screenshots
  were inspected as images. Existing museum catalog, shared blog CSS and all
  exhibit runtime files remain unchanged.
- External source GETs were checked where possible. Some sites reject automated
  HEAD/GET requests; Intel's PDF was successfully downloaded/read, and IMSAI/CHM
  source pages were available through research retrieval. Such blocking is not
  presented as a successful universal external-link check.

Actual browser acceptance was attempted, but Chrome cannot launch in this
execution environment: its process-singleton socket call is denied with
`Operation not permitted`. **No desktop/mobile browser rendering, interaction,
console/network or responsive screenshot success is claimed for this mission.**
The automated UI harness is not a browser. Existing screenshot evidence and
static layout/asset checks do not replace final visual acceptance on Worldnode.

Re-run relevant checks:

```sh
node scripts/build-museum-blog.mjs
node scripts/build-imsai-8080.mjs
node scripts/build-apollo-11.mjs
node scripts/generate-blog-rss.mjs
node scripts/sync-seo.mjs --sitemaps-only
node --test tests/museum-blog.test.mjs tests/blog-rss.test.mjs tests/seo-localization.test.mjs tests/seo-sitemap-generator.test.mjs tests/sitemaps.test.mjs tests/museum-seo.test.mjs tests/museum-bilingual-coverage.test.mjs tests/imsai-8080-*.test.mjs tests/apollo-11-*.test.mjs
node scripts/audit-seo.mjs
```
