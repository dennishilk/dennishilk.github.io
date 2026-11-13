# Snakkie 0.4.1 Alpha

Public pages: `/snakkie/` (English) and `/de/snakkie/` (German). Both are
indexable and included in the language sitemaps. Snakkie is Nebby’s cousin.

```sh
node scripts/build-snakkie.mjs
node scripts/sync-seo.mjs --sitemaps-only
node --test tests/snakkie*.test.mjs
npm run test:seo
```

## How replies work

- `knowledge/*.json` holds 100 bilingual original jokes, 20 fallbacks, 90
  factual entries, 6 personality entries, two dictionary words and one phrase.
- `engine.mjs` resolves known topics, including small talk and simple follow-up
  joke requests. Fixed facts can use `exactOnly` so current or more specific
  questions stay eligible for the model and web search. Keep stable IDs,
  source provenance and both languages. `small-talk.mjs` contains DE/EN
  dialogue replies across 67 intents. [Utterance sources](knowledge/SOURCES.md) documents the
  selected corpus inputs. `conversation.mjs` selects prior turns for follow-ups.
  Supported common requests can also repeat the last reply, explain a curated
  topic more simply, or display the date and time in Wiesmoor. Event questions
  about Wiesmoor and short date follow-ups link to the official calendars.
  The tourist office link uses the calendar's date filter in Wiesmoor time.
  Questions about Dennis’s family or private life receive a local response
  without a model or search request. The API applies the same check.
- `weather.mjs` reads the existing same-origin World Observer export for
  Wiesmoor. It validates timestamps and separates current weather from forecasts.
- `words.mjs` independently loads the locally rotating Platt word.
- `ui.mjs` sends open questions and a bounded conversation history to the
  same-origin API. It skips social filler when keeping the last three exchanges
  and sends at most two relevant exchanges for follow-ups. Conversation state
  lives in the current tab. A reset aborts
  the browser request and starts a fresh conversation. The curated collection
  remains available during service interruptions.
- [The Worldnode API](../../server/snakkie/README.md) uses local llama.cpp for
  generation and SearXNG for selected research questions. SearXNG can contact
  external search providers. The model does not fetch pages or run tools.

## Regional language and daily word

Only Moin, snacken and “Van snacken kummt snacken.” are teaching entries. They
were checked against `www.platt-wb.de` on 2026-10-30. The dictionary is based on
Gernot de Vries's Ostfriesisches Wörterbuch with publisher permission. We retain
its spelling and eastern-East-Frisian qualification for snacken. Specific
Wiesmoor speaker review remains pending. Branding greetings and humorous copy
must not silently become authenticated teaching material.

The daily selection uses the visitor's local calendar date and words sorted by
stable ID. It rotates across just TWO words; the UI states that small scope.
Manual browsing does not change the daily algorithm. Audio and more entries
require regional review and, for larger source-derived datasets, permissions.

## Weather and history

See [the 0.3 report](../../docs/snakkie/knowledge-0.3.md) for source checks, byte
sizes, tests, freshness policy and known limits. No new weather API is called.
The raw weather export is published by the existing Worldnode process and is
ignored in Git; do not add a frozen snapshot to production as a substitute.

The [0.2 report](../../docs/snakkie/local-ai-0.2.md) and its benchmark JSON remain
historical. Runtime licenses and the pinned artifact manifest now live under
`docs/snakkie/history-0.2/`. Their runtime/provisioner code was removed. Existing
untracked model files are deliberately left untouched; Git does not clean them.
The frontend no longer reads those files or old browser model caches.

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
