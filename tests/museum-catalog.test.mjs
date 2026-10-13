import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const html=readFileSync(new URL('../museum/index.html',import.meta.url),'utf8');const cards=[...html.matchAll(/<a class="catalog-card ([^"]+)"([\s\S]*?)<\/a>/g)];
const sandbox={};runInNewContext(readFileSync(new URL('../assets/museum-catalog/catalog.js',import.meta.url),'utf8'),sandbox);const {normalize,matches}=sandbox.MuseumCatalog;
test('all 18 exhibits have unique crawlable existing destinations and complete bilingual copy',()=>{
 assert.equal(cards.length,18);const destinations=new Set(),counts={};
 for(const [raw,,rest] of cards){const url=rest.match(/href="([^"]+)"/)[1];assert.ok(!destinations.has(url));destinations.add(url);assert.ok(existsSync(new URL('../'+url.slice(1)+'index.html',import.meta.url)),url);
 const category=rest.match(/data-category="([^"]+)"/)[1];counts[category]=(counts[category]||0)+1;assert.match(raw,/data-status="available"/);assert.match(raw,/<h3 [^>]*data-en="[^"\n]+" data-de="[^"\n]+"/);assert.match(raw,/<p [^>]*data-en="[^"\n]+" data-de="[^"\n]+"/);
 const native=rest.match(/data-native-de="([^"]+)"/);if(native)assert.ok(existsSync(new URL('../'+native[1].slice(1)+'index.html',import.meta.url)));
 }
 assert.deepEqual(counts,{retro:7,linux:4,network:4,security:3});
 for(const url of ['/wopr/','/museum/c64/','/museum/ibm-pc-xt/','/museum/apollo-dsky/','/museum/bios-setup/','/museum/dos-setup/','/museum/crt-remote-terminal/','/museum/debian-server-experiment/','/museum/linux-terminal-academy/','/museum/failure-lab/','/museum/linux-game-install/','/museum/bbs-system/','/museum/unix-time-sharing-center/','/museum/telephone-exchange/','/museum/modem-lab/','/museum/malware-history/','/museum/password-cracking-lab/','/museum/cryptography-lab/'])assert.ok(destinations.has(url),url);
});
test('search combines all query terms with topic selection and handles accents, case and punctuation',()=>{
 const entry={category:'security',search:normalize('Kryptografie-Labor cryptography Rätsel SHA-256 Straße')};
 assert.ok(matches(entry,'KRYPTografie sha-256','security'));assert.ok(matches(entry,'rätsel'));assert.ok(matches(entry,'strasse'));assert.ok(matches(entry,''));assert.ok(!matches(entry,'sha no-such-word'));assert.ok(!matches(entry,'sha','linux'));assert.ok(matches(entry,'  --  '));
});
test('directory is progressive and scoped: static links, hidden JS controls, accessible feedback, no exhibit runtimes',()=>{
 assert.match(html,/class="catalog-controls" hidden/);assert.match(html,/id="catalog-count" role="status" aria-live="polite"/);assert.match(html,/id="catalog-search" type="search"/);assert.match(html,/class="catalog-context"/);assert.match(html,/assets\/museum-catalog\/catalog\.css/);assert.doesNotMatch(html,/c64-(?:machine|worker|lab)\.js|password-cracking-lab\/ui\.js/);
 assert.ok(html.indexOf('museum-card-lost-administrator')<html.indexOf('catalog-grid'));assert.ok(html.indexOf('museum-card-author-lab')<html.indexOf('catalog-grid'));
 const css=readFileSync(new URL('../assets/museum-catalog/catalog.css',import.meta.url),'utf8');assert.match(css,/prefers-reduced-motion/);assert.match(css,/\.museum-catalog-page \[hidden\]/);assert.doesNotMatch(css,/@import|https?:/);
});
