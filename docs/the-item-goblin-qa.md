# The Item Goblin: release QA, 26 November 2026

## Automated checks

`node --test tests/item-goblin.test.mjs`: 8 tests passed.

- 125 stable IDs; 250 unique localized examples, valid icons and share round-trips.
- 162 name components, 251 attributes, 127 effects, 125 flavors and 34 requirements; bilingual rows and all 17 themed categories covered at the lowest absurdity setting.
- 5,760 deterministic random items: both languages × 18 category choices × 4 absurdity levels × 40 rolls. No invalid records. Weapons have valid damage and positive speed, consumables/mounts/quests have use effects, armor has armor, junk is poor and legendary loot is legendary.
- Invalid versions, unknown fields, external and SVG icon URLs, invalid numeric values, reversed damage, oversized imports, bad arrays and malformed URL fragments rejected. User HTML remains inert plain text.
- Unicode and emoji sharing, optional field omission, DPS, undo/redo and locked weapon values.
- Layout of all 250 catalog records plus a 200-character unbroken name and 80 multiline custom attributes; wrapped text remains within the tooltip and image bounds. Layout checks use a deterministic mock canvas, complemented by real browser export checks below.
- Both static routes include canonicals, hreflang, Open Graph, WebApplication data, no-JS explanation and existing internal asset/link targets.

`node --test tests/wow-forever-paladin.test.mjs`: 11 existing talent-calculator tests passed after adding internal links.

The final combined run of Item Goblin, Paladin, sitemap and SEO-generator checks passed all **34 tests** with no failures. Temporary preview fixtures were excluded before regenerating and validating the release sitemaps.

## Browser checks (Chromium, local static preview)

Observed directly through the browser controls:

- German and English startup, live preview, custom text and negative attributes.
- All editor groups present; coherent tank roll and absurdity selection; locked name preserved during a global roll.
- Clipboard contained an actual `image/png` payload, not plain text, after pressing Copy image. The German test payload was approximately 576,000 base64 characters. A second export with a custom icon, long name, transparency and 3× scale reported successful PNG copy.
- PNG and JSON download events completed. Exported JSON was selected through the file chooser and successfully imported; a visible status confirmed import.
- With the Clipboard API disabled in a dedicated static test page, Copy image visibly confirmed the PNG download fallback.
- Text copying, full URL copying and restoring the shared Unicode item.
- Undo restored the prior name; redo restored the edited name.
- Favorite and custom-item save/load UI showed the correct item in each collection.
- Example search found the requested DAD/World Tree item in both languages and loaded it into the editable workbench.
- Local PNG icon selected and re-encoded; remove-custom-icon control became available. Inside/none icon placement, transparent/workshop backgrounds, 1×/3× and branding toggles exercised.
- Responsive DE/EN pages loaded in same-origin frames at widths 320, 390 and 768 pixels. After fixes, document scroll width exactly matched document client width at all six sizes (305/375/753 pixels after frame scrollbar allocation). These are layout checks, not physical touch-device certification.
- Original mascot and SVG icons loaded; no broken images in those six views.
- No application-origin error logs were observed. Browser-extension metadata errors were unrelated and excluded.

## Integration and limits

- Both tool overviews, home pages, diaries, addon articles and talent-calculator pages link to the tool.
- Standard English/German sitemaps include both tool routes and overview routes. Their existing sitemap-index references remain valid.
- The social image is the original 1200 × 630 vector-derived card; all 17 icons and the mascot are original artwork, licensed with the tool under MIT.
- Full external-browser and messenger interoperability is not asserted. Clipboard can be denied or unsupported; the implementation downloads the PNG in that case. Large share links may exceed messaging-service limits; JSON is available.
- See `the-item-goblin.md` for explicit import, storage and canvas bounds.

## Changed file groups

- New `assets/item-goblin/`: shared JS modules, stylesheet, independent JSON data/schema/license, 17 icons, mascot and social SVG/PNG.
- New DE/EN tool pages and tool-overview pages.
- New page/social build scripts and one Node test file; package scripts added.
- Internal-link additions only in DE/EN home pages, WoW diaries, Just20Minutes articles and talent calculators.
- DE/EN sitemap URL additions; no separate sitemap group needed.
- This QA record and the bilingual authoring guide.
