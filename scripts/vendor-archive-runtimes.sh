#!/usr/bin/env bash
set -euo pipefail
# Development-only, reproducible vendoring. These files are served locally.
ROOT="$(pwd)"
OUT="$ROOT/assets/archive-recovery-lab/vendor"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"
printf '{"private":true}\n' >package.json
npm install --no-save --ignore-scripts --no-audit --no-fund --package-lock=false --exact \
  '7z-wasm@1.2.0' 'qpdf-wasm-esm-embedded@1.1.1'
install -m 0644 node_modules/7z-wasm/7zz.es6.js "$OUT/7zz.es6.js"
install -m 0644 node_modules/7z-wasm/7zz.wasm "$OUT/7zz.wasm"
install -m 0644 node_modules/7z-wasm/License.txt "$OUT/LICENSE.7z-wasm"
install -m 0644 node_modules/7z-wasm/unRarLicense.txt "$OUT/LICENSE.unRAR"
install -m 0644 node_modules/qpdf-wasm-esm-embedded/qpdf.mjs "$OUT/qpdf.mjs"
node "$ROOT/scripts/patch-archive-qpdf.mjs" "$OUT/qpdf.mjs"
install -m 0644 node_modules/qpdf-wasm-esm-embedded/LICENSE "$OUT/LICENSE.qpdf-wasm"
curl -fsSL --retry 3 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.txt' -o "$OUT/LICENSE.LGPL-2.1"
npm view 7z-wasm@1.2.0 dist.integrity >"$OUT/INTEGRITY.7z-wasm.npm"
npm view qpdf-wasm-esm-embedded@1.1.1 dist.integrity >"$OUT/INTEGRITY.qpdf-wasm.npm"
(cd "$OUT" && sha256sum 7zz.es6.js 7zz.wasm qpdf.mjs LICENSE.7z-wasm LICENSE.unRAR LICENSE.qpdf-wasm LICENSE.LGPL-2.1) > "$OUT/SHA256SUMS"
for path in 7zz.es6.js 7zz.wasm qpdf.mjs LICENSE.7z-wasm LICENSE.unRAR LICENSE.qpdf-wasm LICENSE.LGPL-2.1; do
  test -s "$OUT/$path"
done
echo "Bundled locally under $OUT; binaries may not be used until E2E validation passes."
cat "$OUT/SHA256SUMS"
