# Hardware Explorer architecture and evidence boundaries

The Explorer uses the existing static Fix Lab build, blog styling, native
language component, signature engine, guided-question transition function and
social intent builder. It adds a hardware-specific data layer; troubleshooting
claims remain in the existing problem/solution model.

## Files and build order

1. `content/linux-hardware-explorer/research/*.json` contains original bilingual
   profiles, reviewed identity rules and source provenance.
2. `workflows.mjs` and `knowledge.mjs` contain editorial observations and
   explanations. They display commands without executing them.
3. `build-linux-hardware-explorer.mjs` validates content, produces crawlable
   HTML and browser data projections, records content hashes and prepares
   the separate bilingual sitemap and problem backlinks.
4. `hardware-integration.mjs` applies publication gates to the Lab builder and
   SEO scripts. Review state produces no existing-page navigation changes.
5. `build-linux-fix-lab.mjs` adds contextual hardware links only when enabled.
6. `sync-seo.mjs --sitemaps-only` owns active sitemap grouping and robots
   advertisement. Disabling the hardware gate removes its advertisement and
   the hardware builder removes the obsolete root sitemap.

`npm run build:hardware-explorer` executes this order. Actual changed HTML hashes
set modification dates; identical builds retain their previous dates. The
editorial source-review date is separately shown on articles.

## Local runtime

`core.js` parses observations and matches catalog evidence without DOM or
network dependencies. IDs, optional qualifiers, class context, reported binding
and candidate modules are separate values. Missing driver lines never imply
an unbound device. Contradictory explicit observations remain conflicting.

`inspector-worker.js` runs parsing and the reused Lab signature detector inside
one module Worker. It returns device observations and signature IDs/counts;
matching raw log lines are discarded. Log findings are not attributed to a
device automatically. `controller.js` stops prior work, checks request IDs and
imposes a 15-second deadline.

`app.js` uses text nodes for all input-derived values, bounded result batches,
keyboard-operated tabs, public profile links, local allowlist summaries and
best-effort redaction. Clear, input edits, file-read generations, pagehide and
BFcache restoration prevent old async results from restoring private fields.
Public article pages load copying/sharing support without importing the complete
device catalog or guided workflows.

No pasted report is written to browser storage or transmitted. The shared
language component retains only its pre-existing language preference. Public
language context accepts known profile, category, sort, workflow and node IDs;
free search terms, chip IDs, raw reports and arbitrary URL parameters are omitted.
Social buttons require explicit interaction and open only the selected public
page plus the user's optional message. No social widget runs in the page.

## Phase 3 extension point

A future gaming repair component can reuse the local Worker lifecycle, public
context allowlist, existing Lab problem/solution anchors and publication gates.
Its observations and matching rules should remain a separate catalog adapter.
Hardware family evidence must not become a claim that a game, API or userspace
stack works. No gaming feature or new backend was added in this phase.

## Verification boundaries

Offline tests exercise pure functions, the actual module Worker under Node,
events in a minimal DOM contract harness, generated pages, source fixtures,
legacy regressions and an isolated publication/deactivation build. The DOM
harness does not render CSS or replace browser acceptance. No affected physical
device was tested, and the current environment exposes no supported browser
control capability. Rendering, real clipboard/native sharing and assistive
technology behavior still require an actual browser walkthrough before launch.
