import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {root,nodes,resolvePath,counts,doorPath} from '../assets/jurassic-park-sgi/filesystem.mjs';
import {Recovery,stages} from '../assets/jurassic-park-sgi/recovery.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('the authored park tree has consistent parents, aggregates, bilingual contents and resolvable relative paths',()=>{
 assert.deepEqual(root.children.map(n=>n.name),['Airport.Flights','Animals','Physical.Plant','Research','Zoology']);
 const c=counts();assert.ok(c.dirs>=20);assert.ok(c.files>=20);
 for(const n of nodes.values()){
  assert.equal(resolvePath(n.path),n);assert.ok(n.size>0);assert.ok(n.age>=7);if(n.parent)assert.ok(n.parent.children.includes(n));
  if(n.children){assert.equal(n.children.reduce((s,c)=>s+c.size,0),n.size);assert.ok(n.description.en&&n.description.de);}else assert.ok(n.content.en&&n.content.de);
 }
 const door=resolvePath(doorPath);assert.equal(door.action,'doors');assert.equal(resolvePath('../Fences',door.parent)?.name,'Fences');assert.equal(resolvePath('../../../../..',root),null);
 assert.equal(resolvePath('Physical.Plant/Power',root)?.name,'Power');assert.equal(resolvePath('/etc/passwd'),null);assert.equal(resolvePath('missing'),null);
});
test('recovery enforces every dependency, inspection and idempotence; reset clears the secured state',()=>{
 const r=new Recovery();assert.equal(r.next,'diagnose');assert.equal(r.apply('doors').ok,false);assert.equal(r.apply('reboot').ok,false);assert.equal(r.completed.size,0);
 for(const action of stages.slice(0,-1)){assert.equal(r.apply(action).ok,true);assert.equal(r.apply(action).reason,'already');}
 assert.equal(r.apply('doors').reason,'module');assert.equal(r.secured,false);r.inspectDoor();assert.equal(r.apply('doors').ok,true);assert.equal(r.secured,true);assert.equal(r.next,null);assert.equal(r.apply('rm').reason,'unknown');
 r.reset();assert.equal(r.completed.size,0);assert.equal(r.moduleFound,false);assert.equal(r.secured,false);
});
test('EN/DE pages and build are reproducible, link to real local assets and have reciprocal SEO',()=>{
 const paths=['museum/jurassic-park-sgi/index.html','de/museum/jurassic-park-sgi/index.html'];const before=paths.map(read);
 execFileSync(process.execPath,['scripts/build-jurassic-park-sgi.mjs'],{cwd:new URL('../',import.meta.url)});assert.deepEqual(paths.map(read),before);
 for(const [i,path] of paths.entries()){const html=read(path),lang=i?'de':'en',route=(i?'/de':'')+'/museum/jurassic-park-sgi/';
  assert.ok(html.includes('<html lang="'+lang+'">'));assert.ok(html.includes('rel="canonical" href="https://www.dennishilk.com'+route+'"'));
  for(const alt of ['en','de','x-default'])assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(html.includes('LearningResource'));
  for(const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:\?[^"#]*)?"/g)){const target=match[1];assert.ok(existsSync(new URL('../'+target.slice(1)+(target.endsWith('/')?'index.html':''),import.meta.url)),target);}
  assert.ok(read(i?'sitemap-de.xml':'sitemap.xml').includes('https://www.dennishilk.com'+route));
 }
});
test('catalog places SGI third after WOPR without adding a runtime to the overview',()=>{
 const html=read('museum/index.html'),cards=[...html.matchAll(/class="catalog-card ([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(cards.slice(0,4),['museum-card-imsai','museum-card-wopr','museum-card-sgi','museum-card-c64']);assert.equal(cards.length,23);assert.doesNotMatch(html,/jurassic-park-sgi\/ui\.mjs/);
 const preview=readFileSync(new URL('../assets/jurassic-park-sgi/preview.png',import.meta.url));assert.equal(preview.readUInt32BE(16),1200);assert.equal(preview.readUInt32BE(20),630);
});
