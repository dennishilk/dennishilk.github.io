import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { words, wordAt } from '../assets/snakkie/words.mjs';
import {LocalInference} from '../assets/snakkie/inference.mjs';
import {runtime,models,modelURL,limits,prepareMessages,shouldSend} from '../assets/snakkie/model-config.mjs';
import {createModelStorage,downloadSessionBlob} from '../assets/snakkie/model-storage.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const routes = ['snakkie/index.html', 'de/snakkie/index.html'];

test('both direct routes are noindex, have reciprocal language links and resolve local assets', () => {
  routes.forEach((route, i) => {
    const html = read(route);
    assert.match(html, new RegExp(`<html lang="${i ? 'de' : 'en'}">`));
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.ok(html.includes(`rel="canonical" href="https://www.dennishilk.com/${i ? 'de/' : ''}snakkie/"`));
    for (const lang of ['en','de']) assert.ok(html.includes(`hreflang="${lang}" href="https://www.dennishilk.com/${lang === 'de' ? 'de/' : ''}snakkie/"`));
    for (const [, attr, target] of html.matchAll(/\b(src|href)="(\/[^"#?]*)(?:\?[^"#]*)?(?:#[^"]*)?"/g)) {
      const file = target.endsWith('/') ? target.slice(1) + 'index.html' : target.slice(1);
      assert.ok(existsSync(new URL(file, root)), `${attr} missing: ${target}`);
    }
    assert.doesNotMatch(html, /<(?:script|img)[^>]*src="https?:|<link[^>]*rel="stylesheet"[^>]*href="https?:/);
    assert.match(html, /<textarea[^>]*maxlength="800"[^>]*disabled>/);
    assert.match(html, /id="start-model"[^>]*disabled/);
    assert.match(html, /Shift\+Enter/);
    assert.match(html,i ? /Nebbys Cousin/ : /Nebby’s cousin/);
    assert.doesNotMatch(html,/Nebby becomes Snakkie|NEBBY BECOMES SNAKKIE/);
    assert.match(html, /<noscript>/);
  });
});

test('model URLs are local, artifacts pinned, and UI has no chat persistence or HTML injection', async () => {
  const ai = new LocalInference();
  assert.equal(ai.worker,null);
  await assert.rejects(ai.generate({messages:[]}),/MODEL_NOT_READY/);
  for (const model of Object.values(models)) {
    assert.ok(modelURL(model).startsWith('/assets/snakkie/local-ai/'));
    assert.match(model.sha256,/^[a-f0-9]{64}$/);
    assert.match(model.source,/\/resolve\/[a-f0-9]{40}\//);
  }
  assert.deepEqual(JSON.parse(read('assets/snakkie/artifacts.json')),{runtime,models});
  for (const file of ['ui.mjs','inference.mjs','inference-worker.mjs','words.mjs']) {
    assert.doesNotMatch(read(`assets/snakkie/${file}`), /XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|innerHTML/);
  }
});

test('Enter sends; Shift+Enter, IME composition and non-Enter keys do not', () => {
  assert.equal(shouldSend({key:'Enter'}),true);
  assert.equal(shouldSend({key:'Enter',shiftKey:true}),false);
  assert.equal(shouldSend({key:'Enter',isComposing:true}),false);
  assert.equal(shouldSend({key:'Enter',keyCode:229}),false);
  assert.equal(shouldSend({key:'a'}),false);
});

test('context is bounded, complete pairs are retained and current language is explicit', () => {
  const history = Array.from({length:20},(_,i)=>({role:i%2?'assistant':'user',content:'older message '.repeat(18)}));
  history.push({role:'user',content:'Welches Betriebssystem habe ich erwähnt?'});
  const prepared = prepareMessages(history,'de');
  assert.equal(prepared[0].role,'system');
  assert.match(prepared[0].content,/Pinguin/);
  assert.match(prepared[0].content,/Nebby ist dein Cousin/);
  assert.equal(prepared[1].role,'user');
  assert.equal(prepared.at(-1).content,history.at(-1).content);
  assert.ok(new TextEncoder().encode(prepared.map(m=>m.content).join('')).length <= limits.promptBytes);
  assert.ok(prepared.length <= limits.exchanges*2+2);
  assert.throws(()=>prepareMessages([{role:'user',content:' '}],'de'),/EMPTY_INPUT/);
  assert.throws(()=>prepareMessages([{role:'user',content:'🐧'.repeat(201)}],'de'),/INPUT_TOO_LONG/);
  assert.match(prepareMessages([{role:'user',content:'Hello'}],'en')[0].content,/in English/);
});

test('worker adapter is lazy, rejects duplicate requests and supports streaming and cancellation', async t => {
  const previous = globalThis.Worker;
  class FakeWorker {
    constructor() { this.sent=[]; FakeWorker.instance=this; }
    postMessage(message) { this.sent.push(message); }
    terminate() { this.terminated=true; }
    emit(data) { this.onmessage({data}); }
  }
  globalThis.Worker=FakeWorker;
  t.after(()=>{ if(previous)globalThis.Worker=previous;else delete globalThis.Worker; });
  const ai=new LocalInference(); t.after(()=>ai.dispose());
  assert.equal(FakeWorker.instance,undefined);
  const loading=ai.load(); const worker=FakeWorker.instance;
  await assert.rejects(ai.load(),/BUSY/);
  assert.equal(worker.terminated,undefined);
  worker.emit({id:1,type:'done',result:{backend:'cpu'}}); await loading;
  let text=''; const controller=new AbortController();
  const running=ai.generate({messages:[{role:'user',content:'Moin'}],language:'de',signal:controller.signal,onToken:token=>{text+=token;}});
  await assert.rejects(ai.generate({messages:[]}),/BUSY/);
  worker.emit({id:999,type:'token',text:'stale'});
  worker.emit({id:2,type:'token',text:'Moin!'}); assert.equal(text,'Moin!');
  controller.abort(); assert.equal(worker.sent.at(-1).type,'cancel');
  worker.emit({id:2,type:'error',name:'AbortError',message:'Aborted'});
  await assert.rejects(running,{name:'AbortError'});
  ai.dispose(); assert.equal(worker.terminated,true); assert.equal(ai.ready,false);
});

test('asset provisioning dry run makes no output directory or model download', () => {
  const fixture=join(tmpdir(),'snakkie-dry-run-'+process.pid);
  const output=execFileSync('python3',['scripts/prepare-snakkie-assets.py','--output',fixture,'--dry-run'],{cwd:root,encoding:'utf8'});
  assert.match(output,/Destination:/); assert.equal(existsSync(fixture),false);
});

test('unavailable persistent storage falls back honestly, with an empty private cache', async () => {
  const storage=await createModelStorage();
  assert.equal(storage.persistent,false);
  assert.deepEqual(await storage.backend.list(),[]);
  assert.equal(await storage.backend.read('absent'),null);
  await storage.backend.delete('absent');
});

test('session downloads report byte progress and reject incomplete or oversized files', async t => {
  t.mock.method(globalThis,'fetch',async()=>new Response(new Uint8Array([1,2,3])));
  let progress;
  const blob=await downloadSessionBlob('https://test.invalid/model',3,undefined,event=>{progress=event;});
  assert.equal(blob.size,3); assert.deepEqual(progress,{loaded:3,total:3});
  await assert.rejects(downloadSessionBlob('https://test.invalid/model',4,undefined,()=>{}),/MODEL_SIZE_MISMATCH/);
  await assert.rejects(downloadSessionBlob('https://test.invalid/model',2,undefined,()=>{}),/MODEL_SIZE_MISMATCH/);
});

test('curated examples wrap manually and retain evidence and regional limits', () => {
  assert.equal(wordAt(-1), words.at(-1));
  assert.equal(wordAt(words.length), words[0]);
  for (const word of words) {
    for (const key of ['word','de','en','example','exampleDe','exampleEn','noteDe','noteEn','source','checked','region']) assert.ok(word[key]);
    assert.equal(new URL(word.source).hostname, 'www.platt-wb.de');
    assert.equal(word.audio, null);
  }
  assert.match(words[1].noteDe, /Wiesmoor.*noch nicht.*geprüft/);
  assert.doesNotMatch(read('assets/snakkie/words.mjs'), /new Date|Date\.now|Math\.random/);
});

test('no existing public page, RSS feed or sitemap advertises Snakkie', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], {cwd:root, encoding:'utf8'}).split('\0');
  for (const path of tracked.filter(path => /\.(?:html|xml|json|js)$/.test(path) && !/^(?:de\/)?snakkie\//.test(path) && !path.startsWith('assets/snakkie/'))) {
    assert.doesNotMatch(read(path), /(?:href|url|loc)[^\n]{0,12}["'>]?(?:https:\/\/www\.dennishilk\.com)?\/(?:de\/)?snakkie\//i, path);
  }
});

test('the existing sitemap generator excludes both noindex routes after regeneration', t => {
  const fixture = mkdtempSync(join(tmpdir(), 'snakkie-sitemap-'));
  t.after(() => rmSync(fixture, {recursive:true,force:true}));
  const copy = path => {
    mkdirSync(join(fixture, path, '..'), {recursive:true});
    copyFileSync(new URL(path, root), join(fixture, path));
  };
  for (const path of [...routes, 'scripts/sync-seo.mjs','scripts/hardware-integration.mjs','scripts/gaming-integration.mjs']) copy(path);
  execFileSync(process.execPath, ['scripts/sync-seo.mjs', '--sitemaps-only'], {cwd:fixture});
  for (const file of readdirSync(fixture).filter(name => /^sitemap.*\.xml$/.test(name))) {
    assert.doesNotMatch(readFileSync(join(fixture,file),'utf8'), /\/(?:de\/)?snakkie\//);
  }
});
