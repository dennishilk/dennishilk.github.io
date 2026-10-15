/** Event-wiring tests against actual EN/DE shells in a small DOM harness.
 * This is NOT a browser/layout/accessibility audit. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
import * as physics from '../assets/apollo-11/physics.mjs';import * as dsky from '../assets/apollo-11/dsky.mjs';import {events} from '../assets/apollo-11/history.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
class Node{
 constructor(id=''){this.id=id;this.hidden=false;this.value='';this.dataset={};this.style={};this.attributes={};this.children=[];this._text='';this._html='';this.disabled=false;const set=new Set();this.classList={toggle:(k,on)=>on?set.add(k):set.delete(k),add:k=>set.add(k),remove:k=>set.delete(k),contains:k=>set.has(k)};}
 set textContent(v){this._text=v;this.children=[];}get textContent(){return this._text;}
 set innerHTML(v){this._html=v;this.children=[];}get innerHTML(){return this._html;}
 setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k];}
 append(...n){for(const c of n){c.parent=this;this.children.push(c);}}prepend(n){n.parent=this;this.children.unshift(n);}replaceChildren(...n){this.children=[];this.append(...n);}remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}get lastChild(){return this.children.at(-1);}focus(){}before(){}scrollIntoView(){}matches(selector){return false;}
}
async function boot(lang){
 const html=read((lang==='de'?'de/':'')+'museum/apollo-11/index.html'),nodes=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Node(m[1])]));
 for(const [id,value]of [['scenario','final'],['throttle','25'],['attitude','0'],['target','0'],['sim-speed','1'],['history-event','0'],['source-file','LUNAR_LANDING_GUIDANCE_EQUATIONS']])nodes.get(id).value=value;
 const consoleEl=new Node(),ops=new Node(),help=new Node(),tasks=new Map(['guidance','navigation','display'].map(k=>[k,new Node()])),taskStrong=new Map(['guidance','navigation','display'].map(k=>[k,new Node()]));
 const lamps=[...html.matchAll(/data-lamp="([^"]+)"/g)].map(m=>{const n=new Node();n.dataset.lamp=m[1];return n;});
 const instructionButtons=['TC','TCF','CA','TS','OCT'].map(k=>{const n=new Node();n.dataset.instruction=k;return n;}),alarmButtons=['1201','1202'].map(k=>{const n=new Node();n.dataset.alarm=k;return n;});
 const listeners=new Map(),observers=[],frames=new Map();let frameId=0,now=0;
 const document={documentElement:{lang},hidden:false,getElementById:id=>{assert.ok(nodes.has(id),'Missing DOM ID '+id);return nodes.get(id);},createElement:()=>new Node(),addEventListener:(type,fn)=>listeners.set(type,fn),querySelector(selector){if(selector==='.flight-console')return consoleEl;if(selector==='.operations-grid')return ops;if(selector==='.flight-help')return help;if(selector==='[data-alarm="1202"]')return alarmButtons[1];const match=selector.match(/\[data-task="(.*?)"\]( strong)?/);if(match)return (match[2]?taskStrong:tasks).get(match[1]);throw Error('Unimplemented test selector: '+selector);},querySelectorAll(selector){if(selector==='[data-lamp]')return lamps;if(selector==='[data-instruction]')return instructionButtons;if(selector==='[data-alarm]')return alarmButtons;if(selector==='[data-task]:not([data-task="display"]) strong')return [taskStrong.get('guidance'),taskStrong.get('navigation')];throw Error('Unknown list selector '+selector);}};
 const window={},fetches=[];class FakeViewport{draw(){}constructor(){}}
 const code=read('assets/apollo-11/ui.mjs').replace(/^import .*?;\n/gm,'').replace("import('./viewport.mjs')",'Promise.resolve({LunarViewport:FakeViewport})');
 const context={...physics,...dsky,events,window,document,console,structuredClone,FakeViewport,Promise,setTimeout,clearTimeout,matchMedia:()=>({matches:false,addEventListener(){}}),IntersectionObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){}},requestAnimationFrame:fn=>{const id=++frameId;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),addEventListener(){},fetch:async path=>{fetches.push(path);return {ok:true,text:async()=>read(path.slice(1))};}};
 runInNewContext(code,context);await new Promise(r=>setImmediate(r));
 const get=id=>nodes.get(id),tick=(n=1)=>{for(let i=0;i<n;i++){now+=1000/60;const batch=[...frames];frames.clear();for(const [,fn]of batch)fn(now);}};
 return {get,tick,window,document,listeners,consoleEl,instructionButtons,alarmButtons,taskStrong,fetches,observers};
}
for(const lang of ['en','de'])test(lang+': actual UI handlers connect controls, physics, pause, DSKY, history, lessons and local code',async()=>{
 const app=await boot(lang),{get,tick,window}=app;assert.equal(window.apolloReady,true);
 get('throttle').value='40';get('throttle').oninput();assert.equal(window.apolloDiagnostics.snapshot().throttle,.4);get('attitude').value='12';get('attitude').oninput();assert.equal(window.apolloDiagnostics.snapshot().angle,12);
 get('restart').onclick();assert.equal(window.apolloDiagnostics.snapshot().throttle,.25);get('start').onclick();tick(121);assert.ok(window.apolloDiagnostics.snapshot().t>1.9);assert.notEqual(get('altitude').textContent,'00120');
 get('pause').onclick();const before=window.apolloDiagnostics.snapshot();tick(120);assert.deepEqual(window.apolloDiagnostics.snapshot(),before);assert.equal(window.apolloDiagnostics.running(),false);get('pause').onclick();tick(61);assert.ok(window.apolloDiagnostics.snapshot().t>before.t);
 app.document.hidden=true;app.listeners.get('visibilitychange')();assert.equal(window.apolloDiagnostics.snapshot().status,'paused');assert.equal(window.apolloDiagnostics.running(),false);app.document.hidden=false;
 get('restart').onclick();get('dsky-keys').onkeydown({key:'V',preventDefault(){},target:{matches:()=>false}});for(const key of ['1','6','n','6','0','Enter'])get('dsky-keys').onkeydown({key,preventDefault(){},target:{matches:()=>false}});assert.equal(get('dsky-verb').dataset.value,'16');assert.equal(get('r3').dataset.value,'+00394');
 get('dsky-keys').onclick({target:{closest:()=>({dataset:{key:'+'}})}});assert.match(get('dsky-message').textContent,/OPR ERR/);
 get('dsky-keys').onclick({target:{closest:()=>({dataset:{key:'RSET'}})}});assert.doesNotMatch(get('dsky-message').textContent,/OPR ERR/);
 get('history-event').value='6';get('history-event').oninput();assert.equal(get('history-detail').children[0].textContent,'102:42:18');get('history-next').onclick();assert.equal(get('history-detail').children[0].textContent,'102:42:43');
 app.alarmButtons[1].onclick();assert.match(get('alarm-explanation').textContent,/1202/);assert.equal(app.taskStrong.get('display').textContent,lang==='de'?'VERWORFEN':'DISCARDED');get('alarm-reset').onclick();assert.equal(app.taskStrong.get('display').textContent,lang==='de'?'WARTET':'QUEUED');
 app.instructionButtons[4].onclick();assert.match(get('instruction-help').textContent,/OCT/);
 get('source-file').onchange();await new Promise(r=>setImmediate(r));assert.ok(get('source-code').innerHTML.includes('STARTP64'));assert.ok(app.fetches.every(path=>path.startsWith('/assets/apollo-11/source/')));
 get('source-file').value='EXECUTIVE';get('source-file').onchange();await new Promise(r=>setImmediate(r));assert.match(get('source-code').innerHTML,/1201/);assert.match(get('source-code').innerHTML,/1202/);
 get('scenario').value='full';get('scenario').onchange();assert.match(get('entry-description').textContent,lang==='de'?/6.000/:/6,000/);assert.match(get('engine-status').textContent,lang==='de'?/BEREIT/:/ARMED/);get('start').onclick();tick(30);get('computer-mode').onclick();assert.equal(get('cockpit').hidden,true);assert.equal(get('engineering').hidden,false);assert.equal(window.apolloDiagnostics.running(),false);get('land-mode').onclick();assert.equal(get('cockpit').hidden,false);assert.equal(window.apolloDiagnostics.snapshot().status,'paused');
 get('restart').onclick();get('sim-speed').value='10';get('start').onclick();tick(2000);assert.equal(window.apolloDiagnostics.snapshot().status,'landed');assert.match(get('flight-status').textContent,lang==='de'?/Sichere Landung/:/Safe landing/);assert.equal(window.apolloDiagnostics.running(),false);
 get('scenario').value='final';get('scenario').onchange();get('engine-cut').onclick();get('start').onclick();tick(1000);assert.equal(window.apolloDiagnostics.snapshot().status,'crashed');assert.equal(get('start').disabled,true);get('restart').onclick();assert.equal(get('start').disabled,false);
});
