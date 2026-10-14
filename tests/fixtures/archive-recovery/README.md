# Actual Cthulhu acceptance files (2026-10-14)

These two originals were supplied by Dennis for Mission 04.7. They are kept
byte-for-byte, not regenerated or replaced by easier files.

| File | SHA-256 | Password | Independently established properties |
|---|---|---|---|
| `test-pdf-aes256-test9.pdf` | `63c388f40d541af876e85d82b95f79c47160ec349738a7095006612f960caf53` | `test9` | PDF 2.0, Standard Security R6, V5, AESV3 / AES-256, opening/user password, one page |
| `test-7z-secret.7z` | `d5ef7c31996ba1a8d00fd3d04aa6d8557aa105bb4f4528821f24e8249332bd7c` | `secret` | Readable headers, solid block, 7zAES (AES-256), SHA-256 KDF 2^19 cycles, Zstandard extension coder `04F71101` |

PDF supplied as an explicitly created public test document; its one-page text
identifies it as an Archive Recovery Lab test fixture. Its sample password is
intentionally printed inside the encrypted document.

The 7Z is from the py7zr project's encrypted test fixtures, supplied under a
renamed filename. Upstream: https://github.com/miurahr/py7zr. Its embedded
`setup.py` declares LGPL-2.1 and Hiroshi Miura as author (spelled “Hioshi” in that
historical file). LGPL-2.1 license text is included as `LICENSE.py7zr`.
The exact upstream filename/commit was not supplied; do not invent one.

The original 7Z contains these independently extracted files:

| Name | Bytes | SHA-256 |
|---|---:|---|
| `scripts/py7zr` | 111 | `b0385e71d6a07eb692f5fb9798e9d33aaf87be7dfff936fd2473eab2a593d4fd` |
| `setup.cfg` | 58 | `ff77878e070c4ba52732b0c847b5a055a7c454731939c3217db4a7fb4a1e7240` |
| `setup.py` | 559 | `b916eed2a4ee4e48c51a2b51d07d450de0be4dbb83d20e67f6fd166ff7921e49` |

Mission 04.7.1 supplies a separate local 7z-only WASM build of 7-Zip 24.09,
registering its existing native Zstandard decoder under extension `04F71101`.
This original now recovers all three files with `secret`, using the native AES,
solid-folder and CRC pipeline. `expected-zstd.json` is the machine-readable
reference used by Node tests and real browser individual/ZIP download tests.
The original remains byte-for-byte identical; no replacement fixture is used.

## Additional independent coverage

`data-only-lzma2.7z` and `data-only-copy.7z` are separate fixtures made with native
7-Zip 23.01, `-mhe=off -p7` and respectively `-m0=LZMA2` / `-mx=0`.
`header-encrypted-lzma2.7z` uses `-mhe=on -p7` and covers the parsed AES header
coder metadata and existing recovery path. `unencrypted-lzma2.7z` is a negative control, without `-p7`. All contain a directory
`folder` and `folder/sample.txt` with the UTF-8 bytes:

`Independent data-only encrypted 7Z fixture — Grüße!` followed by a newline.

They prove support for readable headers plus encrypted payloads and correct
`Attributes = D …` directory handling. They **do not replace the original 7Z**.

## Mission 04.7.1 Zstandard safety coverage

`scripts/archive-zstd-fixtures.py` independently creates the additional py7zr
1.1.4 fixtures with Zstandard and genuine AES-256. Sample password: `7`.

- `zstd-header-encrypted.7z`: encrypted headers, genuine recovery.
- `zstd-unsafe.7z`: explicit `../escape.txt` path, rejected before search.
- `zstd-over-limit.7z`: 17 MiB output, rejected before decompression.
- `zstd-unencrypted.7z`: no encryption; search remains unnecessary.
- `unsupported-lzma.7z`: outside the validated codec allowlist, still unsupported.
- `zstd-invalid-properties.7z`: two-byte unsupported properties, rejected before search.
- `zstd-window-limit.7z`: a genuine encrypted Zstandard frame with a 64 MiB
  window and tiny output; valid with independent py7zr, rejected by the local
  decoder's 32 MiB window policy after decryption. No output is released.

These do not replace the primary original archive or its reference hashes.
