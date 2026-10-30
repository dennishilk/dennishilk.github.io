# Snakkie — knowledge & humour companion 0.3

Direct routes: `/snakkie/` (English), `/de/snakkie/` (German).
Both remain unlisted and `noindex,follow`. No inbound menus, cards, Observer,
Wiesmoor, RSS or sitemap links. Do not disallow crawling in robots.txt: crawlers
must be able to read noindex. The mascot and original Nebby files are unchanged.

## Build and verify

```sh
node scripts/build-snakkie.mjs
node --test tests/snakkie.test.mjs
npm run test:seo
```

The generator writes only the two Snakkie HTML pages. No packages, models,
frameworks, external runtime or server process are required. The page reuses the
site's local fonts and language-switch assets.

## Current architecture

- `knowledge/*.json`: stable-ID bilingual records, original jokes, source-bearing
  factual entries, dictionary words/phrase and varied honest fallbacks.
- `engine.mjs`: transparent curated retrieval; normalized terms, synonyms, guarded
  one-edit typo correction, mandatory topic anchors, confidence/ambiguity checks.
- `weather.mjs`: reads only the existing same-origin Wiesmoor Observer JSON;
  strict timestamps, freshness checks and separate current/forecast paths.
- `words.mjs`: independent word loader and deterministic local-calendar selection.
- `ui.mjs`: keyboard controls, accessible plain-text replies, safe source links,
  bounded in-memory transcript, gentle scroll following. No saved chat history.

There is no generative AI. Texts come from the maintained collection. A joke or
fallback uses a shuffled bag, exhausting the set before repeating. The small
context remembers only the preceding intent for “Noch einen!”; it is not a
language-model conversation memory. Explicit DE/EN answer-language switches are
supported; unknown questions are left unanswered rather than guessed.

The dataset currently has 100 bilingual original jokes, 20 bilingual fallbacks,
12 factual entries, 6 personality entries, 2 dictionary words and 1 phrase.
New IDs must be stable and unique; keep DE/EN, source/provenance and review status.
Add varied queries and necessary topic anchors, then test positive AND negative
matches. Do not broaden fuzzy matching to short or ambiguous terms casually.
A German/English phrasing is an editorial translation, not a dictionary quote.

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
