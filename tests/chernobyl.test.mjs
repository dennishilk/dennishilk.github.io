import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createState,transition,intervalLimits} from '../assets/chernobyl-control-room/model.mjs';
import {steps,stations,hotspots,sources} from '../assets/chernobyl-control-room/content.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
test('sequence stops at the last chapter, never wraps, and ignores paused ticks',()=>{
 let s=transition(createState(),{type:'start'});assert.equal(s.station,'sequence');assert.ok(s.playing);
 for(let i=0;i<steps.length-1;i++)s=transition(s,{type:'tick'});
 assert.equal(s.step,steps.length-1);assert.equal(s.playing,false);
 assert.deepEqual(transition(s,{type:'tick'}),s);assert.equal(transition(s,{type:'resume'}).playing,false);
 s=transition(s,{type:'restart'});assert.equal(s.step,0);assert.equal(s.playing,false);assert.equal(transition(s,{type:'previous'}).step,0);
});
test('manual navigation and station changes interrupt playback without discarding progress',()=>{
 let s=transition(createState(),{type:'start'});s=transition(s,{type:'tick'});s=transition(s,{type:'station',id:'skala'});assert.equal(s.step,1);assert.equal(s.playing,false);
 s=transition(s,{type:'station',id:'sequence'});assert.equal(s.playing,false);s=transition(s,{type:'resume'});assert.ok(s.playing);
 for(const action of [{type:'next'},{type:'previous'},{type:'seek',index:5}]){s=transition(s,{type:'resume'});s=transition(s,action);assert.equal(s.playing,false);}
 assert.equal(s.step,5);s=transition(s,{type:'start'});assert.equal(s.step,0);
});
test('invalid chapter, station and pace input cannot create an invalid presentation state',()=>{
 const s=createState();for(const action of [{type:'seek',index:-1},{type:'seek',index:steps.length},{type:'seek',index:NaN},{type:'seek',index:2.5},{type:'station',id:'unknown'},{type:'pace',value:'oops'}])assert.deepEqual(transition(s,action),s);
 assert.equal(transition(s,{type:'pace',value:1}).interval,intervalLimits.min);assert.equal(transition(s,{type:'pace',value:Infinity}).interval,s.interval);assert.equal(transition(s,{type:'pace',value:1000000}).interval,intervalLimits.max);
});
test('historical events have citations and caveats; numeric values are restricted to sourced anchors',()=>{
 assert.equal(steps.length,11);assert.equal(new Set(steps.map(s=>s.id)).size,steps.length);
 for(const s of steps){assert.ok(s.ref);assert.ok(s.note.every(n=>n.length>20));assert.ok(s.text.every(n=>n.length>100));assert.ok(['documented','reconstructed'].includes(s.type));assert.ok(sources[s.source||'insag']);}
 assert.deepEqual(steps.filter(s=>s.power).map(s=>s.power),['~30 MW(th)','~200 MW(th)']);assert.equal(steps.find(s=>s.id==='snapshot').type,'reconstructed');assert.equal(steps.find(s=>s.id==='az5').time,'26.04 · 01:23:40');assert.match(steps.find(s=>s.id==='az5').text[0],/not established/);assert.match(hotspots.skala.detail[0],/not available/);
});
test('localized static exhibit pages, structured data, source links and station fallbacks are complete',()=>{
 for(const [lang,path,other] of [['en','museum/chernobyl-control-room/','/de/museum/chernobyl-kontrollraum/'],['de','de/museum/chernobyl-kontrollraum/','/museum/chernobyl-control-room/']]){
  const h=read(path+'index.html');assert.match(h,new RegExp('<html lang="'+lang+'"'));assert.equal((h.match(/class="station" data-station/g)||[]).length,5);assert.equal((h.match(/class="station-footer"/g)||[]).length,5);assert.ok(h.includes('href="'+other+'"'));assert.ok(h.includes('hreflang="x-default"'));for(const s of stations)assert.ok(h.includes('id="'+s[0]+'"'));
  const data=JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.ok(data['@graph'].some(n=>n['@type']==='LearningResource'));assert.equal(data['@graph'][0].inLanguage,lang);assert.ok(h.includes('static-chronology'));for(const source of Object.values(sources))assert.ok(h.includes(source.url));
  const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'unique DOM ids');for(const [,id]of h.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(id),id);
 }
});
test('exhibit and publication rebuilds are deterministic and retain prior publications',()=>{
 const paths=['museum/chernobyl-control-room/index.html','de/museum/chernobyl-kontrollraum/index.html','museum/index.html','blog/index.html','de/blog/index.html'],before=paths.map(read);
 for(const script of ['build-chernobyl','integrate-jurassic-blog','integrate-dual-isa','integrate-chernobyl','integrate-storage-media-lab'])execFileSync(process.execPath,['scripts/'+script+'.mjs'],{cwd:root});assert.deepEqual(paths.map(read),before);
});
test('both article routes have matching canonicals, alternate exhibit slugs and distribution',()=>{
 const a=JSON.parse(read('content/museum-blog/articles.json')).filter(x=>x.topic==='chernobyl');
 for(const spec of a){const prefix=spec.lang==='de'?'de/':'',route='/'+prefix+'blog/'+spec.slug+'/',h=read(prefix+'blog/'+spec.slug+'/index.html'),exhibit='/'+prefix+'museum/'+spec.exhibit+'/';
 assert.ok(h.includes('href="'+exhibit+'"'));assert.ok(read(exhibit.slice(1)+'index.html').includes('href="'+route+'"'));assert.ok(h.includes('href="https://www.dennishilk.com'+route+'"'));assert.ok(read(prefix+'blog/feed.xml').includes(route));assert.ok(read('sitemap-blog.xml').includes(route));assert.ok(read(prefix?'sitemap-de.xml':'sitemap.xml').includes(exhibit));assert.ok(read('museum/index.html').includes(exhibit));
 const d=JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'].find(x=>x['@type']==='BlogPosting');assert.ok(d.wordCount>2500);assert.equal(d.citation.length,5);assert.equal((h.match(/<figcaption>/g)||[]).length,6);
 for(const [,src]of h.matchAll(/(?:src|href)="(\/assets\/blog\/computer-museum\/chernobyl-[^"]+)"/g))assert.ok(existsSync(new URL(src.slice(1),root)),src);
 }
});
test('the personal recollection retains the caretaker question and yellow lettering without identifying an unverified station',()=>{
 const de=read('content/museum-blog/chernobyl.de.fragment'),en=read('content/museum-blog/chernobyl.en.fragment');assert.match(de,/fragte ich den Hausmeister/);assert.match(de,/gelbe Beschriftung/);assert.match(de,/keine historische Standortakte/);assert.match(en,/asked the caretaker/);assert.match(en,/yellow lettering/);assert.doesNotMatch(de+en,/034570021|odl-station-id/);
});
