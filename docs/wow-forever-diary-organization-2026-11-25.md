# WoW Forever diary: structure and visual design

Updated November 25, 2026, following the level-40 / talent-calculator release.

## Reader-facing changes

The German and English diary now have six consistent destinations:

1. **Current:** level-40 snapshot, first mount, character portrait and optional live card.
2. **Talents:** the dual-spec decision and shared interactive Paladin calculator.
3. **Diary:** November 25, 23, 21, 19, 17, 15, 14 and 11, newest first.
4. **Images:** the complete existing screenshot gallery and original downloads.
5. **Background:** the personal story from Vanilla, the expansions and Classic Era.
6. **Linux and tech:** the gaming setup, Just20Minutes and the character observer.

Sources remain available after these chapters. The page has a short orientation
panel and six prominent chapter links; the desktop sidebar mirrors those chapters
and marks the current one while reading. The previous long flat contents lists
and duplicate “new on” navigation notices have been replaced.

Only the newest diary entry starts open. Each older entry has a visible date,
short description and reading-time estimate, and can be opened independently.
Historical text, images and videos remain available in the HTML. The level-40
profile, dual-spec explanation, talent calculator and technical notes no longer
interrupt unrelated diary entries.

The character portrait and API card are disclosures under the current snapshot.
The calculator remains embedded in the article, with both original presets. Its
chapter link opens the panel directly; visitors can also toggle the panel manually.
Shared build fragments open the panel too. The standalone tool is unchanged.

The November 25 world-update observation has been moved out of the November 21
entry and placed in November 25. November 19's harbour story is now its own entry
instead of being buried inside the November 17 guild announcement.

## Visual design

The diary has a scoped Horde / undead theme: dark stone colours, restrained red
accents, muted green, bone-coloured serif headings and an original shield/skull
crest. Background textures are CSS. The crest is an original inline SVG, not a
copied Horde emblem. No new third-party artwork, fonts or runtime dependencies.
The shared calculator preserves the Holy, Protection and Retribution tree colours.

All other blog articles keep their existing design.

## Preservation and validation

- Compared both reorganized articles with commit `5adab89bf7ee53e1c836e0a728037df68373531a`.
- All **125 original content paragraphs per language** were retained verbatim.
  Only the superseded update-navigation notices were replaced.
- All **18 original image `src` references per language**, the image placeholder,
  historical section IDs, gallery manifest and existing video links are retained.
- The original article title and introduction now live with the personal history.
- The latest diary entry is open by default; the seven older ones are closed.
- Historical fragments open their enclosing disclosures automatically and clear
  the sticky header. Nested observer and source links behave the same way.
- Native disclosures, text and build previews remain usable without JavaScript.
- Verified layout at 320, 390, 768, 1024 and 1440 pixels, in both languages.
- Verified navigation, deep links, keyboard interaction, calculator presets,
  responsive controls, clipboard sharing, touch, lightbox and the no-JS fallback.
- Existing talent, RSS and sitemap checks continue to pass.

Browser checks:

```sh
node scripts/test-wow-forever-diary-browser.mjs
node scripts/test-wow-forever-paladin-browser.mjs
```

Set `PALADIN_CHROMIUM` for a Chromium binary outside `/usr/bin/chromium`.
The browser tests use an empty fixture response for the Worldnode-only observer
endpoint so the manually dated fallback remains testable in a static checkout.

## Future diary entries

Place new entries at the start of `.diary-journal`, with their date in
`data-entry-date="YYYY-MM-DD"`. Keep only the latest entry initially open. Give
the entry a short summary and a stable heading ID, and add that ID to the date
shortcuts. Preserve previous fragment IDs when moving material between chapters.

Update the personal snapshot's date and values only when Dennis confirms them.
The optional live API card is a separate, dated data source. Do not infer a new
personal milestone from an old screenshot or an unavailable API response.

The theme and disclosure/navigation behaviour live in
`assets/blog/wow-forever/diary.css` and `diary.js`. The calculator's data and logic
remain under `assets/wow-forever-paladin/` and are shared with the standalone tool.
