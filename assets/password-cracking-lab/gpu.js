import { SHADER_SOURCE } from './shader-source.js?v=20261013-bud-1';
import { encodeAsciiBlock, hexWords, digestHex, hashHex } from './sha256.js';
import { CandidateCursor } from './search.js?v=20261013-bud-1';
export class GpuFailure extends Error {
  constructor(code,stage,message,details=null){super(message);this.name='GpuFailure';this.code=code;this.stage=stage;this.details=details;}
}
export function gpuFailureDetails(error){return {code:error.code||'initialization-failed',stage:error.stage||'initialization',message:error.message||String(error),details:error.details||null};}
export function classifyAdapter(adapter,info={}){
  const description=[info.description,info.vendor,info.architecture,info.device].filter(Boolean).join(' · ');
  const software=adapter.isFallbackAdapter===true||info.isFallbackAdapter===true||/swiftshader|llvmpipe|lavapipe|software\s+(?:adapter|rasterizer|renderer)/i.test(description);
  return {description:description||'WebGPU adapter',software};
}
export class GpuSha256 {
  constructor(device,info) {this.device=device;this.info=info;this.lost=null;this.closed=false;device.lost.then(reason=>{if(!this.closed)this.lost=reason.message||'WebGPU device lost';});}
  static async create({allowSoftware=false,onStage=()=>{},timeoutMs=15000,shaderSource=SHADER_SOURCE}={}) {
    let stage='interface',engine=null,expired=false,timer;
    const advance=value=>{stage=value;onStage(value);};
    const work=(async()=>{
      try{
        advance('interface');if(!globalThis.navigator?.gpu)throw new GpuFailure('interface-unavailable',stage,'WebGPU interface is unavailable in this execution context');
        advance('adapter');let adapter=null,selectedInfo=null,softwareInfo=null;const attempts=[];
        for(const [label,options] of [['high-performance',{powerPreference:'high-performance'}],['default',{}],['compatibility',{featureLevel:'compatibility'}]]){
          let candidate;try{candidate=await navigator.gpu.requestAdapter(options);}catch(error){attempts.push({preference:label,error:error.message});continue;}
          if(expired)throw new GpuFailure('initialization-timeout',stage,'GPU initialization timed out');
          if(!candidate){attempts.push({preference:label,adapter:false});continue;}
          let info={};try{info=candidate.info??(candidate.requestAdapterInfo?await candidate.requestAdapterInfo():{});}catch{info={};}
          const classified=classifyAdapter(candidate,info);attempts.push({preference:label,...classified});
          if(classified.software&&!allowSoftware){softwareInfo=classified;continue;}
          adapter=candidate;selectedInfo={...classified,preference:label,featureLevel:options.featureLevel||'core',attempts};break;
        }
        if(!adapter){if(softwareInfo)throw new GpuFailure('software-adapter',stage,'Only a software WebGPU adapter was detected',attempts);throw new GpuFailure(attempts.some(a=>a.error)?'adapter-request-failed':'adapter-unavailable',stage,'Chrome did not provide a usable WebGPU adapter',attempts);}
        advance('device');let device;try{device=await adapter.requestDevice();}catch(error){throw new GpuFailure('device-creation-failed',stage,error.message);}
        if(expired){device.destroy();throw new GpuFailure('initialization-timeout',stage,'GPU initialization timed out');}
        engine=new GpuSha256(device,selectedInfo);
        advance('shader');let shader;
        try{shader=device.createShaderModule({code:shaderSource});if(shader.getCompilationInfo){const report=await shader.getCompilationInfo(),errors=report.messages.filter(m=>m.type==='error');if(errors.length)throw new Error(errors.map(m=>'line '+m.lineNum+': '+m.message).join('; '));}}
        catch(error){throw new GpuFailure('shader-compilation-failed',stage,error.message);}
        advance('pipeline');try{engine.pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module:shader,entryPoint:'main'}});}catch(error){throw new GpuFailure('pipeline-creation-failed',stage,error.message);}
        advance('selftest');const vectors=['','abc','a'.repeat(55)],encoded=new Uint32Array(vectors.length*16);let answer;
        try{
          vectors.forEach((v,i)=>encodeAsciiBlock(v,encoded,i*16));answer=await engine.compute(encoded,vectors.length,hexWords(hashHex('abc')),true);
          if(answer.match!==1||vectors.some((v,i)=>digestHex(answer.digests.subarray(i*8,i*8+8))!==hashHex(v)))throw new GpuFailure('selftest-failed',stage,'GPU SHA-256 self-test disagreed with CPU test vectors');
        }catch(error){if(error.code==='selftest-failed'||error.code==='device-lost')throw error;throw new GpuFailure('selftest-failed',stage,error.message);}
        finally{encoded.fill(0);answer?.digests?.fill(0);}
        if(expired){engine.dispose();throw new GpuFailure('initialization-timeout',stage,'GPU initialization timed out');}
        advance('ready');return engine;
      }catch(error){engine?.dispose();if(error.code)throw error;throw new GpuFailure('initialization-failed',stage,error.message||String(error));}
    })();
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;engine?.dispose();reject(new GpuFailure('initialization-timeout',stage,'GPU initialization timed out at '+stage));},timeoutMs);});
    work.then(result=>{if(expired)result.dispose();},()=>{});
    try{return await Promise.race([work,timeout]);}finally{clearTimeout(timer);}
  }
  async compute(encoded,count,target,emit=false) {
    if(this.closed||this.lost)throw new GpuFailure(this.lost?'device-lost':'cancelled','execution',this.lost||'WebGPU device is closed');
    if(!Number.isInteger(count)||count<1||count>65536||encoded.length!==count*16)throw new Error('Invalid GPU batch');
    const d=this.device,outputBytes=4+(emit?count*32:0),buffers=[];let mapped=false,scopeOpen=true;
    d.pushErrorScope('validation');
    try {
      const input=d.createBuffer({size:encoded.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});buffers.push(input);
      const params=d.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});buffers.push(params);
      const output=d.createBuffer({size:Math.max(8,outputBytes),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC});buffers.push(output);
      const readback=d.createBuffer({size:Math.max(8,outputBytes),usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});buffers.push(readback);
      const settings=new Uint32Array(12);settings.set(target);settings[8]=count;settings[9]=emit?1:0;
      d.queue.writeBuffer(input,0,encoded);d.queue.writeBuffer(params,0,settings);d.queue.writeBuffer(output,0,new Uint32Array([0xffffffff]));settings.fill(0);
      const bindings=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:input}},{binding:1,resource:{buffer:params}},{binding:2,resource:{buffer:output}}]});
      const encoder=d.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(this.pipeline);pass.setBindGroup(0,bindings);pass.dispatchWorkgroups(Math.ceil(count/64));pass.end();
      encoder.copyBufferToBuffer(output,0,readback,0,Math.max(8,outputBytes));d.queue.submit([encoder.finish()]);
      await readback.mapAsync(GPUMapMode.READ);mapped=true;const words=new Uint32Array(readback.getMappedRange()),match=words[0];
      const digests=emit?words.slice(1,1+count*8):null;readback.unmap();mapped=false;
      const validation=await d.popErrorScope();scopeOpen=false;if(validation)throw new GpuFailure('execution-failed','execution',validation.message);
      if(this.lost)throw new GpuFailure('device-lost','execution',this.lost);return {match:match===0xffffffff?null:match,digests};
    } catch(error){if(scopeOpen)try{await d.popErrorScope();}catch{}if(this.lost)throw new GpuFailure('device-lost','execution',this.lost);if(error.code)throw error;throw new GpuFailure('execution-failed','execution',error.message||String(error));}
    finally {if(mapped)buffers.at(-1).unmap();for(const buffer of buffers)buffer.destroy();}
  }
  async batch(phase,start,count,target,{onStage=()=>{}}={}) {
    const cursor=new CandidateCursor(phase,start),encoded=new Uint32Array(count*16);
    try {onStage('encoding');for(let i=0;i<count;i++)encodeAsciiBlock(cursor.next(),encoded,i*16);onStage('dispatch');return await this.compute(encoded,count,target);}
    finally{encoded.fill(0);}
  }
  dispose(){if(!this.closed){this.closed=true;this.device.destroy();}}
}
