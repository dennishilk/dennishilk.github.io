import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=p=>readFileSync(join(root,p),'utf8');
const en='/lab/raymosaic/',de='/de/lab/raymosaic/';
const posts=['blog/raymosaic-reflected-light-mirror-art/index.html','de/blog/raymosaic-spiegel-licht-kunst/index.html'];
test('one real application core with DE/EN entry points',()=>{
 const enPage=read('lab/raymosaic/index.html'),dePage=read('de/lab/raymosaic/index.html');
 assert.match(enPage,/src="\.\/src\/main\.js"/);
 assert.match(dePage,/src="\/lab\/raymosaic\/src\/main\.js"/);
 assert.match(dePage,/href="\/lab\/raymosaic\/styles\.css"/);
 assert.match(dePage,/<html lang="de">/);
 assert.match(dePage,/rel="canonical" href="https:\/\/www\.dennishilk\.com\/de\/lab\/raymosaic\/"/);
 assert.match(enPage,/rel="canonical" href="https:\/\/www\.dennishilk\.com\/lab\/raymosaic\/"/);
 for(const part of ['main.js','scene.js','optics.mjs','gif-worker.js','project-state.js','i18n.js','public-share.js','message-sequence.mjs'])assert.ok(statSync(join(root,'lab/raymosaic/src',part)).size>500);
 assert.match(read('lab/raymosaic/src/main.js'),/new Worker\(new URL\('\.\/gif-worker\.js',import\.meta\.url\)\)/);
});
test('versioned projects, no remote processing and gzip links',()=>{
 const state=read('lab/raymosaic/src/project-state.js');
 assert.match(state,/STORAGE_KEY='raymosaic\.project\.v1'/);
 assert.match(state,/CompressionStream\('gzip'\)/);
 assert.match(state,/LINK_MAX=1850/);
 assert.doesNotMatch(state,/fetch\s*\(|XMLHttpRequest|sendBeacon/);
 assert.match(state,/mirrorDrawing:p\.mirrorDrawing===true/);
 assert.match(state,/mirrorCount/);
 assert.match(read('lab/raymosaic/src/message-sequence.mjs'),/buildMessageScenes/);
 const share=read('lab/raymosaic/src/public-share.js');
 assert.match(share,/https:\/\/www\.dennishilk\.com\/lab\/raymosaic\//);
 assert.match(share,/PUBLIC_PAGES/);
});
test('both blog posts include valid bilingual BlogPosting metadata',()=>{
 for(const [i,path] of posts.entries()){
  const html=read(path),match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match,path);const graph=JSON.parse(match[1])['@graph'];
  const article=graph.find(x=>x['@type']==='BlogPosting');
  assert.equal(article.inLanguage,i?'de':'en');
  assert.equal(article.datePublished,'2026-10-17');
  assert.match(html,/hreflang="de"/);assert.match(html,/hreflang="en"/);
  assert.match(html,/raymosaic-heart\.webp/);
  assert.match(read(i?'de/blog/index.html':'blog/index.html'),new RegExp(article.url.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')));
 }
});
test('homepage, sitemap, RSS and original generated media are wired',()=>{
 assert.match(read('index.html'),/href="\/lab\/raymosaic\/"/);
 assert.match(read('de/index.html'),/href="\/de\/lab\/raymosaic\/"/);
 assert.match(read('sitemap.xml'),/https:\/\/www\.dennishilk\.com\/lab\/raymosaic\//);
 assert.match(read('sitemap-de.xml'),/https:\/\/www\.dennishilk\.com\/de\/lab\/raymosaic\//);
 for(const path of posts){const route=path.replace(/index\.html$/,'');assert.ok(read('sitemap-blog.xml').includes('https://www.dennishilk.com/'+route));}
 for(const path of ['blog/feed.xml','de/blog/feed.xml'])assert.match(read(path),/RAYMOSAIC/);
 for(const path of ['raymosaic-heart.webp','raymosaic-nebu.webp','raymosaic-scene-nebu.gif'])assert.ok(statSync(join(root,'lab/raymosaic/examples',path)).size>1000);
});
