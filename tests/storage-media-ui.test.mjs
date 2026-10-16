// DOM-adapter integration test of the actual shipped UI module (not a browser/layout test).
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
class Element{
 constructor(dataset={}){this.dataset=dataset;this.events={};this.attrs={};this.hidden=false;this.value='';this.checked=false;this.disabled=false;this.textContent='';this.innerHTML='';this.classList={toggle(){}};}
 addEventListener(type,fn){this.events[type]=fn;}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}focus(){this.focused=true;}
 async fire(type='click'){if(!this.disabled)await this.events[type]?.({preventDefault(){}});}
}
function setup(lang){
 const html=readFileSync(new URL('../'+(lang==='de'?'de/museum/speichermedien-lab':'museum/storage-media-lab')+'/index.html',import.meta.url),'utf8');
 const map=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>['#'+m[1],new Element()]));
 const ids=['gallery','inside','calculator','archive','ventoy'];const sections=ids.map(id=>map.get('#'+id)),headings=ids.map(()=>new Element());
 const nav=[...html.matchAll(/data-station-target="([^"]+)"/g)].map(m=>new Element({stationTarget:m[1]}));const tabs=nav.slice(0,5);
 const kind=['floppy','zip','cd','usb','ssd'].map(id=>new Element({kind:id}));const cache={};
 function generated(key,selector,attr){const el=map.get(key),raw=el.innerHTML;if(cache[selector]?.raw===raw)return cache[selector].nodes;const nodes=[...raw.matchAll(new RegExp(attr+'="([^"]+)"','g'))].map(m=>new Element({[attr==='data-medium'?'medium':'volume']:m[1]}));cache[selector]={raw,nodes};return nodes;}
 const doc={documentElement:{lang},querySelector(s){if(s==='[data-station]:not([hidden]) h2')return headings[sections.findIndex(e=>!e.hidden)];return map.get(s);},querySelectorAll(s){if(s==='[data-station]')return sections;if(s==='[data-station-target]')return nav;if(s==='.tabs a')return tabs;if(s==='[data-kind]')return kind;if(s==='[data-medium]')return generated('#shelf',s,'data-medium');if(s==='[data-volume]')return generated('#disk-stack',s,'data-volume');throw Error('Unhandled selector '+s);}};
 for(const [key,value]of Object.entries({example:'0',custom:'80',unit:'GB',scale:'auto',sample:'25000000',fault:'read','personal-size':'stick','personal-mode':'insertions'}))map.get('#'+key).value=value;
 map.get('#interactive-controls').hidden=true;globalThis.document=doc;globalThis.window={addEventListener(){}};globalThis.location={hash:''};globalThis.history={replaceState(a,b,c){location.hash=c;}};globalThis.matchMedia=()=>({matches:true});
 return {map,doc,nav,tabs,sections};
}
for(const lang of ['en','de'])test(`${lang}: actual UI keeps one station active and preserves gallery, calculator and recovery state`,async()=>{
 const {map,doc,nav,tabs,sections}=setup(lang);await import('../assets/storage-media-lab/ui.mjs?fixture='+lang);
 assert.equal(sections.filter(s=>!s.hidden).length,1);assert.equal(sections[0].hidden,false);assert.equal(map.get('#interactive-controls').hidden,false);assert.equal(map.get('#gallery-fallback').hidden,true);
 await doc.querySelectorAll('[data-medium]').find(b=>b.dataset.medium==='zip').fire();assert.equal(map.get('#gallery-title').textContent,'Iomega ZIP 100');
 await tabs[2].fire();assert.equal(sections[2].hidden,false);map.get('#example').value='1';await map.get('#example').fire('change');assert.ok(map.get('#results').innerHTML.includes(lang==='de'?'47.472':'47,472'));
 await tabs[3].fire();await map.get('#fast').fire();assert.match(map.get('#archive-terminal').textContent,/VOLUME 16/);assert.equal(map.get('#replace').disabled,false);
 await map.get('#retry').fire();assert.match(map.get('#archive-terminal').textContent,/VOLUME 16/);await map.get('#replace').fire();await map.get('#fast').fire();assert.equal(map.get('#archive-end').hidden,false);
 await tabs[0].fire();assert.equal(map.get('#gallery-title').textContent,'Iomega ZIP 100');await tabs[2].fire();assert.ok(map.get('#results').innerHTML.includes(lang==='de'?'47.472':'47,472'));await tabs[3].fire();assert.equal(map.get('#archive-end').hidden,false);
 const next=nav.find((n,i)=>i>=5&&n.dataset.stationTarget==='ventoy');await next.fire();assert.equal(sections[4].hidden,false);assert.equal(sections.filter(s=>!s.hidden).length,1);assert.equal(tabs[4].attrs['aria-current'],'step');
 await tabs[3].fire();await map.get('#reset').fire();assert.equal(map.get('#archive-end').hidden,true);assert.match(map.get('#archive-terminal').textContent,/VOLUME 1 \/ 17/);
});
