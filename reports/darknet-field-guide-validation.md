# Darknet / Tor field guide — publication validation

Date: 2026-10-11. Baseline: `3bf70ce818ce2063d7d6dbe8a70e563eac8a70a5` on `main`.

## Delivered routes and components

- English: `/blog/darknet-tor-onion-services/`.
- German: `/de/blog/darknet-tor-onion-services/`.
- Full original articles, reciprocal article language controls, native expandable FAQs and responsive contents navigation.
- Six localized HTML/CSS figure panels: direct connection, ordinary web through Tor, onion-service rendezvous, observer visibility, qualitative performance, anonymity limitations.
- Shared stylesheet: `assets/blog/darknet/field-guide.css`.
- Original social previews: `assets/blog/darknet/social-{de,en}.{svg,png}`. PNGs are 1200 × 630 exports of the corresponding editable SVGs.
- Both blog indexes and their ItemLists, both RSS feeds and the existing blog sitemap updated. The indexes now list 31 articles per language. Only affected blog sitemap dates were updated.
- Canonical, reciprocal EN/DE/x-default alternates, Open Graph/Twitter metadata, BlogPosting and BreadcrumbList structured data. Visible FAQs deliberately have no FAQPage markup.

## Technical and editorial review

The onion illustration follows the Tor Project's usual six-relay overview: client-selected guard, middle and rendezvous, plus three service-selected relays. Both sides reach rendezvous through Tor. Rendezvous is explicitly not an exit. Descriptor lookup and introduction are explained separately from the established data path. Ordinary web traffic has a conventional exit, and HTTPS is distinguished from Tor circuit encryption.

Performance descriptions are qualitative. No benchmark numbers, geographic routing claims or universal anonymity guarantee appear. Endpoint compromises, identifying accounts, document risks, human behaviour and traffic correlation are covered. Bitcoin addresses are described as pseudonymous, not verified civil identities.

The personal material is drawn from Dennis's supplied mission. His Medium tutorial was independently checked: author Dennis Hilk, 13 July 2019, BankSocietyCoin example. The text does not identify that example as his own experimental coin or recommend the old dependencies today.

The three World Observer pages were inspected in the repository and linked with explicit methodological limits. Their dashboards were not changed. Historical OONI reports and the dated OHCHR statement are not represented as current nationwide measurements or Tor-availability evidence.

## Executed checks

- `node --test tests/darknet-field-guide.test.mjs tests/blog-rss.test.mjs tests/sitemaps.test.mjs tests/seo-sitemap-generator.test.mjs`: **24 passed, 0 failed**.
- `npm run test:seo`: **0 validation errors** across 1,056 HTML files and 1,001 indexable routes. No broken crawlable internal links, sitemap omissions, duplicate sitemap URLs, broken language pairs, canonical mismatches or missing image alt attributes.
- `node scripts/generate-blog-rss.mjs --check`: **31 entries, current, in each language**.
- `node scripts/sync-seo.mjs --sitemaps-only`: existing generator successfully discovers both routes and preserves targeted publication dates; no unrelated sitemap output changes.
- Parsed both new articles with lxml's HTML parser: **no parser diagnostics**, unique IDs, internal URL targets and target fragments checked.
- Headless Chromium with Playwright: English and German at **390 × 1000** and **1440 × 1000**. No horizontal page overflow, missing images, page JavaScript exceptions or HTTP error responses. Six figure panels present. Direct article language switching and native FAQ expansion verified.
- JavaScript-disabled mobile context with reduced-motion preference: figure contents present and native mobile table of contents opens.
- Figure screenshots and the original German social preview visually inspected. Figure-only screenshots hide the existing sticky site header solely for capture; site styling is unchanged.
- `git diff --check`: clean.

## Sources and limitations

Tor Project documentation, Tor specifications, the original USENIX Tor/Turtle publications, Internet Society history, SecureDrop documentation/directory, Bitcoin.org, OONI and OHCHR support the linked technical and historical statements. References appear inline and in the article source lists. All diagrams and social artwork are original; no Wikimedia image licence obligations arise.

The New York Times's own `/tips` page could not be retrieved by the research browser. Its SecureDrop entry and listed newsroom landing page were verified through the official SecureDrop directory. No live onion endpoint or confidential submission workflow was tested. The Internet Archive's about page supplied little extractable content; the article uses only its general archive role and links its homepage.

The runtime's standard Chromium download returned invalid archives; browser validation used a Chromium binary from the npm-distributed `@sparticuz/chromium` package, without adding site dependencies. The cloud browser could not access the local HTTP server; successful browser tests ran locally against the repository's files.

No production deployment, SSH access or Worldnode modification was performed. Public article URLs become available after Dennis deploys the pushed repository.
