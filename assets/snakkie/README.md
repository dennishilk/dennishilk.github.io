# Snakkie — first website preview

Direct routes: `/snakkie/` (English), `/de/snakkie/` (German).
Both are `noindex,follow`. They are deliberately absent from navigation,
homepage cards, World Observer, Wiesmoor, sitemaps and RSS. This is an unlisted
public page, not access control. Do not disallow crawling in robots.txt: crawlers
need to read the noindex directive. The existing sitemap generator already
excludes noindex pages; this is covered by the Snakkie regression test.

## Build and checks

Run from repository root:

```sh
node scripts/build-snakkie.mjs
node --test tests/snakkie.test.mjs
node --test tests/sitemaps.test.mjs tests/seo-sitemap-generator.test.mjs tests/seo-localization.test.mjs tests/blog-rss.test.mjs tests/homepage-featured-projects.test.mjs tests/museum-catalog.test.mjs
npm run test:seo
```

The standalone generator only writes the two Snakkie HTML pages. No new runtime
dependency, installation or package change is needed. Shared language-toggle
CSS/JS and the existing local JetBrains Mono font files are reused. Theme tokens
come from the main site's black/blue palette; `style.css` is not imported because
it includes a Google Fonts request. Font license remains at
`assets/password-cracking-lab/fonts/OFL.txt`.

## What works

- Static bilingual page, reciprocal routes and existing alternate-language control.
- Responsive mascot, keyboard controls, labelled inputs, status log, visible focus,
  reduced-motion support, static/no-JavaScript welcome and first word.
- Local-only chat layout test: input is rendered with textContent, capped at 500
  characters and eight preview turns. Reset removes it. Nothing is sent or saved.
  The welcome and joke are authored copy. No generated answers or simulated thinking.
- Reply-language selector is a design preview. Selecting Platt reveals the planned
  translation feature; it changes neither the page locale nor any AI output.
- Two manually navigable, locally bundled word examples with source links.
  No date-driven selection, audio or speech synthesis is claimed.

## Regional language evidence

Checked 2026-10-30 by retrieving the dictionary pages directly:

- https://www.platt-wb.de/platt-hoch/?term=Moin — Moin as a greeting at any time.
- https://www.platt-wb.de/platt-hoch/?term=snacken — speaking/chatting, explicitly
  labelled eastern East Frisian; the short example is listed there too.

The site's dictionary states it is based on Gernot de Vries's *Ostfriesisches
Wörterbuch*, with permission of Verlag Schuster Leer. English translations and
the short cultural notes here are our editorial translations/paraphrases.
Only a minimal selection is used, not a copy of the dictionary. The words are
attested for East Frisia; neither is represented as uniquely Wiesmoorer. Local
speaker review, pronunciation recordings and redistribution permission for a
larger curated dataset remain future work. The user's supplied greeting
“Moin! Ik bün Snakkie.” is branding copy, not an independently verified regional
teaching example.

## Mascot provenance and limits

**Fixed character reference:** `snakkie-captain-source.png` is the canonical
Snakkie for all future expressions and poses. The user's explicit requirement
to keep the same character is recorded in [AGENTS.md](AGENTS.md), including
visual invariants and the source checksum. Use this actual image as the input
for future variants, not just a fresh textual description of a penguin.

Originals: `/nebby.png` and `/images/nebby.png` are identical 1024×1024 flattened
rasters (SHA-256 `e71dfe68059ae8f723d38b00d968f9720503efe7a4e7bec278e9333fe200cb33`).
Existing optimized copies: `/assets/generated/images/nebby.webp` and
`/assets/generated/images/images/nebby.webp`. No editable layered mascot source
was found. None of these files were overwritten.

Built-in image generation was used in reference-image editing mode, using the
original Nebby as the edit target. This is a new reference-guided illustration,
not lossless removal of a helmet layer. The navy penguin, cream face, orange
beak/feet and familiar expression were preserved visually. The helmet, space
suit and laptop were replaced with sailor clothing and a captain's hat.
Small contour/shading differences are inherent in this illustrated variant.

- `snakkie-captain-source.png`: full-resolution generated transparent RGBA source.
- `snakkie-captain-768.webp`: main optimized transparent web asset.
- `snakkie-captain-480.webp`: smaller responsive asset.
- `snakkie-avatar.webp`: 96px transparent chat figure.

Production prompt (built-in tool, no CLI/API key):

> Use case: identity-preserve. Asset type: transparent website mascot, full-body
> high-quality illustration. Edit target: the attached original Nebby mascot.
> Nebby becomes Snakkie! Preserve his unmistakable rounded penguin body shape,
> original deep navy-blue plumage, cream-white heart-like face patches, large
> expressive black eyes, small brows, orange smiling beak and orange feet, same
> polished hand-illustrated style and original proportions. Remove astronaut
> helmet, entire glass dome, cyan halo, space suit, laptop and background. Dress
> THIS SAME penguin in a traditional blue-and-white horizontally striped East
> Frisian sailor shirt, white captain's cap with black visor and a small gold
> anchor badge centered on front. Friendly slightly mischievous smile, both eyes
> open. Keep the original character identity and colors, do not turn him into an
> octopus, robot or another penguin design. Seated full-body pose like original,
> one flipper lifted in a warm greeting and the other naturally at his side.
> Clean professional edges, detailed but readable at small size, centered with
> comfortable transparent margin, no text, no props, no background, genuine
> transparent alpha. This is the user's established mascot in new clothing, not
> a new character.

WebP variants are resized/encoded from the source with Pillow, Lanczos sampling,
quality 88 and method 6. Alpha is retained. Extra expressions and animation are
intentionally deferred to prioritize a single coherent main figure.

## Later AI integration

`inference.mjs` documents an engine-independent async streaming adapter boundary,
language/translation inputs, cancellation and capabilities. The preview adapter
has `inference: false` and always throws on generation. The UI never invokes it.
This is a boundary for future work, not an installed inference stack.

Before enabling real answers, decide together on engine and model/license,
browser/WebGPU compatibility, loading size and memory budget, CPU/mobile fallback,
privacy, failure/cancellation behavior, response quality and runtime costs.
Then connect a real adapter, implement loading/streaming/error UI and evaluate
DE/EN and locally reviewed Platt. No particular engine is selected here.

The daily-word feature needs an independently curated/licensed dataset, explicit
regional provenance and a documented Europe/Berlin daily selection rule.
Daily rotation should only be labelled active after it exists.

## Validation of this first version

- `node scripts/build-snakkie.mjs`: passes; repeat build produces identical HTML.
- `node scripts/sync-seo.mjs --sitemaps-only`: passes; no existing file changes
  and neither Snakkie route is added to the sitemap set.
- 44 Node tests pass across Snakkie (5), sitemaps/generator/localization, blog RSS,
  homepage project order, museum catalog and World Observer bilingual coverage.
- `npm run test:seo`: passes, 0 validation errors, 0 broken internal links,
  0 broken hreflang pairs, 0 sitemap duplicates; 1,059 indexable URLs remain.
- Chromium browser QA: DE/EN switch, safe literal rendering of HTML-like input,
  local preview notice, reset, word navigation and planned Platt translation note.
  All displayed mascot assets load. Runtime elements reference local assets.
- Desktop viewport 1,348 CSS px and responsive iframe widths 320, 390, 768 CSS px
  (305, 375, 753 content px with desktop scrollbars) checked without horizontal
  overflow. Desktop, phone chat and tablet layouts inspected visually. This is
  responsive browser QA, not a test on physical mobile devices.
- Original Nebby PNG checksums are unchanged. WebP variants retain alpha.

No production deployment was performed. Worldnode's normal `git pull` remains
the owner's next step after the commit is pushed to `origin/main`.
