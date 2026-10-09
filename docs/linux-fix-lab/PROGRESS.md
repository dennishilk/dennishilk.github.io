# Linux Fix Lab — official launch checkpoint

2026-10-09: Dennis explicitly approved the official launch after browsing the unlisted real-site release 3f07061f. Scope: enable indexing and the dedicated sitemap; replace the World Observer Featured Projects card on both homepages with Linux Fix Lab. Preserve World Observer navigation, pages, dashboard data, every other featured card, the blog and other existing pages.

| Component | Actual completion |
| --- | ---: |
| Problem types / categories | 150 / 12 |
| Localized article pages / landings | 300 / 2 |
| Log signatures / supplied negatives | 163 / 326 |
| Diagnostic assistants / reachable nodes | 18 / 126 |
| Diagnostic command strings | 325 |
| Solution sections / localized anchors | 301 / 602 |
| Lab tests | 655 passed, 0 failed |
| Launch homepage/sitemap integration | 15 passed, 0 failed |
| New Lab indexing policy | index,follow,max-image-preview:large |
| Dedicated sitemap | 302 unique Lab URLs |
| Sitewide sitemap URLs / SEO errors | 611 / 0 |
| Existing pages receiving new Lab links | English and German homepages only |

Publication controls are in content/linux-fix-lab/publication.json. All three launch gates are enabled. The root Lab sitemap is integrated in sitemap-index.xml and robots.txt; its URLs are excluded from other sitemaps to avoid duplicate ownership. Homepage changes are limited to the requested card in its existing position and layout.

The original unlisted release passed 655 Lab and 42 integration tests. The official launch retains the content and runtime assets; updated release tests verify indexing, sitemap ownership and the two authorized homepage links. See REVIEW.md and REGRESSION-BASELINE.md for verification results and limits.

Before the launch update, actual HTTPS verification of the unlisted release passed for all 302 pages, six Lab assets and 82 existing files. All pages matched their approved commit bytes; 9,040 internal Lab links and 602 solution anchors across 301 solution pairs were valid. These are HTTP/source checks, not automated browser interaction. Repeat against the launch commit after Worldnode sync.

Browser modules use .js after an actual nginx check found .mjs served as application/octet-stream. No nginx or shared language/CSS changes are required. No extra dependency, backend or paid API is introduced.

Worldnode serves /srv/www/dennishilk.github.io directly through nginx. The first server sync retained its separate dashboard commit through a normal merge. After each main update, synchronize that checkout while preserving its local commits, then verify the actual HTTPS URLs and assets. GitHub Pages success alone does not establish deployment on the real domain.

Edit source JSON and run build:fix-lab, test:fix-lab and test:seo separately. Preserve IDs, localized slugs and solution anchors. HTML/catalog/manifest/sitemaps are generated. Sources and synthetic fixtures do not establish a reproduced cure on an affected machine. Browser interactions are tested by Dennis on the actual site; automated control-browser is unavailable in this session.
