# Existing regression baseline

Main baseline: `17a5b92af148cc76fd52ecaf3be12a2d5aca1551`.

The unchanged baseline has 579 tests: 550 passed, 29 failed. The approved unlisted live-test implementation has 1,234 tests: 1,205 passed, 29 failed. No failing subtest name was added or removed. Existing homepage tests and pages remain unchanged.

Lab-only: 655 passed, 0 failed. Affected integration: 42 passed, 0 failed. The full suite remains red because of inherited unrelated failures.

| Existing failing subtest | Location |
| --- | --- |
| route, exact card order, metadata, neighbors and sitemap | `tests/bbs-system.test.mjs:8:1` |
| supporting HTML is crawlable and the Home Computing Lab supplies one incoming link | `tests/c64-integration.test.mjs:143:1` |
| starfield uses the rendered viewport, a DPR backing store, and centered coordinates | `tests/firefox-cross-browser-regressions.test.js:8:1` |
| homepage presents the author identity and exact featured project order | `tests/homepage-featured-projects.test.mjs:7:1` |
| Lab 06 public routes and Academy availability metadata remain scoped | `tests/linux-academy-virtual-system.test.js:234:1` |
| Lab 07 routes, availability metadata, and shared service monitor integration are scoped | `tests/linux-academy-virtual-system.test.js:283:1` |
| Lab 08 recovery is cumulative, stateful, resettable, and publicly routed | `tests/linux-academy-virtual-system.test.js:291:1` |
| Certificate V2 keeps earned and locked states, editable name, reset, and print appearance | `tests/linux-academy-virtual-system.test.js:397:1` |
| project metadata presents the ongoing novel and uses its cover image | `tests/lost-administrator-novel.test.mjs:12:1` |
| main landing page uses full-card links for the novel and workstation | `tests/lost-administrator-novel.test.mjs:34:1` |
| landing page centers the download and support button groups | `tests/lost-administrator-novel.test.mjs:52:1` |
| featured story and interactive experiment order are exact | `tests/museum-experiment-availability.test.mjs:24:1` |
| Telephone Exchange is available from the catalog and its information page | `tests/telephone-exchange.test.js:14:1` |
| tests/time-observer.test.js | `tests/time-observer.test.js:1:1` |
| Wiesmoor is the only permanent map node and country data does not render persistent map dots | `tests/traffic-live-stream-rendering.test.mjs:109:1` |
| temporary decorative origin appears only during an active route and is removed after completion | `tests/traffic-live-stream-rendering.test.mjs:121:1` |
| decorative map signals render for ZZ or unknown country data without deriving origins from payload | `tests/traffic-live-stream-rendering.test.mjs:139:1` |
| traffic page re-renders live requests and novel aggregates on every poll | `tests/traffic-live-stream-rendering.test.mjs:186:1` |
| novel reader hides per-chapter statistics and links to the novel landing page | `tests/traffic-live-stream-rendering.test.mjs:202:1` |
| novel reader changes do not alter analytics values or counting fields | `tests/traffic-live-stream-rendering.test.mjs:225:1` |
| novel reader signal handles zero activity and missing payloads | `tests/traffic-live-stream-rendering.test.mjs:238:1` |
| current export is rendered as raw country profiles without geographic invention | `tests/undersea-cable-dependency-map.test.mjs:95:1` |
| published memory uses the real 105 numeric export-history points | `tests/undersea-cable-dependency-map.test.mjs:148:1` |
| company identity and available catalog route remain production framed | `tests/unix-time-sharing-center.test.mjs:10:1` |
| desktop peatland main grid is deterministic two-column row layout | `tests/wiesmoor-peatland-rendering.test.js:122:1` |
| layout cleanup preserves approved visible labels and initial values | `tests/wiesmoor-peatland-rendering.test.js:170:1` |
| observation limits card is unique and outside the two-column grid at full page container width | `tests/wiesmoor-peatland-rendering.test.js:184:1` |
| peat context layout stays compact without stretching the pressure card | `tests/wiesmoor-peatland-rendering.test.js:263:1` |
| English and German Hometown pages contain two matching rows of five cards | `tests/wiesmoor-public-observers.test.js:31:1` |
