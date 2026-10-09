import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const root=new URL('../',import.meta.url),origin='https://www.dennishilk.com';
test('an isolated rebuild is deterministic and removing an entry removes its generated pages',async t=> {
  const fixture=await mkdtemp(join(tmpdir(),'lfl-build-'));t.after(()=>rm(fixture,{recursive:true,force:true}));
  for(const dir of ['scripts','content','assets/linux-fix-lab'])await mkdir(join(fixture,dir),{recursive:true});
  await cp(new URL('scripts/build-linux-fix-lab.mjs',root),join(fixture,'scripts/build-linux-fix-lab.mjs'));
  await cp(new URL('content/linux-fix-lab',root),join(fixture,'content/linux-fix-lab'),{recursive:true});
  const run=()=>spawnSync(process.execPath,['scripts/build-linux-fix-lab.mjs'],{cwd:fixture,encoding:'utf8'});
  const first=run();assert.equal(first.status,0,first.stderr);
  const manifest=await readFile(join(fixture,'content/linux-fix-lab/generated-manifest.json'),'utf8');
  assert.equal(manifest,await readFile(new URL('content/linux-fix-lab/generated-manifest.json',root),'utf8'));
  const again=run();assert.equal(again.status,0,again.stderr);assert.equal(await readFile(join(fixture,'content/linux-fix-lab/generated-manifest.json'),'utf8'),manifest);
  // Remove a problem which is not used by the assistants, preserving all valid links.
  const file=join(fixture,'content/linux-fix-lab/graphics.json'),entries=JSON.parse(await readFile(file,'utf8'));
  const removed=entries.find(item=>item.id==='hybrid-gpu-selection');assert.ok(removed);
  await writeFile(file,JSON.stringify(entries.filter(item=>item.id!==removed.id)));assert.equal(run().status,0);
  const changed=JSON.parse(await readFile(join(fixture,'content/linux-fix-lab/generated-manifest.json'),'utf8'));
  assert.equal(changed.problemCount,149);assert.equal(changed.localizedProblemPages,298);
  for(const lang of ['en','de']){const route=`${lang==='de'?'de/':''}linux-fix-lab/${removed.slug[lang]}/index.html`;await assert.rejects(readFile(join(fixture,route)) ,{code:'ENOENT'});}
});
test('existing sitemap generator adds, removes and excludes localized Lab pages without duplicate ownership',async t=> {
  const fixture=await mkdtemp(join(tmpdir(),'lfl-sitemap-'));t.after(()=>rm(fixture,{recursive:true,force:true}));
  await mkdir(join(fixture,'scripts'));await cp(new URL('scripts/sync-seo.mjs',root),join(fixture,'scripts/sync-seo.mjs'));
  const paths=['/linux-fix-lab/first-problem/','/de/linux-fix-lab/erstes-problem/'];
  const alternate=`<link rel="alternate" hreflang="en" href="${origin}${paths[0]}"><link rel="alternate" hreflang="de" href="${origin}${paths[1]}">`;
  for(const [index,path]of paths.entries()){await mkdir(join(fixture,path.slice(1)),{recursive:true});await writeFile(join(fixture,path.slice(1),'index.html'),`<html lang="${index?'de':'en'}"><head><title>Fixture</title>${alternate}</head><body><h1>Fixture</h1></body></html>`);}
  await mkdir(join(fixture,'content/linux-fix-lab'),{recursive:true});await writeFile(join(fixture,'content/linux-fix-lab/generated-manifest.json'),JSON.stringify({pages:Object.fromEntries(paths.map(path=>[path,{lastmod:'2026-10-09'}]))}));
  await writeFile(join(fixture,'content/linux-fix-lab/publication.json'),JSON.stringify({phase:'live-test',allowIndexing:false,activateSitemap:false}));
  await writeFile(join(fixture,'robots.txt'),'User-agent: *\nSitemap: https://www.dennishilk.com/sitemap-index.xml\n');
  for(const path of paths){const file=join(fixture,path.slice(1),'index.html');await writeFile(file,(await readFile(file,'utf8')).replace('<head>','<head><meta name="robots" content="noindex,follow">'));}
  const run=()=>spawnSync(process.execPath,['scripts/sync-seo.mjs','--sitemaps-only'],{cwd:fixture,encoding:'utf8'});
  assert.equal(run().status,0);await assert.rejects(readFile(join(fixture,'sitemap-linux-fix-lab.xml')),{code:'ENOENT'});
  assert.doesNotMatch(await readFile(join(fixture,'sitemap-index.xml'),'utf8'),/linux-fix-lab/);
  assert.equal(await readFile(join(fixture,'robots.txt'),'utf8'),'User-agent: *\nSitemap: https://www.dennishilk.com/sitemap-index.xml\n');
  await writeFile(join(fixture,'content/linux-fix-lab/publication.json'),JSON.stringify({phase:'public-launch',allowIndexing:true,activateSitemap:true}));
  for(const path of paths){const file=join(fixture,path.slice(1),'index.html');await writeFile(file,(await readFile(file,'utf8')).replace('<meta name="robots" content="noindex,follow">',''));}
  assert.equal(run().status,0);const sitemap=await readFile(join(fixture,'sitemap-linux-fix-lab.xml'),'utf8');assert.equal((sitemap.match(/<loc>/g)||[]).length,2);
  assert.match(await readFile(join(fixture,'robots.txt'),'utf8'),/Sitemap: https:\/\/www\.dennishilk\.com\/sitemap-linux-fix-lab\.xml/);
  for(const path of paths)assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`));assert.match(sitemap,/<lastmod>2026-10-09<\/lastmod>/);
  for(const other of ['sitemap.xml','sitemap-de.xml'])assert.doesNotMatch(await readFile(join(fixture,other),'utf8'),/first-problem|erstes-problem/);
  assert.equal(run().status,0);assert.equal(await readFile(join(fixture,'sitemap-linux-fix-lab.xml'),'utf8'),sitemap);
  for(const path of paths){const file=join(fixture,path.slice(1),'index.html');await writeFile(file,(await readFile(file,'utf8')).replace('<head>','<head><meta name="robots" content="noindex,follow">'));}
  assert.equal(run().status,0);assert.doesNotMatch(await readFile(join(fixture,'sitemap-linux-fix-lab.xml'),'utf8'),/<loc>/);
  for(const path of paths)await rm(join(fixture,path.slice(1),'index.html'));assert.equal(run().status,0);assert.doesNotMatch(await readFile(join(fixture,'sitemap-linux-fix-lab.xml'),'utf8'),/<loc>/);
});
