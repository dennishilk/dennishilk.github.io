// Format-specific module worker. No runtime CDN, uploads, storage or logging.
// ZIP uses the original, separately built classic Worker unchanged.
import {createFormatBackend} from './format-backend.js?v=20261014-48-drain1';
let engineFormat=null;
let backend=null,paused=false,stopped=false,wake=null,abort=false;
let checking=false,pauseEpoch=0;
const yieldTask=()=>new Promise(r=>setTimeout(r,0));
self.onmessage=async ({data})=>{
 if(data.type==='pause'){paused=true;pauseEpoch=data.epoch;if(!checking)self.postMessage({type:'paused',epoch:pauseEpoch});return;}
 if(data.type==='resume'){paused=false;wake?.();wake=null;return;}
 if(data.type==='stop'){stopped=true;paused=false;abort=true;wake?.();wake=null;return;}
 try{
  if(data.format)engineFormat=data.format;
  if(data.type==='inspect'){
   backend=await createFormatBackend(data.blob,data.format);
   self.postMessage({type:'inspected',info:backend.info});
   return;
  }
  if(data.type==='init'){
   backend=await createFormatBackend(data.blob,data.format);
   self.postMessage({type:'ready'});
   return;
  }
  if(data.type==='verify'){
   // A newly created module Worker independently reconstructs the engine.
   backend=await createFormatBackend(data.blob,data.format);
   const {files,info}=await backend.recover(data.password);
   if(abort)return;
   self.postMessage({type:'verified',files,algorithms:info.algorithms});
   return;
  }
  if(data.type==='batch'){
   if(!backend)throw new Error('engine not initialized');
   let checked=0,reported=0,match=null;
   for(const candidate of data.candidates){
    while(paused&&!stopped){if(checked>reported){self.postMessage({type:'tick',id:data.id,delta:checked-reported});reported=checked;}self.postMessage({type:'paused',epoch:pauseEpoch});await new Promise(resolve=>{wake=resolve;});}
    if(stopped)break;
    let valid;checking=true;try{valid=await backend.check(candidate);}finally{checking=false;}
    if(abort||stopped)break;
    checked++;
    if(valid){match=candidate;break;}
    if(checked%4===0){self.postMessage({type:'tick',id:data.id,delta:checked-reported});reported=checked;await yieldTask();}
   }
   self.postMessage({type:'done',id:data.id,delta:checked-reported,checked,match});
  }
 }catch(e){
  if(!stopped)self.postMessage({type:'error',code:e.code??'engine-internal',
   diagnostic:{operation:data.type,format:engineFormat,stage:data.type,...(e.diagnostic??{})}});
 }
};
