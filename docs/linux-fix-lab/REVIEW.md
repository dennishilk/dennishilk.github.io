# Linux Fix Lab 1.0 — approved official launch

Dennis approved the official launch on 2026-10-09 after browsing the real unlisted release. Final routes remain /linux-fix-lab/ and /de/linux-fix-lab/.

## Approved changes

- All 302 Lab pages use index,follow,max-image-preview:large.
- /sitemap-linux-fix-lab.xml contains the two landings and 300 localized articles, with exact reciprocal language pairs and build dates. It is integrated in sitemap-index.xml and robots.txt and owns its URLs exclusively.
- Linux Fix Lab replaces the World Observer Featured Projects card, in the existing layout and position, on both homepages. Each card links to its own language.
- World Observer navigation, pages and dashboard data remain intact. Other featured cards, blog/RSS and other existing pages remain unchanged. No new Lab links are added elsewhere.
- No preview, password, server configuration change, shared CSS/language change or new dependency is required.

## Implementation and verification

150 problem types, 12 categories, 300 localized articles, two landings, 163 signatures, 18 assistants / 126 reachable nodes, 325 diagnostic command strings and 301 solutions with 602 stable localized anchors. Search, worker-based local log parsing, contextual assistants, per-solution local confirmation and editable sharing are implemented. Raw log excerpts are omitted from exports by default; optional redaction is best effort. Logs are never uploaded or placed in storage/URLs.

655 Lab tests pass. Sitewide SEO reports 611 unique indexable sitemap URLs and zero validation errors. Affected integration and regression results are recorded in REGRESSION-BASELINE.md. The independent content audit samples 24 complete entries across 12 categories plus seven additional reads; it is not an all-entry or hardware reproduction claim.

## Reproduction and deployment

Use Node 22 or later. Edit source JSON, preserve identifiers and run these commands separately:

```bash
npm run build:fix-lab
```

```bash
npm run test:fix-lab
```

```bash
npm run test:seo
```

The publication controls explicitly require public-launch, indexing permission and sitemap activation. The builder preserves lastmod on unchanged outputs. Browser modules use .js for the real nginx MIME configuration.

Reconcile current main before publishing, preserve intervening dashboard updates and use a guarded non-forced main update. Worldnode serves its local checkout, so that checkout must also be synchronized while retaining local commits. Confirm all real HTTPS pages, exact localized language links, canonical/robots metadata, solution anchors, MIME/content of modules and the advertised sitemap after server sync.

## Verification limits

Automated browser interaction is unavailable: the Sites skill requires control-browser and forbids an improvised browser path when it is absent. HTTP checks and Node tests do not establish visual layout, focus behavior, Web Share permissions or execution on every browser/hardware. Dennis tests directly on the real site. Primary references and synthetic fixtures do not imply a reproduced cure on an affected computer.

The original proposal archive and first unlisted release are historical. This separately approved launch activates indexing/sitemaps and only the requested homepage card integration.
