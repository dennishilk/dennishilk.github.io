import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {recognize} from '../assets/archive-recovery-lab/core.js';
import {probeUnsupportedFormat} from '../assets/archive-recovery-lab/format-probe.js';
import {createFormatBackend} from '../assets/archive-recovery-lab/format-backend.js';
const root=new URL('./fixtures/archive-recovery/',import.meta.url);
const fixture=name=>new Blob([readFileSync(new URL(name,root))]);

test('actual Cthulhu originals retain their bytes and valid container metadata',async()=>{
 for(const [name,format,sha] of [
  ['test-pdf-aes256-test9.pdf','PDF','63c388f40d541af876e85d82b95f79c47160ec349738a7095006612f960caf53'],
  ['test-7z-secret.7z','7Z','d5ef7c31996ba1a8d00fd3d04aa6d8557aa105bb4f4528821f24e8249332bd7c']]){
  const b=fixture(name);
  assert.equal(createHash('sha256').update(new Uint8Array(await b.arrayBuffer())).digest('hex'),sha);
  assert.equal(await recognize(b),format);
  const probe=await probeUnsupportedFormat(b,format);
  if(format==='PDF')assert.equal(probe.version,'2.0');
 }
});
test('real py7zr AES+Zstandard archive rejects wrong passwords and recovers exact original bytes',async()=>{
 const blob=fixture('test-7z-secret.7z'),backend=await createFormatBackend(blob,'7Z');
 assert.equal(backend.info.supported,true);
 assert.equal(backend.info.filenamesEncrypted,false);
 assert.equal(backend.info.encryptedCount,3);
 assert.equal(backend.info.total,728);
 assert.match(backend.info.algorithms.join(' '),/AES-256.*ZSTD/);
 for(const bad of ['wrong','Secret','secreu'])assert.equal(await backend.check(bad),false);
 assert.equal(await backend.check('secret'),true);
 const fresh=await createFormatBackend(blob,'7Z');
 await assert.rejects(fresh.recover('wrong'),e=>e.code==='independent');
 const {files}=await fresh.recover('secret');
 const expected=JSON.parse(readFileSync(new URL('expected-zstd.json',root),'utf8'));
 assert.deepEqual(files.map(f=>f.name).sort(),Object.keys(expected).sort());
 for(const file of files){
  const bytes=new Uint8Array(await file.blob.arrayBuffer());
  assert.equal(bytes.length,expected[file.name].size);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected[file.name].sha256);
 }
});
for(const name of ['data-only-lzma2.7z','data-only-copy.7z'])test(name+': readable headers, real checks and fresh independent extraction',async()=>{
 const blob=fixture(name),backend=await createFormatBackend(blob,'7Z');
 assert.equal(backend.info.supported,true);
 assert.equal(backend.info.filenamesEncrypted,false);
 assert.equal(backend.info.entries[0].directory,true);
 assert.equal(backend.info.encryptedCount,1);
 for(const bad of ['wrong','0','8'])assert.equal(await backend.check(bad),false);
 assert.equal(await backend.check('7'),true);
 const fresh=await createFormatBackend(blob,'7Z');
 await assert.rejects(fresh.recover('wrong'),e=>e.code==='independent');
 const result=await fresh.recover('7');
 assert.equal(result.files.length,1);
 assert.equal(result.files[0].name,'folder/sample.txt');
 assert.equal(await result.files[0].blob.text(),'Independent data-only encrypted 7Z fixture — Grüße!\n');
});
test('encoded but unencrypted 7Z headers never enable password recovery',async()=>{
 await assert.rejects(createFormatBackend(fixture('unencrypted-lzma2.7z'),'7Z'),e=>e.code==='unencrypted');
});
test('encrypted-header AES is established by coder metadata, not an arbitrary WASM exception',async()=>{
 const blob=fixture('header-encrypted-lzma2.7z');
 const probe=await probeUnsupportedFormat(blob,'7Z');
 assert.equal(probe.headerEncrypted,true);
 assert.equal(probe.encryptionStatus,'headers-encrypted');
 const backend=await createFormatBackend(blob,'7Z');
 assert.equal(backend.info.filenamesEncrypted,true);
 assert.equal(await backend.check('wrong'),false);
 assert.equal(await backend.check('7'),true);
 const fresh=await createFormatBackend(blob,'7Z');
 assert.equal(await (await fresh.recover('7')).files[0].blob.text(),'Independent data-only encrypted 7Z fixture — Grüße!\n');
});
test('corrupt actual 7Z checksum is rejected before engine startup',async()=>{
 const bytes=new Uint8Array(await fixture('test-7z-secret.7z').arrayBuffer());bytes[8]^=1;
 await assert.rejects(createFormatBackend(new Blob([bytes]),'7Z'),e=>e.code==='malformed'&&e.diagnostic.stage==='preflight');
});
test('original PDF and original Zstandard content are independently readable with their supplied passwords',()=>{
 execFileSync('python3',[new URL('../scripts/verify-archive-real-fixtures.py',import.meta.url).pathname,root.pathname]);
});
test('Zstandard payload corruption is never a password match or downloadable result',async()=>{
 const bytes=new Uint8Array(await fixture('test-7z-secret.7z').arrayBuffer());bytes[32]^=1;
 const blob=new Blob([bytes]),backend=await createFormatBackend(blob,'7Z');
 assert.equal(await backend.check('secret'),false);
 const fresh=await createFormatBackend(blob,'7Z');
 await assert.rejects(fresh.recover('secret'),e=>e.code==='independent');
});
test('Zstandard with encrypted headers uses genuine password verification and extraction',async()=>{
 const blob=fixture('zstd-header-encrypted.7z'),backend=await createFormatBackend(blob,'7Z');
 assert.equal(backend.info.filenamesEncrypted,true);
 assert.equal(await backend.check('wrong'),false);
 assert.equal(await backend.check('7'),true);
 const fresh=await createFormatBackend(blob,'7Z');
 const {files}=await fresh.recover('7');
 assert.equal(files[0].name,'folder/sample.txt');
 assert.equal(await files[0].blob.text(),'Independent Zstandard encrypted-header fixture\n');
});
for(const [name,code] of [['zstd-unsafe.7z','unsafe-path'],['zstd-over-limit.7z','limits'],
 ['zstd-unencrypted.7z','unencrypted'],['unsupported-lzma.7z','archive-codec'],
 ['zstd-invalid-properties.7z','archive-codec']])test(name+': reject before search ('+code+')',async()=>{
 await assert.rejects(createFormatBackend(fixture(name),'7Z'),e=>e.code===code);
});
test('AES-encrypted Zstandard frames cannot request a decoder window above 32 MiB',async()=>{
 const blob=fixture('zstd-window-limit.7z'),backend=await createFormatBackend(blob,'7Z');
 // The encrypted frame header only becomes inspectable with its password.
 await assert.rejects(backend.check('7'),e=>e.code==='archive-codec');
 const fresh=await createFormatBackend(blob,'7Z');
 await assert.rejects(fresh.recover('7'),e=>e.code==='archive-codec');
});
