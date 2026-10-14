import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {SearchRun} from '../assets/archive-recovery-lab/search.js';
import {resourcePlan} from '../assets/archive-recovery-lab/resources.js';
import {gpuVariant,ArchiveGpu} from '../assets/archive-recovery-lab/gpu.js';
const phase=count=>({kind:'brute',charset:'0123456789',length:5,count:BigInt(count),offset:0n});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
class Actor{
 constructor(url){this.gpu=String(url).includes('gpu-worker');this.dead=false;this.paused=false;Actor.all.push(this);}
 postMessage(data){
  if(data.type==='pause'){this.paused=true;return;}if(data.type==='resume'){this.paused=false;this.work?.();return;}
  if(data.type==='stop'){this.stopping=true;this.paused=false;this.work?.();return;}
  if(data.type==='init'){setTimeout(()=>{if(!this.dead)this.onmessage({data:Actor.failAt===Actor.all.indexOf(this)+1?{type:'error',code:'wasm-init'}:{type:'ready'}});},2);return;}
  if(data.type==='verify'){setTimeout(()=>{if(!this.dead)this.onmessage({data:{type:'verified',files:[],algorithms:['test']}});},1);return;}
  if(data.type==='batch'){
   this.work=()=>{if(this.dead||this.paused)return;this.work=null;
    const candidates=this.stopping?[]:data.candidates;for(const p of candidates)Actor.seen.push(p);
    this.onmessage({data:{type:'done',id:data.id,checked:candidates.length,delta:candidates.length,match:Actor.match&&candidates.includes(Actor.match)?Actor.match:null}});
   };setTimeout(()=>this.work?.(),this.gpu?4:2);
  }
 }
 terminate(){this.dead=true;}
 static all=[];static seen=[];static match=null;static failAt=0;
}
async function simulated(engine,workers,count=1000,hook=()=>{}){
 Actor.all=[];Actor.seen=[];Actor.match=null;Actor.failAt=0;const previous=globalThis.Worker;globalThis.Worker=Actor;
 let finish;const end=new Promise(r=>finish=r),run=new SearchRun(new Blob(['x']),[phase(count)],workers,{progress:s=>{hook(run,s);if(['found','exhausted','stopped','error'].includes(s.state))finish(s);}},'ZIP',{engine,deviceMemory:8});
 run.newWorker=()=>new Actor('cpu');
 try{await run.start();const timeout=setTimeout(()=>{run.dispose();finish({state:'timeout'});},3000);const result=await end;clearTimeout(timeout);return {run,result,seen:Actor.seen.slice(),actors:Actor.all.slice()};}finally{globalThis.Worker=previous;}
}
test('fixed defaults, all 16 integer choices, and engine controls in both languages',()=>{
 for(const prefix of ['','de/']){
  const s=readFileSync(new URL('../'+prefix+'museum/archive-recovery-lab/index.html',import.meta.url),'utf8');
  const choices=s.match(/<select id="workers"[^>]*>(.*?)<\/select>/)[1];
  assert.deepEqual([...choices.matchAll(/value="(\d+)"/g)].map(m=>Number(m[1])),Array.from({length:16},(_,i)=>i+1));
  assert.match(choices,/value="2" selected/);assert.match(s,/id="engine"[\s\S]*?value="cpu" selected/);
  assert.match(s,/value="gpu" disabled/);assert.match(s,/value="hybrid" disabled/);
 }
 const ui=readFileSync(new URL('../assets/archive-recovery-lab/ui.js',import.meta.url),'utf8');assert.match(ui,/\$\('workers'\).value='2'/);assert.doesNotMatch(ui,/Math\.[^(]+\([^;]*hardwareConcurrency/);
});
test('CPU executes every configured worker count without clamping',async()=>{
 for(let count=1;count<=16;count++){
  let peak=0;const x=await simulated('cpu',count,700,(_r,s)=>{peak=Math.max(peak,s.workers);});
  assert.equal(x.result.state,'exhausted');assert.equal(peak,count);assert.equal(x.run.done,700n);assert.equal(x.run.cpuDone,700n);assert.equal(x.run.gpuDone,0n);assert.ok(x.actors.every(a=>a.dead));
 }
});
test('Hybrid and GPU disjoint ranges, out-of-order completions and exact completed accounting',async()=>{
 for(const engine of ['gpu','hybrid']){
  const x=await simulated(engine,4,10007);assert.equal(x.result.state,'exhausted');assert.equal(x.run.done,10007n);
  assert.equal(new Set(x.seen).size,10007);assert.equal(x.seen.length,10007);assert.equal(x.run.cpuDone+x.run.gpuDone,x.run.done);assert.ok(x.run.gpuDone>0n);
  if(engine==='hybrid')assert.ok(x.run.cpuDone>0n);else assert.equal(x.run.cpuDone,0n);
 }
});
test('BigInt allocation remains exact past Number.MAX_SAFE_INTEGER',()=>{
 const p=phase(1);p.count=10n**24n;p.length=24;const r=new SearchRun(new Blob(),[p],2);r.next=2n**60n;
 const a=r.allocate(256n),b=r.allocate(64n);assert.equal(b.start,a.start+256n);assert.notEqual(a.candidates[0],b.candidates[0]);assert.equal(r.done,0n);
});
test('Pause drains GPU once, resume allocates remaining work, Stop releases every actor',async()=>{
 let paused=false,resumed=false;const x=await simulated('hybrid',2,2000,(run,s)=>{
  if(s.state==='running'&&!paused){paused=true;setTimeout(()=>{run.pause();setTimeout(()=>{resumed=true;run.resume();},12);},1);}
 });assert.equal(x.result.state,'exhausted');assert.equal(resumed,true);assert.equal(x.seen.length,2000);assert.equal(new Set(x.seen).size,2000);
 let stopped=false;const y=await simulated('hybrid',16,10000,(run,s)=>{if(s.state==='running'&&!stopped){stopped=true;setTimeout(()=>run.stop(),1);}});
 assert.equal(y.result.state,'stopped');assert.ok(y.actors.every(a=>a.dead));assert.equal(y.run.pending.size,0);assert.equal(y.run.initWaits.size,0);
});
test('CPU match cancels an in-flight GPU range without deadlocking independent verification',async()=>{
 let armed=false;const x=await simulated('hybrid',2,2000,(_r,s)=>{if(s.state==='running'&&!armed){armed=true;Actor.match='00000';}});
 assert.equal(x.result.state,'found');assert.equal(x.run.winner.engine,'cpu');assert.ok(x.actors.every(a=>a.dead));
});
test('memory rejection is explicit and never reduces the selected worker count',async()=>{
 const plan=resourcePlan('7Z',16,688,{deviceMemory:8});assert.equal(plan.allowed,false);assert.equal(plan.workers,16);
 const r=new SearchRun(new Blob(['x']),[phase(10)],16,{},'7Z',{deviceMemory:8});await r.start();assert.equal(r.workerCount,16);assert.equal(r.state,'error');assert.equal(r.workers.length,0);
 assert.equal(resourcePlan('ZIP',16,688,{deviceMemory:8}).allowed,true);
});
test('format-aware capabilities explicitly cover the entire non-ZIP matrix',()=>{
 for(const [format,code] of [['RAR4','gpu-rar4'],['RAR5','gpu-rar5'],['7Z','gpu-7z'],['PDF','gpu-pdf']])assert.equal(gpuVariant({supported:true,format}),code);
 assert.equal(gpuVariant({supported:true,format:'ZIP'}),null);assert.equal(gpuVariant(null),'gpu-file-required');
});
test('WebGPU absence, missing adapter, rejected device and incompatible capabilities are distinct',async()=>{
 await assert.rejects(ArchiveGpu.create({gpu:null}),e=>e.code==='gpu-interface');
 await assert.rejects(ArchiveGpu.create({gpu:{requestAdapter:async()=>null}}),e=>e.code==='gpu-adapter');
 await assert.rejects(ArchiveGpu.create({gpu:{requestAdapter:async()=>({requestDevice:async()=>{throw Error();}})}}),e=>e.code==='gpu-device');
 let destroyed=false;const d={lost:new Promise(()=>{}),limits:{maxComputeInvocationsPerWorkgroup:1},destroy(){destroyed=true;}};
 await assert.rejects(ArchiveGpu.create({gpu:{requestAdapter:async()=>({requestDevice:async()=>d})}}),e=>e.code==='gpu-capabilities');assert.equal(destroyed,true);
});
test('RAR5 narrow GPU parser checks bounds, CRC, check checksum, flags and KDF admission',async()=>{
 const {rar5Parameters}=await import('../assets/archive-recovery-lab/rar5-gpu.js');
 const {createHash}=await import('node:crypto');
 function record({log=15,flags=1}={}){
  const check=Buffer.from('0123456789abcdef','hex'),sum=createHash('sha256').update(check).digest().subarray(0,4);
  const header=Buffer.concat([Buffer.from([4,0,0,flags,log]),Buffer.alloc(16),check,sum]),body=Buffer.concat([Buffer.from([header.length]),header]);
  let crc=0xffffffff;for(const b of body){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const checksum=Buffer.alloc(4);checksum.writeUInt32LE((crc^0xffffffff)>>>0);
  return Buffer.concat([Buffer.from([82,97,114,33,26,7,1,0]),checksum,body,Buffer.alloc(32)]);
 }
 const b=record(),p=await rar5Parameters(new Blob([b]));assert.equal(p.kind,2);assert.equal(p.iterations,32800);assert.equal(p.header.length,16);assert.equal(gpuVariant({supported:true,format:'RAR5',gpuParameters:p}),null);
 for(const options of [{log:17},{flags:0},{flags:3}])assert.equal(await rar5Parameters(new Blob([record(options)])),null);
 for(const index of [8,12,13,18,40]){const bad=Buffer.from(b);bad[index]^=1;assert.equal(await rar5Parameters(new Blob([bad])),null);}
 for(let length=0;length<46;length++)assert.equal(await rar5Parameters(new Blob([b.subarray(0,length)])),null);
});
test('independent RAR5 header fixture is reproducible and native backend verifies exact plaintext',async()=>{
 const {execFileSync}=await import('node:child_process'),{mkdtempSync}=await import('node:fs'),{tmpdir}=await import('node:os');
 const out=mkdtempSync(tmpdir()+'/archive-rar-fixture-');execFileSync('python3',['scripts/archive-gpu-fixtures.py',out]);
 const hostExitCode=process.exitCode;const original=readFileSync(new URL('./fixtures/archive-recovery/rar5-header-gpu-7.rar',import.meta.url));assert.deepEqual(readFileSync(out+'/rar5-header-gpu-7.rar'),original);
 const {createFormatBackend}=await import('../assets/archive-recovery-lab/format-backend.js');const blob=new Blob([original]),backend=await createFormatBackend(blob,'RAR5');
 assert.equal(backend.info.gpuParameters.iterations,32800);assert.equal(await backend.check('wrong'),false);assert.equal(await backend.check('7'),true);
 const fresh=await createFormatBackend(blob,'RAR5');const {files}=await fresh.recover('7');assert.equal(files[0].name,'folder/sample.txt');assert.equal(await files[0].blob.text(),'Independent Python RAR5 AES-256 fixture\n');
 // The unmodified legacy RAR WASM sets Node's exitCode for CLI failures.
 // Restore the host code only after asserting each expected return value.
 process.exitCode=hostExitCode;
});

test('partially initialized configurations fail completely; Reset during startup releases timers',async()=>{
 let armed=false,peak=0;const x=await simulated('cpu',16,1000,(_r,s)=>{peak=Math.max(peak,s.workers);if(s.workers===1&&!armed){armed=true;Actor.failAt=2;}});
 assert.equal(x.result.state,'error');assert.equal(peak,1);assert.equal(x.run.workerCount,16);assert.ok(x.actors.every(a=>a.dead));assert.equal(x.run.initWaits.size,0);
 let stopping=false;const y=await simulated('hybrid',16,1000,(run,s)=>{if(s.workers===1&&!stopping){stopping=true;run.stop();}});
 assert.equal(y.result.state,'stopped');assert.equal(y.run.initWaits.size,0);assert.ok(y.actors.every(a=>a.dead));
});
test('production never presents a software WebGPU adapter as hardware acceleration',async()=>{
 let requestedDevice=false;const adapter={info:{architecture:'swiftshader'},requestDevice(){requestedDevice=true;throw Error();}};
 await assert.rejects(ArchiveGpu.create({gpu:{requestAdapter:async()=>adapter}}),e=>e.code==='gpu-software');assert.equal(requestedDevice,false);
});
