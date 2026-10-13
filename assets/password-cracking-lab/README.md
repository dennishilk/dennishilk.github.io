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
sources. German imports the shortest 100,000 eligible entries from
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
| DE | 102,091 | 100,570 | 1,521 | 828,629 | 121,808,463 |
| EN | 109,573 | 108,064 | 1,509 | 908,433 | 133,539,651 |
| Common/IT | 10,253 | 10,253 | 0 | 77,598 | 11,406,906 |

Order: selected base collections (Common/IT, DE, EN), years 2000–2035 in the
same collection order, one-digit suffixes, two-digit suffixes, optional brute
force. Fixed case and both leetspeak mappings remain. Each phase is internally
unique; cross-phase/list overlaps are actual hash checks. Source revisions,
raw and filtered checksums, transformations, selection limits and license
copies live in `wordlists/`. Imported text snapshots rebuild without network:

```sh
node scripts/build-password-cracking-wordlists.mjs --check
npm run build:password-cracking
```

For a deliberate source update, download the pinned original `german.txt`,
`english.dic`, `common.txt`, their license files and `versions.json` into a
local folder matching the import script's documented names, then run
`scripts/import-password-cracking-wordlists.py --sources-dir /path/to/folder`.
The raw snapshots are developer inputs; the public page requests no wordlist
URLs. All candidate data is preloaded in the self-contained Worker bundle.
Larger lists increase load time and per-worker memory as well as search cost.
The application never downloads or adapts words based on entered plaintext.

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
