#!/usr/bin/env bash
# Rebuild the locally bundled, extraction-only 7z engine. No runtime downloads.
set -euo pipefail
TASK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR_DIR="$TASK_ROOT/assets/archive-recovery-lab/vendor"
command -v emcc >/dev/null
COMPILER_VERSION="$(emcc --version)"
case "$COMPILER_VERSION" in
 *' 4.0.10'*) ;;
 *) echo 'Use Emscripten 4.0.10.' >&2; exit 1 ;;
esac
(cd "$VENDOR_DIR" && sha256sum -c SHA256SUMS.7zr-zstd)
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT
# The full modified 7-Zip source accompanies the binary, including licenses.
tar --no-same-owner -xzf "$VENDOR_DIR/7zr-zstd-source.tar.gz" -C "$BUILD_DIR"
cd "$BUILD_DIR/7zr-zstd-source/CPP/7zip/Bundles/Alone7z"
ST_MODE=1 EMSCRIPTEN=1 emmake make -j"${ARCHIVE_BUILD_JOBS:-4}" -f makefile.emcc \
 CC=emcc CXX=em++ CFLAGS_BASE_LIST='-c -DZ7_EXTRACT_ONLY' \
 LDFLAGS_EMCC="-O2 -sEXPORTED_RUNTIME_METHODS=['FS','callMain'] -sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=268435456 -sINITIAL_MEMORY=33554432 -sSTACK_SIZE=1048576 -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=SevenZipZstd --post-js post.js --pre-js pre.js"
# Require a bit-for-bit rebuild. Do not silently bless different binaries.
for FILE_NAME in 7zr-zstd.es6.js 7zr-zstd.es6.wasm; do
 cmp "_o/$FILE_NAME" "$VENDOR_DIR/$FILE_NAME"
done
echo '7zr-zstd rebuild matches both committed runtime files exactly.'
