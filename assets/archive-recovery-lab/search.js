import {resourcePlan} from './resources.js?v=20261014-48-drain1';
import {WORKER_SOURCE} from './worker-source.js?v=20261014-48-drain1';
import {createPhases,candidateAt,initializeDictionaryVariants,DICTIONARY_COUNTS,BLIND_LIMITS} from '../password-cracking-lab/search.js?v=20261013-bud-1';
export {DICTIONARY_COUNTS,BLIND_LIMITS};
export async function preparePhases(config){
 if(config.german||config.english||config.common)await initializeDictionaryVariants();
 const phases=(config.german||config.english||config.common||config.mode!=='known'&&config.brute)?createPhases({strategy:'blind',german:config.german,english:config.english,common:config.common,brute:config.mode!=='known'&&config.brute}):[];
 if(config.mode==='known'&&config.brute){phases.push(...createPhases({strategy:'brute',min:config.min,max:config.max,lower:config.lower,upper:config.upper,digits:config.digits,symbols:config.symbols}));}
 let offset=0n;for(const p of phases){p.offset=offset;offset+=p.count;}return phases;
}
export class SearchRun{
 constructor(blob,phases,workers,events={},format='ZIP',options={}){this.format=format;this.engine=options.engine??'cpu';if(!['cpu','gpu','hybrid'].includes(this.engine))throw Error('Invalid engine');
  if(!Number.isInteger(workers)||workers<1||workers>16)throw Error('Invalid worker count');
  this.pauseAcknowledged=new Set();this.pauseEpoch=0;this.pausedDrainAt=null;this.readyWorkers=new Set();this.roles=new Map();this.initWaits=new Map();this.cpuDone=0n;this.gpuDone=0n;this.initMs=0;this.plan=resourcePlan(format,workers,blob.size,{...options,engine:this.engine});
  this.blob=blob;this.phases=phases;this.events=events;this.workers=[];this.pending=new Map();this.done=0n;this.next=0n;this.phaseDone=phases.map(()=>0n);this.total=phases.reduce((a,p)=>a+p.count,0n);this.id=0;this.state='starting';this.workerCount=workers;this.elapsedMs=0;this.activeSince=null;this.winner=null;this.closed=false;
 }
 get pauseDraining(){return this.state==='paused'&&[...this.pending.keys()].some(w=>this.roles.get(w)==='gpu'||!this.pauseAcknowledged.has(w));}
 get elapsed(){return this.elapsedMs+(this.activeSince===null?0:performance.now()-this.activeSince);}
 snapshot(){return {state:this.state,pauseDraining:this.pauseDraining,checked:this.done,total:this.total,phaseDone:this.phaseDone.slice(),elapsed:this.elapsed,phaseIndex:this.phases.findIndex(p=>this.next<=p.offset+p.count),workers:[...this.readyWorkers].filter(w=>this.roles.get(w)==='cpu').length,engine:this.engine,cpuChecked:this.cpuDone,gpuChecked:this.gpuDone,initMs:this.initMs,resourcePlan:this.plan};}
 emit(){this.events.progress?.(this.snapshot());}
 async start(){
  this.emit();
  const started=performance.now();
  try{
   if(this.engine==='hybrid'&&this.total<2n){this.error('gpu-hybrid-space');return;}
   if(!this.plan.allowed){this.error('worker-memory',this.plan);return;}
   // One initialization at a time bounds peak compilation/input-copy pressure.
   const roles=[...Array.from({length:this.engine==='gpu'?0:this.workerCount},()=> 'cpu'),...(this.engine==='cpu'?[]:['gpu'])];
   for(const role of roles){
    if(this.closed)return;
    await this.initialize(role);
   }
   if(this.closed)return;this.initMs=performance.now()-started;this.state='running';this.activeSince=performance.now();
   for(const w of this.workers)this.dispatch(w);this.emit();
  }catch(e){this.error(e.code??e.message);}
 }
 initialize(role){return new Promise((resolve,reject)=>{
  const w=role==='gpu'?new Worker(new URL('./gpu-worker.js?v=20261014-48-drain1',import.meta.url),{type:'module'}):this.newWorker();
  this.workers.push(w);this.roles.set(w,role);
  const timer=setTimeout(()=>{reject(Object.assign(new Error('worker-init-timeout'),{code:role==='gpu'?'gpu-timeout':'worker-init-timeout'}));},45000);
  const end=()=>{clearTimeout(timer);this.initWaits.delete(w);};this.initWaits.set(w,()=>{end();resolve();});
  w.onerror=()=>{end();reject(new Error(role==='gpu'?'gpu-init':'worker'));this.error(role==='gpu'?'gpu-init':'worker');};
  w.onmessage=({data})=>{
   if(this.closed)return;
   if(data.type==='ready'){end();this.readyWorkers.add(w);resolve();this.emit();return;}
   if(data.type==='error'){end();reject(new Error(data.code));this.error(data.code,data.diagnostic);return;}
   this.message(w,data);
  };w.postMessage({type:'init',blob:this.blob,format:this.format});
 });}

 allocate(batchSize=64n){if(this.next>=this.total)return null;const pi=this.phases.findIndex(p=>this.next<p.offset+p.count),phase=this.phases[pi],start=this.next-phase.offset,count=Number((phase.count-start)<batchSize?phase.count-start:batchSize);
  const job={id:++this.id,pi,start,count,confirmed:0,candidates:Array.from({length:count},(_,i)=>candidateAt(phase,start+BigInt(i)))};this.next+=BigInt(count);return job;
 }
 dispatch(w){if(this.state!=='running')return;const maximum=this.roles.get(w)==='gpu'?(this.format==='RAR5'?8n:256n):64n;const idle=Math.max(1,this.workers.filter(x=>!this.pending.has(x)).length);const fair=(this.total-this.next)/BigInt(idle);const batch=fair>0n&&fair<maximum?fair:maximum;const job=this.allocate(batch);if(!job){this.maybeFinish();return;}this.pending.set(w,job);if(this.roles.get(w)==='gpu')job.timer=setTimeout(()=>this.error('gpu-execution-timeout'),30000);try{w.postMessage({type:'batch',id:job.id,candidates:job.candidates});}catch{this.error('worker');}}
 message(w,data){if(this.closed)return;if(data.type==='paused'){if(this.state==='paused'&&data.epoch===this.pauseEpoch){this.pauseAcknowledged.add(w);this.emit();}return;}const job=this.pending.get(w);if(!job||job.id!==data.id)return;
  if(!['tick','done'].includes(data.type)||(data.type==='done'&&data.match!==null&&(typeof data.match!=='string'||!job.candidates.includes(data.match)))){this.error('worker');return;}
  if(!Number.isInteger(data.delta)||data.delta<0||job.confirmed+data.delta>job.count){this.error('worker');return;}job.confirmed+=data.delta;
  if(data.type==='done'&&data.checked!==job.confirmed){this.error('worker');return;}
  if(data.delta&&this.state==='paused'&&this.pausedDrainAt!==null){const now=performance.now();this.elapsedMs+=now-this.pausedDrainAt;this.pausedDrainAt=now;}
  if(data.delta){this.done+=BigInt(data.delta);if(this.roles.get(w)==='gpu')this.gpuDone+=BigInt(data.delta);else this.cpuDone+=BigInt(data.delta);this.phaseDone[job.pi]+=BigInt(data.delta);}
  if(data.type==='done'){
   clearTimeout(job.timer);this.pending.delete(w);
   if(data.match!==null&&!this.winner){this.winner={password:data.match,phase:job.pi,worker:this.roles.get(w)==='gpu'?'GPU':this.workers.filter(x=>this.roles.get(x)==='cpu').indexOf(w)+1,engine:this.roles.get(w)};this.state='draining';for(const worker of this.workers){if(this.roles.get(worker)==='gpu'&&this.pending.has(worker)){clearTimeout(this.pending.get(worker).timer);worker.terminate();this.pending.delete(worker);this.readyWorkers.delete(worker);}else worker.postMessage({type:'stop'});}}
   if(this.state==='running')this.dispatch(w);else this.maybeFinish();
  }this.emit();
 }
 maybeFinish(){
  if(this.pending.size)return;
  if(this.winner){this.finishClock();this.state='verifying';this.terminate();this.emit();this.verify();}
  else if(this.state==='stopping'||(this.state==='running'&&this.next>=this.total)){this.finishClock();this.state=this.state==='stopping'?'stopped':'exhausted';this.terminate();this.closed=true;this.emit();}
 }
 finishClock(){if(this.activeSince!==null){this.elapsedMs+=performance.now()-this.activeSince;this.activeSince=null;}}
 pause(){if(this.state!=='running')return;this.finishClock();this.state='paused';this.pausedDrainAt=performance.now();this.pauseAcknowledged.clear();this.pauseEpoch++;this.workers.forEach(w=>w.postMessage({type:'pause',epoch:this.pauseEpoch}));this.emit();}
 resume(){if(this.state!=='paused')return;if(this.pauseDraining&&this.pausedDrainAt!==null)this.elapsedMs+=performance.now()-this.pausedDrainAt;this.pausedDrainAt=null;this.state='running';this.activeSince=performance.now();this.workers.forEach(w=>{w.postMessage({type:'resume'});if(!this.pending.has(w))this.dispatch(w);});this.emit();}

 stop(){if(this.closed)return;this.dispose();this.state='stopped';this.emit();}

 newWorker(){
  if(this.format!=='ZIP')return new Worker(new URL('./format-worker.js?v=20261014-48-drain1',import.meta.url),{type:'module'});
  const url=URL.createObjectURL(new Blob([WORKER_SOURCE],{type:'text/javascript'}));
  try{return new Worker(url);}finally{URL.revokeObjectURL(url);}
 }
 terminate(){clearTimeout(this.verifyTimer);for(const job of this.pending.values())clearTimeout(job.timer);for(const end of this.initWaits.values())end();this.initWaits.clear();this.workers.forEach(w=>w.terminate());this.workers=[];this.readyWorkers.clear();this.roles.clear();}
 dispose(){this.closed=true;this.finishClock();this.terminate();this.pending.clear();this.blob=null;}
 error(code,diagnostic){if(this.closed)return;this.dispose();this.state='error';this.events.error?.(code,diagnostic);this.emit();}
 verify(){
  const verificationStart=performance.now();
  let w;try{w=this.newWorker();}catch{this.error('worker');return;}this.workers=[w];
  this.verifyTimer=setTimeout(()=>this.error('verification-timeout'),120000);
  w.onerror=()=>this.error('worker');w.onmessage=({data})=>{
   if(this.closed)return;if(data.type==='error'){this.error(data.code??'independent',data.diagnostic);return;}
   if(data.type==='verified'){this.state='found';this.terminate();this.closed=true;this.emit();this.events.result?.({...this.winner,files:data.files,algorithms:data.algorithms,checked:this.done,elapsed:this.elapsed,verificationMs:performance.now()-verificationStart,initMs:this.initMs,cpuChecked:this.cpuDone,gpuChecked:this.gpuDone});this.blob=null;}
  };try{w.postMessage({type:'verify',blob:this.blob,password:this.winner.password,format:this.format});}catch{this.error('worker');}
 }
}
