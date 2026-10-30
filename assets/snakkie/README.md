# Snakkie — local AI experiment 0.2

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

The standalone generator only writes the two Snakkie HTML pages. The generator
and base page need no package installation or package.json change. The optional
chat requires the separately provisioned, pinned runtime described below.
Shared language-toggle
CSS/JS and the existing local JetBrains Mono font files are reused. Theme tokens
come from the main site's black/blue palette; `style.css` is not imported because
it includes a Google Fonts request. Font license remains at
`assets/password-cracking-lab/fonts/OFL.txt`.

## Current version

The chat now occupies the full content width, with a 500–650px conversation
viewport on larger screens. Platt van Dag is a separate section below it.
Enter submits, Shift+Enter inserts a newline, IME Enter does not submit.

The previous local echo demo has been replaced with a real lazy-loaded wllama
adapter. The start button requests local model/runtime files **only after a
click**. Missing files produce an honest error, never a fake ready state or
scripted model response. Replies stream from inference in a worker and can be
stopped. Text is rendered as plain text; chat history is not persisted/uploaded.

Read [the 0.2 research and deployment report](../../docs/snakkie/local-ai-0.2.md)
for engine/model comparisons, measurements, limitations, exact artifacts and
owner-run provisioning. Model weights and runtime binaries are ignored by Git
and must be supplied separately. A normal git pull alone does not supply them.

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

Current character story: **Snakkie is Nebby's cousin from East Frisia.** This
user correction supersedes the earlier “Nebby becomes Snakkie” working slogan.
The established illustration is unchanged. The exact historical image prompt
below is retained as production provenance, not as the current character story.

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

## Inference modules

- `model-config.mjs`: pinned local paths, artifact metadata, persona and bounded context.
- `inference.mjs`: lazy adapter with progress, streaming, cancellation and watchdogs.
- `inference-worker.mjs`: wllama integration; no external inference endpoints.
- `model-storage.mjs`: explicit origin-private model cache or session-only fallback.
- `artifacts.json`: reproducible provisioning manifest, checked against the JS metadata.
- `ui.mjs`: page controls, safe streaming transcript and word navigation.

`local-ai/` is excluded from Git. Do not commit weights, runtime tarballs, browser
caches, private transcripts or API keys. Keep all browser runtime paths local.
The mascot reference and unlisted/noindex rules remain in force.
