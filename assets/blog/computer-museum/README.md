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
