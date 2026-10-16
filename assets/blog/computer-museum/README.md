# Computer Museum articles — visual provenance

Published 15 October 2026. All illustrations and museum implementations are by
Dennis Hilk. No movie frames, posters, actor photographs or NASA photographs are
used. Screenshots of reconstructions are not photographs of historical hardware.

## Actual screenshots

- `imsai-panel.webp`: optimized from the existing repository asset
  `assets/imsai-8080/preview.png` (1200×630). That project's browser capture
  script documents the scene and display preparation. English interface;
  captions disclose that language in both articles. No fresh browser capture
  was possible during this mission.
- `apollo-cockpit.webp`: Dennis's `Bildschirmfoto_20261015_191142.png`, supplied
  on 15 October 2026, resized from 2048×1038 to 1600×811.
- `apollo-dsky.webp`: a crop of that same screenshot, rectangle
  `(46,190)–(563,954)`, 517×764. Cropping isolates the real UI; no values or
  labels were retouched.
- `apollo-source.webp`: Dennis's `Bildschirmfoto_20261015_191207.png`, resized
  from 2047×934 to 1600×730. This is the **landing-guidance listing**, not the
  Executive excerpt quoted separately in the article.

Apollo screenshots show the German interface in both language versions.
English captions disclose this. No attempt was made to translate or fabricate
text inside a screenshot. The lunar imagery is the exhibit's original terrain
illustration, not historical mission photography.

## Original diagrams

`binary-switches-{en,de}.svg` explains the eight bit weights in 00111100.
`imsai-architecture-{en,de}.svg` separates the working CPU/teaching I/O from
the independent fictional bonus. It is a diagram of our implementation, not a
historical S-100 wiring schematic or screenshot.
`agc-recovery-{en,de}.svg` is an explicitly simplified explanation of protected
recovery. It is not an AGC execution trace or a browser load measurement.

## Social images and rebuilding

`{imsai,apollo}-social-{en,de}.png` are 1200×630 editorial compositions using
the real screenshots above, local text and the established blog palette.
They are social cards, not fresh simulator screenshots.

Run `node scripts/build-museum-blog-visuals.mjs` with Sharp installed to rebuild
the SVGs and social images. The script supports the existing
`CODEX_PRIMARY_RUNTIME_NODE_MODULES` runtime convention. All article assets
are hosted locally; no CDN, web font, external image runtime or tracking was
added. WebP files range from about 24 to 68 KiB; social PNGs are about 130–204 KiB.

## Jurassic Park article — 16 October 2026

All five screenshots were freshly captured from the actual local exhibit in
headless Chromium 151, separately in English and German. No film still or private
source photo was copied. No runtime or exhibit design was changed for the article.

- `sgi-workstation-{en,de}.webp`: complete monitor, stand, keyboard, mouse and
  period-inspired case, 1368×1120. 960-pixel variants serve narrower screens.
- `fsn-landscape-{en,de}.webp`: actual authored `/park` overview, 1049×486.
- `fsn-power-module-{en,de}.webp`: actual `Power` directory with `mains.control`,
  1049×486, not a generatively reconstructed screenshot.
- `jurassic-recovery-{en,de}.webp`: completed local scenario, all six map markers
  online, 1368×721. This is the original museum schematic, not a film island map.
- `doctor-nebu-lockscreen-{en,de}.webp`: actual dialog after three access denials,
  680×498. Includes only the already authorized cartoon asset, not Dennis's photo.
- `sgi-stack-{en,de}.svg` and `fsn-tree-{en,de}.svg`: original 1200×600 teaching
  diagrams, not exact SGI circuit diagrams or recovered historical layouts.
- `jurassic-social-{en,de}.png`: localized 1200×630 editorial compositions using
  the real complete-workstation captures. These are social cards, not screenshots
  of a differently arranged application.

The WebP captures preserve natural aspect ratios, use quality 87, and do not
retouch labels or model values. Figure metadata and captions are in
`content/museum-blog/jurassic-figures.json`. Reproduce with:

```sh
SGI_BROWSER=/path/to/chrome node scripts/build-jurassic-blog-visuals.mjs
npm run build:museum-blog
npm run test:museum-blog
SGI_BROWSER=/path/to/chrome npm run test:jurassic-blog:browser
```

The article's search focus is the informational question “Was the Jurassic Park
UNIX system real?”. No search-volume or rich-result promises are made. Original
SGI and Apple documents support technical data; ILM and firsthand production
interviews support the effects section. Shot-based hardware archaeology is
identified as such. The personal cinema memory is supplied by Dennis. The exact
fan repository he used years later is unknown. The raptor and ocean details remain
observations/jokes, not independently authenticated production claims.

Acceptance for this publication: 67 Node tests passed across article, RSS,
localization/museum, sitemap and SEO-generator suites. The global SEO audit has
zero errors across 1,031 indexable pages. Article browser acceptance decoded all
14 figures, checked natural aspect ratios, desktop/mobile contents navigation,
reciprocal links, both language switches and seven widths per language with no
page overflow or request errors. Full SGI acceptance also covers the recovery
scenario, three-denial lockscreen, polite-word exit, offline behavior and Canvas
fallback. Its image assertion waits for `decode()` so lazy-loading does not race
the browser test. No exhibit runtime behavior was changed for publication.
