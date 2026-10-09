import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { loadProblems, problemPath, landingPath } from '../scripts/build-linux-fix-lab.mjs';

const root=resolve(import.meta.dirname,'..'),origin='https://www.dennishilk.com',problems=loadProblems();
const sourceFor=path=>readFileSync(resolve(root,path.slice(1),path.endsWith('/')?'index.html':''),'utf8');
const decode=text=>text.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const ids=source=>[...source.matchAll(/(?:\s|<)id="([^"]+)"/g)].map(match=>match[1]);

for(const problem of problems)for(const lang of ['en','de'])test(`${problemPath(problem,lang)}: static content, exact language pair, stable solution links and structured data`,()=> {
  const path=problemPath(problem,lang),other=problemPath(problem,lang==='en'?'de':'en'),source=sourceFor(path);
  assert.ok(source.includes(`<html lang="${lang}">`));assert.ok(source.includes(`rel="canonical" href="${origin}${path}"`));
  for(const [locale,target]of [['en',problemPath(problem,'en')],['de',problemPath(problem,'de')],['x-default',problemPath(problem,'en')]])assert.ok(source.includes(`hreflang="${locale}" href="${origin}${target}"`));
  assert.ok(source.includes(`class="language-link" href="${other}"`));
  assert.match(source,/<h1>[^<]+<\/h1>/);assert.ok(source.includes('id="diagnostics"'));assert.ok(source.includes('id="sources"'));
  assert.equal(new Set(ids(source)).size,ids(source).length,'unique HTML IDs');
  for(const diagnostic of problem.diagnostics)assert.ok(source.includes(`id="check-${diagnostic.id}"`));
  for(const solution of problem.solutions){assert.ok(source.includes(`id="${solution.id}"`));assert.ok(source.includes(`href="${path}#${solution.id}" data-share="${solution.id}"`));assert.ok(source.includes(`data-solved="${solution.id}"`));}
  const data=JSON.parse(source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const article=data['@graph'].find(item=>item['@type']==='TechArticle');assert.equal(article.url,origin+path);assert.equal(article.inLanguage,lang);assert.equal(article.dateModified,problem.reviewed);assert.deepEqual(article.citation,problem.sources.map(source=>source.url));
  const crumbs=data['@graph'].find(item=>item['@type']==='BreadcrumbList');assert.deepEqual(crumbs.itemListElement.map(item=>item.position),[1,2,3]);assert.equal(crumbs.itemListElement.at(-1).item,origin+path);
  assert.ok(source.includes('name="robots" content="index,follow,max-image-preview:large"'));assert.ok(source.includes("connect-src 'none'"));assert.match(source,/<noscript>/);
  for(const match of source.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const href=decode(match[1]);if(/^https?:/.test(href))continue;
    const url=new URL(href,origin+path),file=resolve(root,url.pathname.slice(1),url.pathname.endsWith('/')?'index.html':'');
    assert.ok(existsSync(file),`broken internal href ${href}`);
    if(url.hash){const target=readFileSync(file,'utf8');assert.ok(ids(target).includes(decodeURIComponent(url.hash.slice(1))),`broken fragment ${href}`);}
  }
});

for(const lang of ['en','de'])test(`${lang} landing: complete static search list and labeled functional controls`,()=> {
  const source=sourceFor(landingPath(lang));
  assert.ok(source.includes('name="robots" content="index,follow,max-image-preview:large"'));
  assert.equal((source.match(/data-problem="/g)||[]).length,150);
  assert.equal((source.match(/data-assistant="/g)||[]).length,18);
  assert.equal(new Set(ids(source)).size,ids(source).length);
  for(const id of ['problem-search','problem-category','log-input','log-file'])assert.ok(source.includes(`for="${id}"`));
  for(const id of ['log-analyse','log-clear','log-sample','search-reset','log-copy','log-export'])assert.ok(source.includes(`id="${id}"`));
  assert.ok(source.includes('id="log-include-lines" type="checkbox">'),'raw log excerpts off by default');
  assert.ok(source.includes('id="log-redact" type="checkbox" checked'),'redaction defaults on');
  assert.ok(source.includes('class="skip-link" href="#main"'));assert.ok(source.includes('id="main"'));
  const data=JSON.parse(source.match(/<script id="assistant-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  for(const tree of data)for(const node of Object.values(tree.nodes))for(const guide of node.guides||[])for(const locale of ['en','de'])assert.ok(existsSync(resolve(root,guide.path[locale].slice(1),'index.html')));
  for(const problem of problems)assert.ok(source.includes(`href="${problemPath(problem,lang)}"`));
});

test('inactive launch sitemap is prepared for both landings and 300 pages with reciprocal alternates and real build dates',()=> {
  const source=readFileSync(resolve(root,'content/linux-fix-lab/prepared-launch-sitemap.xml'),'utf8');
  const urls=[...source.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
  const expected=['en','de'].flatMap(lang=>[origin+landingPath(lang),...problems.map(problem=>origin+problemPath(problem,lang))]);
  assert.equal(urls.length,302);assert.deepEqual(urls.sort(),expected.sort());assert.equal(new Set(urls).size,302);
  const manifest=JSON.parse(readFileSync(resolve(root,'content/linux-fix-lab/generated-manifest.json'),'utf8'));
  for(const [entry]of source.matchAll(/<url>[\s\S]*?<\/url>/g)) {
    const url=entry.match(/<loc>([^<]+)<\/loc>/)[1],page=sourceFor(new URL(url).pathname);
    assert.ok(entry.includes(`<lastmod>${manifest.pages[new URL(url).pathname].lastmod}</lastmod>`));
    for(const locale of ['en','de','x-default']){const href=entry.match(new RegExp(`hreflang="${locale}" href="([^"]+)"`))[1];assert.ok(page.includes(`hreflang="${locale}" href="${href}"`));}
  }
});

function contrast(a,b) {
  const luminance=hex=>{const channels=hex.match(/[a-f0-9]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
  const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
test('theme text contrast, control boundaries, focus and reduced motion meet static accessibility contracts',()=> {
  for(const fg of ['e9eef5','a9b7c8','76d2fa','93dfc1'])for(const bg of ['0b1017','121b26'])assert.ok(contrast(fg,bg)>=4.5,`${fg} on ${bg}`);
  assert.ok(contrast('587389','121b26')>=3);
  const css=readFileSync(resolve(root,'assets/linux-fix-lab/lab.css'),'utf8');
  assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/:focus-visible/);assert.match(css,/max-width:650px/);assert.match(css,/grid-template-columns:1fr/);assert.match(css,/min-height:44px/);
});
