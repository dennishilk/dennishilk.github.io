import { WORKER_SOURCE } from './worker-source.js?v=20261013-lists-1';
import { RangeLedger, candidateAt, createPhases } from './search.js?v=20261013-lists-1';
import { hashHex, hexWords } from './sha256.js';
import { GpuSha256, GpuFailure, gpuFailureDetails } from './gpu.js?v=20261013-lists-1';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class WorkerClient {
  constructor(kind,source=WORKER_SOURCE) {
    this.kind=kind;this.pending=new Map();this.sequence=0;this.closed=false;this.stage='worker-start';this.gpuInterface=null;this.stageHistory=[];this.busy=false;this.activity='idle';
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    try{this.worker=new Worker(url,{name:'password-lab-'+kind});}finally{URL.revokeObjectURL(url);}
    this.worker.onmessage=event=>{const result=event.data;if(typeof result.gpuInterface==='boolean')this.gpuInterface=result.gpuInterface;if(result.progress){if(result.task==='batch')this.activity=result.stage;else{this.stage=result.stage;this.stageHistory.push(result.stage);this.onStage?.(result.stage);}return;}const p=this.pending.get(result.id);if(!p)return;this.pending.delete(result.id);clearTimeout(p.timer);result.ok?p.resolve(result):p.reject(new GpuFailure(result.failure?.code||'worker-failed',result.failure?.stage||this.stage,result.error||'Worker failed',result.failure?.details));};
    this.worker.onerror=event=>{event.preventDefault?.();this.fail(new GpuFailure('worker-unavailable',this.stage,event.message||'Compute worker failed'));};
  }
  rpc(action,data={},timeout=0) {
    if(this.closed)return Promise.reject(new Error('Compute worker is closed'));
    const id=++this.sequence;
    return new Promise((resolve,reject)=>{
      const p={resolve,reject,timer:timeout?setTimeout(()=>{this.pending.delete(id);reject(new GpuFailure('initialization-timeout',this.stage,'Compute initialization timed out at '+this.stage));},timeout):null};
      this.pending.set(id,p);try{this.worker.postMessage({id,action,...data});}catch(error){this.pending.delete(id);clearTimeout(p.timer);reject(error);}
    });
  }
  async initialize(){const result=await this.rpc('initialize',{kind:this.kind},20000);this.info={...result.info,execution:this.kind==='gpu'?'worker':undefined};this.stage='ready';return this;}
  batch(phase,start,count,target){this.busy=true;this.activity='checking';return this.rpc('batch',{phase,start:BigInt(start).toString(),count,target}).catch(error=>{error.engine=this.kind;throw error;}).finally(()=>{this.busy=false;this.activity='idle';});}
  fail(error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
  close(){
    if(this.closed)return;this.closed=true;this.busy=false;this.activity='idle';this.fail(new Error('Compute worker closed'));
    try{this.worker.postMessage({id:++this.sequence,action:'dispose'});}catch{}
    setTimeout(()=>this.worker.terminate(),20);
  }
}
export class MainThreadGpuClient {
  constructor({gpuFactory=options=>GpuSha256.create(options),encoderFactory=()=>new WorkerClient('encoder')}={}){
    this.kind='gpu';this.closed=false;this.stage='preparation-worker';this.stageHistory=[];this.busy=false;this.activity='idle';this.gpuInterface=Boolean(globalThis.navigator?.gpu);this.gpuFactory=gpuFactory;this.encoder=encoderFactory();this.gpu=null;
  }
  async initialize(){
    if(this.closed)throw new GpuFailure('cancelled',this.stage,'GPU initialization was cancelled');
    try{await this.encoder.initialize();}catch(error){throw new GpuFailure('preparation-worker-failed','preparation-worker',error.message);}
    if(this.closed)throw new GpuFailure('cancelled',this.stage,'GPU initialization was cancelled');
    const gpu=await this.gpuFactory({onStage:stage=>{this.stage=stage;this.stageHistory.push(stage);this.onStage?.(stage);}});
    if(this.closed){gpu.dispose();throw new GpuFailure('cancelled',this.stage,'GPU initialization was cancelled');}
    this.gpu=gpu;this.info={...gpu.info,execution:'main'};return this;
  }
  async batch(phase,start,count,target){
    if(this.closed)throw new GpuFailure('cancelled','execution','GPU client is closed');
    const started=performance.now();this.busy=true;this.activity='encoding';let encoded=null,targetWords=null;
    try{
      const prepared=await this.encoder.rpc('encode',{phase,start:BigInt(start).toString(),count});
      encoded=new Uint32Array(prepared.buffer);
      if(prepared.count!==count||encoded.length!==count*16)throw new Error('Incomplete encoded candidate range');
      if(this.closed)throw new GpuFailure('cancelled','execution','GPU client is closed');
      targetWords=hexWords(target);this.activity='dispatch';const result=await this.gpu.compute(encoded,count,targetWords);
      return {count,match:result.match,ms:Math.max(performance.now()-started,0.001)};
    }catch(error){error.engine='gpu';throw error;}finally{this.busy=false;this.activity='idle';encoded?.fill(0);targetWords?.fill(0);}
  }
  close(){if(this.closed)return;this.closed=true;this.busy=false;this.activity='idle';this.encoder.close();this.gpu?.dispose();}
}
export async function selectGpuBackend({preferred='worker',workerFactory=()=>new WorkerClient('gpu'),mainFactory=()=>new MainThreadGpuClient(),mainInterface=Boolean(globalThis.navigator?.gpu),onCreated=()=>{}}={}){
  const diagnostics={main:{interface:mainInterface,stage:'not-tested'},worker:{interface:null,stage:'not-tested'}};
  for(const path of preferred==='main'?['main','worker']:['worker','main']){
    if(path==='main'&&!mainInterface){diagnostics.main={interface:false,code:'interface-unavailable',stage:'interface',message:'WebGPU is unavailable on the main thread'};continue;}
    let engine;
    try{
      engine=path==='worker'?workerFactory():mainFactory();onCreated(engine);await engine.initialize();
      diagnostics[path]={interface:path==='main'?mainInterface:engine.gpuInterface,stage:'ready',steps:[...(engine.stageHistory||[])],description:engine.info.description,software:engine.info.software===true};
      engine.diagnostics=diagnostics;
      return {available:true,path,...engine.info,diagnostics,engine};
    }catch(error){diagnostics[path]={interface:path==='main'?mainInterface:(engine?.gpuInterface??null),steps:[...(engine?.stageHistory||[])],...gpuFailureDetails(error)};engine?.close();}
  }
  const failure=diagnostics.main.interface?diagnostics.main:diagnostics.worker.code?diagnostics.worker:diagnostics.main;
  return {available:false,path:'none',code:failure.code||'initialization-failed',stage:failure.stage,reason:failure.message,diagnostics};
}
export async function probeGPU(options={}) {
  const result=await selectGpuBackend(options);result.engine?.close();const {engine,...capability}=result;return capability;
}
export async function makeEngines(mode,workers=1,{onCreated=()=>{},gpuPath='worker',workerFactory=()=>new WorkerClient('gpu'),mainFactory=()=>new MainThreadGpuClient()}={}) {
  if(!['cpu','gpu','hybrid'].includes(mode))throw new Error('Invalid compute mode');
  const limit=Math.max(1,Math.min(8,(globalThis.navigator?.hardwareConcurrency??9)-1));
  if(!Number.isInteger(workers)||workers<1||workers>limit)throw new Error('Invalid CPU worker count');
  const engines=[],created=[];let cancelled=false;
  const register=engine=>{created.push(engine);onCreated(engine);if(cancelled)engine.close();};
  try {
    if(mode!=='gpu')for(let i=0;i<workers;i++){const w=new WorkerClient('cpu');engines.push(w);register(w);}
    const tasks=engines.map(w=>w.initialize());
    if(mode!=='cpu')tasks.push(selectGpuBackend({preferred:gpuPath,workerFactory,mainFactory,onCreated:register}).then(result=>{if(!result.available)throw Object.assign(new GpuFailure(result.code,result.stage,result.reason,result.diagnostics),{engine:'gpu'});if(cancelled){result.engine.close();throw new Error('Initialization cancelled');}engines.push(result.engine);return result.engine;}));
    await Promise.all(tasks);return engines;
  }catch(error){cancelled=true;created.forEach(w=>w.close());throw error;}
}
export async function verifyCandidate(candidate,target) {
  if(hashHex(candidate)!==target)return false;
  if(!globalThis.crypto?.subtle)throw new Error('Independent Web Crypto verification is unavailable');
  const bytes=new TextEncoder().encode(candidate);
  try{const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));const hex=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');digest.fill(0);return hex===target;}
  finally{bytes.fill(0);}
}
export async function benchmark(engines,phase,target,intensity=70) {
  // Initialization and a separate warm-up are excluded from measured counts.
  await Promise.all(engines.map(e=>e.batch(phase,0n,Math.min(256,Number(phase.count<256n?phase.count:256n)),target)));
  const counts=engines.map(()=>0),started=performance.now();
  await Promise.all(engines.map(async(e,index)=>{
    const batch=e.kind==='gpu'?8192:4096,count=Number(phase.count<BigInt(batch)?phase.count:BigInt(batch));
    for(let round=0;round<3;round++){
      const result=await e.batch(phase,0n,count,target);if(result.count!==count)throw new Error('Incomplete calibration batch');counts[index]+=count;
      await delay(Math.max(0,result.ms*(100-Math.min(100,Math.max(10,intensity)))/Math.min(100,Math.max(10,intensity))));
    }
  }));
  const ms=Math.max(performance.now()-started,0.001),checked=counts.reduce((n,c)=>n+c,0);
  const cpu=engines.reduce((n,e,i)=>n+(e.kind==='cpu'?counts[i]:0),0)*1000/ms;
  const gpu=engines.reduce((n,e,i)=>n+(e.kind==='gpu'?counts[i]:0),0)*1000/ms;
  return {checked,ms,cpu,gpu,combined:checked*1000/ms};
}
export class CrackSession {
  constructor({config,target,engines,intensity=70,onUpdate=()=>{},verify=verifyCandidate,now=()=>performance.now()}) {
    this.ledger=new RangeLedger(createPhases(config));this.target=target;this.engines=engines;this.intensity=Math.min(100,Math.max(10,Number(intensity)));
    this.onUpdate=onUpdate;this.verify=verify;this.now=now;this.state='idle';this.error=null;this.errorInfo=null;this.result=null;this.strategy=null;
    this.stats=engines.map(e=>({kind:e.kind,checked:0n,rate:0,ms:0,batch:e.kind==='gpu'?8192:2048,active:false}));
    this.elapsedMs=0;this.started=null;this.token=0;this.verifying=false;this.events=[];this.rateWindowStarted=0;
    this.done=new Promise(resolve=>{this.resolveDone=resolve;});
  }
  elapsed(){return this.elapsedMs+(this.started===null?0:Math.max(0,this.now()-this.started));}
  snapshot(){
    const elapsed=this.elapsed(),time=this.now();let cpu=0,gpu=0;
    this.events=this.events.filter(event=>event.time>time-1000);
    const windowMs=Math.max(0.001,Math.min(1000,time-this.rateWindowStarted));
    for(const event of this.events){if(event.kind==='cpu')cpu+=event.count*1000/windowMs;else gpu+=event.count*1000/windowMs;}
    if(!['running','pausing','verifying'].includes(this.state)){cpu=0;gpu=0;}
    const cpuDone=this.stats.filter(s=>s.kind==='cpu').reduce((n,s)=>n+s.checked,0n),gpuDone=this.stats.filter(s=>s.kind==='gpu').reduce((n,s)=>n+s.checked,0n);
    return {state:this.state,elapsed,checked:this.ledger.checked,total:this.ledger.total,frontier:this.ledger.frontier,pending:this.ledger.pending.size,
      cpu,gpu,combined:cpu+gpu,cpuDone,gpuDone,cpuAverage:elapsed?Number(cpuDone)*1000/elapsed:0,gpuAverage:elapsed?Number(gpuDone)*1000/elapsed:0,
      average:elapsed?Number(this.ledger.checked)*1000/elapsed:0,strategy:this.strategy,result:this.result,error:this.error,errorInfo:this.errorInfo,gpuPath:this.engines.find(e=>e.kind==='gpu')?.info?.execution||null,cpuActive:this.stats.filter(s=>s.kind==='cpu'&&s.active).length,gpuActive:this.stats.some(s=>s.kind==='gpu'&&s.active),gpuActivity:this.engines.find(e=>e.kind==='gpu')?.activity||'idle',phases:this.ledger.phases,phaseChecked:this.ledger.phaseChecked};
  }
  update(){this.onUpdate(this.snapshot());}
  start(){if(this.state!=='idle')throw new Error('Session already started');this.state='running';this.started=this.now();this.rateWindowStarted=this.started;this.update();this.engines.forEach((_,i)=>this.pump(i));return this.done;}
  async pump(index) {
    const engine=this.engines[index],stat=this.stats[index],token=this.token;
    if(this.state!=='running'||stat.active)return;
    const job=this.ledger.allocate(stat.batch);
    if(!job){stat.rate=0;this.update();this.settle();return;}
    stat.active=true;this.strategy={kind:job.phase.kind,phaseIndex:job.phaseIndex,engine:engine.kind};this.update();
    try {
      const answer=await engine.batch(job.phase,job.start,job.count,this.target);
      if(token!==this.token)return;
      if(!Number.isFinite(answer.ms)||answer.ms<=0||!Number.isInteger(answer.count)||answer.count!==job.count)throw new Error('Invalid compute accounting');
      this.ledger.confirm(job.id,answer.count);stat.checked+=BigInt(answer.count);stat.ms+=answer.ms;this.events.push({kind:engine.kind,count:answer.count,time:this.now()});
      const rest=Math.max(0,answer.ms*(100-this.intensity)/this.intensity);stat.rate=answer.count*1000/(answer.ms+rest);
      stat.batch=Math.max(64,Math.min(engine.kind==='gpu'?32768:8192,Math.round((stat.batch*40/Math.max(answer.ms,1))/64)*64));
      if(answer.match!==null&&answer.match!==undefined) {
        if(!Number.isInteger(answer.match)||answer.match<0||answer.match>=job.count)throw new Error('Invalid candidate match index');
        if(!this.result){this.result={candidate:candidateAt(job.phase,job.start+BigInt(answer.match)),engine:engine.kind,phase:job.phase,index:job.start+BigInt(answer.match)};this.state='verifying';}
      }
      stat.active=false;this.update();this.settle();
      if(this.state==='running'){await delay(rest);if(token===this.token)this.pump(index);}
    } catch(error){stat.active=false;if(token===this.token)this.finish('error',error.message,{...gpuFailureDetails(error),engine:engine.kind});}
  }
  settle(){
    if(this.stats.some(s=>s.active))return;
    if(this.state==='verifying'&&!this.verifying) {
      this.verifying=true;const token=this.token;
      this.verify(this.result.candidate,this.target).then(valid=>{if(token!==this.token)return;if(!valid)this.finish('error','Independent candidate verification failed');else this.finish('success');}).catch(error=>{if(token===this.token)this.finish('error',error.message);});return;
    }
    if(this.state==='pausing'){this.freezeTime();this.state='paused';this.update();}
    else if(this.state==='running'&&this.ledger.exhausted)this.finish('exhausted');
  }
  freezeTime(){if(this.started!==null){this.elapsedMs+=Math.max(0,this.now()-this.started);this.started=null;}}
  pause(){if(this.state==='running'){this.state='pausing';this.update();this.settle();}}
  resume(){if(this.state!=='paused')return;this.state='running';this.started=this.now();this.rateWindowStarted=this.started;this.events=[];this.update();this.engines.forEach((_,i)=>this.pump(i));}
  stop(){if(['idle','running','pausing','paused','verifying'].includes(this.state))this.finish('stopped');}
  finish(state,error=null,details=null){
    if(['success','exhausted','stopped','error'].includes(this.state))return;
    this.freezeTime();this.state=state;this.error=error;this.errorInfo=details?{...gpuFailureDetails(details),engine:details.engine||null}:null;this.token++;this.target=null;this.ledger.pending.clear();
    if(state!=='success')this.result=null;if(state==='stopped'||state==='error')this.strategy=null;
    for(const e of this.engines)e.close();for(const s of this.stats){s.rate=0;s.active=false;}
    this.update();this.resolveDone(this.snapshot());
  }
  clear(){this.stop();if(this.result)this.result.candidate='';this.result=null;this.target=null;}
}
