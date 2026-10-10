import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(item=> {
  if(['.git','node_modules'].includes(item.name))return [];
  const path=resolve(directory,item.name);return item.isDirectory()?walk(path):[path];
});

test('the approved public launch is indexable and advertises exactly one complete Lab sitemap',()=> {
  const publication=JSON.parse(read('content/linux-fix-lab/publication.json'));
  assert.equal(publication.phase,'public-launch');assert.equal(publication.allowIndexing,true);assert.equal(publication.activateSitemap,true);
  const manifest=JSON.parse(read('content/linux-fix-lab/generated-manifest.json'));
  assert.deepEqual(manifest.publication,{phase:'public-launch',robots:'index,follow,max-image-preview:large',sitemapActive:true});
  assert.equal(Object.keys(manifest.pages).length,302);
  assert.equal(existsSync(resolve(root,'sitemap-linux-fix-lab.xml')),true);
  const origin='https://www.dennishilk.com',sitemapUrl=origin+'/sitemap-linux-fix-lab.xml';
  const urls=[...read('sitemap-linux-fix-lab.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
  assert.deepEqual(urls.sort(),Object.keys(manifest.pages).map(path=>origin+path).sort());
  assert.equal(new Set(urls).size,302);
  assert.equal(read('robots.txt').split(/\r?\n/).filter(line=>line==='Sitemap: '+sitemapUrl).length,1);
  assert.equal(read('sitemap-index.xml').split(sitemapUrl).length-1,1);
  for(const path of readdirSync(root).filter(name=>/^sitemap.*\.xml$/.test(name)&&!['sitemap-index.xml','sitemap-linux-fix-lab.xml'].includes(name)))assert.doesNotMatch(read(path),/linux-fix-lab/);
});

test('Fix Lab inbound links stay within approved homepages and its diagnostic ecosystem',()=> {
  const homepages=new Set([resolve(root,'index.html'),resolve(root,'de/index.html')]);
  const paths=walk(root).filter(path=>path.endsWith('.html')&&!homepages.has(path)&&!/^\/(?:de\/)?linux-(?:fix-lab|hardware-explorer)\//.test(path.slice(root.length).replaceAll('\\','/')));
  assert.ok(paths.length>300);
  for(const path of paths)assert.doesNotMatch(readFileSync(path,'utf8'),/\b(?:href|action)\s*=\s*["'](?:https?:\/\/(?:www\.)?dennishilk\.com)?\/(?:de\/)?linux-fix-lab(?:\/|[?#"'])/i,path.slice(root.length+1));
});

for(const [path,titles]of [
  ['index.html',['The Lost Administrator','Linux Fix Lab','Linux Migration Companion','BoringOS','Free Image Converter']],
  ['de/index.html',['The Lost Administrator','Linux Fix Lab','Linux Migration Companion','BoringOS','Bildkonverter – JPG, PNG &amp; WebP']],
])test(`${path}: approved launch replaces only the World Observer featured card and retains its navigation`,()=> {
  const source=read(path),start=source.indexOf('<section class="projects">'),section=source.slice(start,source.indexOf('</section>',start));
  assert.deepEqual([...section.matchAll(/<h3>([^<]+)<\/h3>/g)].map(match=>match[1]),titles);
  const labPath=path.startsWith('de/')?'/de/linux-fix-lab/':'/linux-fix-lab/';
  assert.equal(section.split(`href="${labPath}"`).length-1,1);
  assert.doesNotMatch(section,/World Observer/);
  assert.match(source.slice(0,start),/href="\/?world-observer\.html"[^>]*>[\s\S]*?World Observer/);
});
