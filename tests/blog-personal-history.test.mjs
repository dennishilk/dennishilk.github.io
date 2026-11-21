import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdir, mkdtemp, cp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const graph=html=>JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
const article=html=>graph(html).find(n=>n['@type']==='BlogPosting');
const assets=html=>[...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)(?:\?[^"]*)?"/g)].map(m=>m[1]))].sort();
const wowRoutes=['de/blog/wow-forever-nebukatneza-dennis-hilk/index.html','blog/wow-forever-nebukatneza-dennis-hilk/index.html'];

test('published personal histories retain their actual latest event dates and gallery scripts',async()=>{
  for(const path of wowRoutes){
    const html=await read(path);
    assert.equal(article(html).datePublished,'2026-11-10');
    assert.equal(article(html).dateModified,'2026-11-21');
    assert.match(html,/2026-11-19/);
    for(const script of ['gallery.js','observer.js'])assert.equal([...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].filter(m=>m[1].includes('/wow-forever/'+script)).length,1);
    assert.match(html,/Ostfriesen Raid/);
    assert.match(html,/BONK/);
    assert.match(html,/id="level-34-20261121"/);
    for(const id of ["jS9mmWPO27E","46Rgw8VeC2o","GAV4w-TpN7M","QsQWJBZ6I7k","V88Ib_WcPno","xO6zDGxV1eA","QyHWj7mKqko"])assert.ok(html.includes(id));
  }
  for(const path of ['de/blog/janes-ah64d-longbow-1996-big-box-retro-pc/index.html','blog/janes-ah64d-longbow-1996-retro-pc/index.html']){
    const html=await read(path);
    assert.equal(article(html).datePublished,'2026-11-03');
    assert.equal(article(html).dateModified,'2026-11-21');
    assert.match(html,/20[.]? November 2026/);
  }
});

test('rebuilding personal stories preserves published diary assets and authored modification dates',async t=>{
  const fixture=await mkdtemp(join(tmpdir(),'personal-history-'));
  t.after(()=>rm(fixture,{recursive:true,force:true}));
  const paths=[
    'scripts/build-behind-projects.mjs','scripts/build-longbow-retro.mjs',
    'content/behind-projects/articles.json','content/behind-projects/longbow.json',
    'content/behind-projects/wow-forever.de.fragment','content/behind-projects/wow-forever.en.fragment',
    'content/behind-projects/longbow.de.fragment','content/behind-projects/longbow.en.fragment',
    'de/blog/index.html','blog/index.html','sitemap-blog.xml',
    'de/blog/nebuverse-gotosocial-selbst-hosten/index.html','blog/nebuverse-self-hosting-gotosocial/index.html'
  ];
  for(const path of paths){await mkdir(join(fixture,path,'..'),{recursive:true});await cp(new URL(path,root),join(fixture,path));}
  execFileSync(process.execPath,['scripts/build-behind-projects.mjs','wow-forever'],{cwd:fixture});
  for(const path of wowRoutes){
    const output=await readFile(join(fixture,path),'utf8');
    assert.deepEqual(assets(output),assets(await read(path)),path);
    assert.equal(article(output).dateModified,'2026-11-21');
    assert.match(output,/BONK/);
  }
  const before=await Promise.all(wowRoutes.map(path=>readFile(join(fixture,path),'utf8')));
  execFileSync(process.execPath,['scripts/build-behind-projects.mjs','wow-forever'],{cwd:fixture});
  assert.deepEqual(await Promise.all(wowRoutes.map(path=>readFile(join(fixture,path),'utf8'))),before);
  const specs=JSON.parse(await readFile(join(fixture,'content/behind-projects/articles.json'),'utf8'));
  for(const a of specs.filter(a=>a.topic==='wow-forever'))a.modified='2026-11-22';
  await writeFile(join(fixture,'content/behind-projects/articles.json'),JSON.stringify(specs));
  execFileSync(process.execPath,['scripts/build-behind-projects.mjs','wow-forever'],{cwd:fixture});
  for(const path of wowRoutes){
    const html=await readFile(join(fixture,path),'utf8');
    assert.equal(article(html).datePublished,'2026-11-10');
    assert.equal(article(html).dateModified,'2026-11-22');
    assert.match(html,/<meta property="article:modified_time" content="2026-11-22">/);
  }
  execFileSync(process.execPath,['scripts/build-longbow-retro.mjs'],{cwd:fixture});
  const longbow=await readFile(join(fixture,'de/blog/janes-ah64d-longbow-1996-big-box-retro-pc/index.html'),'utf8');
  assert.equal(article(longbow).datePublished,'2026-11-03');
  assert.equal(article(longbow).dateModified,'2026-11-21');
});
