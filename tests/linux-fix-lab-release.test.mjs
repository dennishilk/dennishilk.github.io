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

test('the approved live test remains noindex and cannot advertise the prepared sitemap',()=> {
  const publication=JSON.parse(read('content/linux-fix-lab/publication.json'));
  assert.equal(publication.phase,'live-test');assert.equal(publication.allowIndexing,false);assert.equal(publication.activateSitemap,false);
  const manifest=JSON.parse(read('content/linux-fix-lab/generated-manifest.json'));
  assert.deepEqual(manifest.publication,{phase:'live-test',robots:'noindex,follow',sitemapActive:false});
  assert.equal(Object.keys(manifest.pages).length,302);
  assert.equal(existsSync(resolve(root,'sitemap-linux-fix-lab.xml')),false);
  for(const path of ['robots.txt','sitemap-index.xml',...readdirSync(root).filter(name=>/^sitemap.*\.xml$/.test(name))])assert.doesNotMatch(read(path),/linux-fix-lab/);
});

test('existing HTML pages contain no inbound link to the unlisted Lab',()=> {
  const paths=walk(root).filter(path=>path.endsWith('.html')&&!/^\/(?:de\/)?linux-fix-lab\//.test(path.slice(root.length).replaceAll('\\','/')));
  assert.ok(paths.length>300);
  for(const path of paths)assert.doesNotMatch(readFileSync(path,'utf8'),/\b(?:href|action)\s*=\s*["'](?:https?:\/\/(?:www\.)?dennishilk\.com)?\/(?:de\/)?linux-fix-lab(?:\/|[?#"'])/i,path.slice(root.length+1));
});

for(const [path,titles]of [
  ['index.html',['The Lost Administrator','World Observer','Linux Migration Companion','BoringOS','Free Image Converter']],
  ['de/index.html',['The Lost Administrator','World Observer','Linux Migration Companion','BoringOS','Bildkonverter – JPG, PNG &amp; WebP']],
])test(`${path}: approved first publication retains all existing featured cards and World Observer navigation`,()=> {
  const source=read(path),start=source.indexOf('<section class="projects">'),section=source.slice(start,source.indexOf('</section>',start));
  assert.deepEqual([...section.matchAll(/<h3>([^<]+)<\/h3>/g)].map(match=>match[1]),titles);
  assert.match(section,/href="https:\/\/github\.com\/dennishilk\/world-observer"/);
  assert.match(source.slice(0,start),/href="\/?world-observer\.html"[^>]*>[\s\S]*?World Observer/);
});
