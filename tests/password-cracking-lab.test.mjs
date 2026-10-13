import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {Worker as NativeWorker} from 'node:worker_threads';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createSha256,hashHex,digestHex,encodeAsciiBlock} from '../assets/password-cracking-lab/sha256.js';
import {DICTIONARY,DICTIONARY_META,dictionaryBases,SETS,createPhases,candidateAt,CandidateCursor,RangeLedger} from '../assets/password-cracking-lab/search.js';
import {CrackSession,benchmark,verifyCandidate,probeGPU,selectGpuBackend} from '../assets/password-cracking-lab/coordinator.js';
import {classifyAdapter,GpuFailure} from '../assets/password-cracking-lab/gpu.js';
import {WORKER_SOURCE} from '../assets/password-cracking-lab/worker-source.js';
const reference=text=>createHash('sha256').update(text).digest('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
globalThis.crypto??=webcrypto;
class CpuWorker {
  constructor(kind='cpu'){this.kind=kind;this.sequence=0;this.pending=new Map();this.sent=[];this.closed=false;
    this.worker=new NativeWorker("const {parentPort}=require('node:worker_threads');globalThis.postMessage=data=>parentPort.postMessage(data);parentPort.on('message',data=>globalThis.onmessage({data}));\n"+WORKER_SOURCE,{eval:true});
    this.worker.on('message',result=>{const p=this.pending.get(result.id);if(!p)return;this.pending.delete(result.id);result.ok?p.resolve(result):p.reject(new Error(result.error));});
    this.worker.on('error',error=>{for(const p of this.pending.values())p.reject(error);this.pending.clear();});
  }
  rpc(action,data={}){const id=++this.sequence;this.sent.push({id,action,...data});return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker.postMessage({id,action,...data});});}
  async initialize(){await this.rpc('initialize',{kind:this.kind});return this;}
  batch(phase,start,count,target){return this.rpc('batch',{phase,start:String(start),count,target});}
  close(){if(!this.closed){this.closed=true;for(const p of this.pending.values())p.reject(new Error('Worker closed'));this.pending.clear();this.worker.terminate();}}
}
test('SHA-256 agrees with Node on known vectors, padding boundaries, UTF-8 and a million bytes',()=>{
  const sha=createSha256();for(const text of ['', 'abc', '\0', 'Grüße 🔐',...[1,24,55,56,63,64,65,128,1000000].map(n=>'a'.repeat(n))])assert.equal(digestHex(sha.hash(text)),reference(text));
  for(const text of ['123','123!','katharina2482','a'.repeat(24),'a'.repeat(55)])assert.equal(digestHex(sha.ascii(text)),reference(text));
  assert.throws(()=>encodeAsciiBlock('ä'));sha.clear();
});
test('the original target is verified with SHA-256 and independent Web Crypto',async()=>{assert.equal(await verifyCandidate('123',hashHex('123')),true);assert.equal(await verifyCandidate('124',hashHex('123')),false);});
test('numeric enumeration includes leading zeroes and exact fixed-length spaces',()=>{
  const phases=createPhases({strategy:'numeric',min:1,max:3});assert.deepEqual(phases.map(p=>p.count),[10n,100n,1000n]);
  assert.equal(candidateAt(phases[1],0n),'00');assert.equal(candidateAt(phases[2],123n),'123');
  const cursor=new CandidateCursor(phases[1],98n);assert.equal(cursor.next(),'98');assert.equal(cursor.next(),'99');assert.throws(()=>cursor.next());
});
test('dictionary variants and numerical suffixes are fixed independently of the target',()=>{
  assert.ok(DICTIONARY.length>=3000);assert.equal(new Set(DICTIONARY).size,DICTIONARY.length);assert.equal(SETS.symbols.length,32);
  assert.equal(DICTIONARY_META.individualWords+DICTIONARY_META.wordPairs,DICTIONARY_META.total);assert.equal(DICTIONARY_META.total,DICTIONARY.length);assert.ok(DICTIONARY.every(word=>/^[a-z0-9]{1,20}$/.test(word)));
  const phases=createPhases({strategy:'dictionary',suffix:4,variants:false});assert.equal(candidateAt(phases[4],12482n),'katharina2482');
  assert.equal(candidateAt(phases[1],10n),'katharina0');assert.equal(candidateAt(createPhases({strategy:'dictionary',suffix:0,variants:true})[0],4n),'Katharina');
  assert.equal(phases.reduce((n,p)=>n+p.count,0n),BigInt(DICTIONARY.length)*11111n);
});
test('case and both selected leetspeak transformations are uniquely and exactly enumerated',()=>{
  for(const [variants,leet] of [[false,false],[true,false],[false,true],[true,true]]){const bases=dictionaryBases(variants,leet);assert.equal(new Set(bases).size,bases.length);assert.ok(bases.every(word=>word.length<=20&&/^[\x20-\x7e]+$/.test(word)));const p=createPhases({strategy:'dictionary',suffix:0,variants,leet})[0];assert.equal(p.count,BigInt(bases.length));}
  assert.ok(dictionaryBases(false,true).includes('p455w0rd'));assert.ok(dictionaryBases(false,true).includes('p@$$w0rd'));assert.ok(dictionaryBases(true,true).includes('P@$$W0RD'));
});
test('optional years form a separate finite phase and include exact inclusive endpoints',()=>{
  const phases=createPhases({strategy:'dictionary',suffix:0,variants:false,years:true,yearMin:2000,yearMax:2002}),p=phases[1];assert.equal(phases.length,2);assert.equal(p.count,BigInt(DICTIONARY.length)*3n);assert.equal(candidateAt(p,0n),'password2000');assert.equal(candidateAt(p,2n),'password2002');assert.equal(candidateAt(p,3n),'katharina2000');
  const cursor=new CandidateCursor(p,2n);assert.equal(cursor.next(),'password2002');assert.equal(cursor.next(),'katharina2000');assert.equal(candidateAt(p,p.count-1n),DICTIONARY.at(-1)+'2002');assert.throws(()=>createPhases({strategy:'dictionary',years:true,yearMin:2030,yearMax:2000}));
});
test('brute-force character selection and smart ordering disclose real finite phases',()=>{
  const p=createPhases({strategy:'brute',min:1,max:2,digits:false,lower:false,upper:false,symbols:true});assert.equal(p[0].count,32n);assert.equal(p[1].count,1024n);
  const smart=createPhases({strategy:'smart',numericMax:5,suffix:2,min:1,max:4});assert.deepEqual(smart.slice(0,4).map(p=>p.kind),['dictionary','numeric','numeric','numeric']);
  assert.throws(()=>createPhases({min:6,max:1}));assert.throws(()=>createPhases({strategy:'brute',digits:false,lower:false,upper:false,symbols:false}));
});
test('indices and counts above 2^53 remain exact',()=>{
  const p=createPhases({strategy:'numeric',min:24,max:24})[0],index=9007199254740993n;assert.equal(p.count,10n**24n);assert.equal(candidateAt(p,index),'000000009007199254740993');
  const cursor=new CandidateCursor(p,index);assert.equal(cursor.next(),candidateAt(p,index));assert.equal(cursor.next(),candidateAt(p,index+1n));
  const ledger=new RangeLedger([p]);ledger.next=index;const job=ledger.allocate(4096);assert.equal(job.start,index);assert.equal(ledger.next,index+4096n);
});
test('hybrid range ledger confirms out-of-order ranges without overlap, gaps or double counts',()=>{
  const ledger=new RangeLedger(createPhases({strategy:'numeric',min:1,max:4})),ranges=[];while(ledger.next<ledger.total){const a=ledger.allocate(73),b=ledger.allocate(127);ranges.push(a);if(b)ranges.push(b);if(b)ledger.confirm(b.id,b.count);ledger.confirm(a.id,a.count);}
  let end=0n;for(const r of ranges){assert.equal(r.globalStart,end);end+=BigInt(r.count);}assert.equal(end,11110n);assert.equal(ledger.checked,end);assert.equal(ledger.frontier,end);assert.equal(ledger.exhausted,true);assert.throws(()=>ledger.confirm(ranges[0].id,ranges[0].count));
});
test('real production CPU worker recovers 123 by hashing only the allocated candidates',async()=>{
  const worker=await new CpuWorker().initialize(),session=new CrackSession({config:{strategy:'numeric',min:1,max:3},target:hashHex('123'),engines:[worker],intensity:100});
  try{const result=await session.start();assert.equal(result.state,'success');assert.equal(result.result.candidate,'123');assert.equal(result.checked,BigInt(worker.sent.filter(m=>m.action==='batch').reduce((n,m)=>n+m.count,0)));assert.ok(result.checked>=234n&&result.checked<=1110n);
    for(const message of worker.sent.filter(m=>m.action==='batch'))assert.deepEqual(Object.keys(message).sort(),['action','count','id','phase','start','target']);assert.equal(session.target,null);
  }finally{worker.close();}
});
test('real dictionary enumeration from index zero recovers katharina2482',async()=>{
  const worker=await new CpuWorker().initialize(),session=new CrackSession({config:{strategy:'dictionary',suffix:4,variants:false},target:hashHex('katharina2482'),engines:[worker],intensity:100});
  try{const result=await session.start();assert.equal(result.state,'success');assert.equal(result.result.candidate,'katharina2482');assert.ok(result.checked>=BigInt(DICTIONARY.length)*1111n+12483n);assert.equal(result.result.phase.suffixDigits,4);}finally{worker.close();}
});
test('real CPU workers recover year and leetspeak examples without target-derived vocabulary',async()=>{
  for(const [target,config] of [['katharina2002',{strategy:'dictionary',suffix:0,variants:false,years:true,yearMin:2000,yearMax:2002}],['p@$$w0rd',{strategy:'dictionary',suffix:0,variants:false,leet:true}]]){
    const worker=await new CpuWorker().initialize(),session=new CrackSession({config,target:hashHex(target),engines:[worker],intensity:100});try{const r=await session.start();assert.equal(r.state,'success');assert.equal(r.result.candidate,target);}finally{worker.close();}
  }
});
test('GPU preparation worker receives only a range and generates exact padded blocks',async()=>{
  const worker=await new CpuWorker('encoder').initialize(),phase=createPhases({strategy:'dictionary',suffix:0,variants:false,leet:true,years:true,yearMin:2024,yearMax:2024})[1];
  try{const result=await worker.rpc('encode',{phase,start:'0',count:71}),encoded=new Uint32Array(result.buffer);assert.equal(result.count,71);assert.equal(encoded.length,71*16);for(let i=0;i<71;i++)assert.deepEqual(encoded.subarray(i*16,i*16+16),encodeAsciiBlock(candidateAt(phase,BigInt(i))));const packet=worker.sent.at(-1);assert.deepEqual(Object.keys(packet).sort(),['action','count','id','phase','start']);}finally{worker.close();}
});
test('a target outside the selected space reports exhaustion, never security',async()=>{
  const worker=await new CpuWorker().initialize(),session=new CrackSession({config:{strategy:'numeric',min:1,max:1},target:hashHex('not-a-digit'),engines:[worker]});
  try{const r=await session.start();assert.equal(r.state,'exhausted');assert.equal(r.checked,10n);assert.equal(r.frontier,10n);assert.equal(r.result,null);}finally{worker.close();}
});
class ControlledEngine {
  constructor(kind='cpu'){this.kind=kind;this.jobs=[];this.closed=false;}
  batch(phase,start,count,target){return new Promise((resolve,reject)=>this.jobs.push({phase,start,count,target,resolve,reject}));}
  close(){this.closed=true;}
  complete(match=null){const j=this.jobs.shift();j.resolve({count:j.count,match,ms:10});return j;}
}
test('pause drains work, resume continues, stop ignores late replies and elapsed excludes pauses',async()=>{
  let time=0;const engine=new ControlledEngine(),s=new CrackSession({config:{strategy:'numeric',min:6,max:6},target:hashHex('999999'),engines:[engine],now:()=>time,intensity:100});
  s.start();time=12;s.pause();assert.equal(s.state,'pausing');engine.complete();await sleep(2);assert.equal(s.state,'paused');const checked=s.ledger.checked,elapsed=s.elapsed();time=500;assert.equal(s.elapsed(),elapsed);s.resume();assert.equal(engine.jobs.length,1);time=510;s.stop();engine.complete();await sleep(2);assert.equal(s.ledger.checked,checked);assert.equal(s.state,'stopped');assert.equal(s.target,null);assert.equal(engine.closed,true);assert.equal(s.elapsed(),22);
});
test('a GPU failure ends hybrid work and is not relabeled CPU fallback',async()=>{
  const cpu=new ControlledEngine(),gpu=new ControlledEngine('gpu'),s=new CrackSession({config:{strategy:'numeric',min:6,max:6},target:hashHex('999999'),engines:[cpu,gpu]});s.start();gpu.jobs.shift().reject(new Error('GPU device lost'));const r=await s.done;assert.equal(r.state,'error');assert.match(r.error,/GPU device lost/);assert.equal(cpu.closed,true);assert.equal(gpu.closed,true);assert.equal(r.checked,0n);
});
test('out-of-range and false matches cannot produce success',async()=>{
  for(const match of [10,0]){const engine=new ControlledEngine('gpu'),s=new CrackSession({config:{strategy:'numeric',min:1,max:1},target:hashHex('outside'),engines:[engine]});s.start();engine.complete(match);const r=await s.done;assert.equal(r.state,'error');assert.equal(r.result,null);}
});
test('benchmark counts actual measured batches and uses a common wall-time window',async()=>{
  const engines=[{kind:'cpu',close(){},async batch(p,start,count){await sleep(2);return {count,match:null,ms:2};}},{kind:'gpu',close(){},async batch(p,start,count){await sleep(3);return {count,match:null,ms:3};}}];
  const p=createPhases({strategy:'numeric',min:6,max:6})[0],r=await benchmark(engines,p,hashHex('outside'),100);
  assert.equal(r.checked,3*(4096+8192));assert.equal(r.combined,r.checked*1000/r.ms);assert.ok(Math.abs(r.cpu+r.gpu-r.combined)<1e-8);
});
test('unsupported WebGPU is explicitly unavailable',async()=>{const r=await probeGPU();assert.equal(r.available,false);assert.match(r.reason,/Worker|WebGPU|unavailable|not defined/);});
test('software detection does not misclassify a hardware driver merely containing the word software',()=>{
  assert.equal(classifyAdapter({isFallbackAdapter:false},{description:'AMD Software Driver',vendor:'AMD',architecture:'RDNA4'}).software,false);
  for(const description of ['SwiftShader','Mesa llvmpipe','lavapipe','Software rasterizer'])assert.equal(classifyAdapter({}, {description}).software,true);
  assert.equal(classifyAdapter({}, {isFallbackAdapter:true,description:'Hidden adapter'}).software,true);
});
test('GPU architecture selection preserves Worker-first execution and independently tries the main context',async()=>{
  const events=[],factory=(path,fail=false)=>()=>({kind:'gpu',gpuInterface:!fail,info:{description:path,software:false},async initialize(){events.push(path);if(fail)throw new GpuFailure('interface-unavailable','interface','Worker WebGPU is unavailable');return this;},close(){events.push('close-'+path);}});
  const fallback=await selectGpuBackend({mainInterface:true,workerFactory:factory('worker',true),mainFactory:factory('main')});assert.equal(fallback.path,'main');assert.equal(fallback.diagnostics.worker.code,'interface-unavailable');assert.equal(fallback.diagnostics.main.stage,'ready');fallback.engine.close();
  events.length=0;const worker=await selectGpuBackend({mainInterface:true,workerFactory:factory('worker'),mainFactory:factory('main')});assert.equal(worker.path,'worker');assert.deepEqual(events,['worker']);worker.engine.close();
});
test('precise adapter failures in both execution contexts remain unavailable rather than CPU fallback',async()=>{
  const failing=()=>({gpuInterface:true,async initialize(){throw new GpuFailure('adapter-unavailable','adapter','No adapter returned');},close(){}});
  const r=await probeGPU({mainInterface:true,workerFactory:failing,mainFactory:failing});assert.equal(r.available,false);assert.equal(r.code,'adapter-unavailable');assert.equal(r.diagnostics.main.stage,'adapter');assert.equal(r.diagnostics.worker.stage,'adapter');
});
test('bundles match source and have no runtime imports, fetches or storage',()=>{
  const result=spawnSync(process.execPath,['scripts/build-password-cracking-worker.mjs','--check'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.equal(result.status,0,result.stderr+result.stdout);
  assert.doesNotMatch(WORKER_SOURCE,/^\s*(?:import|export)\s/m);assert.doesNotMatch(WORKER_SOURCE,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\s*\(/);
  assert.match(readFileSync(new URL('../assets/password-cracking-lab/sha256.wgsl',import.meta.url),'utf8'),/@compute/);
});
for(const language of ['en','de']){
  const prefix=language==='de'?'de/':'';
  test(language+': independent lab route, metadata, local dependencies and privacy protections',()=>{
    const route=prefix+'museum/password-cracking-lab/',html=readFileSync(new URL('../'+route+'index.html',import.meta.url),'utf8');
    assert.match(html,new RegExp('<html lang="'+language+'"'));
    assert.ok(html.includes('href="https://www.dennishilk.com/'+route+'"'));
    for(const alt of ['en','de','x-default'])assert.ok(html.includes('hreflang="'+alt+'"'));
    assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);assert.doesNotMatch(html,/<form\b/i);
    assert.match(html,/YOUR PASSWORD NEVER LEAVES YOUR BROWSER|DEIN PASSWORT VERLÄSST NIEMALS DEINEN BROWSER/);
    const scripts=Array.from(html.matchAll(/<script[^>]*src="([^"]+)"/g),m=>m[1]);assert.deepEqual(scripts.map(src=>src.split('?')[0]),['/assets/js/language-toggle.js','/assets/password-cracking-lab/ui.js']);assert.match(scripts[1],/\?v=/);
    for(const src of [...scripts,...Array.from(html.matchAll(/<link[^>]*href="(\/[^"?#]+)(?:\?[^"#]*)?"/g),m=>m[1])])assert.equal(existsSync(new URL('..'+src.split('?')[0],import.meta.url)),true,src);
    const ui=readFileSync(new URL('../assets/password-cracking-lab/ui.js',import.meta.url),'utf8');assert.doesNotMatch(ui,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|sendBeacon)\s*\(/);
    const css=readFileSync(new URL('../assets/password-cracking-lab/lab.css',import.meta.url),'utf8');assert.doesNotMatch(css,/@import|https?:\/\//);assert.match(css,/prefers-reduced-motion/);
    const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.equal(schema['@graph'][0].inLanguage,language);assert.equal(schema['@graph'][0]['@type'],'WebApplication');
  });
  test(language+': original blog metadata, localized calls to action, RSS and sitemaps agree',()=>{
    const slug='how-fast-can-your-computer-crack-a-password',route=prefix+'blog/'+slug+'/',html=readFileSync(new URL('../'+route+'index.html',import.meta.url),'utf8');
    assert.match(html,new RegExp('<html lang="'+language+'"'));assert.ok(html.includes('href="/'+prefix+'museum/password-cracking-lab/"'));assert.match(html,/\/blog\/blog\.css/);
    const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'][0];assert.equal(data.inLanguage,language);assert.ok(data.wordCount>1500);assert.equal(data.url,'https://www.dennishilk.com/'+route);
    const index=readFileSync(new URL('../'+prefix+'blog/index.html',import.meta.url),'utf8'),feed=readFileSync(new URL('../'+prefix+'blog/feed.xml',import.meta.url),'utf8');assert.ok(index.includes(data.url));assert.ok(index.includes('id="password-cracking-guide"'));assert.ok(feed.includes(data.url));
    const sitemap=readFileSync(new URL('../sitemap-blog.xml',import.meta.url),'utf8');assert.ok(sitemap.includes(data.url));
  });
}
