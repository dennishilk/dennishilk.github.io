# Mission 12 — Storage Media Lab

Implementation and source review: 16 October 2026.

## Published routes (after Dennis's manual deployment)

| Content | English | German |
| --- | --- | --- |
| Exhibit | `/museum/storage-media-lab/` | `/de/museum/speichermedien-lab/` |
| Feature article | `/blog/floppy-disk-zip-cd-usb-storage-history/` | `/de/blog/diskette-zip-cd-usb-speichermedien/` |

## Experience

1. **Storage gallery:** 14 selectable objects, including punched media, tape/reels, cassettes, 8-inch and 5.25-inch sleeves, DD/HD 3.5-inch disks, ZIP, CD, DVD, Blu-ray, USB and internal SSD. Distinct original illustrations; representative formats, operation, limitations and sources. Full static collection remains readable without JS.
2. **Inside the media:** three-step magnetic, optical and flash lessons, track/sector/head highlights, optical diagrams and conceptual logical-block remapping. Optional rotation respects reduced motion. SSD/NVMe is distinguished from removable media and NAND cell technology.
3. **How many floppies?:** Windows storage-space planning examples, custom B/MB/MiB/GB/GiB input, exact BigInt ceiling arithmetic, numeric results and a bounded Canvas grid with explicit bundle scale (at most 144 symbols). Zero requires zero media; invalid input shows an error; fractional bytes round upward. Maximum custom input is 1 EB.
4. **Disk 16 failed:** select volumes in any order and read them, inspect errors, retry, replace volume 16 with a good backup and resume. Wrong/no disk blocks progress. Three selectable reenacted faults (read, checksum, missing) persist until replacement. Fast-forward stops at an unresolved fault. 25/40/80 MB synthetic payloads, whole-volume byte accounting, reset and optional synthesized sound off by default. This is a state machine, not a real decompressor or recreation of a specific utility.
5. **ZIP → Ventoy:** Dennis's ownership facts with clearly generic drawings, shared calculator target or a 128 GB target, fractional equivalents/whole-media counts/linear visual comparison, completion links and return to gallery.

Only one main station is active with JS; numbered navigation, previous/next and keyboard focus are retained. Gallery, calculator and archive state persist while switching stations within the page. A reload restarts the experience; language navigation opens the other localized page.

## Editorial and imagery

- Two original features: English about 2,571 words; German about 2,173 words, including rendered source list. Existing localized article shell, table of contents, reciprocal alternates, Article/BlogPosting metadata and related exhibits.
- Dennis's actual `1000178668.jpg` (advertisement) and `1000178669.jpg` (cover) were obtained as individual uploads; the ZIP mentioned in the brief was not needed. WebP variants at 640 and up to 1280 pixels, actual dimensions, descriptive localized alt text, captions and explicit separate Microsoft artwork attribution. Cover rotated upright. No invented image substitutes.
- Documentary photography is supplied by Dennis; all other object/cutaway/capacity/social images are original explanatory illustrations. A Commons public-domain floppy photograph was researched but not used. See `assets/storage-media-lab/ATTRIBUTION.md`.
- Sources include IBM, Computer History Museum, Iomega's archived manufacturer manual, Ecma CD/DVD standards, Blu-ray Disc Association, Kingston's flash guide, Raymond Chen, archived Microsoft KB, archived id Software announcements, contemporary WIRED reporting, MusicBrainz (explicitly community discography), Steam/Larian and Ventoy. All links and access date are centralized in `sources.mjs` and rendered on-page.
- Personal part-16 recollection is explicitly separate from the documented seven-part Quake shareware distribution. No claim identifies the exact archive utility, cause, year or soundtrack contents of Dennis's disks. Game data, CD-Audio, extracted audio files and multipart archives are distinguished. No game/NIN audio embedded.

## Numerical conventions

| Target, decimal GB | Floppies at 1,474,560 B | ZIP nominal units at 100,000,000 B |
| --- | ---: | ---: |
| 80 | 54,254 | 800 |
| 70 | 47,472 | 700 |
| 150 | 101,726 | 1,500 |
| 128 | 86,806 | 1,280 |

74/80-minute Mode 1 CDs: 681,984,000 / 737,280,000 user-data bytes. Single-layer DVD comparison: approximately 4,700,000,000 B; Blu-ray: nominal 25,000,000,000 B. USB: 128,000,000,000 total nominal B, not RAM or 128 GiB. Filesystem/archive overhead and Ventoy partitions reduce available capacity. Figures compare capacities, not measured downloads, transfer speeds or playable modern-game floppy editions.

## Integration and reproducibility

- Museum card with text-only presentation (Mission 12.1), native German destination, searchable bilingual copy, derived counts/numbering (25 exhibits) and schema reference. Other exhibit designs unchanged.
- Both blog indexes, museum-story counts, RSS feeds and standard generated sitemaps updated. Existing publication build commands include the storage integrator so rebuilds retain the new entry.
- `npm run build:storage` regenerates both exhibit pages, both features and integration/RSS/sitemaps. Source modules, article fragments and committed image assets are kept in the repository; production needs no new runtime or package installation.
- Catalog regression expectations account for the extra hardware exhibit; the existing Chernobyl publication rebuild test includes the newly required integration step.

## Checks actually executed

- `npm run build:storage` — passed, repeated after observed changes.
- `node --test --test-concurrency=1 tests/storage-media*.test.mjs tests/museum*.test.mjs tests/blog-rss.test.mjs tests/jurassic-blog.test.mjs tests/chernobyl.test.mjs tests/ibm-dual-isa*.test.mjs` — 108 passed, 0 failed.
- Storage tests cover the four declared examples, zero/tiny/exact/one-byte-over/large values, explicit decimal versus binary units, invalid input, all three fault/retry/replace/completion paths, alternate payload sizes, unique page IDs, local assets and deterministic rebuilds.
- The shipped `ui.mjs` is also exercised in English and German through a small DOM adapter: one active station, station navigation, gallery selection, changed game calculation, error at 16, retry, backup recovery, completion and reset, with state retained across station changes. These are runtime integration tests, **not a real browser or layout test**.
- `npm run test:seo` — passed: 1,043 unique sitemap URLs, no duplicates, broken crawlable internal links, broken hreflang pairs, missing sitemap pages or validation errors.
- `node --check` on new UI, illustration and build modules; `git diff --check` — passed.
- Inspected actual original photographs and upright optimized cover visually. No browser screenshots were produced.

## Verification limits

The managed environment did not expose the supported control-browser capability. Per the Sites environment guidance, no preview server or alternate browser installation was used. Real desktop/tablet/mobile rendering, keyboard-only use in a browser, spoken screen-reader output, physical touch interactions and audible playback remain unverified. Responsive CSS, semantic controls, focus styling, live regions and reduced-motion rules were implemented and inspected, but this report does not label those browser checks as performed.

Worldnode deployment remains manual. This task changes GitHub `main` only.


## Mission 12.1 — catalog and final-station polish

- Removed only the Storage Media Lab card's inline preview image in the shared bilingual catalog and its integration generator. Card title, description, metadata and native German destination are retained.
- Root cause of the final-station blank graphics: static build-time SVGs and browser-generated gallery/drive SVGs restarted the same ID counter. The final ZIP/USB used `shadow-9`/`shadow-10`; gallery initialization introduced those IDs again. SVG fragment references are document-wide, and station visibility could make a referenced duplicate filter unavailable.
- Build-time SVG definitions now use the `page-` namespace and client-generated definitions use `live-`, with per-render counters inside each namespace. All gradient and filter references are rewritten together; neither panel nor its artwork was removed. Updated the UI/module URL versions so reloads fetch the corrected generator.
- Added regression checks for self-contained SVG references, no static/runtime ID collisions over repeated draws and fresh module counters, both preserved final SVGs, and image-free bilingual catalog markup. Actual UI-module tests now include EN/DE direct `#ventoy` initialization on two fresh fixtures and navigation away/back.
- Final verification: 115 automated tests passed; SEO audit reported 0 errors; `git diff --check` passed. These tests cover the fresh-load lifecycle and underlying SVG references, not real-browser rasterization or a literal browser hard reload. Browser visual inspection remains unavailable in this managed environment.
- GitHub main only; no Worldnode deployment.
