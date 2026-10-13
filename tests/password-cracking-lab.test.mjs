import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {Worker as NativeWorker} from 'node:worker_threads';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createSha256,hashHex,digestHex,encodeAsciiBlock} from '../assets/password-cracking-lab/sha256.js';
import {DICTIONARY,DICTIONARY_META,dictionaryBases,DICTIONARIES,DICTIONARY_COUNTS,WORDLIST_SOURCES,BLIND_LIMITS,BLIND_CHARSET,normalizeConfig,SETS,createPhases,candidateAt,CandidateCursor,RangeLedger,initializeDictionaryVariants,dictionaryRangePhase,yearRange,dictionaryIndexStats} from '../assets/password-cracking-lab/search.js';
import {CrackSession,benchmark,verifyCandidate,probeGPU,selectGpuBackend} from '../assets/password-cracking-lab/coordinator.js';
import {classifyAdapter,GpuFailure} from '../assets/password-cracking-lab/gpu.js';
import {WORKER_SOURCE} from '../assets/password-cracking-lab/worker-source.js';
const reference=text=>createHash('sha256').update(text).digest('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
globalThis.crypto??=webcrypto;
before(()=>initializeDictionaryVariants());
class CpuWorker {
  constructor(kind='cpu'){this.kind=kind;this.sequence=0;this.pending=new Map();this.sent=[];this.closed=false;
    this.worker=new NativeWorker("const {parentPort}=require('node:worker_threads');globalThis.postMessage=data=>parentPort.postMessage(data);parentPort.on('message',data=>globalThis.onmessage({data}));\n"+WORKER_SOURCE,{eval:true});
    this.worker.on('message',result=>{const p=this.pending.get(result.id);if(!p)return;this.pending.delete(result.id);result.ok?p.resolve(result):p.reject(new Error(result.error));});
    this.worker.on('error',error=>{for(const p of this.pending.values())p.reject(error);this.pending.clear();});
  }
  rpc(action,data={}){const id=++this.sequence;this.sent.push({id,action,...data});return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker.postMessage({id,action,...data});});}
  async initialize(){await this.rpc('initialize',{kind:this.kind});return this;}
  batch(phase,start,count,target){return this.rpc('batch',{phase:dictionaryRangePhase(phase,start,count),start:String(start),count,target});}
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
  assert.throws(()=>createPhases({strategy:'smart',min:6,max:1}));assert.throws(()=>createPhases({strategy:'brute',digits:false,lower:false,upper:false,symbols:false}));
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
    const suffixSpace=createPhases({german:true,english:true,brute:false}).reduce((n,p)=>n+p.count,0n);
    assert.ok(html.includes(new Intl.NumberFormat(language==='de'?'de-DE':'en-US').format(suffixSpace)),'Published dictionary-space example must match the actual configuration');
    const index=readFileSync(new URL('../'+prefix+'blog/index.html',import.meta.url),'utf8'),feed=readFileSync(new URL('../'+prefix+'blog/feed.xml',import.meta.url),'utf8');assert.ok(index.includes(data.url));assert.ok(index.includes('id="password-cracking-guide"'));assert.ok(feed.includes(data.url));
    const sitemap=readFileSync(new URL('../sitemap-blog.xml',import.meta.url),'utf8');assert.ok(sitemap.includes(data.url));
  });
}

test('blind default has two explicit language dictionaries and no numeric shortcut',()=>{
  assert.deepEqual(normalizeConfig(),{strategy:'blind',german:true,english:true,common:false,brute:false});
  const p=createPhases({});assert.deepEqual(p.map(x=>x.language),['de','en','de','en','de','en','de','en']);
  assert.ok(p.every(x=>x.kind==='dictionary'));assert.throws(()=>createPhases({german:false,english:false,brute:false}),/at least one search method/);
  assert.deepEqual(normalizeConfig({german:false,english:false,brute:true,min:1,max:1,charset:'0',password:'123',length:3}),{strategy:'blind',german:false,english:false,common:false,brute:true});
});
test('language dictionaries contain actual separate vocabulary and exact documented counts',()=>{
  for(const language of ['de','en']){
    const entries=DICTIONARIES[language],meta=DICTIONARY_COUNTS[language];assert.equal(new Set(entries).size,entries.length);assert.equal(meta.total,entries.length);assert.equal(meta.individualWords+meta.wordPairs,meta.total);assert.ok(entries.every(w=>/^[\x20-\x7e]{1,20}$/.test(w)));
    const bases=dictionaryBases(true,true,language);assert.equal(new Set(bases).size,bases.length);assert.ok(bases.every(w=>w.length<=20));
  }
  assert.ok(DICTIONARIES.de.includes('sommer')); // English name vocabulary may also include Sommer.
  assert.ok(DICTIONARIES.en.includes('sunshine')); // Shared loanwords do not invalidate language provenance.
  assert.ok(DICTIONARIES.de.includes('penis'));assert.ok(!DICTIONARIES.de.includes('A1h5')&&!DICTIONARIES.en.includes('A1h5'));
  assert.ok(DICTIONARIES.de.includes('blauerkater'));assert.ok(DICTIONARIES.en.includes('bluecat'));
});
test('all checkbox combinations select only their deterministic phases, independent of target and locale',()=>{
  for(const german of [false,true])for(const english of [false,true])for(const common of [false,true])for(const brute of [false,true]){
    if(!german&&!english&&!common&&!brute)continue;
    const config={german,english,common,brute},a=createPhases({...config,password:'penis',locale:'de'}),b=createPhases({...config,password:'A1h5',locale:'en',min:4,max:4,digits:true});
    assert.deepEqual(a,b);assert.equal(a.some(p=>p.language==='de'),german);assert.equal(a.some(p=>p.language==='en'),english);assert.equal(a.some(p=>p.kind==='brute'),brute);assert.equal(a.some(p=>p.language==='common'),common);
    for(const p of a){const start=0n,last=p.count-1n;assert.equal(candidateAt(p,start),candidateAt(b[a.indexOf(p)],start));assert.equal(candidateAt(p,last),candidateAt(b[a.indexOf(p)],last));}
  }
});
test('blind brute force covers exactly printable ASCII across every length, with BigInt totals',()=>{
  assert.equal(BLIND_CHARSET.length,95);assert.equal(new Set(BLIND_CHARSET).size,95);assert.deepEqual([...BLIND_CHARSET].map(c=>c.charCodeAt(0)).sort((a,b)=>a-b),Array.from({length:95},(_,i)=>32+i));
  const phases=createPhases({german:false,english:false,brute:true});assert.equal(phases.length,24);assert.equal(BLIND_LIMITS.maximumLength,24);
  assert.deepEqual(phases.map(p=>p.length),Array.from({length:24},(_,i)=>i+1));assert.ok(phases.every(p=>p.charset===BLIND_CHARSET));
  const two=phases[1],all=new Set();const cursor=new CandidateCursor(two);for(let i=0n;i<two.count;i++)all.add(cursor.next());assert.equal(all.size,95**2);assert.ok(all.has('A1')&&all.has('  ')&&all.has('!?'));assert.throws(()=>cursor.next());
  const total=phases.reduce((sum,p)=>sum+p.count,0n);assert.equal(total,Array.from({length:24},(_,i)=>95n**BigInt(i+1)).reduce((a,b)=>a+b));assert.ok(total>BigInt(Number.MAX_SAFE_INTEGER));
  const index=9007199254740993n,p=phases[8];assert.equal(new CandidateCursor(p,index).next(),candidateAt(p,index));
});
test('fixed dictionary patterns have unique candidates within each phase and exact radix accounting',()=>{
  for(const language of ['de','en']){
    const phases=createPhases({german:language==='de',english:language==='en',brute:false});const bases=dictionaryBases(true,true,language);
    assert.deepEqual(phases.map(p=>p.count),[1n,BigInt(BLIND_LIMITS.yearMax-BLIND_LIMITS.yearMin+1),10n,100n].map(n=>n*BigInt(bases.length)));
    const first=new Set();for(let i=0n;i<phases[0].count;i++)first.add(candidateAt(phases[0],i));assert.equal(first.size,bases.length);
    for(const p of phases.slice(1)){
      const width=p.yearMin===undefined?Number(10n**BigInt(p.suffixDigits)):BLIND_LIMITS.yearMax-BLIND_LIMITS.yearMin+1;
      const values=new Set(Array.from({length:width},(_,i)=>candidateAt(p,BigInt(i))));assert.equal(values.size,width);
      assert.equal(new CandidateCursor(p,p.count-1n).next(),candidateAt(p,p.count-1n));
    }
  }
});
test('blind CPU recovery from zero verifies German base and fixed year patterns',async()=>{
  for(const target of ['penis','sommer2024']){
    const worker=await new CpuWorker().initialize(),s=new CrackSession({config:{german:true,english:false,brute:false},target:hashHex(target),engines:[worker],intensity:100});
    try{const result=await s.start();assert.equal(result.state,'success');assert.equal(result.result.candidate,target);assert.equal(result.result.phase.language,'de');if(target==='sommer2024')assert.equal(result.result.phase.yearMin,1984);
      assert.equal(result.checked,BigInt(worker.sent.filter(p=>p.action==='batch').reduce((n,p)=>n+p.count,0)));assert.ok(worker.sent.filter(p=>p.action==='batch').every(p=>Object.keys(p).sort().join(',')==='action,count,id,phase,start,target'));
    }finally{worker.close();}
  }
});
test('mixed-case target is recovered by a real worker at its genuine brute-force index',async()=>{
  // A local range check verifies the expensive index without pretending to run
  // every earlier candidate in this test. Production still starts at index zero.
  const phase=createPhases({german:false,english:false,brute:true})[3];let index=0n;for(const c of 'A1h5')index=index*95n+BigInt(BLIND_CHARSET.indexOf(c));assert.equal(candidateAt(phase,index),'A1h5');assert.ok(index>20000000n);
  const worker=await new CpuWorker().initialize();try{const result=await worker.batch(phase,index-2n,5,hashHex('A1h5'));assert.equal(result.match,2);assert.equal(result.count,5);}finally{worker.close();}
});
test('verified match time includes independent verification',async()=>{
  let time=0;const engine=new ControlledEngine(),s=new CrackSession({config:{german:false,english:false,brute:true},target:hashHex('a'),engines:[engine],now:()=>time,verify:async()=>{time=30;return true;}});
  s.start();time=10;engine.complete(0);const result=await s.done;assert.equal(result.state,'success');assert.equal(result.elapsed,30);
});

test('both actual UI modules validate methods and run genuine workers without target-derived options',async()=>{
  // DOM fixture exercises the shipped UI script and real CPU engines. It does
  // not replace the separate browser suite's rendering/WebGPU acceptance.
  const {runInNewContext}=await import('node:vm');
  class Element {
    constructor(){this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.dataset={};this.children=[];this.events={};this._text='';const classes=new Set();this.classList={toggle:(name,on)=>on?classes.add(name):classes.delete(name),contains:name=>classes.has(name)};}
    set textContent(value){this._text=String(value);}get textContent(){return this._text;}
    addEventListener(type,callback){this.events[type]=callback;}emit(type){return this.events[type]?.();}
    append(child){this.children.push(child);}replaceChildren(...children){this.children=children;}
    setAttribute(name,value){this[name]=value;}closest(){return this.card??=new Element();}scrollIntoView(){}focus(){}
  }
  for(const lang of ['en','de']){
    const html=readFileSync(new URL('../'+(lang==='de'?'de/':'')+'museum/password-cracking-lab/index.html',import.meta.url),'utf8'),elements=new Map();
    for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
      const el=new Element(),source=tag[0];el.value=source.match(/\bvalue="([^"]*)"/)?.[1]||'';el.checked=/\schecked(?:\s|>)/.test(source);el.disabled=/\sdisabled(?:\s|>)/.test(source);elements.set(tag[1],el);
    }
    elements.get('mode').value='cpu';elements.get('mode').options=['cpu','gpu','hybrid'].map(value=>({value,disabled:value!=='cpu'}));
    const doc={documentElement:{lang},body:{dataset:{}},hidden:false,getElementById:id=>{assert.ok(elements.has(id),'Missing UI element '+id);return elements.get(id);},createElement:()=>new Element(),addEventListener(){},querySelectorAll:()=>[],querySelector:()=>new Element()};
    const search=await import('../assets/password-cracking-lab/search.js'),created=[];
    const dependencies={...search,benchmark,CrackSession,makeEngines:async(mode,count)=>{assert.equal(mode,'cpu');const engines=await Promise.all(Array.from({length:count},async()=>{const worker=await new CpuWorker().initialize();created.push(worker);return worker;}));return engines;},probeGPU:async()=>({available:false,path:'none',code:'adapter-unavailable',diagnostics:{main:{interface:true,stage:'adapter',code:'adapter-unavailable'},worker:{interface:false,stage:'interface',code:'interface-unavailable'}}})};
    const code=readFileSync(new URL('../assets/password-cracking-lab/ui.js',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
    const sandbox={...dependencies,document:doc,window:{addEventListener(){}},navigator:{hardwareConcurrency:2},crypto:webcrypto,TextEncoder,Intl,innerWidth:1440,matchMedia:()=>({matches:true}),setInterval:()=>0};
    runInNewContext(code,sandbox);elements.get('password').value='invented';elements.get('password').emit('input');assert.equal(elements.get('start').disabled,true,'Start must wait for local indexes');await sleep(2);
    const el=id=>elements.get(id);
    try{
      el('password').value='invented';el('password').emit('input');
      el('german').checked=false;el('german').emit('change');el('english').checked=false;el('english').emit('change');assert.equal(el('start').disabled,true);assert.match(el('method-help').textContent,lang==='de'?/mindestens/:/at least/);
      // Deliberately search the dictionary opposite the interface language.
      const language=lang==='de'?'english':'german',target=lang==='de'?'sunshine':'penis';el(language).checked=true;el(language).emit('change');el('password').value=target;el('password').emit('input');
      await el('start').emit('click');
      for(let i=0;i<10000&&!['success','error'].includes(doc.body.dataset.state);i++)await sleep(2);
      assert.equal(doc.body.dataset.state,'success',el('status-detail').textContent);assert.equal(el('password').value,'');assert.equal(el('recovered').textContent,'');assert.ok(el('result-time').textContent);assert.match(el('result-strategy').textContent,language==='english'?/English|Englisches/:/German|Deutsches/);
      el('reveal').emit('click');assert.equal(el('recovered').textContent,target);el('reveal').emit('click');assert.equal(el('recovered').textContent,'');el('reset').emit('click');assert.equal(el('checked').textContent,'0');assert.equal(doc.body.dataset.state,'idle');
      el(language).checked=false;el(language).emit('change');el('brute').checked=true;el('brute').emit('change');el('password').value='a';el('password').emit('input');await el('start').emit('click');
      for(let i=0;i<10000&&!['success','error'].includes(doc.body.dataset.state);i++)await sleep(2);
      assert.equal(doc.body.dataset.state,'success',el('status-detail').textContent);assert.equal(el('checked').textContent,'95');assert.match(el('result-strategy').textContent,/Brute/);el('reset').emit('click');assert.equal(el('recovered').textContent,'');
      for(const worker of created)for(const packet of worker.sent.filter(p=>p.action==='batch'))assert.deepEqual(Object.keys(packet).sort(),['action','count','id','phase','start','target']);
    }finally{created.forEach(worker=>worker.close());}
  }
});

test('common/IT-only search genuinely exhausts all phases for an uncovered Unicode target',async()=>{
  const config={german:false,english:false,common:true,brute:false},worker=await new CpuWorker().initialize(),s=new CrackSession({config,target:hashHex('outside-🔐'),engines:[worker],intensity:100});
  try{const result=await s.start();assert.equal(result.state,'exhausted');assert.equal(result.result,null);assert.equal(result.checked,BigInt(dictionaryBases(true,true,'common').length)*BigInt(111+BLIND_LIMITS.yearMax-BLIND_LIMITS.yearMin+1));assert.equal(result.frontier,result.total);assert.equal(result.total,result.checked);assert.ok(result.phaseChecked.every((count,i)=>count===result.phases[i].count));}finally{worker.close();}
});

test('production worker hashes 24-character brute-force candidates at exact boundary ranges',async()=>{
  const phase=createPhases({german:false,english:false,brute:true}).at(-1);assert.equal(phase.length,24);
  const worker=await new CpuWorker().initialize();
  try{
    let result=await worker.batch(phase,0n,3,hashHex('a'.repeat(24)));assert.equal(result.match,0);assert.equal(result.count,3);
    result=await worker.batch(phase,phase.count-2n,2,hashHex('~'.repeat(24)));assert.equal(result.match,1);assert.equal(result.count,2);
    const start=9007199254740993n;result=await worker.batch(phase,start,2,hashHex(candidateAt(phase,start+1n)));assert.equal(result.match,1);
  }finally{worker.close();}
});

test('expanded snapshots are pinned, checksum verified, reproducible and locally licensed',()=>{
  const result=spawnSync(process.execPath,['scripts/build-password-cracking-wordlists.mjs','--check'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.equal(result.status,0,result.stderr+result.stdout);
  assert.ok(WORDLIST_SOURCES.de.selected>=204182);assert.ok(WORDLIST_SOURCES.en.selected>=219146);assert.ok(WORDLIST_SOURCES.common.selected>=20506);
  for(const language of ['de','en','common'])assert.match(WORDLIST_SOURCES[language].bundledSha256,/^[a-f0-9]{64}$/);
  for(const file of ['LICENSE-german-CC0.txt','LICENSE-english-SCOWL.txt','LICENSE-common-MIT.txt'])assert.ok(readFileSync(new URL('../assets/password-cracking-lab/wordlists/'+file,import.meta.url),'utf8').length>1000);
  assert.ok(DICTIONARIES.de.length>100000);assert.ok(DICTIONARIES.en.length>45000);assert.ok(DICTIONARIES.common.length>10000);
  assert.ok(DICTIONARIES.de.includes('ratte'));assert.ok(DICTIONARIES.en.includes('abbreviation'));assert.ok(DICTIONARIES.common.includes('123456'));assert.ok(DICTIONARIES.common.includes('admin'));assert.ok(DICTIONARIES.common.includes('kernel'));
  const bundled=readFileSync(new URL('../assets/password-cracking-lab/wordlists-data.js',import.meta.url),'utf8');assert.match(bundled,/Copyright 2000-2026 by Kevin Atkinson/);assert.match(bundled,/Copyright \(c\) 2018 Daniel Miessler/);assert.ok(Buffer.byteLength(WORKER_SOURCE)<60000);
});
test('optional common/IT collection retains exact strings and deduplicates each phase',async()=>{
  const bases=dictionaryBases(true,true,'common');assert.equal(new Set(bases).size,bases.length);assert.ok(bases.every(w=>/^[\x20-\x7e]{1,20}$/.test(w)));
  const config={german:false,english:false,common:true,brute:false},phases=createPhases(config);assert.ok(phases.every(p=>p.language==='common'));assert.equal(candidateAt(phases[0],0n),readFileSync(new URL('../assets/password-cracking-lab/wordlists/common.txt',import.meta.url),'utf8').split('\n')[0]);
  const worker=await new CpuWorker().initialize(),session=new CrackSession({config,target:hashHex('123456'),engines:[worker],intensity:100});try{const result=await session.start();assert.equal(result.state,'success');assert.equal(result.result.phase.language,'common');assert.equal(result.result.candidate,'123456');}finally{worker.close();}
});

test('Bud Spencer expansion exceeds all unique targets and preserves every baseline candidate',async()=>{
  const {runInNewContext}=await import('node:vm');const baseline={},names={de:'german',en:'english',common:'common'},minimum={de:204182,en:219146,common:20506};
  for(const language of Object.keys(names)){
    const rows=readFileSync(new URL('../assets/password-cracking-lab/wordlists/'+names[language]+'.txt',import.meta.url),'utf8').trimEnd().split('\n'),source=WORDLIST_SOURCES[language];
    assert.equal(rows.length,source.selected);assert.equal(new Set(rows).size,rows.length);assert.ok(rows.every(w=>/^[\x20-\x7e]{1,20}$/.test(w)));
    baseline[language]=rows.slice(0,source.baselineSelected);assert.equal(reference(baseline[language].join('\n')+'\n'),source.datasets[0].bundledSha256);
    assert.ok(DICTIONARIES[language].length>=minimum[language]);assert.equal(new Set(DICTIONARIES[language]).size,DICTIONARY_COUNTS[language].total);
  }
  const code=readFileSync(new URL('../assets/password-cracking-lab/dictionary.js',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'').replace(/\bexport /g,'');
  const previous=runInNewContext(code+';DICTIONARIES',{EXTERNAL_DE:baseline.de,EXTERNAL_EN:baseline.en,EXTERNAL_COMMON:baseline.common,WORDLIST_SOURCES:{}});
  for(const [language,count] of Object.entries({de:102091,en:109573,common:10253})){
    assert.equal(previous[language].length,count);const current=new Set(DICTIONARIES[language]);for(const entry of previous[language])assert.ok(current.has(entry),'Missing baseline '+language+': '+entry);
  }
  for(const word of ['sackgesicht','dummkopf','vollpfosten','klugscheisser','kartoffelsalat','sommerurlaub','lieblingsmensch','schlafmuetze','computerfreak'])assert.ok(DICTIONARIES.de.includes(word),word);
  for(const word of ['budspencer','terencehill','spiderman','spider-man','darthvader','chucknorris','indianajones','starwars','trustno1'])assert.ok(DICTIONARIES.common.includes(word),word);
  assert.ok(dictionaryBases(true,true,'de').includes('Wiesmoor'));
  const curated=readFileSync(new URL('../assets/password-cracking-lab/wordlists/curated-themes.json',import.meta.url));assert.equal(createHash('sha256').update(curated).digest('hex'),WORDLIST_SOURCES.common.datasets[1].sourceSha256);
});
test('packed indexes reproduce exactly and occupy one shared table per language',()=>{
  const built=spawnSync(process.execPath,['scripts/build-password-cracking-variants.mjs','--check'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.equal(built.status,0,built.stderr+built.stdout);
  const stats=dictionaryIndexStats();for(const language of ['de','en','common']){assert.equal(stats[language].count,dictionaryBases(true,true,language).length);assert.ok(stats[language].bytes<32000000);}
  assert.doesNotMatch(WORKER_SOURCE,/export const EXTERNAL_DE|variant-pack-|new DecompressionStream/);
});
test('bounded dictionary pages preserve CPU/encoder candidates across years and phase boundaries',async()=>{
  const cpu=await new CpuWorker().initialize(),encoder=await new CpuWorker('encoder').initialize();
  try{
    for(const language of ['de','en','common']){
      const phases=createPhases({german:language==='de',english:language==='en',common:language==='common'});
      for(const phase of phases)for(const start of [0n,53n,phase.count-72n]){
        const count=72,page=dictionaryRangePhase(phase,start,count),cursor=new CandidateCursor(page,start);
        assert.ok(page.rangeBases.length<=count);assert.ok(page.rangeBases.length<dictionaryBases(true,true,language).length);
        for(let i=0;i<count;i++)assert.equal(cursor.next(),candidateAt(phase,start+BigInt(i)));
        const target=candidateAt(phase,start+35n),result=await cpu.batch(phase,start,count,hashHex(target));assert.equal(result.match,35);assert.equal(result.count,count);
        const blocks=await encoder.rpc('encode',{phase:page,start:String(start),count});const expected=new Uint32Array(count*16);
        for(let i=0;i<count;i++)encodeAsciiBlock(candidateAt(phase,start+BigInt(i)),expected,i*16);assert.deepEqual(new Uint32Array(blocks.buffer),expected);
      }
    }
    const phase=createPhases({german:false,english:false,common:true})[0];assert.throws(()=>dictionaryRangePhase(phase,-1n,1));assert.throws(()=>dictionaryRangePhase(phase,phase.count-1n,2));assert.throws(()=>dictionaryRangePhase(phase,0n,65537));
  }finally{cpu.close();encoder.close();}
});
test('all engines use fixed blind years 1984 onward with future-safe four-digit bounds',async()=>{
  assert.deepEqual(yearRange(2026),{yearMin:1984,yearMax:2035});assert.deepEqual(yearRange(2036),{yearMin:1984,yearMax:2036});assert.deepEqual(yearRange(10000),{yearMin:1984,yearMax:9999});
  const cpu=await new CpuWorker().initialize();try{
    for(const language of ['de','en','common']){
      const phase=createPhases({german:language==='de',english:language==='en',common:language==='common'})[1],bases=dictionaryBases(true,true,language),base=language==='common'?'Budspencer':'Dragon',index=(()=>{let i=0;for(const value of bases){if(value===base)return i;i++;}return -1;})();assert.ok(index>=0);
      for(const year of [1984,1999,2000,2026,2035]){
        const offset=BigInt(index)*BigInt(phase.yearMax-phase.yearMin+1)+BigInt(year-phase.yearMin);assert.equal(candidateAt(phase,offset),base+year);
        const result=await cpu.batch(phase,offset,1,hashHex(base+year));assert.equal(result.match,0);assert.equal(result.count,1);
      }
    }
    const phase=createPhases({german:false,english:false,common:true})[1],bases=dictionaryBases(true,true,'common');let index=0;for(const base of bases){if(base==='Dr4g0n')break;index++;}assert.ok(index<bases.length);
    const offset=BigInt(index)*BigInt(phase.yearMax-phase.yearMin+1)+BigInt(2025-phase.yearMin);assert.equal(candidateAt(phase,offset),'Dr4g0n2025');assert.equal((await cpu.batch(phase,offset,1,hashHex('Dr4g0n2025'))).match,0);
  }finally{cpu.close();}
});
