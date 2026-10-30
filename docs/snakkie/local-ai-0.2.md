# Snakkie 0.2 — browser-local inference experiment

> HISTORICAL: superseded by 0.3. The frontend no longer uses an LLM. Do not
> provision these models for the current page. The old provisioner and inference
> modules were removed; the manifest/licenses are archived in `history-0.2/`.
> See [the current report](knowledge-0.3.md).

This is an unlisted, noindex proof of concept. The mascot, hero, bilingual
routes, original Nebby files and public navigation are preserved. No changes
to Worldnode services, nginx, secrets or server inference were made.

## Engine evaluation (2026-10-30)

Primary sources were retrieved directly because the web-search tool failed:

- [wllama README](https://github.com/ngxson/wllama),
  [v3 API/migration guide](https://github.com/ngxson/wllama/blob/master/guides/intro-v3.md),
  [pinned 3.8.1 source](https://github.com/ngxson/wllama/tree/b68fd6427063266176bb0054befe9ff70b3258f1).
- [WebLLM README/API and cache backends](https://github.com/mlc-ai/web-llm).
- [Transformers.js README: WebGPU, quantization, local model/WASM paths](https://github.com/huggingface/transformers.js).

| Criterion | WebLLM | Transformers.js | wllama 3.8.1 |
|---|---|---|---|
| Small chat models | MLC-converted models and matching compiled model libraries | Supported ONNX causal language models | llama.cpp-compatible GGUF models |
| DE/EN quality | Depends on weights and conversion; not benchmarked here | Depends on weights and conversion; not benchmarked here | Measured below; engine choice does not fix weak models |
| GPU | WebGPU is central | Optional WebGPU backend | WebGPU in current v3; optional CPU mode |
| CPU fallback | No general equivalent CPU path in the reviewed main runtime | WASM/CPU supported | WASM SIMD/CPU supported; used in actual tests |
| Download | Weights, tokenizer/config and matching model library | ONNX weights, tokenizer/config, ONNX runtime | One GGUF includes weights/tokenizer/template; JS + WASM runtime |
| RAM/VRAM | Weights plus KV/cache/buffers; device-specific | Same principle; dtype/backend matter | Bounded 2048-token context here; actual process RAM not measured |
| Desktop/mobile speed | No comparative performance test performed | No comparative performance test performed | Actual single-thread CPU measurements below; physical phones untested |
| Browser support | Requires usable WebGPU | Depends on selected ONNX backend and browser support | Chrome CPU tested; Firefox/Safari/WebGPU not verified here |
| Cache | Cache API, IndexedDB, OPFS options | Browser model cache configurable | Explicit origin-private OPFS adapter; session-only fallback |
| Self hosting | Self-host model assets and compiled MLC library | Disable remote models; set local model and WASM paths | Self-host two runtime files and pinned GGUF; chosen here |
| License | Apache-2.0 library; model license separate | Apache-2.0 library; model license separate | MIT library; chosen Qwen weights Apache-2.0 |
| Maintenance | Matching conversion/compiler artifacts required | ONNX conversion/architecture compatibility required | One pinned runtime, GGUF format, engine-independent UI boundary |

**Choice:** wllama gives this static site a real CPU path without mandatory
GPU support, a familiar GGUF deployment, worker execution, streaming and
cancellation. WebLLM and Transformers.js remain viable future adapters, not
benchmarked losers. No external inference service or provider account is used.

## Models actually investigated

| Model / quantization | Exact bytes | Decimal download | License | Artifact source |
|---|---:|---:|---|---|
| Qwen3 0.6B Q4_K_M | 396,705,472 | 396.7 MB | Apache-2.0 | [Unsloth conversion](https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/tree/50968a4468ef4233ed78cd7c3de230dd1d61a56b) |
| Qwen2.5 0.5B Instruct Q4_K_M | 491,400,032 | 491.4 MB | Apache-2.0 | [Official Qwen GGUF](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/tree/9217f5db79a29953eb74d5343926648285ec7e67) |
| Qwen3 1.7B Q4_K_M | 1,107,409,472 | 1.107 GB | Apache-2.0 | [Unsloth conversion](https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/tree/d7f544eead698dbd1f15126ef60b45a1e1933222) |

The base Qwen3 and Qwen2.5 model cards advertise multilingual support. That
claim is not treated as a guarantee of good German from the smallest quantized
models. First-hand tests found substantial failures. All three actual GGUF
SHA-256 checksums were verified against the pinned Hub LFS metadata.

The original 0.6B test with a mixed English/German persona produced nonsensical
German identity claims (including a plough/horse instead of a penguin), while
English identity and OS explanations were substantially clearer. Six completed
answers were inspected before the first QA page was reloaded during development;
that incomplete run is not represented as a saved full benchmark.

The subsequent 0.5B comparison was stopped after four completed German answers:
its identity answer was correct, but its Linux and Debian/Arch explanations
were misleading, and its joke was incoherent. Raw results:
[qwen25-baseline.json](qwen25-baseline.json). Changing to a fully German persona
improved 0.6B's identity but still left grammatical and explanatory weaknesses:
[qwen3-small.json](qwen3-small.json). These are diagnostic experiments, not a
statistically representative model ranking.

### Selected default: Qwen3 1.7B Q4_K_M

The larger 1.7B model is the default because its tested DE/EN answers were more
coherent than the two smaller candidates. The 397 MB 0.6B remains an explicitly
weaker, optional experiment. This is a tested inference proof of concept, **not
a dependable technical or regional information assistant**.

All eleven requested/optional questions completed with real browser inference:
[full answers and native timings](qwen17-browser.json). No answer was substituted
from a script. Each ordinary question started with its own prompt; only the
context test passed the preceding Debian user/assistant exchange. Prefix caching
means later first-token timings are not independent cold-start measurements.

| Test | First token | Complete reply | Observed quality |
|---|---:|---:|---|
| German identity | 99.3 s | 156.2 s | Penguin and clothing correct; falsely implies daily learning |
| Linux, simple German | 14.5 s | 81.7 s | Understandable, imprecise OS/kernel distinction and spelling |
| Debian vs Arch | 13.6 s | 77.3 s | Misleading generalizations; not a trustworthy comparison |
| Short joke | 34.3 s | 56.1 s | Spontaneous but awkward, no convincing dry humour |
| English identity | 64.8 s | 116.3 s | Clear English and correct penguin persona |
| Operating system, English | 10.2 s | 71.9 s | Understandable introductory explanation |
| Linux, English | 12.6 s | 77.2 s | Coherent basic explanation |
| Debian statement | 10.2 s | 38.6 s | Recognizes Debian; poor German grammar |
| Recall previous OS | 43.7 s | 53.8 s | Correctly recalls Debian from supplied conversation |
| Wiesmoor location | 10.3 s | 54.4 s | Hallucinates a village, West Frisia and an invented region |
| Clothing compliment | 43.1 s | 66.8 s | Generated friendly reply, then an unhelpful weather question |

Loading took **71.5 seconds** in this preview, including a local-origin download
and CPU initialization. Initial load plus first reply's first token took about
171 seconds. Native decoding ranged from **0.82–1.18 tokens/s**; median complete
reply time was **71.9 seconds**. The run including loading took about 15.4 minutes.
These are slow single-thread cloud-desktop CPU results, not a claim about a
visitor's GPU, internet connection or mobile phone. Process RAM was not measured.

The complete 1.7B run preceded the user's final cousin correction. Public copy,
metadata, image alt text, the maintained character reference and both system
prompts now define **Snakkie as Nebby's cousin**, keeping the existing artwork.
A subsequent real frontend test with the final English persona and 0.6B model
asked “Is Nebby your cousin?”. It answered after 30.8 seconds:
“I'm a penguin, not a cousin. But if you're wondering, I'm Nebby! 🐟”. This is a
documented persona failure, not a passing test. Final-cousin adherence has not
been benchmarked with 1.7B; prompt instructions cannot guarantee it.

## Runtime and memory limits

- wllama: `3.8.1`, MIT. npm archive SHA-512 integrity and SHA-256 both verified.
- Context: 2048 tokens; output at most 256 tokens. No thinking mode for Qwen3.
- Prompt: current persona plus up to three recent exchanges, conservatively
  bounded to 1450 UTF-8 bytes of message text. Older complete pairs are dropped.
  Individual input: at most 800 UTF-8 bytes. Textarea also limits characters.
- One generation at a time, no automatic send queue. Stopped/failed partial
  replies remain visibly marked but are not added to future model context.
- Generation watchdog: 180 seconds; loading watchdog: 10 minutes; stop kills
  the worker if cooperative cancellation has not completed after 3 seconds.
- No multithreading or cross-origin-isolation server changes are required:
  `n_threads: 1` is intentional. This costs CPU speed in the test environment.
- Model weights alone occupy roughly 0.40 / 0.49 / 1.11 GB. Runtime, KV context,
  execution buffers and temporary download copies add memory. For planning,
  allow several GB of free RAM for 1.7B; this is not a measured minimum or a
  guarantee. RAM/VRAM peaks were **not measured**. Mobile memory safety and speed
  remain unverified. A browser process can still be killed by the OS under OOM.

## Browser, cache and privacy behavior

The actual browser tests use Chrome 155 on Linux, five reported logical CPUs,
one WASM inference thread, non-isolated HTTP preview. This origin has no secure
OPFS/WebGPU access. The app genuinely falls back to CPU with session-only model
storage; no browser security flags were changed.

On a supported HTTPS origin, the explicit storage backend writes model files
and their cache metadata to OPFS folder `snakkie-models-v2`. It does not use a
cross-origin storage extension. Browser eviction/private-mode restrictions can
remove or disable this cache. A size mismatch invalidates a cache entry. The
provisioner verifies SHA-256 server-side; the browser does not duplicate a GB of
data just to calculate a second checksum. Use HTTPS and immutable hashed names.

Cache reuse, eviction and quota errors on a real HTTPS production origin are
not claimed as browser-tested here. Without OPFS, the worker downloads a session
Blob, with bounded size checking and truthful UI. A later visit needs another
download. The model loader checks same-origin asset availability even for a
cached model, so **full offline site operation is not promised**.

The page downloads no model, runtime library or WASM until Start is clicked.
After that, only same-origin model/runtime URLs are configured. Chat messages
are posted to a local worker; no backend endpoint exists. No chat text is sent
to Hugging Face, npm, an AI provider, telemetry or server storage. Ordinary
same-origin file downloads can still appear in the web server's access log.

WebGPU mode is an experimental selectable path. Automatic mode attempts it only
when an adapter is available; initialization errors fall back to CPU. No WebGPU
performance or Firefox/Safari/Android/iOS success is claimed. The upstream
compatibility CDN is explicitly disabled. Users can explicitly choose CPU.

## Separate artifact provisioning — owner action, not deployment by the worker

Git contains only source, manifest, tests, reports and license notices. It does
**not** contain GGUF weights, the 5.83 MB npm tarball, the installed ~9 MB runtime,
or browser caches. `.gitignore` excludes `/assets/snakkie/local-ai/`.

The reproducible helper is `scripts/prepare-snakkie-assets.py` (Python 3 standard
library, no pip, Node, service installation or nginx changes). It pins sources
by revision/version, validates exact model size and SHA-256, extracts only two
named regular files from the checked npm archive, and refuses to overwrite
existing files with unexpected checksums. Downloads become visible atomically.

Expected server paths beneath the existing static document root:

```text
/srv/www/dennishilk.github.io/assets/snakkie/local-ai/
  wllama-3.8.1/index.js
  wllama-3.8.1/wllama.wasm
  wllama-3.8.1/LICENSE.txt
  models/<selected hashed GGUF filename>
  models/LICENSE.txt
```

Review first without downloading:

```sh
python3 /srv/www/dennishilk.github.io/scripts/prepare-snakkie-assets.py --output /srv/www/dennishilk.github.io/assets/snakkie/local-ai --dry-run
```

The owner can then provision one model by supplying `--model qwen3`,
`--model qwen25` or `--model qwen17` without `--dry-run`. `--model all` is
research-only convenience and downloads about 2 GB of model weights. There is
no need to provide all models. An unprovided choice returns an honest error.
The helper's default is `qwen17`, matching the initial website selection.
Keep the existing nginx static root; enable no server inference service.

Use `application/wasm` for WASM, a JavaScript MIME type for JS/MJS, and normal
static file GET/HEAD support. Model sizes should be sent via Content-Length;
byte ranges are useful for large-file hosting. No new CORS policy is necessary
for same-origin assets. Do not change global COOP/COEP headers just for this
single-thread proof of concept.

If the site uses CSP, this runtime needs same-origin modules/fetches, blob
workers and WebAssembly compilation permission. Review a Snakkie-scoped policy;
the helper does not change or weaken any existing site policy.

Installed model + runtime storage is roughly 406 MB / 500 MB / 1.12 GB.
Allow additional temporary room for the pinned npm archive and partial downloads.
Provisioning one first-time 1.7B visitor transfers about 1.12 GB; 100 uncached
starts are roughly 112 GB. There are no token/API fees, but hosting bandwidth,
disk space and visitor data allowance still matter. Actual Worldnode free disk
space, traffic allowance and caching configuration were not inspected or changed.

## Integration verification

- Real frontend: model start, CPU loading, streaming a generated answer, reply
  language selection, Shift+Enter newline, Enter submit, repeated Enter during
  generation (only one user message), whitespace-only input (no new message),
  stop during prefill, transcript reset, model unload and session cache controls.
- Missing model file and unavailable forced WebGPU both produced visible errors
  without enabling Send. Word navigation remained usable after errors/abort.
- DE/EN route switch, cousin captions and `noindex,follow` verified in Chrome.
- Layout inspected at 1348 px desktop and 320/390/768 px iframe widths. No
  horizontal overflow; Platt van Dag follows the chat. Desktop message viewport
  measured 543 px; mobile 400 px. Iframes test CSS, not physical mobile hardware.
- Unit/regression suite: **45 tests passed, zero failures**, including 11 Snakkie
  tests plus sitemaps, sitemap generator, localization, RSS, homepage project
  cards and museum catalog. JavaScript syntax and Python compilation passed.
- SEO audit: **zero validation errors**, 1059 indexable pages / 1059 unique
  sitemap URLs. Sitemap regeneration preserves the unlisted/noindex routes and
  leaves existing sitemap/navigation/Observer content unchanged.
- Provisioning dry run makes no output directory; actual scratch provisioning
  verified pinned runtime and model checksums. Large assets remain Git-ignored.
- Still untested: real HTTPS OPFS persistence/reuse/eviction/quota failures,
  actual WebGPU generation, Firefox/Safari, physical phones, IME input through an
  actual input-method application, and scrolling away during a long streamed
  answer. IME event guards are covered by unit tests. No benchmark is invented
  for any of those cases.

No Worldnode deployment was performed. The server still needs the reviewed,
separate artifact provisioning after the owner pulls this commit. Without those
files, the live chat reports that the model is unavailable; it does not pretend
to answer.

## Changed files

- `.gitignore`
- `snakkie/index.html`, `de/snakkie/index.html`, `scripts/build-snakkie.mjs`
- `assets/snakkie/{AGENTS.md,README.md,snakkie.css,ui.mjs,inference.mjs}`
- `assets/snakkie/{model-config.mjs,inference-worker.mjs,model-storage.mjs,artifacts.json}`
- `assets/snakkie/licenses/{WLLAMA-MIT.txt,QWEN-APACHE-2.0.txt}`
- `scripts/prepare-snakkie-assets.py`, `tests/snakkie.test.mjs`
- `docs/snakkie/{local-ai-0.2.md,qwen17-browser.json,qwen25-baseline.json,qwen3-small.json}`
- `docs/snakkie/{snakkie-02-cousin.jpg,snakkie-02-chat.jpg}` (browser screenshots)

The canonical mascot files in `assets/snakkie/snakkie-captain-source.png`,
`snakkie-captain-768.webp`, `snakkie-captain-480.webp` and `snakkie-avatar.webp`
are unchanged. No new character was generated in 0.2.

## Later work

Regional Platt remains planned, not an advertised model capability. Review a
curated/licensed Wiesmoor-specific dataset with local speakers before enabling
that mode or pronunciation audio. The manual word examples remain independent
of model availability. Daily rotation is still explicitly inactive.

Before wider publication: verify self-hosted files, HTTPS OPFS cache, Chrome
WebGPU behavior and actual hardware memory limits; test physical phones and
Firefox/Safari; expand factual/personality/language-switch evaluation. Preserve
the noindex/unlisted rules until a separate public-launch decision.
