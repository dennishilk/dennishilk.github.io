import {rar5Candidate} from './rar5-gpu.js?v=20261014-48-drain1';
// Dedicated GPU actor; CPU confirmation runs only for cryptographic filter hits.
import {ArchiveGpu,zipParameters,gpuVariant} from './gpu.js?v=20261014-48-drain1';
import {createFormatBackend} from './format-backend.js?v=20261014-48-drain1';
import {verifier} from './core.js?v=20261014-48-drain1';
let gpu=null,check=null,param=null,stopped=false;
self.onmessage=async({data})=>{
 if(data.type==='stop'){stopped=true;gpu?.dispose();return;}
 try{
  if(data.type==='probe'){
   const validated={},failures={};let info=null;
   for(const [format,variant] of [['ZIP','zip'],['RAR5','rar5']]){
    try{gpu=await ArchiveGpu.create({variant});validated[format]=true;info=gpu.info;gpu.dispose();}
    catch(e){failures[format]=e.code??'gpu-init';}
   }
   if(!Object.keys(validated).length)throw Object.assign(new Error(),{code:failures.ZIP??failures.RAR5});
   self.postMessage({type:'ready',info:{...info,validated,failures}});return;
  }
  if(data.type==='init'){
   const backend=data.format==='ZIP'?await verifier(data.blob):await createFormatBackend(data.blob,data.format);const info=backend.info,unsupported=gpuVariant(info);if(unsupported)throw Object.assign(new Error(unsupported),{code:unsupported});
   gpu=await ArchiveGpu.create({variant:data.format==='RAR5'?'rar5':'zip'});gpu.device.lost.then(()=>{if(!stopped&&!gpu.closed)self.postMessage({type:'error',code:'gpu-lost'});});param=info.gpuParameters??await zipParameters(data.blob,info);check=backend;
   if(!stopped)self.postMessage({type:'ready',info:gpu.info});return;
  }
  if(data.type==='batch'){
   const candidates=param.kind===2?data.candidates.map(rar5Candidate):data.candidates;const flags=await gpu.compute(candidates,param);if(stopped)return;
   let match=null;
   for(let i=0;i<flags.length;i++)if(flags[i]&1){if(await check.check(data.candidates[i])){match=data.candidates[i];break;}if(stopped)return;}
   flags.fill(0);if(!stopped)self.postMessage({type:'done',id:data.id,delta:data.candidates.length,checked:data.candidates.length,match});
  }
 }catch(e){if(!stopped)self.postMessage({type:'error',code:e.code??'gpu-execution'});}
};
