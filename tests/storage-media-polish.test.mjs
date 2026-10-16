import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const refs=s=>[...s.matchAll(/url\(#([^)]+)\)/g)].map(m=>m[1]);
function checkSVG(svg){
 const definitions=new Set(ids(svg));assert.ok(definitions.size>=3);
 for(const ref of refs(svg))assert.ok(definitions.has(ref),'self-contained SVG reference: '+ref);
 assert.match(svg,/<(?:g|path|rect)\b/);
}
test('shared bilingual catalog card preserves text, links and metadata without an image',()=>{
 const h=read('museum/index.html');const card=h.match(/<a class="catalog-card museum-card-storage"[\s\S]*?<\/a>/)[0];
 assert.doesNotMatch(card,/<img|<svg|preview\.svg/);
 for(const s of ['href="/museum/storage-media-lab/"','data-native-de="/de/museum/speichermedien-lab/"','data-category="hardware"','data-status="available"','data-en="Storage Media Lab','data-de="Speichermedien-Labor','catalog-card-foot'])assert.ok(card.includes(s),s);
});
for(const [lang,path]of [['en','museum/storage-media-lab/index.html'],['de','de/museum/speichermedien-lab/index.html']])test(`${lang}: final media survive a fresh runtime ID counter and repeated gallery/simulator rendering`,async()=>{
 const h=read(path),final=h.match(/<section id="ventoy"[\s\S]*?<\/section>/)[0],svgs=[...final.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map(m=>m[0]);
 assert.equal(svgs.length,2);assert.match(svgs[0],/ZIP \/ 100/);assert.match(svgs[1],/128 GB/);svgs.forEach(checkSVG);
 const pageIDs=new Set(ids(h));assert.equal(pageIDs.size,ids(h).length);
 // A new import reproduces a hard reload: client counter restarts while all static SVGs exist.
 const {objectSVG,mechanismSVG}=await import('../assets/storage-media-lab/illustrations.mjs?fresh='+lang);
 let runtime='';for(let cycle=0;cycle<3;cycle++){
  runtime+=objectSVG('floppy','gallery');for(let i=0;i<14;i++)runtime+=objectSVG(i===8?'zip':'floppy','shelf');runtime+=mechanismSVG('floppy',1,lang);for(let i=0;i<17;i++)runtime+=objectSVG('floppy','volume');
 }
 for(const svg of runtime.match(/<svg\b[\s\S]*?<\/svg>/g))checkSVG(svg);
 const liveIDs=ids(runtime);assert.equal(liveIDs.length,new Set(liveIDs).size);
 for(const id of liveIDs)assert.ok(!pageIDs.has(id),'runtime must not shadow a static SVG definition: '+id);
 assert.ok(refs(final).every(id=>id.startsWith('page-')));
 assert.match(h,/ui\.mjs\?v=12\.1/);assert.match(read('assets/storage-media-lab/ui.mjs'),/illustrations\.mjs\?v=12\.1/);
});
