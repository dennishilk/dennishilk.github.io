import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
test('museum publication integrations preserve the current bilingual blog card style and archive',async t=>{
 const fixture=await mkdtemp(join(tmpdir(),'blog-museum-integration-'));
 t.after(()=>rm(fixture,{recursive:true,force:true}));
 const scripts=['integrate-jurassic-blog','integrate-dual-isa','integrate-chernobyl','integrate-storage-media-lab'];
 const paths=[...scripts.map(s=>'scripts/'+s+'.mjs'),'scripts/museum-publication-counts.mjs','content/museum-blog/articles.json','blog/index.html','de/blog/index.html','museum/index.html'];
 for(const p of paths){await mkdir(join(fixture,p,'..'),{recursive:true});await cp(new URL(p,root),join(fixture,p));}
 const archives=['blog/index.html','de/blog/index.html'];
 const before=await Promise.all(archives.map(p=>readFile(join(fixture,p),'utf8')));
 for(let pass=0;pass<2;pass++){
  for(const s of scripts)execFileSync(process.execPath,['scripts/'+s+'.mjs'],{cwd:fixture});
  assert.deepEqual(await Promise.all(archives.map(p=>readFile(join(fixture,p),'utf8'))),before);
 }
});
