import {WORKER_SOURCE} from './worker-source.js';
import {createPhases,candidateAt,initializeDictionaryVariants,DICTIONARY_COUNTS,BLIND_LIMITS} from '../password-cracking-lab/search.js?v=20261013-bud-1';
export {DICTIONARY_COUNTS,BLIND_LIMITS};
export async function preparePhases(config){
 if(config.german||config.english||config.common)await initializeDictionaryVariants();
 const phases=(config.german||config.english||config.common||config.mode!=='known'&&config.brute)?createPhases({strategy:'blind',german:config.german,english:config.english,common:config.common,brute:config.mode!=='known'&&config.brute}):[];
 if(config.mode==='known'&&config.brute){phases.push(...createPhases({strategy:'brute',min:config.min,max:config.max,lower:config.lower,upper:config.upper,digits:config.digits,symbols:config.symbols}));}
 let offset=0n;for(const p of phases){p.offset=offset;offset+=p.count;}return phases;
}
export class SearchRun{
 constructor(blob,phases,workers,events={}){
  if(!Number.isInteger(workers)||workers<1||workers>4)throw Error('Invalid worker count');
  this.blob=blob;this.phases=phases;this.events=events;this.workers=[];this.pending=new Map();this.done=0n;this.next=0n;this.phaseDone=phases.map(()=>0n);this.total=phases.reduce((a,p)=>a+p.count,0n);this.id=0;this.state='starting';this.workerCount=workers;this.elapsedMs=0;this.activeSince=null;this.winner=null;this.closed=false;
 }
 get elapsed(){return this.elapsedMs+(this.activeSince===null?0:performance.now()-this.activeSince);}
 snapshot(){return {state:this.state,checked:this.done,total:this.total,phaseDone:this.phaseDone.slice(),elapsed:this.elapsed,phaseIndex:this.phases.findIndex(p=>this.next<=p.offset+p.count),workers:this.workers.length};}
 emit(){this.events.progress?.(this.snapshot());}
 async start(){
  this.emit();
  try{await Promise.all(Array.from({length:this.workerCount},()=>new Promise((resolve,reject)=>{
   const w=this.newWorker();this.workers.push(w);
   w.onerror=()=>{reject(new Error('worker'));this.error('worker');};
   w.onmessage=({data})=>{if(data.type==='ready'){resolve();return;}if(data.type==='error'){reject(new Error(data.code));this.error(data.code);return;}this.message(w,data);};w.postMessage({type:'init',blob:this.blob});
  })));
  if(this.closed)return;this.state='running';this.activeSince=performance.now();for(const w of this.workers)this.dispatch(w);this.emit();
  }catch(e){this.error(e.message);}
 }
 allocate(){if(this.next>=this.total)return null;const pi=this.phases.findIndex(p=>this.next<p.offset+p.count),phase=this.phases[pi],start=this.next-phase.offset,count=Number((phase.count-start)<64n?phase.count-start:64n);
  const job={id:++this.id,pi,start,count,confirmed:0,candidates:Array.from({length:count},(_,i)=>candidateAt(phase,start+BigInt(i)))};this.next+=BigInt(count);return job;
 }
 dispatch(w){if(this.state!=='running')return;const job=this.allocate();if(!job){this.maybeFinish();return;}this.pending.set(w,job);w.postMessage({type:'batch',id:job.id,candidates:job.candidates});}
 message(w,data){if(this.closed)return;const job=this.pending.get(w);if(!job||job.id!==data.id)return;
  if(!Number.isInteger(data.delta)||data.delta<0||job.confirmed+data.delta>job.count){this.error('worker');return;}job.confirmed+=data.delta;
  if(data.type==='done'&&data.checked!==job.confirmed){this.error('worker');return;}
  if(data.delta){this.done+=BigInt(data.delta);this.phaseDone[job.pi]+=BigInt(data.delta);}
  if(data.type==='done'){
   this.pending.delete(w);
   if(data.match!==null&&!this.winner){this.winner={password:data.match,phase:job.pi,worker:this.workers.indexOf(w)+1};this.state='draining';this.workers.forEach(worker=>worker.postMessage({type:'stop'}));}
   if(this.state==='running')this.dispatch(w);else this.maybeFinish();
  }this.emit();
 }
 maybeFinish(){
  if(this.pending.size)return;
  if(this.winner){this.finishClock();this.state='verifying';this.terminate();this.emit();this.verify();}
  else if(this.state==='stopping'||(this.state==='running'&&this.next>=this.total)){this.finishClock();this.state=this.state==='stopping'?'stopped':'exhausted';this.terminate();this.closed=true;this.emit();}
 }
 finishClock(){if(this.activeSince!==null){this.elapsedMs+=performance.now()-this.activeSince;this.activeSince=null;}}
 pause(){if(this.state!=='running')return;this.finishClock();this.state='paused';this.workers.forEach(w=>w.postMessage({type:'pause'}));this.emit();}
 resume(){if(this.state!=='paused')return;this.state='running';this.activeSince=performance.now();this.workers.forEach(w=>{w.postMessage({type:'resume'});if(!this.pending.has(w))this.dispatch(w);});this.emit();}
 stop(){if(this.closed)return;if(this.state==='verifying'||this.state==='starting'){this.dispose();this.state='stopped';this.emit();return;}this.finishClock();this.state='stopping';this.workers.forEach(w=>w.postMessage({type:'stop'}));this.maybeFinish();this.emit();}
 newWorker(){const url=URL.createObjectURL(new Blob([WORKER_SOURCE],{type:'text/javascript'}));try{return new Worker(url);}finally{URL.revokeObjectURL(url);}}
 terminate(){this.workers.forEach(w=>w.terminate());this.workers=[];}
 dispose(){this.closed=true;this.finishClock();this.terminate();this.pending.clear();this.blob=null;}
 error(code){if(this.closed)return;this.dispose();this.state='error';this.events.error?.(code);this.emit();}
 verify(){
  const verificationStart=performance.now();
  const w=this.newWorker();this.workers=[w];
  w.onerror=()=>this.error('worker');w.onmessage=({data})=>{
   if(this.closed)return;if(data.type==='error'){this.error('independent');return;}
   if(data.type==='verified'){this.state='found';this.terminate();this.closed=true;this.emit();this.events.result?.({...this.winner,files:data.files,algorithms:data.algorithms,checked:this.done,elapsed:this.elapsed,verificationMs:performance.now()-verificationStart});this.blob=null;}
  };w.postMessage({type:'verify',blob:this.blob,password:this.winner.password});
 }
}
