# Linux News & Security / Linux-News & Sicherheit

Permanent dated reporting section at `/blog/#linux-news` and `/de/blog/#linux-news`.
It covers releases, upstream changes, security advisories, regressions and verified
workarounds. The existing Networks & Security section remains the evergreen library.

## Add or update a report

1. Add a reciprocal DE/EN pair to `articles.json` and write original HTML fragments.
   Keep one H1 in the generated shell; give fragment H2 headings stable IDs.
2. Verify primary sources, package versions and archive pockets separately. Keep a
   dated evidence summary. Identify unresolved questions and the verification boundary.
3. Distinguish publication, modification and status-check dates. Advance dates only
   for a real editorial update; never refresh them just because a build ran.
4. Supply localized accessible visuals with the filename convention used by the
   builder, including mobile SVG and 1200×630 social PNG variants.
5. Run `npm run build:linux-news`, `npm run sync:seo`, `npm run test:linux-news`,
   `npm run test:seo`, and the existing RSS/sitemap/localization checks.

`npm run test:linux-news:browser` checks the real Chromium layout at seven widths
from 320 to 2048 pixels, localized SVG selection, table-of-contents links, sticky
header clearance, language switches and category cards. The dedicated GitHub
Actions workflow runs this without deployment and retains screenshots plus a
JSON report for seven days. Local use requires Playwright and its Chromium build.

`scripts/build-linux-news.mjs` reuses the existing localized article navigation,
footer, typography, table styles and responsive TOCs. It replaces only its own
index category, prepends its articles to the RSS-source ItemList, keeps article
counts accurate and preserves every other section. It uses no network access.

`scripts/build-linux-news-visuals.mjs` creates original explanatory assets. It uses
the already installed `sharp` package (the Codex runtime path is supported); this
optional asset-authoring step is not required for rebuilding HTML or feeds.

For operational advice, start with read-only diagnosis. Put backup, console and
second-session prerequisites before repair discussion. Do not publish a destructive
cleanup command as a copyable workaround. State when validation consists of source
review and upstream test evidence rather than an independently run Ubuntu system.

The Ubuntu report's `ubuntu-openssh.evidence.json` records the 19 October 2026 source
and amd64 binary publication check. It is an editorial snapshot, not a live status
service or an assertion about every architecture's installation state.

## November 2026 deep dives

The APT, kernel-AI and Plasma 6.8 features use the same builder and six canonical
fragments. `november-2026.evidence.json` records the dated primary-source checks,
release-specific package thresholds, counting units and research limitations.
It is an editorial snapshot, not a live vulnerability database.

`npm run build:linux-deep-dives:visuals` authors their responsive SVG diagrams and
localized social PNGs. The checked-in assets make the normal HTML rebuild
independent of sharp. `deep-dives.js` progressively adds local reference filters,
checklist progress and clipboard controls; it has no network or storage APIs.
Never replace the APT guide with a version scanner without independently testing
Debian version ordering and exact distributor/release mapping.

`npm run test:linux-deep-dives` checks operational command boundaries, counting
units and the no-JavaScript content. `npm run test:linux-news:browser` also tests
all guide choices, keyboard-operated checks and copy buttons, clipboard failure,
and complete fallback content with JavaScript disabled. The browser test uses
Playwright; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an existing compatible
Chromium executable for local QA.
