import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {Intel8080} from '../assets/imsai-8080/cpu.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const specs=JSON.parse(read('content/museum-blog/articles.json')),origin='https://www.dennishilk.com';
for(const a of specs){
 const prefix=a.lang==='de'?'de/':'',path=prefix+'blog/'+a.slug+'/index.html',url=origin+'/'+prefix+'blog/'+a.slug+'/';
 test(a.lang+' '+a.topic+': complete article, reciprocal alternates, dates, visible examples and distribution',()=>{
  const html=read(path),graph=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'],article=graph.find(x=>x['@type']==='BlogPosting');
  assert.equal(article.mainEntityOfPage,url);assert.equal(article.inLanguage,a.lang);assert.equal(article.datePublished,a.date);assert.equal(article.dateModified,a.date);assert.ok(article.wordCount>=1800);assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.ok(graph.some(x=>x['@type']==='BreadcrumbList'));
  const opposite=specs.find(x=>x.topic===a.topic&&x.lang!==a.lang),other=origin+'/'+(opposite.lang==='de'?'de/':'')+'blog/'+opposite.slug+'/';
  assert.ok(html.includes(`hreflang="${opposite.lang}" href="${other}"`));assert.ok(html.includes(`class="language-link" href="${other.replace(origin,'')}"`));
  assert.ok(html.includes('href="/'+prefix+'museum/'+(a.exhibit||(a.topic==='imsai'?'imsai-8080':'apollo-11'))+'/"'));
  const sitemap=read('sitemap-blog.xml'),entry=sitemap.match(/<url>[\s\S]*?<\/url>/g).find(s=>s.includes('<loc>'+url+'</loc>'));
  assert.ok(entry);assert.ok(entry.includes('<lastmod>'+a.date+'</lastmod>'));assert.ok(read(prefix+'blog/feed.xml').includes(url));assert.ok(read(prefix+'blog/index.html').includes(url));
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));for(const [,anchor]of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(anchor),anchor);
  assert.doesNotMatch(html,/\{\{figure:|<iframe|FAQPage|AggregateRating/);
 });
 test(a.lang+' '+a.topic+': local visuals have dimensions, captions, alt text and valid social PNG',()=>{
  const html=read(path),images=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);assert.ok(images.length>=3);
  for(const tag of images){assert.match(tag,/alt="[^"\s][^"]*"/);assert.match(tag,/width="\d+" height="\d+"/);const src=tag.match(/src="([^"]+)"/)[1];assert.ok(existsSync(new URL(src.slice(1),root)));}
  assert.equal((html.match(/<figcaption>/g)||[]).length,images.length);
  const social=readFileSync(new URL('assets/blog/computer-museum/'+a.topic+'-social-'+a.lang+'.png',root));assert.equal(social.subarray(1,4).toString(),'PNG');assert.equal(social.readUInt32BE(16),1200);assert.equal(social.readUInt32BE(20),630);
 });
}
test('the published six-byte example really stores 42 at 0200 and halts',()=>{
 const cpu=new Intel8080();cpu.load([0x3e,0x2a,0x32,0,2,0x76]);for(let i=0;i<3;i++)cpu.step();assert.equal(cpu.a,42);assert.equal(cpu.read(0x0200),42);assert.equal(cpu.halted,true);assert.equal(cpu.pc,6);
 for(const lang of ['en','de'])assert.ok(read('content/museum-blog/imsai.'+lang+'.fragment').includes('3E 2A 32 00 02 76'));
});
test('the AGC excerpt is retained in the actual public-domain file, and articles do not claim execution',()=>{
 assert.match(read('assets/apollo-11/source/EXECUTIVE.agc'),/TC\s+BAILOUT1\s+# NO CORE SETS AVAILABLE\.\s+OCT\s+1202/);
 assert.match(read('content/museum-blog/apollo.en.fragment'),/does not control the simulated flight/);assert.match(read('content/museum-blog/apollo.de.fragment'),/steuert den simulierten Flug nicht/);
});
test('article rebuilds retain the committed output and localized shell',()=>{
 const before=specs.map(a=>read((a.lang==='de'?'de/':'')+'blog/'+a.slug+'/index.html'));
 execFileSync(process.execPath,['scripts/build-museum-blog.mjs'],{cwd:root});
 assert.deepEqual(specs.map(a=>read((a.lang==='de'?'de/':'')+'blog/'+a.slug+'/index.html')),before);
});
