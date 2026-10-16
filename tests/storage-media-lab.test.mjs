import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {countMedia,parseBytes,createArchive,archiveAction,comparisons} from '../assets/storage-media-lab/model.mjs';
import {media,localizedMeta} from '../assets/storage-media-lab/media.mjs';
import {objectSVG} from '../assets/storage-media-lab/illustrations.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const [gb,floppy,zip] of [[80,54254,800],[70,47472,700],[150,101726,1500],[128,86806,1280]])test(`${gb} GB exact declared equivalents`,()=>{
 const b=BigInt(gb)*1000000000n;assert.equal(countMedia(b,1474560n),BigInt(floppy));assert.equal(countMedia(b,100000000n),BigInt(zip));
});
test('integer ceil boundaries for every medium, including values above safe Number precision',()=>{
 for(const m of comparisons){assert.equal(countMedia(0n,m.bytes),0n);assert.equal(countMedia(1n,m.bytes),1n);assert.equal(countMedia(12n*m.bytes,m.bytes),12n);assert.equal(countMedia(12n*m.bytes+1n,m.bytes),13n);const huge=999999999n*m.bytes;assert.equal(countMedia(huge,m.bytes),999999999n);assert.equal(countMedia(huge+1n,m.bytes),1000000000n);}
 assert.throws(()=>countMedia(-1n,1n));assert.throws(()=>countMedia(1n,0n));
});
test('custom parser explicitly separates decimal and binary units, handles empty/zero/tiny/invalid inputs',()=>{
 assert.equal(parseBytes('1','GB'),1000000000n);assert.equal(parseBytes('1','GiB'),1073741824n);assert.equal(parseBytes('1','MiB'),1048576n);assert.equal(parseBytes('1,5','MB'),1500000n);assert.equal(parseBytes('0.000000001','GB'),1n);assert.equal(parseBytes('0.1','B'),1n);assert.equal(parseBytes('0'),0n);assert.equal(parseBytes('1000000000','GB'),1000000000000000000n);
 for(const s of ['', '-1','NaN','Infinity','1e5','1.2.3','<script>','1000000001','9'.repeat(1000)])assert.equal(parseBytes(s),null,s);
});
test('a wrong or absent disk blocks progress and inserting the requested one resolves only that fault',()=>{
 let s=createArchive();const pristine={...s};s=archiveAction(s,{type:'read'});assert.equal(s.message,'insert');assert.equal(s.current,1);s=archiveAction(s,{type:'insert',volume:2});s=archiveAction(s,{type:'read'});assert.equal(s.message,'wrong');assert.equal(s.verified,0n);s=archiveAction(s,{type:'insert',volume:1});s=archiveAction(s,{type:'read'});assert.equal(s.current,2);assert.equal(s.verified,1474560n);assert.deepEqual(pristine,createArchive());
});
for(const fault of ['read','checksum','missing'])test(`fault ${fault} at 16 survives retry, requires replacement, resumes and completes`,()=>{
 let s=createArchive(25000000n,fault);s=archiveAction(s,{type:'replace'});assert.equal(s.replaced,false);s=archiveAction(s,{type:'fast'});assert.equal(s.current,16);assert.equal(s.status,'error');assert.equal(s.message,fault);assert.equal(s.verified,15n*1474560n);
 s=archiveAction(s,{type:'retry'});assert.equal(s.status,'error');assert.equal(s.message,fault);s=archiveAction(s,{type:'inspect'});assert.equal(s.status,'error');s=archiveAction(s,{type:'replace'});assert.equal(s.status,'loaded');assert.equal(s.replaced,true);s=archiveAction(s,{type:'read'});assert.equal(s.current,17);s=archiveAction(s,{type:'fast'});assert.equal(s.status,'done');assert.equal(s.verified,25000000n);assert.deepEqual(archiveAction(s,{type:'read'}),s);s=archiveAction(s,{type:'reset'});assert.equal(s.current,1);assert.equal(s.replaced,false);assert.equal(s.fault,fault);
});
test('all sample sizes finish after recovery and no state is shared between transfers',()=>{
 for(const bytes of [25000000n,40000000n,80000000n]){let s=createArchive(bytes);s=archiveAction(s,{type:'fast'});s=archiveAction(s,{type:'replace'});s=archiveAction(s,{type:'fast'});assert.equal(s.verified,bytes);assert.equal(s.status,'done');assert.equal(s.total,Number(countMedia(bytes,1474560n)));}
 assert.equal(createArchive().current,1);assert.throws(()=>createArchive(1n));assert.throws(()=>createArchive(25000000n,'invented'));
});
test('objects include materially distinct early sleeves, reels, optical discs and SSD boards',()=>{
 assert.equal(media.length,14);for(const m of media){assert.equal(m.name.length,2);assert.ok(m.how.every(s=>s.length>80));assert.ok(m.use.every(s=>s.length>50));assert.match(objectSVG(m.type,m.name[0]),/<svg/);}
 assert.notEqual(objectSVG('five'),objectSVG('floppy'));assert.notEqual(objectSVG('ssd'),objectSVG('usb'));assert.match(localizedMeta(media[7],'de').capacity,/1\.474\.560/);
});
for(const [lang,path,article] of [['en','museum/storage-media-lab','blog/floppy-disk-zip-cd-usb-storage-history'],['de','de/museum/speichermedien-lab','de/blog/diskette-zip-cd-usb-speichermedien']])test(`${lang}: crawlable routes, full fallback, accessible station navigation and valid media`,()=>{
 const h=read(path+'/index.html'),a=read(article+'/index.html');assert.match(h,new RegExp('<html lang="'+lang+'"'));assert.equal((h.match(/data-station class=/g)||[]).length,5);assert.equal((h.match(/class="station-footer"/g)||[]).length,5);assert.match(h,/<noscript>/);assert.match(h,/id="gallery-fallback"/);assert.match(h,/id="interactive-controls" hidden/);assert.match(h,/id="sound"/);assert.doesNotMatch(h,/id="sound" checked/);assert.match(h,/hreflang="de"/);assert.match(h,/hreflang="en"/);
 assert.match(a,/class="article-main storage-article"/);assert.doesNotMatch(a,/\{\{/);assert.ok(a.includes('/'+path+'/'));assert.match(a,/Microsoft/);
 const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const [,id] of h.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(id),id);
 for(const [,src]of [...h.matchAll(/(?:src|href)="(\/assets\/[^"?]+)(?:\?[^" ]*)?"/g),...a.matchAll(/src="(\/assets\/[^"?]+)(?:\?[^" ]*)?"/g)])assert.ok(existsSync(new URL('..'+src,import.meta.url)),src);
});
test('generated exhibit and integrations rebuild without changes',()=>{
 const paths=['museum/storage-media-lab/index.html','de/museum/speichermedien-lab/index.html','museum/index.html','blog/index.html','de/blog/index.html'];const before=paths.map(read);
 execFileSync(process.execPath,['scripts/build-storage-media-lab.mjs']);execFileSync(process.execPath,['scripts/integrate-storage-media-lab.mjs']);assert.deepEqual(paths.map(read),before);
});
