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
test('real py7zr Zstandard archive is an unsupported codec, never a duplicate or unencrypted file',async()=>{
 await assert.rejects(createFormatBackend(fixture('test-7z-secret.7z'),'7Z'),e=>{
  assert.equal(e.code,'archive-codec');
  assert.deepEqual(e.diagnostic,{format:'7Z',stage:'inspection',codec:'zstandard-04f71101'});
  return true;
 });
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
