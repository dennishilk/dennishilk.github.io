import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8'),specs=JSON.parse(read('content/museum-blog/articles.json')).filter(a=>a.topic==='jurassic');
for(const a of specs){const prefix=a.lang==='de'?'de/':'',route='/'+prefix+'blog/'+a.slug+'/',html=read(prefix+'blog/'+a.slug+'/index.html');
 test(a.lang+': article uses the shared shell, complete sources, seven local figures and responsive hero',()=>{
  assert.ok(html.includes('/blog/blog.css'));assert.ok(html.includes('/assets/blog/computer-museum/article.css'));assert.equal((html.match(/<figure\b/g)||[]).length,7);
  assert.equal((html.match(/loading="lazy"/g)||[]).length,6);assert.equal((html.match(/fetchpriority="high"/g)||[]).length,1);assert.match(html,/srcset="[^"]+960w,[^"]+1368w"/);
  for(const [,src] of html.matchAll(/<img[^>]+src="([^"]+)"/g))assert.ok(src.startsWith('/assets/blog/computer-museum/'));
  for(const id of ['fsn','indigo','family','sanglard','crimson','apple','wapo','cw','irix','dev','fan','o2','ilm','fxguide','implementation','film'])assert.ok(html.includes('id="source-'+id+'"'),id);
  assert.match(html,/1368" height="1120"/);assert.ok(html.includes('href="/'+prefix+'museum/jurassic-park-sgi/"'));
  const exhibit=read(prefix+'museum/jurassic-park-sgi/index.html');assert.equal(exhibit.split('href="'+route+'"').length-1,1);
  const graph=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);const article=graph['@graph'].find(n=>n['@type']==='BlogPosting');assert.ok(article.wordCount>=2600&&article.wordCount<3900);assert.equal(article.datePublished,'2026-10-16');
 });
 test(a.lang+': one visible card and one RSS-source listing, with reciprocal sitemap pair',()=>{
  const index=read(prefix+'blog/index.html'),data=JSON.parse(index.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);const list=data['@graph'].find(n=>n['@type']==='ItemList');assert.equal(list.itemListElement.filter(n=>n.url.endsWith(route)).length,1);assert.equal(list.numberOfItems,list.itemListElement.length);assert.equal((index.match(/id="jurassic-story"/g)||[]).length,1);
  assert.equal((read(prefix+'blog/feed.xml').match(new RegExp('<link>https://www.dennishilk.com'+route+'</link>','g'))||[]).length,1);
  const sitemap=read('sitemap-blog.xml'),entry=sitemap.match(/<url>[\s\S]*?<\/url>/g).find(e=>e.includes('<loc>https://www.dennishilk.com'+route+'</loc>'));assert.ok(entry.includes('/blog/jurassic-park-unix-sgi-fsn/'));assert.ok(entry.includes('/de/blog/jurassic-park-unix-system-sgi-fsn/'));
  for(const [,srcset] of html.matchAll(/srcset="([^"]+)"/g))for(const src of srcset.split(',').map(v=>v.trim().split(' ')[0]))assert.ok(existsSync(new URL(src.slice(1),root)));
 });
}
test('index integration is idempotent and does not duplicate cards or RSS metadata',()=>{
 const files=['blog/index.html','de/blog/index.html'],before=files.map(read);execFileSync(process.execPath,['scripts/integrate-jurassic-blog.mjs'],{cwd:root});assert.deepEqual(files.map(read),before);
});
