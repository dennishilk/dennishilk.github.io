import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeWorkstation } from '../assets/js/lost-administrator/workstation-controller.js';
import { TerminalRenderer } from '../assets/js/debian-server/terminal-renderer.js';
import { WORKSTATION_STORAGE_KEY } from '../assets/js/lost-administrator/workstation-state.js';

class MockElement{
  constructor(doc){this.ownerDocument=doc;this.children=[];this.listeners=new Map();this.value='';this.textContent='';this.scrollTop=0;this.scrollHeight=0;this.selectionStart=0;this.selectionEnd=0;}
  addEventListener(type,fn){this.listeners.set(type,fn);}dispatch(type,event={}){event.type=type;event.preventDefault??=()=>{event.defaultPrevented=true;};this.listeners.get(type)?.(event);return event;}
  append(...items){this.children.push(...items);}replaceChildren(...items){this.children=[...items];}focus(){this.ownerDocument.activeElement=this;}blur(){this.ownerDocument.activeElement=null;}setAttribute(){}set className(value){this._className=value;}
}
const harness=({fine=true,selection=''}={})=>{const elements=new Map(),doc={activeElement:null,querySelector:key=>elements.get(key)||null,createElement:()=>new MockElement(doc),defaultView:{}};for(const key of ['#debian-terminal','#terminal-history','#terminal-input','#terminal-prompt-text'])elements.set(key,new MockElement(doc));const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},listeners=new Map();let destination=null,reloads=0;const view={localStorage:storage,matchMedia:()=>({matches:fine}),getSelection:()=>({toString:()=>selection}),addEventListener:(type,fn)=>listeners.set(type,fn),location:{assign:value=>destination=value,reload:()=>reloads++}};initializeWorkstation(doc,view,storage);return {doc,elements,storage,data,view,listeners,get destination(){return destination;},get reloads(){return reloads;}};};
const key=(input,key,extra={})=>input.dispatch('keydown',{key,ctrlKey:false,isComposing:false,...extra});

test('route remains terminal-only and exposes quiet accessible instructions',async()=>{
  const html=await readFile(new URL('../lost-administrator/workstation/index.html',import.meta.url),'utf8'),css=await readFile(new URL('../style.css',import.meta.url),'utf8');
  assert.match(html,/role="log" aria-live="off"/);assert.match(html,/aria-describedby="terminal-instructions"/);assert.match(html,/maxlength="2048"/);
  assert.match(css,/100dvh/);assert.match(css,/safe-area-inset/);assert.match(css,/touch-action:pan-y/);assert.match(css,/font-size:1rem/);
  assert.doesNotMatch(html,/modal|tour|progress|achievement|evidence discovered/i);
});

test('renderer creates output only through its owning document and textContent',()=>{
  const doc={createElement:()=>new MockElement(doc),defaultView:{}},terminal=new MockElement(doc),history=new MockElement(doc),prompt=new MockElement(doc),renderer=new TerminalRenderer(terminal,history,prompt,{user:'m.weber',hostname:'workstation',home:'/home/m.weber'});
  renderer.line('<img src=x onerror=alert(1)>','line');renderer.output({stdout:['<script>bad()</script>'],stderr:[]});
  assert.deepEqual(history.children.map(node=>node.textContent),['<img src=x onerror=alert(1)>','<script>bad()</script>']);
  assert.equal(renderer.promptText('/home/m.weber/Notes'),'m.weber@workstation:~/Notes$');
});

test('startup has one neutral hint and IME Enter does not submit',()=>{
  const h=harness(),input=h.elements.get('#terminal-input'),history=h.elements.get('#terminal-history');
  assert.equal(h.doc.activeElement,input);assert.equal(history.children.filter(node=>node.textContent==="Type 'help' to see available commands.").length,1);
  input.value='pwd';const event=key(input,'Enter',{isComposing:true});assert.equal(event.defaultPrevented,undefined);assert.equal(input.value,'pwd');
  key(input,'Enter');assert.equal(input.value,'');assert.match(history.children.map(x=>x.textContent).join('\n'),/\/home\/m\.weber/);
});

test('mail leaves Tab and arrows to the browser/caret while Ctrl+C exits safely',()=>{
  const h=harness(),input=h.elements.get('#terminal-input'),prompt=h.elements.get('#terminal-prompt-text');input.value='mail';key(input,'Enter');assert.equal(prompt.children[0].textContent,'mail>');
  input.value='open';const tab=key(input,'Tab'),arrow=key(input,'ArrowUp');assert.equal(tab.defaultPrevented,undefined);assert.equal(arrow.defaultPrevented,undefined);assert.equal(input.value,'open');
  key(input,'c',{ctrlKey:true});assert.equal(prompt.children.map(x=>x.textContent).join(''),'m.weber@workstation:~$');assert.equal(input.value,'');
});

test('selection-aware focus, coarse pointers, history cap, exit, and reset are safe',()=>{
  const coarse=harness({fine:false});assert.equal(coarse.doc.activeElement,null);
  const selected=harness({selection:'copied output'});selected.doc.activeElement=null;selected.elements.get('#debian-terminal').dispatch('click');assert.equal(selected.doc.activeElement,null);
  const h=harness(),input=h.elements.get('#terminal-input');for(let i=0;i<205;i++){input.value='pwd';key(input,'Enter');}assert.equal(JSON.parse(h.data.get(WORKSTATION_STORAGE_KEY)).commandHistory.length,200);
  input.value='exit';key(input,'Enter');assert.equal(h.destination,'/lost-administrator/');
  input.value='reset-workstation';key(input,'Enter');input.value='yes';key(input,'Enter');assert.equal(h.reloads,0);input.value='reset-workstation';key(input,'Enter');input.value='YES';key(input,'Enter');assert.equal(h.reloads,1);assert.equal(h.data.has(WORKSTATION_STORAGE_KEY),false);
});
