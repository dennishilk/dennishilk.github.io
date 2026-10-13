import { WORKER_SOURCE } from './worker-source.js';
import { RangeLedger, candidateAt, createPhases } from './search.js';
import { hashHex } from './sha256.js';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class WorkerClient {
  constructor(kind,source=WORKER_SOURCE) {
    this.kind=kind;this.pending=new Map();this.sequence=0;this.closed=false;
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    try{this.worker=new Worker(url,{name:'password-lab-'+kind});}finally{URL.revokeObjectURL(url);}
    this.worker.onmessage=event=>{const result=event.data,p=this.pending.get(result.id);if(!p)return;this.pending.delete(result.id);clearTimeout(p.timer);result.ok?p.resolve(result):p.reject(new Error(result.error||'Worker failed'));};
    this.worker.onerror=event=>{event.preventDefault?.();this.fail(new Error(event.message||'Compute worker failed'));};
  }
  rpc(action,data={},timeout=0) {
    if(this.closed)return Promise.reject(new Error('Compute worker is closed'));
    const id=++this.sequence;
    return new Promise((resolve,reject)=>{
      const p={resolve,reject,timer:timeout?setTimeout(()=>{this.pending.delete(id);reject(new Error('Compute initialization timed out'));},timeout):null};
      this.pending.set(id,p);try{this.worker.postMessage({id,action,...data});}catch(error){this.pending.delete(id);clearTimeout(p.timer);reject(error);}
    });
  }
  async initialize(){const result=await this.rpc('initialize',{kind:this.kind},20000);this.info=result.info;return this;}
  batch(phase,start,count,target){return this.rpc('batch',{phase,start:BigInt(start).toString(),count,target});}
  fail(error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
  close(){
    if(this.closed)return;this.closed=true;this.fail(new Error('Compute worker closed'));
    try{this.worker.postMessage({id:++this.sequence,action:'dispose'});}catch{}
    setTimeout(()=>this.worker.terminate(),20);
  }
}
export async function probeGPU() {
  let worker;
  try {worker=new WorkerClient('gpu');await worker.initialize();return {available:true,...worker.info};}
  catch(error){return {available:false,reason:error.message};}
  finally{worker?.close();}
}
export async function makeEngines(mode,workers=1,{onCreated=()=>{}}={}) {
  if(!['cpu','gpu','hybrid'].includes(mode))throw new Error('Invalid compute mode');
  const limit=Math.max(1,Math.min(8,(globalThis.navigator?.hardwareConcurrency??9)-1));
  if(!Number.isInteger(workers)||workers<1||workers>limit)throw new Error('Invalid CPU worker count');
  const engines=[];
  try {
    if(mode!=='gpu')for(let i=0;i<workers;i++){const w=new WorkerClient('cpu');engines.push(w);onCreated(w);}
    if(mode!=='cpu'){const w=new WorkerClient('gpu');engines.push(w);onCreated(w);}
    await Promise.all(engines.map(w=>w.initialize()));return engines;
  }catch(error){engines.forEach(w=>w.close());throw error;}
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
    this.onUpdate=onUpdate;this.verify=verify;this.now=now;this.state='idle';this.error=null;this.result=null;this.strategy=null;
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
      average:elapsed?Number(this.ledger.checked)*1000/elapsed:0,strategy:this.strategy,result:this.result,error:this.error,phases:this.ledger.phases,phaseChecked:this.ledger.phaseChecked};
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
    } catch(error){stat.active=false;if(token===this.token)this.finish('error',error.message);}
  }
  settle(){
    if(this.stats.some(s=>s.active))return;
    if(this.state==='verifying'&&!this.verifying) {
      this.verifying=true;this.freezeTime();const token=this.token;
      this.verify(this.result.candidate,this.target).then(valid=>{if(token!==this.token)return;if(!valid)this.finish('error','Independent candidate verification failed');else this.finish('success');}).catch(error=>{if(token===this.token)this.finish('error',error.message);});return;
    }
    if(this.state==='pausing'){this.freezeTime();this.state='paused';this.update();}
    else if(this.state==='running'&&this.ledger.exhausted)this.finish('exhausted');
  }
  freezeTime(){if(this.started!==null){this.elapsedMs+=Math.max(0,this.now()-this.started);this.started=null;}}
  pause(){if(this.state==='running'){this.state='pausing';this.update();this.settle();}}
  resume(){if(this.state!=='paused')return;this.state='running';this.started=this.now();this.rateWindowStarted=this.started;this.events=[];this.update();this.engines.forEach((_,i)=>this.pump(i));}
  stop(){if(['idle','running','pausing','paused','verifying'].includes(this.state))this.finish('stopped');}
  finish(state,error=null){
    if(['success','exhausted','stopped','error'].includes(this.state))return;
    this.freezeTime();this.state=state;this.error=error;this.token++;this.target=null;this.ledger.pending.clear();
    if(state!=='success')this.result=null;if(state==='stopped'||state==='error')this.strategy=null;
    for(const e of this.engines)e.close();for(const s of this.stats){s.rate=0;s.active=false;}
    this.update();this.resolveDone(this.snapshot());
  }
  clear(){this.stop();if(this.result)this.result.candidate='';this.result=null;this.target=null;}
}
