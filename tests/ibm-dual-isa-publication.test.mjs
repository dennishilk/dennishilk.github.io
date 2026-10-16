import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
test('dual-ISA catalog and blog integration are idempotent, with unique RSS sources',()=>{
 const paths=['museum/index.html','blog/index.html','de/blog/index.html'],before=paths.map(read);execFileSync(process.execPath,['scripts/integrate-dual-isa.mjs'],{cwd:root});assert.deepEqual(paths.map(read),before);
 for(const prefix of ['','de/']){const h=read(prefix+'blog/index.html');assert.equal((h.match(/id="dual-isa-story"/g)||[]).length,1);const data=JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]),list=data['@graph'].find(n=>n['@type']==='ItemList');assert.equal(list.itemListElement.filter(n=>n.url.includes('/ibm-z-arm-dual-isa-')).length,1);assert.match(h,/<section id="museum-stories"[\s\S]*?<div class="section-heading">[\s\S]*?<span>05<\/span>/);}
});
test('both exhibit pages and articles are in matching localized sitemaps with reciprocal links',()=>{
 for(const [prefix,slug]of [['','processor'],['de/','prozessor']]){const route='/'+prefix+'museum/ibm-dual-isa/',article='/'+prefix+'blog/ibm-z-arm-dual-isa-'+slug+'/',h=read(prefix+'museum/ibm-dual-isa/index.html');assert.ok(h.includes('href="'+article+'"'));assert.ok(read(prefix+'blog/ibm-z-arm-dual-isa-'+slug+'/index.html').includes('href="'+route+'"'));assert.ok(read(prefix?'sitemap-de.xml':'sitemap.xml').includes('https://www.dennishilk.com'+route));assert.ok(read('sitemap-blog.xml').includes('https://www.dennishilk.com'+article));}
});
test('runtime performs only deterministic local work with explicit architecture boundaries',()=>{
 const ui=read('assets/ibm-dual-isa/ui.mjs'),model=read('assets/ibm-dual-isa/model.mjs');assert.doesNotMatch(ui+model,/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|requestAnimationFrame/);assert.match(ui,/visibilitychange/);assert.match(ui,/pagehide/);assert.match(read('assets/ibm-dual-isa/README.md'),/not a benchmark platform/);assert.match(read('assets/ibm-dual-isa/lab.css'),/prefers-reduced-motion/);
});
