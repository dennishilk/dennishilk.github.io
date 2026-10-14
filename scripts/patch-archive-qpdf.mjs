// Reproducible local integration fix for qpdf-wasm-esm-embedded 1.1.1.
// Embedded data must be decoded directly, never fetched under connect-src self.
import {readFileSync,writeFileSync} from 'node:fs';
const path=process.argv[2]||new URL('../assets/archive-recovery-lab/vendor/qpdf.mjs',import.meta.url);
const original='function Pa(){if(ha||m){';
const patched='function Pa(){if(M.startsWith(Ma))return Promise.resolve().then(Oa);if(ha||m){';
const source=readFileSync(path,'utf8');
if(source.includes(patched))process.exit(0);
if(source.split(original).length!==2)throw Error('Pinned qpdf loader changed; review embedded-WASM patch');
writeFileSync(path,source.replace(original,patched));
