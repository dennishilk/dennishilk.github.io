# Password Cracking Lab

The experiment uses real local SHA-256 comparisons. No target plaintext is
passed to the cracking engines. The UI hashes the target locally, then sends
only its digest, a predefined search phase, a BigInt index and a bounded count.

## Architecture

- `sha256.js`: reusable JavaScript SHA-256 scratch buffers, full UTF-8 hashing
  for independent checks and a one-block ASCII path for generated candidates.
- `search.js`: fixed 64-word teaching dictionary, deterministic numeric,
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
node --test tests/password-cracking-lab.test.mjs
PASSWORD_LAB_BROWSER=/path/to/chrome node scripts/test-password-cracking-browser.mjs --engines-only
```

The browser engine tests execute the production WGSL with real WebGPU buffers,
143 digest vectors, a range above 2^53, and concurrent CPU + WebGPU workers
confirming exactly 100,000 separate attempts. They use an explicit test-only
software-adapter permission. The normal worker never grants that permission:
software WebGPU is disabled in the visitor UI rather than called physical GPU
computation. The available verification browser was Chrome Headless Shell
141.0.7390.54 with SwiftShader. This is real shader execution, **not physical
GPU hardware verification**.

On Dennis's Cthulhu workstation, manually verify GPU adapter detection, real
GPU and Hybrid modes, counts, pause/resume and sustained searches after the
manual Worldnode deployment. WebGPU requires a supported browser, secure
context and worker support. Browser suspension and closed tabs cannot retain
computation. JavaScript strings cannot be securely overwritten; practical
cleanup clears inputs, revealed results, typed buffers and worker instances.
