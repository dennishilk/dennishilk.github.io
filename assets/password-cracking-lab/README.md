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

## Vocabulary and exact search spaces

The bundled, self-authored vocabulary has **4,850 unique base entries**:
**1,817 individual words** and **3,033 fixed word-pair patterns**. Categories
include German/English words, generic names, seasons, months, animals, nature,
places, hobbies and technology. Pairing rules and source categories are
explicit in dictionary.js; pairs are not claimed to be independent dictionary
lexemes. There are no breach dumps, real-account password lists, downloaded
wordlists or target-derived entries.

Bases are lowercase ASCII, 1–20 characters; German transliterations use
ae/oe/ue/ss. Optional title case/uppercase yield 14,549 unique forms. Optional
whole-word leetspeak applies two fixed mappings, not every substitution mix:

- `a→4, e→3, i→1, o→0, s→5, t→7`
- `a→@, i→!, o→0, s→$`

Leetspeak alone yields 14,166 forms; both options yield 40,621. Word variants
are deduplicated before exact counting. Optional years use an inclusive,
configurable range within 1900–2099; the UI starts at 2000–2035. Numeric suffix
widths are 0–4, including leading zeroes. Four-digit additions keep candidates
within the existing 24-character limit. Original entries plus suffix widths
0–4, without years or other variants, total **53,888,350**. Original words plus
years 2000–2035 without numeric suffixes yield **179,450** total candidates.

Dictionary order: words, selected years, selected suffix widths. Smart order:
words, short numbers, years, suffixes, longer numbers, selected brute force.
Bounds and exact phases are inspectable. Phases can repeat values (a year may
also be a four-digit suffix), but indexed ranges within a phase are never
allocated twice or skipped. Original UTF-8 input is hashed exactly: accented
input is not silently converted to ASCII. Exhaustion covers only the selected
space and never proves password safety.

## Measurements, controls and privacy

Calibration uses an uncounted warm-up, then three measured batches per engine.
All contributions use the same measured wall-time window, including intensity
rests. Each Measure click runs fresh batches and never advances the attack
counter. Live rates use confirmed counts in a common rolling one-second
window. Elapsed attack time excludes initialization, calibration, pauses and
final independent verification. JavaScript SHA-256 and Web Crypto both verify
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

Engine tests execute production WGSL using real WebGPU buffers: 143 vectors,
exact indices above 2^53, atomic first-match and outside-space checks. CPU +
GPU workers and main-thread GPU Hybrid each confirm exactly 100,000 distinct
attempts. Real shader compilation failure and native device destruction retain
precise reasons. A test-only adapter-request override returns null for the two
core requests, then executes the real shader through the compatibility request.
Shader answers are never mocked.

Acceptance covers EN/DE, 320/390/768/1440px, keyboard access, prominent outcomes,
explicit reveal/reset, offline dictionary recovery without HTTP or plaintext
worker messages, real year/leet/symbol recovery, relevant editable controls,
fresh repeated calibration and reset during pending hashing. Separate real CPU
and main-thread GPU Hybrid UI searches last over 30 seconds and pause/resume/
stop correctly. Articles, Museum integration, SEO, RSS and sitemaps are checked.

Available browsers: Chrome Headless Shell **141.0.7390.54** and **154.0.8037.92**,
using **SwiftShader**. Explicit unsafe flags/software permission occur only in
the test harness; normal-page tests keep GPU/Hybrid disabled for software.
Worker interface removal and software permission in private main-path UI tests
are delivery overrides confined to testing; metadata remains software=true.
This is real shader execution, **not physical GPU verification** or proof of
RX 9060 XT support.

Dennis should verify adapter detection, genuine GPU/Hybrid and sustained
searches on Cthulhu after manually deploying Worldnode. The application does
not deploy the server or require unsafe flags, a console, NixOS changes or
developer-only adapter settings for normal controls.

Final acceptance: 72 automated tests and 23 browser checks each in Chrome 154
and Chrome 141 passed. The SEO audit reports zero errors.
