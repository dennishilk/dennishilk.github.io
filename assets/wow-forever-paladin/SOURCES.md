# WoW Forever – Paladin talent calculator: sources and maintenance

Implemented and checked: **2026-11-25**. This is an independent fan calculator for
Dennis Hilk's website. It does not embed or reuse another calculator's interface.

## Data provenance

- Primary data publisher: [Talents Forever Paladin JSON export](https://talentsforever.com/export/paladin.json).
- [Publisher's description and reuse terms](https://talentsforever.com/about).
- Export date: **2026-11-10**; retrieved **2026-11-25**.
- Export SHA-256: `ac9c7b46e48d6c55b339f0cde5a985bebaa8596c7b5cf0b5763e83cb12506375`.
- The publisher identifies **Forever client 1.60.1.70755**, development notes of
  November 2 and **November 3 server hotfixes**. This is client-derived published
  data, not an independent extraction from Dennis' installed game client.
- The currently served `https://talentsforever.com/talents.js` Paladin trees were
  compared with the JSON export on November 25: all tree data matched.
- All **51 talents / 139 ranks** are marked confirmed in the export. Positions,
  rank caps, descriptions and named dependencies come from that source.
- German localization: `https://talentsforever.com/talents.de.js`, published as data
  from `data/beta/locale/deDE.json` and `i18n/de.json`, build 1.60.1.70755.
  The localization was extracted as JSON; no third-party executable code is shipped.
- A supposed official export linked by a secondary site at
  `https://wow-forever.gg/developers/talents.json` was unavailable. It was **not**
  used as a source or presented as independently verified official data.

## Licence and modifications

Talent data is published under
[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
Credit **Talents Forever — https://talentsforever.com/** when reusing the adapted
dataset. Visible attribution is included on both tool pages and in the component.

Modifications: Paladin-only extraction, one combined bilingual schema, stable IDs,
explicit prerequisite IDs/ranks, Dennis' presets, and additional German translations.
English effects, positions and numerical values have not been invented or replaced
with Classic Era, Retail, Turtle WoW or another ruleset.

The source localization retains English text for Oath of Light, Swift Judgement,
Shieldsworn, Two-Handed Weapon Specialization, Turn Evil and Vengeance. Those
descriptions have been translated for this website, preserving the source numbers.
`translation: "site"` marks these entries. “Böses vertreiben” is our German label
for the source's untranslated Turn Evil. These are **not claimed as official
Blizzard localization**. Other German names/text come from the published locale.

Game names, spell text and icons remain **© Blizzard Entertainment**. The data
licence does not grant ownership or a CC licence over Blizzard artwork or text.
Icons are the game-icon filenames named by the source, retrieved at
`https://wow.zamimg.com/images/wow/icons/large/<icon>.jpg` and used only to identify
their corresponding talents in this freely accessible fan reference. No tree
backgrounds, watermarks, screenshots or branding from another calculator are used.
See [Blizzard's legal FAQ](https://www.blizzard.com/de-de/legal/28d5ebbf-c245-4408-8ba9-043dd5f056bf/faq-uber-rechtliches).
Any reuse of this repository must respect the separate rights in game content;
the CC licence of the data publisher must not be applied to icons.

Tree backgrounds are original CSS compositions. Build previews are screenshots of
this implementation. Three gameplay originals were supplied by Dennis Hilk and
are retained unchanged, with optimized WebP copies alongside them.

## Rules and share format

- Levels 10–60: one point per level; maximum 51. The empty planner displays minimum
  talent level 10. A nonempty build needs `9 + total points`.
- Each row requires `5 × (row − 1)` points in **earlier rows of the same tree**.
- A prerequisite arrow requires the named parent at its maximum source rank.
- Adding and removing points both validate the entire resulting allocation.
- Tree reset affects only that tree. There are no cross-tree prerequisites.
- Share URL: the localized standalone tool URL followed by
  `#paladin=p1.<17 Holy digits>.<17 Protection digits>.<17 Retribution digits>`.
- Digits follow `data.json` order. `p1` is a frozen schema/order version. Do not
  silently reorder or remove talents in `p1`. A structural change needs a new
  version or an explicit migration; invalid links safely load Protection with a
  visible explanation. URL data is never evaluated or inserted as HTML.
- Builds are not sent to a server. Clipboard copying has a selectable URL fallback.
- No local storage is used; first opening without a shared build always loads the
  Protection preset. Hash changes and edits apply without reloading.

## Preset transcription

The two user-supplied reference screenshots remain **outside the public repository**.
They were read by tree, row and column. Unlisted talents have zero points.

**Protection 0/35/16:** Protection: Redoubt 5, Precision 3, Sacred Duty 2,
Templar's Bulwark 1, Shield Specialization 2, Toughness 3, Swift Judgement 1,
Improved Righteous Fury 3, Anticipation 5, Holy Shield 1, Reckoning 5,
Iron Creed 3, Shieldsworn 1. Retribution: Benediction 5, Improved Judgement 2,
Conviction 3, Sanctified Judgement 3, Pursuit of Justice 2, Sacred Arbiter 1.

**Retribution 12/8/31:** Holy: Divine Strength 5, Improved Seals 5,
Holy Conduit 2. Protection: Divine Intellect 5, Precision 3.
Retribution: Benediction 5, Improved Judgement 2, Conviction 3,
Sanctified Judgement 3, Unyielding Faith 1, Seal of Command 1,
Pursuit of Justice 2, Sacred Arbiter 1, Two-Handed Weapon Specialization 3,
Repentance 1, Vengeance 3, Champion of the Light 5, Unsealed Wrath 1.

Both are **planned level-60 builds**, not the character's current level-40 allocation.

## Validation and update procedure

Run `node --test tests/wow-forever-paladin.test.mjs` and
`node scripts/test-wow-forever-paladin-browser.mjs` (Playwright/Chromium required).
The browser script captures the two optional build previews from our own UI.
It saves temporary PNG screenshots in `/tmp/wow-forever-paladin-qa`; release
previews are converted with Pillow to genuine WebP files. Set `PALADIN_CHROMIUM`
when Chromium is installed outside `/usr/bin/chromium`.

When updating data, compare every changed rank with a named Forever source and
record its dated evidence. Keep missing/unknown effects explicit. Recheck the
presets and share version, localized static references, then rerun the tests.
Do not imply this dated export automatically contains later live hotfixes.

No unverified rank effects remain in this snapshot. Remaining limitations:
live tuning is not automatically imported, no Legacy bonus points are included,
no gear-dependent damage/healing simulation, and the fan German additions above
may differ from later official wording.

## Deutsche Kurzfassung

Die 51 Talente und 139 Ränge stammen aus dem oben verlinkten Forever-Datensatz;
die Quelle markiert alle Ränge als bestätigt. Der Datenstand ist datiert und wird
nicht automatisch mit dem laufenden Spiel synchronisiert. Sechs Beschreibungen
und der Name „Böses vertreiben“ wurden für die Website übersetzt. Die beiden
51-Punkte-Vorlagen entsprechen Dennis' privaten Referenzbildern und sind als
Level-60-Pläne gekennzeichnet. Fremde Referenzbilder wurden nicht veröffentlicht.
Talentdaten: Talents Forever, CC BY 4.0; Spieltexte und Symbole: Blizzard Entertainment.
