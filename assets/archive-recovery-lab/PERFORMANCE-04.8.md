# Archive Recovery Lab — CPU / WebGPU / Hybrid, Mission 04.8

This release preserves CPU recovery for the existing ZIP, RAR4, RAR5, 7Z and PDF
subset. Initial settings are always **CPU and exactly two workers**. Every integer
1–16 is selectable. No hardware-based selection, persisted mode, automatic
benchmark, automatic GPU choice or silent CPU fallback exists.

## Implemented GPU and Hybrid scope

| Variant | Cryptographic GPU operation | Status / independent gate |
|---|---|---|
| ZIP ZipCrypto | UTF-8 password key schedule, CRC-32 updates and decryption of all 12 header bytes | Implemented and tested; matching one-byte check is only a filter. CPU decrypts target and checks CRC; fresh Worker extracts every entry. |
| ZIP AES-128 AE-1 / AE-2 | PBKDF2-HMAC-SHA-1, 1,000 iterations, salt 8 bytes, derived verifier offset 32 | Implemented and tested; CPU derives complete keys, authenticates/decrypts target, then fresh complete extraction. |
| ZIP AES-192 AE-1 / AE-2 | Same KDF, salt 12 bytes, verifier offset 48 | Implemented and tested, same gate. |
| ZIP AES-256 AE-1 / AE-2 | Same KDF, salt 16 bytes, verifier offset 64 | Implemented and tested, same gate. |
| RAR5, supported archive-encryption header | PBKDF2-HMAC-SHA-256 at **2^k + 32** iterations, XOR-fold of 32 derived bytes to the eight-byte password check | Implemented and tested for version 0, header flags 0, encryption flags exactly 1, KDF exponent 0–16, valid header CRC and check SHA-256 checksum. Native 7-Zip validates decrypted headers; fresh Worker enforces archive limits, all file checks and extraction. |
| RAR5 without this check, data-only records, other header flags or exponent >16 | Different parameter-location/configuration or missing usable verifier | CPU-only. This narrow GPU reader deliberately does not enable unvalidated variants. |
| RAR4 | Custom 2^18-round SHA-1 derivation over UTF-16LE password, salt and 3-byte counter; IV snapshots; AES-128; header or content checks | Investigated, not implemented on GPU. Standard PBKDF2 is incorrect. Native source also has historical long-password SHA-1 compatibility behavior. Requires a separate compatible KDF/AES implementation and validated encrypted-header boundary reader. |
| 7Z AES-256 + LZMA2 | SHA-256 over repeated salt + UTF-16LE password + little-endian 64-bit counter, usually 2^19 repetitions; AES-256-CBC; folder verification | Investigated, CPU-only. No universal standalone password-check record. The native engine has no imported-derived-key interface: GPU KDF alone followed by CPU redoing it for every candidate would not meet this release's GPU verification contract. A complete validated AES/header/CRC pipeline is still missing. |
| 7Z AES-256 + Copy | Same crypto, Copy folder output rather than LZMA2 | Same current blocker. Copy is not a substitute for independent CRC verification, particularly for empty or unauthenticated content. |
| 7Z AES-256 + Zstandard | Same crypto; native Zstandard folder decoder handles extraction | Same current blocker. Codec 04F71101 is decompression, not a GPU password verifier. Original three-file fixture remains fully CPU supported. |
| PDF R2 / RC4-40 | Padded 32-byte password, MD5 over password/O/P/ID, 40-bit key; RC4 of the standard padding compared to U | Investigated, not implemented on GPU. MD5/RC4 kernels and an exact resolved encryption-dictionary/ID/password-encoding bridge to qpdf are missing. |
| PDF R3 / RC4-128 | MD5, 50 rehashes, 20 RC4 passes, 16-byte U check | Investigated, same missing bridge and kernels; not equivalent to ZIP PBKDF2. |
| PDF R4 / AES-128 (and supported crypt filters) | Legacy MD5/RC4 password validation still applies; EncryptMetadata contributes to derivation; AES is used for content | Investigated, same bridge/kernels missing. AES content encryption does not imply an AES-only password check. |
| PDF R6 / AES-256 | Password preparation and truncation; salted SHA-256 followed by variable AES-CBC and SHA-256/384/512 rounds, minimum 64, data-dependent stop | Investigated, not implemented on GPU. Requires AES, SHA-384/512 (including 64-bit word emulation in WGSL), bounded multi-dispatch round state and exact qpdf-compatible password preparation. |

The CPU-only rows are **engineering/validation gaps, not claims that GPU cracking
is mathematically impossible**. This release makes no universal GPU claim.
Neither the companion Password Cracking Lab's engine nor its benchmark is used.

## How GPU results become recovery results

`crypto.wgsl` performs the actual format-specific cryptography. ZIP AES only needs
the final PBKDF2 block containing its two-byte verifier, so the GPU does not
calculate earlier unused PBKDF2 blocks. Each block still executes all 1,000 HMAC
iterations. The full CPU key derivation/authentication runs only for filter hits.
This is a genuine accelerated filter, not GPU AES extraction or full GPU ZIP
HMAC authentication. RAR5 compares its actual eight-byte KDF check.

A dedicated local GPU Worker maps all completed flags, confirms plausible hits
with the existing CPU backend, and reports completed checks. A separate newly
constructed CPU Worker then reparses and independently verifies/extracts **every
file**, or produces a password-free verified PDF. No filter hit alone authorizes
a success screen or download. A mixed-password ZIP and damaged AES tag are
explicit negative tests. A real ZipCrypto collision test exercises the CPU gate.

UTF-8 password input supports 0–256 bytes in kernels, including SHA-1/SHA-256 key
prehashing for HMAC keys longer than 64 bytes. Self-tests compare empty, Unicode,
65-byte, 128-byte and 256-byte inputs to WebCrypto, all ZIP AES strengths and RAR5's exact
additional rounds, including the maximum admitted 65,568-round boundary. Larger GPU candidates cause an explicit error, not fallback.
RAR5 prepares the first 127 UTF-16 units exactly as the native engine does,
while retaining the original candidate for CPU confirmation. Inputs exceeding
the native 256-original-UTF-8-byte CLI guard, malformed Unicode, controls or a
surrogate split at the truncation boundary cause an explicit encoding error
rather than a silent rejection. Normal candidate dictionaries/order and ASCII
brute-force configuration are unchanged.

## Manual capabilities, failure handling and scheduling

WebGPU is optional. The explicit hardware-check button starts a small shader and
cryptographic known-answer test; it never benchmarks or changes the selected
engine. CPU does not depend on adapter/device creation. Unavailable modes stay
visible and disabled with DE/EN explanations. A file change that invalidates a
selected mode blocks Start until the visitor explicitly selects a valid mode.

ZIP and RAR5 capability tests are tracked separately: a failing RAR5 self-test
does not disable an otherwise validated ZIP path. Each run recreates its GPU
device/pipeline and repeats the selected format's self-tests. Adapter,
device, software-adapter, capability-limit, shader, self-test, initialization-timeout, execution and
device-loss failures remain distinct. Device loss ends Hybrid as a whole. There
is no silent CPU continuation. Resource initialization is limited to one Worker
at a time with 45-second initialization deadlines. GPU jobs have a 30-second
watchdog; independent final verification has a 120-second deadline. Shader workgroups have 32 invocations; batches are at most 256 ZIP or
8 RAR5 candidates, with bounded buffers under 1 MiB for password input.

All actors use one BigInt coordinator cursor. Ranges are disjoint, phase bounded
and allocated fairly to idle actors, including small search spaces. Hybrid needs
at least two candidates; otherwise it requests an explicit different mode.
Counts increase only from validated completed messages, never queued ranges.
CPU confirmations of GPU filter hits and final extraction are not counted again
as new candidates. The live display shows ready/active CPU counts, per-path
completed-work rates and the combined rate. Startup, final verification and
paused idle time do not inflate search throughput.

Pause stops new GPU dispatches while an already submitted batch drains; its
completed checks and remaining active time are included. CPU Workers acknowledge pause at cooperative boundaries with a generation-tagged
message. The live dashboard distinguishes draining work from acknowledged
quiescence, and completed checks are flushed before that acknowledgement.
A delayed older acknowledgement cannot mark a later pause as complete. Resume never resubmits a completed range. Stop/Reset
terminate every actor immediately; unreported/in-flight work is discarded from
counts. Match arbitration cancels pending GPU work if CPU wins, drains native CPU
actors, then releases all search instances before creating the fresh verifier.

## Memory admission and limits

Browser APIs do **not** reveal reliable free RAM. The app therefore uses an
explicit conservative admission estimate, not an OOM-prevention guarantee:

- ZIP search Worker reserve: 32 MiB plus three input-file copies.
- Native Worker reserve: 320 MiB plus three input-file copies (engine, MEMFS and
  extraction scratch). 7zr-zstd's actual WASM maximum remains 256 MiB; other
  native runtimes retain their prior build limits.
- GPU reserve including CPU confirmation: 96 MiB for ZIP, 416 MiB for native RAR5.
- Aggregate budget: one quarter of `navigator.deviceMemory`, capped at 2 GiB;
  if absent, 1 GiB. This estimate deliberately leaves browser/OS headroom.

An unsafe request is rejected with the estimate/budget and a translated message.
The selected count is never clamped. Consequently 16 workers are selectable but
many native-format configurations cannot be admitted. With a browser reporting
8 GiB, this policy rejects 8/16 native CPU workers. Increasing the selector is
not a promise that 16 native instances fit. Sequential initialization avoids
compilation/copy spikes. Errors, Stop, Reset and page exit release Worker/device
references and download URLs. JS/driver garbage collection cannot guarantee
secure erasure or expose exact process/GPU memory.

All original archive size, path, symlink, entry, output, ratio, CRC and codec
limits remain intact. The authorization checkbox remains mandatory. New code
uses only local static modules and WGSL; there are no uploads, private-content
requests, telemetry, runtime CDNs or persistent password storage. Offline tests
use fresh Workers with cached static assets, including WGSL and native RAR WASM.

## Reproducible checks and benchmarks

```sh
npm run test:archive-recovery
npm run build:archive-recovery
node scripts/test-archive-recovery-browser.mjs
node scripts/test-archive-wasm-browser.mjs
node scripts/test-archive-real-files-browser.mjs
node scripts/test-archive-gpu-browser.mjs
node scripts/benchmark-archive-cpu-browser.mjs
```

Browser scripts use `ARCHIVE_RECOVERY_BROWSER` and `PLAYWRIGHT_MODULE` (or the
existing runtime module path). The WASM and GPU suites use the existing pinned
junrar fixtures in `$RUNNER_TEMP/archive-wasm-test` (default `/tmp`). The Actions
workflow already fetches them, then runs the new GPU suite. Its default test
adapter uses Chrome SwiftShader with explicit test flags and a test-server-only
`allowSoftware=true` opt-in. The production default rejects known software/fallback
adapters rather than presenting them as physical GPU acceleration. This is software
WebGPU correctness validation, **not a physical GPU speed claim**.

`ARCHIVE_GPU_BENCHMARK_ONLY=1` skips correctness/UI tests for a quiet repeat of
identical benchmark workloads. `ARCHIVE_GPU_HARDWARE=1` omits software flags for
manual hardware runs; a usable actual adapter is still required. Report paths
are controlled by `ARCHIVE_GPU_REPORT` and `ARCHIVE_CPU_REPORT`.

The ZIP benchmark checks exactly 1,000 numeric candidates per accepted mode,
RAR5 checks 64; the password is outside those candidate sets. Independent
extraction with the known fixture password is checked separately. Browser UI
acceptance tests additionally verify real individual and recovered ZIP downloads.
The native CPU matrix uses 16 rejection checks per accepted configuration. These
short measurements are noisy and are format-specific, not universal rates.

Checked-in JSON reports record actual active time, initialization time,
completed CPU/GPU counts, memory admission, browser and environment. All hardware
GPU performance, driver stability, Firefox behavior and Cthulhu scaling remain
**awaiting Dennis's real-world validation**. The test environment is an AMD EPYC
9V74 container, nine visible logical CPUs with an eight-CPU cgroup quota and an
8 GiB cgroup memory limit; it is not the Ryzen/Radeon workstation.

### Recorded container measurements (14 October 2026)

These are completed candidates per active second on **Chrome 155.0.8059.79,
AMD EPYC 9V74 container and SwiftShader software WebGPU**. They are short
single-run observations, not statistically stable hardware comparisons. There
is no Radeon result in this table. Initialization and KAT cost are excluded.

| Format | CPU 2 | CPU 4 | CPU 8 | CPU 16 | Software WebGPU | Hybrid CPU 2 + software WebGPU |
|---|---:|---:|---:|---:|---:|---:|
| zipcrypto | 64102.6 | 106383.0 | 97087.4 | 84745.8 | 32362.5 | 98039.2 |
| aes128 | 3652.3 | 3937.0 | 3891.1 | 3721.6 | 1027.6 | 3741.1 |
| aes192 | 2474.6 | 2522.1 | 2635.7 | 2654.6 | 1067.6 | 2485.7 |
| aes256 | 1917.2 | 1844.7 | 1726.8 | 1742.5 | 1251.4 | 2763.2 |
| rar5 | 70.3 | 118.3 | blocked | blocked | 7.8 | 57.8 |

RAR5 CPU 8/16 requests were explicitly rejected by memory admission, not silently
reduced. For AES-256, initialization was 27.0 ms (CPU 2), 909.6 ms (software
WebGPU) and 932.4 ms (Hybrid). The RAR5 software device is slower than CPU;
production does not offer this software adapter as hardware acceleration.

Full raw results: [ZIP/RAR5 execution comparisons](../../tests/reports/archive-recovery-04.8-gpu.json)
and [RAR4/5, 7Z Copy/LZMA2/Zstandard and PDF R2/R3/R4/R6 CPU matrix](../../tests/reports/archive-recovery-04.8-cpu.json).
The latter records 36 admitted/blocked configurations with measured startup and
active time; all admitted cases completed exactly 16 real rejection checks.

Local release checks: 68 Archive tests, 44 unchanged companion tests, 24 Museum
tests and zero SEO errors. Real Chrome suites cover existing ZIP controls,
RAR4/5, 7Z, PDF, original Zstandard/PDF files, genuine GPU/Hybrid cryptography,
DE/EN, real downloads, cached offline operation, and no private transmissions.
The new GPU suite includes live Hybrid device loss, shader failure, per-format
KAT failure isolation, mixed-password independent-verification refusal, explicit
pause quiescence with a deliberately delayed real GPU batch, and
software-adapter rejection. Firefox and physical Cthulhu hardware are untested here.

## Sources, licenses and integrity

New JS, WGSL and the independent Python RAR5 fixture writer are original code,
licensed MIT in `LICENSE.gpu`. There is no added runtime dependency. Existing
zip.js BSD-3-Clause, native 7-Zip LGPL/public-domain/BSD/unRAR and qpdf Apache-2.0
notices remain unchanged. `SHA256SUMS.gpu` pins the new runtime source files.

Research/algorithm sources:

- [WinZip AE specification](https://www.winzip.com/en/support/aes-encryption/).
- [RARLAB RAR5 format](https://www.rarlab.com/technote.htm).
- 7-Zip 24.09 at `e5431fa6f5505e385c6f9367260717e9c47dc2ee`,
  `CPP/7zip/Crypto/RarAes.cpp`, `Rar5Aes.cpp`, `7zAes.cpp` in the already supplied
  complete source archive; no C++ code is copied into these WGSL kernels.
- [qpdf encryption model](https://qpdf.readthedocs.io/en/stable/encryption.html)
  and pypdf 5.9.0 `AlgV4`/`AlgV5` source inspected independently for R2–R6.
- [WebGPU specification](https://www.w3.org/TR/webgpu/), compute limits,
  asynchronous mapping, device loss and error scopes.
- SHA-1/SHA-256 arithmetic/constants follow NIST FIPS 180-4.

The new deterministic `rar5-header-gpu-7.rar` has independently generated AES-256
CBC encrypted headers **and file data**, KDF exponent 15 and stored compression.
Native 7-Zip 24.09 successfully tests and extracts its exact 40-byte plaintext.
Its generator uses Python hashlib and cryptography only, never application code.
The original Zstandard/PDF acceptance fixtures remain byte-identical.

The Password Cracking Lab, other Museum exhibits, overview/starfield, blog drafts,
blog indexes, feeds, sitemaps and Worldnode/nginx configuration are outside this
change. No article is published by this mission.
