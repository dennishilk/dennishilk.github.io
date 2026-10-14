import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../stars.js',import.meta.url),'utf8');const renderer=source.slice(source.indexOf('const canvas = document.getElementById("stars")'));
function fixture({path='/museum/',optIn=true,width=1440,height=1050,reduced=false,hidden=false,bodyClass=true}={}){
 const frames=new Map(),events={},motionEvents={};let sequence=0,draws=0,arcs=0,randomCalls=0,removed=false;
 const ctx={setTransform(){},fillRect(){draws++;},clearRect(){draws++;},beginPath(){},arc(){arcs++;},fill(){}};
 const canvas={dataset:optIn?{museumAtmosphere:'subtle'}:{},bounds:{width,height},getContext:()=>ctx,getBoundingClientRect(){return this.bounds;},remove(){removed=true;}};
 const media={matches:reduced,addEventListener:(type,fn)=>motionEvents[type]=fn};const doc={hidden,body:{classList:{contains:()=>bodyClass}},getElementById:()=>canvas,documentElement:{clientWidth:width,clientHeight:height},addEventListener:(type,fn)=>events[type]=fn};
 const win={location:{pathname:path},devicePixelRatio:3,matchMedia:()=>media,addEventListener:(type,fn)=>events[type]=fn,visualViewport:{addEventListener(){}}};
 const math=Object.create(Math);math.random=()=>{randomCalls++;return .6;};
 runInNewContext(renderer,{document:doc,window:win,Math:math,requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)});
 return {canvas,ctx,frames,doc,media,events,motionEvents,get draws(){return draws;},get arcs(){return arcs;},get randomCalls(){return randomCalls;},get removed(){return removed;},step(time){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));}};
}
test('explicit museum opt-in uses homepage cyan/projection with bounded density and DPR',()=>{
 const desktop=fixture();assert.equal(desktop.randomCalls,140*3);assert.equal(desktop.ctx.fillStyle,'#00b4ff');assert.equal(desktop.canvas.width,1800);assert.equal(desktop.frames.size,1);assert.ok(desktop.arcs>0);
 const mobile=fixture({width:390});assert.equal(mobile.randomCalls,70*3);assert.equal(mobile.canvas.width,488);
 const html=readFileSync(new URL('../museum/index.html',import.meta.url),'utf8');assert.match(html,/data-museum-atmosphere="subtle" aria-hidden="true"/);
 const css=readFileSync(new URL('../assets/museum-catalog/catalog.css',import.meta.url),'utf8');assert.match(css,/\.museum-catalog-page #stars\{z-index:0;pointer-events:none/);assert.match(css,/\.museum-catalog-page>\.museum-index\{position:relative;z-index:1/);
});
test('reduced motion draws static stars and schedules no continuous animation, including live preference changes',()=>{
 const f=fixture({reduced:true});assert.ok(f.draws>0);assert.equal(f.frames.size,0);const before=f.draws;f.step(1000);assert.equal(f.draws,before);
 f.media.matches=false;f.motionEvents.change();assert.equal(f.frames.size,1);f.step(2000);assert.ok(f.draws>before);
 f.media.matches=true;f.motionEvents.change();assert.equal(f.frames.size,0);
});
test('hidden museum tabs and page departure cancel decorative work; visibility resumes only one loop',()=>{
 const f=fixture();f.doc.hidden=true;f.events.visibilitychange();assert.equal(f.frames.size,0);const before=f.draws;f.step(1000);f.events.resize();assert.equal(f.draws,before);
 f.doc.hidden=false;f.events.visibilitychange();assert.equal(f.frames.size,1);f.events.pageshow();assert.equal(f.frames.size,1);f.events.pagehide();assert.equal(f.frames.size,0);
 const hidden=fixture({hidden:true});assert.equal(hidden.draws,0);assert.equal(hidden.frames.size,0);
});
test('slow museum rendering is capped while resize retains count and background dimensions',()=>{
 const f=fixture();f.step(100);const before=f.draws;f.step(110);assert.equal(f.draws,before);f.step(150);assert.equal(f.draws,before+1);
 f.canvas.bounds.width=390;f.events.resize();assert.equal(f.canvas.width,488);assert.equal(f.frames.size,1);
 const mobile=fixture({width:390});mobile.step(100);const base=mobile.draws;mobile.step(150);assert.equal(mobile.draws,base);mobile.step(165);assert.equal(mobile.draws,base+1);
});
test('all exhibit paths, aliases and non-opted-in pages reject stars; homepage keeps its original renderer',()=>{
 const paths=['/museum/password-cracking-lab/','/de/museum/password-cracking-lab/','/museum/cryptography-lab/','/museum/bbs-system/','/museum/linux-terminal-academy/','/museum/failure-lab/','/wopr/','/museum/c64/','/museum/ibm-pc-xt/','/museum/bios-setup/','/museum/dos-setup/','/museum/home-computing-lab/','/about/'];
 for(const path of paths){const f=fixture({path});assert.equal(f.removed,true,path);assert.equal(f.frames.size,0,path);}
 assert.equal(fixture({optIn:false}).removed,true);assert.equal(fixture({bodyClass:false}).removed,true);assert.equal(fixture({path:'/museum/index.html'}).removed,false);
 for(const path of ['/','/index.html','/de/','/de/index.html']){const home=fixture({path,optIn:false});assert.equal(home.randomCalls,200*3);assert.equal(home.canvas.width,4320);assert.equal(home.ctx.fillStyle,'#00b4ff');assert.equal(home.frames.size,1);assert.equal(home.removed,false);}
});
