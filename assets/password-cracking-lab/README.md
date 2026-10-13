# Password Cracking Lab

Real local SHA-256 comparisons: the UI hashes the invented target locally.
CPU/GPU search workers receive only its digest and a predetermined range.
The main-thread GPU preparation worker receives only the phase, exact starting
index and bounded count, then transfers padded blocks. No compute engine
receives the original target plaintext.

## Architecture and GPU compatibility

- `sha256.js`: reusable JavaScript SHA-256 buffers, full UTF-8 hashing for
  independent checks and a one-block ASCII path for generated candidates.
- `dictionary.js` / `search.js`: fixed vocabulary and deterministic numeric,
  dictionary and brute-force enumeration with exact BigInt accounting.
- `sha256.wgsl` / `gpu.js`: genuine SHA-256 compute dispatches. Every dispatched
  candidate is hashed, including lanes after a matching lane. Initialization
  checks three real CPU/GPU digest agreement vectors.
- `worker.js`: CPU hashing, preferred GPU execution and a separate candidate
  preparation worker for the main-thread GPU path. No runtime HTTP requests.
- `coordinator.js`: one exact range ledger for concurrent engines. Worker
  WebGPU is tried first; if it fails, main-thread WebGPU is tried independently.
  The fallback asynchronously submits/reads real GPU work on the main thread
  and prepares candidates in a dedicated worker. It does not perform the
  search hashes on the main CPU thread. Hybrid runs genuine CPU workers
  concurrently with either genuine GPU path.
- Generated `worker-source.js` / `shader-source.js`: preloaded Blob Worker code
  so new searches need no network after initial page load.
- `ui.js` / `lab.css`: independent EN/DE setup, prominent status/result
  dashboard and expandable diagnostics, ledger, vocabulary and explanations.

Both GPU contexts try high-performance, default and compatibility-feature-level
adapter requests, in order, until a usable adapter is returned. Public
execution rejects fallback/software adapters, including SwiftShader, llvmpipe
and lavapipe. A hardware driver description containing the word "software"
alone is not incorrectly rejected. No unsafe browser flags are enabled by the
page. Compatibility mode is requested through the standard API; browser and
platform support still determine whether it returns a usable adapter.

The UI records main/worker interface exposure, selected path, adapter,
request attempts, initialization steps and precise failures: interface,
adapter, device creation, shader compilation, pipeline creation, self-test,
initialization timeout and runtime device loss. Raw reasons are accessible on
the page without developer tools. A runtime GPU error ends the run; CPU work
is never silently relabeled as GPU work.

Established defects in the preceding version: worker-only GPU detection, no
independent main-thread GPU attempt, and generic failure reporting. Those
can hide a working main-thread adapter. They do not establish why Cthulhu's
Chrome 154 returned no usable adapter. Its RX 9060 XT, NixOS, Mesa and browser
backend combination cannot be physically reproduced here. A browser-wide
"hardware accelerated" label is not a successful page-level requestAdapter.
ANGLE OpenGL is not itself proof of a working WebGPU backend. The diagnostics
expose the actual page-level result after Dennis's manual deployment.

Primary background: [Chrome troubleshooting](https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips),
[Chrome compatibility mode](https://developer.chrome.com/blog/new-in-webgpu-146),
[WorkerNavigator.gpu](https://developer.mozilla.org/en-US/docs/Web/API/WorkerNavigator/gpu)
and the [WebGPU specification](https://www.w3.org/TR/webgpu/).

## Measurements, controls and privacy

Calibration uses an uncounted warm-up, then three measured batches per engine.
All contributions use the same measured wall-time window, including intensity
rests. Start automatically calibrates when necessary without advancing the
attack counter. Live rates use confirmed counts in a common rolling one-second
window. Elapsed attack time excludes initialization, calibration and pauses, but
includes final independent verification. JavaScript SHA-256 and Web Crypto both verify
a match before success. Counters include whole completed batches rather than
pretending all engines stopped exactly at the matching candidate.

Pause drains assigned work; Resume retains the same in-memory range ledger.
Stop, Reset, completion and departure close engines. No 5/10/30-second attack
cutoff exists; initialization has a separate bounded wait. Hidden tabs pause
running searches. Suspended or closed tabs cannot retain computation. Workers
and intensity control actual load. Activity chips describe actual batch and
preparation states, not invented hardware utilization percentages.

Initial lab dependencies are same-origin. The existing language control reads
language preferences, never password inputs. Fonts are bundled. CSP enforces
connect-src 'none' and form-action 'none'. Inputs, local reveal results and
typed buffers are practically cleared; JavaScript strings cannot be securely
overwritten. Nothing is stored in URLs or browser storage.

## Verification

```sh
node scripts/build-password-cracking-worker.mjs --check
node --test tests/password-cracking-lab.test.mjs tests/blog-rss.test.mjs tests/museum-bilingual-coverage.test.mjs tests/cryptography-labs-04-08.test.js tests/museum-seo.test.mjs tests/sitemaps.test.mjs tests/seo-localization.test.mjs
node scripts/audit-seo.mjs
PASSWORD_LAB_BROWSER=/path/to/chrome node scripts/test-password-cracking-browser.mjs
```

The browser suite runs production WGSL with explicit test-only software adapter
permission. Ordinary-page tests reject software adapters. A private delivery
override checks the genuine main-thread GPU fallback and responsive Hybrid UI.
Rendering checks cover both languages at 320/390/768/1024/1440px. Software shader
execution must never be described as verification on a physical RX 9060 XT.
Browser checks require an installed browser; no browser success is claimed
when the suite cannot launch. Dennis manages Worldnode deployment manually.

## Mission 03.3 — current public interface and blind search

The public interface has
only password, compute mode, four method checkboxes, worker count, intensity
and Start/Pause/Resume/Stop/Reset. Start calibrates automatically. No preset
buttons, numeric shortcut, target-derived lengths or character selections.

`normalizeConfig()` defaults to `{strategy:'blind', german:true, english:true,
common:false, brute:false}`. No-method configurations are rejected. The UI passes only the
four explicit method flags. Legacy strategies remain solely for internal
engine benchmarks and regression fixtures; the public UI does not expose them.

The collections retain the teaching vocabulary and add pinned, locally bundled
sources. German imports the shortest 210,000 eligible entries from
`enz/german-wordlist` (CC0), ordered by length then ASCII lexicographic.
English imports eligible headwords from SCOWL/ESDB's official US Hunspell
release 2026.02.25, with explicit affix flags expanded at build time. Both use lowercase ASCII
transliteration (ä/ö/ü/ß → ae/oe/ue/ss, diacritics stripped), letters plus English apostrophes/hyphens,
1–20 characters. The selected German subset is not the complete source.
Common/IT imports SecLists `10k-most-common.txt` (10,001 actual source entries)
with exact ASCII spelling and source order, plus fixed IT vocabulary. It is a
published test list, not a current empirical popularity ranking. Defaults
remain DE/EN on, Common/IT and Brute Force off.

Counts after merging and deduplication:

| Collection | Bases | Individual entries | Pairs | Transformed bases | Full hash checks |
|---|---:|---:|---:|---:|---:|
| DE | 213,096 | 211,575 | 1,521 | 1,729,310 | 281,877,530 |
| EN | 249,223 | 247,725 | 1,498 | 2,072,347 | 337,792,561 |
| Common/IT | 26,652 | 26,652 | 0 | 211,653 | 34,499,439 |

Order: selected base collections (Common/IT, DE, EN), years 1984–max(2035, current UTC year), capped at 9999 in the
same collection order, one-digit suffixes, two-digit suffixes, optional brute
force. Fixed case and both leetspeak mappings remain. Each phase is internally
unique; cross-phase/list overlaps are actual hash checks. Source revisions,
raw and filtered checksums, transformations, selection limits and license
copies live in `wordlists/`. Imported text snapshots rebuild without network:

```sh
node scripts/build-password-cracking-wordlists.mjs --check
npm run build:password-cracking
```

Brute force includes all 95 printable ASCII characters: lowercase, uppercase,
digits, then space and symbols in ASCII order. Every length 1–24 is fully
enumerated before moving to the next. Total is sum(95**n, n=1..24), computed
with BigInt. This includes the acceptance example sommer2024, but does not
promise it can realistically be reached. Dictionary bases remain ASCII,
maximum length 20; year additions can reach 24. Input is hashed as exact UTF-8;
Unicode input is not converted into searchable ASCII.

Verified-match time includes independent verification, excludes calibration
and paused time. CPU/GPU shaders, exact shared range accounting, software
adapter rejection, fallback paths, diagnostics and local-only privacy remain.

Current automated coverage adds all fifteen checkbox combinations, deterministic
plans despite misleading plaintext/locale/configuration fields, language
separation, full printable ASCII, counts above 2^53, unique per-phase bases,
real blind CPU recovery from zero and a real worker check at A1h5's expensive
brute-force index. That last range test does not claim to have exhaustively
searched every preceding candidate. Browser UI acceptance has been updated
for the simplified interface; results must be reported from an actual run.


## Dictionary Expansion 2.0 — The Bud Spencer Incident

Every baseline candidate is retained. Unique full-collection counts increased
from 102,091 to 213,096 (DE), 109,573 to 249,223 (EN), and 10,253 to
26,652 (Common/IT). These include the existing teaching vocabulary and fixed
word pairs; raw imported snapshot counts differ and are recorded separately
in `wordlists/sources.json` (211,155 / 247,640 / 26,485). An imported word that
already exists as a pair is counted once, so the EN pair-only count decreased.

New source selections:

- German: 210,000 eligible words from the pinned enz/german-wordlist snapshot
  (CC0-1.0), plus editorial compounds and colloquial vocabulary.
- English: 246,841 eligible entries from pinned ESDB revision
  `7e99edab8e32f9f9ea2b15f249ca8d4d67237410`, queried with
  `./scowl word-list 80 A,B,Z,C 5 --deaccent --wo-usage-notes=offensive-1,offensive-2`.
  This includes regional spellings and less frequent vocabulary; it is not a
  frequency ranking. Full upstream permission notices are in LICENSE-ESDB80.txt.
- Common/IT: the 15,000 most frequent distinct given names from summed public
  SSA national birth-count statistics, 1880–2025. Published government statistics
  contain no person-level records; public-domain notice in LICENSE-SSA.txt.
- Editorial vocabulary: `curated-themes.json`, CC0-1.0, covering German
  compounds/slang, English compounds/slang, computing, films, games, music and
  personal themes. Only explicit selected names get original, joined and
  hyphenated aliases. No arbitrary name products, no new credential dumps.

Existing SecLists data is preserved; no additional credential dataset was
incorporated. Per-dataset counts, revisions, checksums and selection policies
are included in sources.json. `baselineSelected` and `newUnique` refer to the
raw imported lists, not the full collections displayed by the UI.

Years are deterministic ascending four-digit values starting at 1984, through
`max(2035, current UTC calendar year)`, capped at 9999. In 2026 this is 52 years.
All three dictionary collections and all engines share the same phase limits.
Legacy explicit regression configurations may still request narrower ranges.
The UI derives its range label from the limits. No target properties affect it.

`wordForms()` is shared between build-time indexing and legacy enumeration.
Deduplicated variants are gzip-compressed into initial JavaScript asset chunks
using a reproducible build. DecompressionStream, Web Crypto checksum verification,
and cooperatively yielded offset indexing prepare one table per language;
modern gzip DecompressionStream support is required. Count metadata can build
phase plans before decoding completes, but Start stays disabled until completion.
Dictionary tables occupy about 51.92 MiB total (bytes plus 32-bit offsets),
excluding base strings, compressed modules and temporary initialization buffers.
Workers receive at most 65,536 relevant bases per batch and do not each copy
millions of words. Stop terminates workers as before; all confirmed batches
count every actual hash, including candidates after a match in the same batch.

Compressed variant payloads total 12,942,673 bytes before base64; base64 module
files are larger. HTTP gzip compression reduces their transfer size again.
This trades a larger first load for avoiding repeated runtime transformation
and large per-worker dictionaries. No real browser load-time or physical GPU
performance claim is made without measurement on that browser/hardware.

Rebuild and verify both data stages:

```sh
node scripts/build-password-cracking-wordlists.mjs --check
node scripts/build-password-cracking-variants.mjs --check
node scripts/build-password-cracking-worker.mjs --check
```

The original import-password-cracking-wordlists.py script recreates only the old baseline; do not use it alone to update the expanded production lists.

The expansion importer takes the original German source, the pinned ESDB80
query result and its Copyright notice, and SSA names.zip as developer inputs:

```sh
python scripts/expand-password-cracking-wordlists.py --sources-dir /path/to/sources
npm run build:password-cracking
```

Source updates preserve the leading baseline. Checks confirm source hashes,
full baseline inclusion, minimum collection counts, representative membership,
packed-index reproducibility, CPU/encoder candidate equivalence at range and
phase boundaries, and years 1984/1999/2000/2026/2035. Tests at selected offsets
verify generation and hashing without claiming a complete from-zero search.

ASCII is an existing CPU/GPU candidate-space limitation. Umlauts/ß in imported
words become ae/oe/ue/ss; Unicode input is hashed exactly without rewriting.
This update does not add Unicode candidate search or falsely promise it.
Names, compounds and slang remain predictable themes. Failure to find a
password proves only that the selected finite search did not recover it.

Measured build sizes (decimal MB, gzip level 9 per JS/CSS file, 2026-10-13):

| Assets | Uncompressed | Gzip estimate |
|---|---:|---:|
| All lab JS/CSS | 22.82 MB | 14.32 MB |
| Packed index modules (included above) | 17.52 MB | 12.58 MB |
| Worker bundle | 47,891 bytes | 18,795 bytes |
| Previous worker bundle | 2,377,620 bytes | 752,682 bytes |

These are build measurements, not guaranteed HTTP transfer sizes: hosting
compression/cache settings determine actual traffic. Initial preparation took
about 1.0 seconds in Node 24 here, excluding download/module parsing; it is not
a browser or physical GPU benchmark. The shared byte/offset tables occupy
54,437,996 bytes, excluding base arrays, module strings and temporary buffers.
The increased first-load cost is material, particularly on mobile connections;
searching larger wordlists also takes more genuine hash work.

Verification: 89 automated tests passed across the lab, cryptography labs,
bilingual museum, blog/RSS and SEO/sitemap regression suites; SEO audit had
zero errors. Five focused index/loading/range/year tests also passed after
loading-loop responsiveness refinements. The browser acceptance command could
not launch because this environment has no `/usr/bin/google-chrome`.
This release does not claim fresh rendered-browser or physical Radeon testing.

Local Node-only timing: module import 222 ms; dictionary index preparation 629 ms. These are environment-specific and do not measure browser transfer, parsing or physical GPU speed.

Raw wordlist bytes / gzip bytes: DE 1,893,842 / 607,219; EN 2,518,262 / 917,188; Common 201,005 / 95,933. Base-word module 5,123,913 / 1,667,161; worker bundle 47,891 / 18,749. Gzip sizes are reproducible level-9 local compression, not observed HTTP transfers.

The 25 variant-index modules total 17,523,139 raw bytes and 12,637,246 bytes when individually gzip-compressed at level 9 (including bundled license notices). The public module set therefore totals roughly 22.7 MB raw / 14.3 MB gzip, excluding other application assets.

Validation for this release: 44 complete lab tests, 45 website regression tests, SEO audit with zero validation errors, and six targeted final checks passed. Browser acceptance could not run: no Chrome executable was installed and the browser download failed. No new physical GPU or responsive-layout validation is claimed. The browser harness includes actual shader tests for packed dictionary ranges and year boundaries for a subsequent browser run.
