# Linux Fix Lab 1.0 — approved unlisted live test

Dennis approved publication on 2026-10-09 under `/linux-fix-lab/` and `/de/linux-fix-lab/`, with all 300 localized articles and browser tools.

## Current release boundaries

- All 302 new HTML pages use `noindex,follow`.
- Existing homepages, Featured Projects, World Observer, navigation, blog pages, RSS, robots.txt and advertised sitemaps remain unchanged.
- No existing page links to the Lab. The final URLs are public and do not require a password.
- A draft sitemap with 302 reciprocal language pairs is prepared in `content/linux-fix-lab/prepared-launch-sitemap.xml`. It is not an active root sitemap or an advertised sitemap.
- The existing sitemap generator and SEO audit contain disabled, explicit launch integration. `publication.json` keeps it inactive; a later change requires Dennis's separate approval.
- Browser modules use `.js`, because an actual server header check found `.mjs` served as `application/octet-stream` while `.js` is served as `application/javascript`. No server configuration or shared assets were changed.

## Delivered implementation

150 problem types, 12 categories, 300 localized articles, two landings, 163 explainable signatures, 18 diagnostic assistants / 126 reachable nodes, 325 diagnostic command strings and 301 solutions with 602 localized stable anchors. Search, local worker parsing, contextual assistants, per-solution local confirmation and editable sharing are implemented. Raw log excerpts are omitted from exports by default; optional redaction is best effort. Logs are never uploaded or placed in storage/URLs.

655 Lab tests and 42 affected integration tests pass. Sitewide SEO remains at the existing 309 indexable URLs with zero errors. New Lab pages are deliberately excluded. Full regression: 1,205 passed / 29 inherited failures out of 1,234; no new failure names versus the unchanged main baseline. The independent source audit checks 24 complete entries across 12 categories, plus seven additional reads. See CONTENT-AUDIT.md and REGRESSION-BASELINE.md for limits.

## Reproduction

Use Node 22 or later. Edit source JSON, preserve IDs/slugs/solution anchors, then run each command separately:

```bash
npm run build:fix-lab
```

```bash
npm run test:fix-lab
```

```bash
npm run test:seo
```

No new package dependency, backend or paid API is required. Static HTML, catalog and manifest are generated; do not edit them directly. Existing integration is disabled until the explicitly approved official launch.

## Verification limits

After the authorized main update, verify all actual HTTPS routes, canonical/language metadata, noindex directives, static solution anchors and browser asset status/MIME/content. Verify that existing pages and sitemap advertisements remain unchanged. Post-publication HTTP results are reported separately.

Automated browser interaction is unavailable in this session: the Sites skill requires control-browser and forbids an improvised browser path when it is absent. No separate preview or server is started. HTTP checks and Node tests do not establish actual visual layout, tab/focus behavior, Web Share permissions or execution on all hardware. The user will test directly on the real URLs. Sources and synthetic fixtures never imply a reproduced cure on a affected computer.

The original first-review archive proposed homepage/blog integration and indexable pages. This current live-test release supersedes that proposal and deliberately does not activate those items.
