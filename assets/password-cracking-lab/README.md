# Password Cracking Lab

The experiment uses real local SHA-256 comparisons. No target plaintext is
passed to the cracking engines. The UI hashes the target locally, then sends
only its digest, a predefined search phase, a BigInt index and a bounded count.

## Architecture

- `sha256.js`: reusable JavaScript SHA-256 scratch buffers, full UTF-8 hashing
  for independent checks and a one-block ASCII path for generated candidates.
- `search.js`: fixed 4,850-entry teaching dictionary, deterministic numeric,
  dictionary and brute-force enumeration, and exact BigInt range accounting.
- `sha256.wgsl` / `gpu.js`: genuine WebGPU SHA-256 compute dispatches. Every
  dispatched candidate is hashed, including all lanes after a matching lane.
  Adapter initialization includes three CPU/GPU digest agreement checks.
- `worker.js`: CPU and GPU worker entry point. No runtime HTTP requests.
- `coordinator.js`: concurrent worker scheduling over one shared range ledger;
  pause drains assigned work, resume retains the same in-memory session, and
  stop terminates all engines. A GPU error ends the run explicitly.
- Generated `worker-source.js` / `shader-source.js`: preloaded source used by
  Blob Workers so starting a run needs no network after initial page load.

Search candidates are ASCII, 1–24 characters. Dictionary variants are the
original spelling, title case and uppercase; numeric suffix widths are 0–4.
Suffixes include leading zeroes. The dictionary is bundled and does not change
with the target. Smart phases can contain overlapping *values* (for example
an all-digit brute-force space also appears in the numeric strategy), but no
indexed range within a phase is allocated twice or skipped.

Calibration performs an uncounted warm-up and then three measured batches per
engine. CPU, GPU and combined calibration contributions use the same measured
wall-time window, including intensity rests. Calibration never advances the
attack counter. Live rates use actual confirmed counts in a common rolling
one-second wall-time window. Elapsed attack time excludes calibration,
initialization, pauses and the final independent verification. A match is
checked both by the JavaScript SHA-256 implementation and Web Crypto before
success is announced. Counts include completed batches rather than pretending
every other engine stopped at precisely the matching candidate.

## Verification

```sh
node scripts/build-password-cracking-worker.mjs --check
node --test tests/password-cracking-lab.test.mjs tests/blog-rss.test.mjs tests/museum-bilingual-coverage.test.mjs tests/cryptography-labs-04-08.test.js tests/museum-seo.test.mjs tests/sitemaps.test.mjs tests/seo-localization.test.mjs
node scripts/audit-seo.mjs
PASSWORD_LAB_BROWSER=/path/to/chrome node scripts/test-password-cracking-browser.mjs
```

The browser engine tests execute the production WGSL with real WebGPU buffers,
143 digest vectors, a range above 2^53, atomic first-match and outside-space
checks, and concurrent CPU + WebGPU workers confirming exactly 100,000
separate attempts. They use an explicit test-only
software-adapter permission. The normal worker never grants that permission:
software WebGPU is disabled in the visitor UI rather than called physical GPU
computation. The available verification browser was Chrome Headless Shell
141.0.7390.54 with SwiftShader. This is real shader execution, **not physical
GPU hardware verification**.

The complete acceptance runner also checks both independent language pages,
320/390/768/1440px layouts, explicit local reveal and reset, offline dictionary
recovery without HTTP requests, actual symbol brute-force recovery, repeated
fresh calibration, reset during pending target hashing, a real search lasting
more than 30 seconds, pause/resume/stop, native blog layouts and live German
Museum link translation. Initial lab dependencies are all same-origin. The
only shared runtime script is the existing language control; it reads language
controls and preference keys, never password inputs. The separate lab CSS uses
bundled fonts rather than the site's external font import. Static route tests
also enforce `connect-src 'none'` and `form-action 'none'`.

On Dennis's Cthulhu workstation, manually verify GPU adapter detection, real
GPU and Hybrid modes, counts, pause/resume and sustained searches after the
manual Worldnode deployment. WebGPU requires a supported browser and secure context. CPU search and
candidate preparation require dedicated Workers; WebGPU itself may run in
either the Worker or main context. Browser suspension and closed tabs cannot retain
computation. JavaScript strings cannot be securely overwritten; practical
cleanup clears inputs, revealed results, typed buffers and worker instances.

## Mission 03.1 compatibility and dictionary update

Initialization prefers Worker WebGPU. If it fails at any stage, it independently
tries main-thread WebGPU. The main path uses a separate encoding Worker and
transfers padded candidate blocks; only asynchronous WebGPU dispatch/readback
runs on the main thread. Both paths participate in the same BigInt range ledger.
Each context tries high-performance, default, then the standard
`featureLevel: "compatibility"` adapter request. Every selected path must compile
and pass the actual SHA-256 self-test. Compatibility opt-in does not enable flags,
bypass a blocklist or guarantee OpenGL ES support on Linux.

The original application only probed Worker WebGPU and rejected any adapter
whose description contained the word "software". It also requested only the
high-performance core adapter. These are established implementation limitations,
not proof of the precise failure on Cthulhu. Main-thread-only access, a null core
adapter, device or shader failure, and platform restrictions can now be told apart.
Software detection checks fallback flags and known software renderer names rather
than classifying an "AMD Software" hardware driver as a software renderer.
Runtime GPU failure ends the search; it never silently switches to CPU.

The UI reports availability and selected architecture, with expandable API,
adapter, device, shader, pipeline and self-test details. READY, SEARCHING, FOUND,
EXHAUSTED, STOPPED and ERROR have distinct outcomes. The prominent dashboard
shows actual candidate checks, measured rates, progress, elapsed/remaining time,
and CPU/GPU activity; the recovered result is above the detailed metrics and
hidden until explicitly revealed. Technical settings and accounting are expandable.

`dictionary.js` contains 1,817 distinct original vocabulary terms plus 3,033
fixed adjective+noun combinations: **4,850 unique ASCII base entries**. Categories
include German/English everyday words, generic names, calendar, technology,
nature, hobbies and places. Combinations are reproducible from the bundled
patterns, not a claim of 4,850 independently sourced common passwords. No leaked
credentials, password dumps or external dictionary sources are used.

Optional transformations are original/title/uppercase case and two whole-word
leet mappings: `a/e/i/o/s/t → 4/3/1/0/5/7` and `a/i/o/s → @/!/0/$`.
They are selected transformations, not all possible mixed leet substitutions.
Base variants are deduplicated before exact phase counts are computed. Numeric
suffix widths 0–4 include leading zeroes; optional years are an inclusive range
within 1900–2099. Year and four-digit suffix phases may repeat candidate values;
indexed work is always disjoint. Base entries use at most 20 ASCII characters,
so suffixes stay within 24. German spelling uses ae/oe/ue/ss; accented targets are
hashed as entered but cannot be found in this ASCII space.

Platform references reviewed on 2026-10-13:
- https://gpuweb.github.io/gpuweb/ — Window and Worker exposure, adapter requests.
- https://developer.chrome.com/blog/new-in-webgpu-146 — standard compatibility opt-in.
- https://developer.chrome.com/blog/new-in-webgpu-147-148 — Linux rollout remains platform dependent.

Acceptance coverage now includes real main-thread and Worker shader execution,
Worker-interface failure followed by main fallback, compatibility request fallback,
143 digest vectors, responsive main-thread Hybrid work, shader compilation errors
and native device destruction. These test-only shader runs use SwiftShader.
Chrome Headless Shell 154 and 141 are available here; **the physical RX 9060 XT
and Dennis's NixOS driver/browser configuration are not available**. No physical
AMD acceleration result is claimed. The public UI rejects software adapters.

Final verification for this update: 72 automated tests, 19 complete browser
acceptance checks in Chrome Headless Shell 154, and five engine checks in Chrome
Headless Shell 141 passed. The SEO audit reports zero errors. Layout widths are
320, 390, 768 and 1440 pixels in both languages. A separate Chrome 154 run using
normal WebGPU defaults (no unsafe WebGPU/software flags) recovered the CPU example
and correctly reported that its WebGPU API could not acquire an adapter. All
input/select controls have associated labels. Test-runner flags remain confined
to the explicit software shader acceptance environment.
