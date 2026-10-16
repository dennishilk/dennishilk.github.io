# Chernobyl Unit 4 — RBMK Control Room & SKALA

Mission 11 · Dennis Hilk · 16 October 2026

## Purpose and scope

A bilingual, browser-local museum reconstruction about the 1986 RBMK-1000,
process instrumentation, SKALA and the accident. This is a curated technical
presentation, not a nuclear-plant operating simulator. The explorer's buttons
open explanations. No adjustable reactor parameters, operational procedures,
accident challenges, scores, Easter eggs or explosion effects are implemented.

English: `/museum/chernobyl-control-room/`
German: `/de/museum/chernobyl-kontrollraum/`

English article: `/blog/chernobyl-rbmk-skala-control-room/`
German article: `/de/blog/tschernobyl-rbmk-skala-kontrollraum/`

## Source basis and hierarchy

1. IAEA, *The Chernobyl Accident: Updating of INSAG-1*, INSAG-7 (1992):
   https://www-pub.iaea.org/MTCD/publications/PDF/Pub913e_web.pdf
   - Main §§2–5: design, protection, accident factors and safety culture.
   - Annex I §1-3.8: original rod/displacer design.
   - Annex I Table I-I, printed pp.53–55: chronological anchors.
   - Annex I §1-4.3.2, printed p.56: SKALA, DREG, PRIZMA, cycles and gaps.
   - Annex I §1-4.5, printed pp.64–65: the 01:22:30 state and later calculations.
   - Annex I §1-4.6.3: AZ-5, unknown reason for the demand, accident analysis.
   - Annex II: alternate modelling and limitations.
   Page numbers refer to printed pagination, not PDF viewer pages.
2. OECD/NEA, *Chernobyl: Assessment of Radiological and Health Impacts* (2002),
   chapter I: https://oecd-nea.org/jcms/pl_28271/chernobyl-chapter-i-the-site-and-accident-sequence
   Used for plant context and RBMK description. Its account retains older
   simplifications; it does not override INSAG-7 on pre-scram behaviour, the
   reason for AZ-5, or ORM. A round peak-power estimate is not reproduced.
3. UNSCEAR: https://www.unscear.org/unscear/en/areas-of-work/chernobyl.html
   Used for the consequences context and access to dated assessments. There
   is no total-casualties counter and no inference about an individual's dose.
4. The article's IMIS context follows official German Environment Ministry,
   Berlin Senate and BfS ODL information linked in the article. Dennis's
   primary-school recollection is first-person testimony, not a technical
   record identifying the device. His deliberate question to the caretaker,
   the metal tube/cylindrical head and yellow lettering are retained. A supplied
   neighbouring-town photo is linked as a visual reference, not republished.
   No verified historical station identity, model or school-site date is claimed.

Sources inspected 16 October 2026. The report's main text and annexes contain
qualifications and differing reconstructions; they are not a unified telemetry
file. The exhibit follows the explicitly cited report section per claim.

## Evidence conventions

- **D · Documented / Belegt:** report-supported fact or event, not necessarily
  an original sensor reading.
- **R · Reconstructed / Rekonstruiert:** inferred state or interpreted layout.
- **S · Schematic / Schematisch:** educational representation, not historical
  telemetry or a physics calculation.

The legend is always available. Diagram and statement badges are independent:
a documented timestamp does not make its adjacent illustration a measurement.
Every timeline chapter includes a source locator and a caveat.

Only the sourced approximate thermal-power anchors (~30 and ~200 MW(th)) are
shown numerically in the sequence. There is no invented continuous power,
pressure, xenon, flow or temperature history. No peak-power figure is claimed.
The 01:22:30 snapshot is documented; its calculated ORM was obtained after
the accident using PRIZMA-ANALOG, and is not displayed as a live crew readout.
ORM is a reactivity-equivalent quantity, not simply the count of inserted rods.
AZ-5's DREG timestamp is 01:23:40; the teletape discrepancy is stated. The reason
for pressing it is not asserted. Final explosion timing and mechanisms remain
qualified rather than animated with spurious precision.

## Presentation model

- `content.mjs`: shared localized narrative, hotspots, timeline and source map.
- `model.mjs`: pure presentation-state transitions; no reactor physics.
- `diagrams.mjs`: original SVG explanations, gauges and symbolic channel view.
- `ui.mjs`: station tabs/history, inspectors, view options and one timeout.
- `exhibit.css`: responsive industrial design and reduced-motion handling.
- `scripts/build-chernobyl.mjs`: reproducible localized static HTML.
- `content/museum-blog/chernobyl.*.fragment`: localized long-form article sources.

Stations: basics, control room, SKALA, historical sequence, technical findings.
One panel at a time with JavaScript; static text/chronology remain readable
without JavaScript. Tabs use manual activation, arrow/Home/End navigation and
native Enter/Space. Pagination focuses the destination heading. Hashes permit
direct station links and browser back/forward.

The eleven-chapter sequence advances every 18 seconds by default, selectable
between 8/18/30 seconds. This is reading time, never physical event duration.
Start begins at chapter one; restart returns to chapter one paused. Manual
next/previous/seek pauses. Switching stations, page hiding or pagehide pauses;
returning does not resume automatically. The last chapter stops without a loop.
No audio, network calls, tracking or persistent browser storage is added.

## Visual limitations

The control-room arrangement is an original functional interpretation, not a
surveyed replica or exact panel label transcription. Pointer angles, lamps,
channel patterns and positions of rods are schematic. No exact core loading
map, neutron-flux map, protection wiring or historical CRT software is claimed.
The simplified section does not reproduce all plant loops or rod geometry.
The fading diagram means lost observability in the museum's visual vocabulary;
it does not depict a known historical screen behaviour. All art and diagrams
are original code-drawn assets; screenshots are captures of this implementation.
Social cards are 1200×630; article figures are optimized WebP with localized
alt text/captions and explicit reconstructed/schematic provenance.

## Build and tests

```sh
npm run build:chernobyl
npm run test:chernobyl
npm run test:chernobyl:browser
```

The browser harness uses Playwright and an existing Chromium executable;
`CHERNOBYL_BROWSER` overrides its default. Dependencies can be resolved from the
shared runtime via `CODEX_PRIMARY_RUNTIME_NODE_MODULES`, or normal local installs.
The harness serves only the checkout for its test lifetime and closes on exit.
It checks both languages, station focus/history, hotspots, all view toggles,
automatic progression, pauses, boundaries, seeking, restart, no-JS chronology,
articles, image decoding, language links and widths 320/375/768/1024/1440.
`--capture` refreshes actual interface captures. For publication assets, run:

```sh
node scripts/test-chernobyl-browser.mjs --capture
node scripts/build-chernobyl-visuals.mjs
npm run build:chernobyl
```

The integration scripts are idempotent. The catalog retains all prior exhibit
order, with Chernobyl added beside the hardware/process-computing group. Counts
are derived from actual cards. Article generation, indexes, RSS, canonical and
hreflang tags, JSON-LD and localized sitemaps use the existing site pipeline.
Deployment remains GitHub only; Dennis deploys Worldnode manually.
