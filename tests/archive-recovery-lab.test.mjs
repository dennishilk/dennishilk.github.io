import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
import {inspect,verifier,recover,createDemo,exportZip,safePath,recognize,zipCryptoHeader,LIMITS} from '../assets/archive-recovery-lab/core.js';
import zip from '../assets/archive-recovery-lab/zip-api.js';
import {preparePhases,DICTIONARY_COUNTS,BLIND_LIMITS} from '../assets/archive-recovery-lab/search.js';
import {candidateAt,RangeLedger,yearRange} from '../assets/password-cracking-lab/search.js';
const raw=JSON.parse(execFileSync('python3',[new URL('../scripts/archive-recovery-fixtures.py',import.meta.url).pathname],{encoding:'utf8'}));
const fixture=name=>new Blob([Buffer.from(raw[name],'base64')]);
const expected='Independent encrypted fixture — grüße!\n';
for(const name of Object.keys(raw).filter(n=>/^(zipcrypto|aes)/.test(n)))test('independent Python fixture: '+name,async()=>{
 const b=fixture(name),i=await inspect(b);assert.equal(i.supported,true);assert.equal(i.entries.length,2);const v=await verifier(b);assert.equal(await v.check('wrong'),false);assert.equal(await v.check('päss🔐'),true);
 const r=await recover(b,'päss🔐');assert.equal(await r.files[0].blob.text(),expected);assert.equal(r.files[1].blob.size,0);await assert.rejects(recover(b,'wrong'));
 const output=await exportZip(r.files),reader=new zip.ZipReader(new zip.BlobReader(output)),entries=await reader.getEntries();assert.equal(entries.length,2);assert.ok(entries.every(e=>!e.encrypted));assert.equal(await entries[0].getData(new zip.TextWriter(),{checkSignature:true}),expected);
 const encoded=Buffer.from(await output.arrayBuffer()).toString('base64');const verified=execFileSync('python3',['-c',"import base64,io,sys,zipfile;z=zipfile.ZipFile(io.BytesIO(base64.b64decode(sys.stdin.read())));assert z.testzip() is None;print(z.read('folder/hello.txt').decode(),end='')"],{input:encoded,encoding:'utf8'});assert.equal(verified,expected);
});
test('small ZIP64, real empty AES and weak all-empty ZipCrypto distinction',async()=>{
 for(const name of ['zip64','empty-aes']){const b=fixture(name);assert.equal(await(await verifier(b)).check('7'),true);assert.equal(await(await verifier(b)).check('wrong'),false);const r=await recover(b,'7');assert.equal(r.files.length,name==='zip64'?2:1);}
 await assert.rejects(inspect(fixture('empty-zipcrypto')),e=>e.code==='empty-zipcrypto');
});
test('preliminary ZipCrypto collision is rejected by actual CRC/decryption',async()=>{
 const b=fixture('zipcrypto-0-1'),i=await inspect(b),e=i.target,h=new Uint8Array(await b.slice(e.dataOffset,e.dataOffset+12).arrayBuffer());let collision;
 for(let n=0;n<10000;n++)if(zipCryptoHeader(String(n),h,e.signature>>>24)){collision=String(n);break;}
 assert.ok(collision);assert.equal(await(await verifier(b)).check(collision),false);
});
test('tampered AES authentication never produces a verified password or output',async()=>{
 const b=fixture('aes256-0-2'),i=await inspect(b),e=i.target,bytes=new Uint8Array(await b.arrayBuffer());bytes[e.dataOffset+e.compressedSize-1]^=1;const corrupt=new Blob([bytes]);assert.equal(await(await verifier(corrupt)).check('päss🔐'),false);await assert.rejects(recover(corrupt,'päss🔐'));
});
test('creator generates independently recoverable real ZIP archives and external ZipCrypto interoperability',async()=>{
 for(const method of ['zipcrypto','aes128','aes192','aes256']){const b=await createDemo('a',method);const v=await verifier(b);assert.equal(await v.check('b'),false);assert.equal(await v.check('a'),true);const r=await recover(b,'a');assert.equal(r.files.length,2);assert.match(await r.files[0].blob.text(),/Real encryption/);
 if(method==='zipcrypto'){const encoded=Buffer.from(await b.arrayBuffer()).toString('base64');const output=execFileSync('python3',['-c',"import base64,io,sys,zipfile;z=zipfile.ZipFile(io.BytesIO(base64.b64decode(sys.stdin.read())));print(z.read('demo/readme.txt',pwd=b'a').decode())"],{input:encoded,encoding:'utf8'});assert.match(output,/Real encryption/);}}
});
test('unsafe paths, duplicates, malformed input, limits, compression and unencrypted input are rejected',async()=>{
 for(const [name,code] of [['unsafe','unsafe-path'],['duplicate','duplicate'],['unsupported-compression','compression']])await assert.rejects(inspect(fixture(name)),e=>e.code===code);
 for(const name of ['../a','/a','C:\\file.txt','a/../../b','a\u0000b','a/CON.txt','a//b','a/./b','a/ends.'])assert.throws(()=>safePath(name));assert.equal(safePath('folder\\hello.txt'),'folder/hello.txt');
 const truncated=fixture('aes128-0-1').slice(0,-10);await assert.rejects(inspect(truncated));
 await assert.rejects(inspect(new Blob([new Uint8Array(LIMITS.input+1)])),e=>e.code==='limits');
 const w=new zip.ZipWriter(new zip.BlobWriter());await w.add('plain.txt',new zip.TextReader('plain'));await assert.rejects(inspect(await w.close()),e=>e.code==='unencrypted');
 const b=new Uint8Array(await fixture('zipcrypto-0-1').arrayBuffer());b[6]|=1<<6;await assert.rejects(inspect(new Blob([b])));
});
test('recognizes file signatures without pretending RAR/7Z/PDF encryption is implemented',async()=>{
 for(const [format,bytes] of [['RAR4',[82,97,114,33,26,7,0]],['RAR5',[82,97,114,33,26,7,1,0]],['7Z',[55,122,188,175,39,28]],['PDF',[37,80,68,70,45]]]){const b=new Blob([new Uint8Array(bytes)]);assert.equal(await recognize(b),format);assert.deepEqual(await inspect(b),{format,supported:false});}
});
test('exact dictionary reuse, transformations, dynamic year bounds and deterministic blind order',async()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(DICTIONARY_COUNTS).map(([k,v])=>[k,v.total])),{de:213096,en:249223,common:26652});assert.equal(BLIND_LIMITS.yearMin,1984);assert.ok(BLIND_LIMITS.yearMax>=2035);assert.equal(yearRange(2040).yearMax,2040);
 const config={mode:'blind',german:true,english:true,common:true,brute:false};const a=await preparePhases(config),b=await preparePhases(config);assert.equal(a.length,12);assert.deepEqual(a.map(p=>[p.language,p.yearMin,p.suffixDigits,p.count]),b.map(p=>[p.language,p.yearMin,p.suffixDigits,p.count]));assert.equal(candidateAt(a[0],0n),'password');assert.equal(candidateAt(a[0],1n),'Password');assert.equal(candidateAt(a[0],2n),'PASSWORD');assert.equal(candidateAt(a[3],0n),'password1984');
 const hinted=await preparePhases({mode:'known',german:false,english:false,common:false,brute:true,min:1,max:1,lower:false,upper:false,digits:true,symbols:false});assert.equal(hinted.length,1);assert.equal(hinted[0].count,10n);assert.equal(candidateAt(hinted[0],7n),'7');const ledger=new RangeLedger(hinted),first=ledger.allocate(3),second=ledger.allocate(7);assert.equal(second.start,3n);ledger.confirm(second.id,7);assert.equal(ledger.frontier,0n);ledger.confirm(first.id,3);assert.equal(ledger.frontier,10n);assert.equal(ledger.exhausted,true);
});
test('bilingual privacy/SEO contracts and no changes to companion runtime',()=>{
 for(const language of ['','de/']){const h=readFileSync(new URL('../'+language+'museum/archive-recovery-lab/index.html',import.meta.url),'utf8');assert.match(h,/connect-src 'none'/);assert.match(h,/worker-src blob:/);assert.match(h,/hreflang="en"/);assert.match(h,/hreflang="de"/);assert.match(h,/canonical/);assert.match(h,/application\/ld\+json/);assert.doesNotMatch(h,/stars\.js|<canvas|<script[^>]+src=["']https?:/);}
 const ui=readFileSync(new URL('../assets/archive-recovery-lab/ui.js',import.meta.url),'utf8');assert.doesNotMatch(ui,/localStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|console\./);
});
test('fresh complete extraction rejects different passwords across entries',async()=>{
 const w=new zip.ZipWriter(new zip.BlobWriter());await w.add('one.txt',new zip.TextReader('one'),{password:'a',encryptionStrength:3});await w.add('two.txt',new zip.TextReader('two'),{password:'b',encryptionStrength:3});const b=await w.close();assert.equal(await(await verifier(b)).check('a'),true);await assert.rejects(recover(b,'a'));
});
test('output bounds and conflicting directory/file structure are enforced',async()=>{
 const w=new zip.ZipWriter(new zip.BlobWriter());await w.add('bomb.txt',new zip.TextReader('x'.repeat(1024**2)),{password:'7'});await assert.rejects(inspect(await w.close()),e=>e.code==='limits');
 const x=new zip.ZipWriter(new zip.BlobWriter());await x.add('a',new zip.TextReader('one'),{password:'7'});await x.add('a/b.txt',new zip.TextReader('two'),{password:'7'});await assert.rejects(inspect(await x.close()),e=>e.code==='duplicate');
});
test('bundled worker is reproducible and contains no runtime imports or embedded WASM',()=>{
 const source=readFileSync(new URL('../assets/archive-recovery-lab/worker-source.js',import.meta.url),'utf8');execFileSync(process.execPath,[new URL('../scripts/build-archive-recovery-worker.mjs',import.meta.url).pathname]);assert.equal(readFileSync(new URL('../assets/archive-recovery-lab/worker-source.js',import.meta.url),'utf8'),source);
 assert.doesNotMatch(source,/data:application\/wasm|WebAssembly\.instantiate|^import /m);assert.match(source,/boundedExtract/);assert.match(source,/Copyright/);
});
