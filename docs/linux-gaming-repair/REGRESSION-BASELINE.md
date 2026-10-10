# Regression baseline

Baseline source: `61e2eeca` (`main`, before Gaming Repair Center changes).
Captured during the 2026-10-10 implementation session.

## Relevant diagnostic projects and SEO

```
node --test tests/linux-fix-lab*.test.mjs tests/linux-hardware-explorer*.test.mjs tests/seo*.test.mjs tests/sitemaps.test.mjs
node scripts/audit-seo.mjs
```

966 tests passed; 0 failures, skips or cancellations. The SEO audit reported
0 validation errors, 943 unique sitemap URLs, no missing indexable routes,
broken hreflang pairs or crawlable internal links.

## Broader existing Node suites

```
node --test tests/*.test.mjs tests/*.test.js
```

1,549 tests: 1,528 passed, 21 failed, 0 skipped. These failures precede
this change. The final regression check compares the failing test names to
this list; it does not claim a clean overall repository suite.

- route, exact card order, metadata, neighbors and sitemap
- supporting HTML is crawlable and the Home Computing Lab supplies one incoming link
- starfield uses the rendered viewport, a DPR backing store, and centered coordinates
- Lab 06 public routes and Academy availability metadata remain scoped
- Lab 07 routes, availability metadata, and shared service monitor integration are scoped
- Lab 08 recovery is cumulative, stateful, resettable, and publicly routed
- Certificate V2 keeps earned and locked states, editable name, reset, and print appearance
- project metadata presents the ongoing novel and uses its cover image
- main landing page uses full-card links for the novel and workstation
- landing page centers the download and support button groups
- featured story and interactive experiment order are exact
- Telephone Exchange is available from the catalog and its information page
- tests/time-observer.test.js
- current export is rendered as raw country profiles without geographic invention
- published memory uses the real 105 numeric export-history points
- company identity and available catalog route remain production framed
- desktop peatland main grid is deterministic two-column row layout
- layout cleanup preserves approved visible labels and initial values
- observation limits card is unique and outside the two-column grid at full page container width
- peat context layout stays compact without stretching the pressure card
- English and German Hometown pages contain two matching rows of five cards

## Python suites

```
python -m unittest discover -s tests -p 'test_*.py'
```

66 tests; result `OK`.
