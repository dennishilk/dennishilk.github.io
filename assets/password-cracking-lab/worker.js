import { createSha256, hashHex, hexWords, equalDigest, encodeAsciiBlock } from './sha256.js';
import { CandidateCursor } from './search.js?v=20261013-bud-1';
import { GpuSha256, gpuFailureDetails } from './gpu.js';
let backend=null,gpu=null;const sha=createSha256();
globalThis.onmessage=async event=>{
  const message=event.data,{id,action}=message;
  try {
    if(action==='initialize') {
      if(backend)throw new Error('Worker already initialized');
      if(!['cpu','gpu','encoder'].includes(message.kind))throw new Error('Unknown compute engine');
      if(hashHex('abc')!=='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')throw new Error('CPU SHA-256 self-test failed');
      backend=message.kind;if(backend==='gpu')gpu=await GpuSha256.create({onStage:stage=>postMessage({id,progress:true,stage,gpuInterface:Boolean(globalThis.navigator?.gpu)})});
      postMessage({id,ok:true,gpuInterface:Boolean(globalThis.navigator?.gpu),info:gpu?.info??{description:backend==='encoder'?'Candidate preparation worker':'JavaScript SHA-256 worker'}});return;
    }
    if(action==='dispose') {gpu?.dispose();sha.clear();backend=null;postMessage({id,ok:true});return;}
    if(action==='encode'&&backend==='encoder'){
      if(!Number.isInteger(message.count)||message.count<1||message.count>65536)throw new Error('Invalid encoding batch');
      const cursor=new CandidateCursor(message.phase,BigInt(message.start)),encoded=new Uint32Array(message.count*16);
      for(let i=0;i<message.count;i++)encodeAsciiBlock(cursor.next(),encoded,i*16);
      postMessage({id,ok:true,count:message.count,buffer:encoded.buffer},[encoded.buffer]);return;
    }
    if(action!=='batch'||!backend)throw new Error('Worker is not initialized');
    const count=message.count;if(!Number.isInteger(count)||count<1||count>65536)throw new Error('Invalid batch size');
    const target=hexWords(message.target),started=performance.now();let match=null;
    try {
      if(backend==='gpu')match=(await gpu.batch(message.phase,BigInt(message.start),count,target,{onStage:stage=>postMessage({id,progress:true,task:'batch',stage})})).match;
      else {const cursor=new CandidateCursor(message.phase,BigInt(message.start));for(let i=0;i<count;i++){if(equalDigest(sha.ascii(cursor.next()),target)&&match===null)match=i;}}
      postMessage({id,ok:true,count,match,ms:Math.max(performance.now()-started,0.001)});
    } finally{target.fill(0);message.target=null;sha.clear();}
  } catch(error){postMessage({id,ok:false,error:error.message||String(error),failure:gpuFailureDetails(error),gpuInterface:Boolean(globalThis.navigator?.gpu)});}
};
