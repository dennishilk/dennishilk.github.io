# Archive Recovery Lab 7zr-zstd 24.09-zstd-1

A separate **7z-only, extraction-only**, single-threaded WebAssembly build.
RAR still uses the unchanged npm `7z-wasm` runtime; ZIP and qpdf are unchanged.
This module contains no JavaScript AES/KDF or handwritten 7z parser.

## Exact source and compiler

- 7-Zip **24.09**, upstream source commit
  [`e5431fa6f5505e385c6f9367260717e9c47dc2ee`](https://github.com/ip7z/7zip/tree/e5431fa6f5505e385c6f9367260717e9c47dc2ee).
- Existing native decoder: `CPP/7zip/Compress/ZstdDecoder.cpp` and
  `C/ZstdDec.c` (Igor Pavlov's 2024-06-18 decoder). **No additional libzstd
  release or standalone JavaScript decoder is linked.**
- Platform compatibility patch adapted from use-strict/7z-wasm commit
  [`521d2cf93f5964f4e77b01049e19f1b29305c454`](https://github.com/use-strict/7z-wasm/tree/521d2cf93f5964f4e77b01049e19f1b29305c454).
- Emscripten **4.0.10**, compiler source commit
  `b7dc6e5747465580df5984e723b9d1f10d8e804b`; wasm32, `-O2`, `Z7_ST`,
  `Z7_EXTRACT_ONLY`. No pthreads, GPU, NODEFS or WORKERFS adapters.
- Full modified source: `7zr-zstd-source.tar.gz`. Complete patch:
  `7zr-zstd.patch`. Machine-readable pins and SHA-256 values:
  `UPSTREAM.7zr-zstd.json`, `SHA256SUMS.7zr-zstd`.

## What changes

`ZstdRegister.cpp` registers the existing native `NZstd::CDecoder` with 7z
method ID **0x04F71101**, displayed as **ZSTD**. The original full WASM build
could decode Zstandard in other contexts, but lacked this 7z codec registration.
The native 7z folder graph, AES-256/SHA-256 KDF, pack/unpack stream bounds,
solid substream splitting, file CRCs and extraction filesystem remain in use.
No bytes or passwords are forwarded to another service or decoder API.

Supported historical Zstandard coder property lengths are 1, 3 and 5 bytes.
These contain historical version/level metadata; the Zstandard frame supplies
its own decoding parameters. Other property lengths return `E_NOTIMPL`.
The app tests codec configuration locally before enabling readable-header
Zstandard input, then uses real candidate tests and a fresh verification Worker.

Policy changes in the native decoder:

- Reject a Zstandard frame window **above 32 MiB**, before allocating it.
  This changes the allocation-policy check, not the format's offset alphabet.
- Reject a declared Zstandard folder output **above 32 MiB**.
- Limit the complete WASM linear memory to **256 MiB**, initially 32 MiB,
  with a 1 MiB stack and bounded memory growth.
- Keep the application limits: input 8 MiB, entry output 16 MiB, total output
  32 MiB, 256 entries, declared expansion 200:1, safe paths and CRC checks.
- The library postamble returns CLI statuses without changing Node's process
  exit code, so failed candidate tests do not terminate the test host.
- Individual binary outputs use `application/octet-stream`, preserving a
  filename without an extension instead of Chromium appending `.txt`.

## Licenses and complete source

The 7-Zip integration is **LGPL-2.1-or-later**, with upstream public-domain
components, the Zstandard decoder's **BSD-3-Clause** and xxHash's **BSD-2-Clause**
notices. See `LICENSE.7zr-zstd` and `LICENSE.LGPL-2.1`.
The included complete 7-Zip source also carries the upstream unRAR notice for
its RAR sources, which are **not compiled into this 7z-only module**. The
separate, unchanged RAR module retains all existing unRAR restrictions.

Generated runtime/library notices are included in `LICENSE.emscripten`
(MIT / Illinois-NCSA options), `LICENSE.libcxx` (Apache-2.0 with LLVM exceptions)
and `LICENSE.musl` (MIT and the file-specific notices reproduced there).
Users may replace/rebuild the module from the supplied complete modified source;
no signing restriction or integrity-enforcement mechanism prevents replacement.
Integrity manifests are development/CI verification, not a runtime lock.

## Rebuild

With Emscripten 4.0.10 on PATH, at the website repository root:

```sh
bash scripts/build-archive-7z-zstd.sh
```

Or use the Emscripten 4.0.10 container to run that same command. The script
checks every pinned hash, unpacks the supplied source locally, rebuilds it and
requires **both output files to match byte-for-byte**. It performs no downloads.
The `Archive Zstandard reproducible WASM build` Actions job runs this check.

## Coverage and limitations

The unchanged original `test-7z-secret.7z` is the primary acceptance case:
AES-256, SHA-256 KDF 2^19 cycles, readable headers, solid Zstandard folder,
three files / 728 bytes. `expected-zstd.json` records independently established
file sizes and SHA-256 values. Wrong candidates, fresh extraction, actual UI
search through 677 common-dictionary candidates, individual and ZIP downloads,
DE/EN, offline operation and no private network traffic are tested.

Additional independent py7zr fixtures cover Zstandard with encrypted headers,
corrupt ciphertext, unsafe paths, over-limit output, unencrypted input,
unsupported properties, and an encrypted frame with a genuine 64 MiB window.
That last file is valid and readable independently, but deliberately outside
this decoder's 32 MiB window policy. The encrypted frame header can only be
checked after decryption; encountering it stops recovery with a codec/configuration
error and releases no output. External Zstandard dictionaries, exotic coder
chains, split archives and the existing unsupported archive cases remain outside
the validated release subset. Long random passwords remain infeasible.
