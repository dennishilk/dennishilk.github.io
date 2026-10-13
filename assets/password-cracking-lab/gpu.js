import { SHADER_SOURCE } from './shader-source.js';
import { encodeAsciiBlock, hexWords, digestHex, hashHex } from './sha256.js';
import { CandidateCursor } from './search.js';
export class GpuSha256 {
  constructor(device,info) {this.device=device;this.info=info;this.lost=null;this.closed=false;device.lost.then(reason=>{if(!this.closed)this.lost=reason.message||'WebGPU device lost';});}
  static async create({allowSoftware=false}={}) {
    if(!globalThis.navigator?.gpu)throw new Error('WebGPU is unavailable in this browser or worker');
    const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
    if(!adapter)throw new Error('No WebGPU adapter is available');
    const info=adapter.info??(adapter.requestAdapterInfo?await adapter.requestAdapterInfo():{});
    const name=[info.vendor,info.architecture,info.device,info.description].filter(Boolean).join(' ');
    const software=Boolean(adapter.isFallbackAdapter||info.isFallbackAdapter||/swiftshader|llvmpipe|software|lavapipe/i.test(name));
    if(software&&!allowSoftware)throw new Error('Only a software WebGPU adapter is available; physical GPU mode is disabled');
    const device=await adapter.requestDevice();const engine=new GpuSha256(device,{description:name||'WebGPU adapter',software});
    try {
      const shader=device.createShaderModule({code:SHADER_SOURCE});
      if(shader.getCompilationInfo){const report=await shader.getCompilationInfo();const errors=report.messages.filter(m=>m.type==='error');if(errors.length)throw new Error('WGSL compilation: '+errors.map(m=>m.message).join('; '));}
      engine.pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module:shader,entryPoint:'main'}});
      const vectors=['','abc','a'.repeat(55)],encoded=new Uint32Array(vectors.length*16);
      vectors.forEach((v,i)=>encodeAsciiBlock(v,encoded,i*16));
      const answer=await engine.compute(encoded,vectors.length,hexWords(hashHex('abc')),true);
      if(answer.match!==1||vectors.some((v,i)=>digestHex(answer.digests.subarray(i*8,i*8+8))!==hashHex(v)))throw new Error('WebGPU SHA-256 self-test failed');
      encoded.fill(0);answer.digests.fill(0);return engine;
    } catch(error){engine.dispose();throw error;}
  }
  async compute(encoded,count,target,emit=false) {
    if(this.closed||this.lost)throw new Error(this.lost||'WebGPU device is closed');
    if(!Number.isInteger(count)||count<1||count>65536||encoded.length!==count*16)throw new Error('Invalid GPU batch');
    const d=this.device,outputBytes=4+(emit?count*32:0),buffers=[];let mapped=false;
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
      const validation=await d.popErrorScope();if(validation)throw new Error(validation.message);
      if(this.lost)throw new Error(this.lost);return {match:match===0xffffffff?null:match,digests};
    } catch(error){try{await d.popErrorScope();}catch{}throw error;}
    finally {if(mapped)buffers.at(-1).unmap();for(const buffer of buffers)buffer.destroy();}
  }
  async batch(phase,start,count,target) {
    const cursor=new CandidateCursor(phase,start),encoded=new Uint32Array(count*16);
    try {for(let i=0;i<count;i++)encodeAsciiBlock(cursor.next(),encoded,i*16);return await this.compute(encoded,count,target);}
    finally{encoded.fill(0);}
  }
  dispose(){if(!this.closed){this.closed=true;this.device.destroy();}}
}
