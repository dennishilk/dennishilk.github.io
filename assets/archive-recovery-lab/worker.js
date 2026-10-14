import {verifier,recover} from './core.js';
let engine=null,paused=false,stopped=false,wake=null,abort=null;
const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
self.onmessage=async({data})=>{
 if(data.type==='pause'){paused=true;return;}
 if(data.type==='resume'){paused=false;wake?.();wake=null;return;}
 if(data.type==='stop'){stopped=true;paused=false;wake?.();wake=null;abort?.abort();return;}
 try{
  if(data.type==='init'){abort=new AbortController();engine=await verifier(data.blob,abort.signal);self.postMessage({type:'ready'});return;}
  if(data.type==='verify'){abort=new AbortController();const {files,info}=await recover(data.blob,data.password,abort.signal);self.postMessage({type:'verified',files,algorithms:info.algorithms});return;}
  if(data.type==='batch'){
   let checked=0,reported=0,match=null;
   for(const candidate of data.candidates){
    while(paused&&!stopped)await new Promise(resolve=>{wake=resolve;});if(stopped)break;
    let valid;try{valid=await engine.check(candidate);}catch(e){if(e.name==='AbortError')break;throw e;}
    checked++;if(valid){match=candidate;break;}
    if(checked%16===0){self.postMessage({type:'tick',id:data.id,delta:checked-reported});reported=checked;await yieldTask();}
   }
   self.postMessage({type:'done',id:data.id,delta:checked-reported,checked,match});
  }
 }catch(e){self.postMessage({type:'error',code:e.code??'verification'});}
};
