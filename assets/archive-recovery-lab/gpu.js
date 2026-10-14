// Original local WebGPU ZIP cryptography. MIT: LICENSE.gpu. No remote services.
export const gpuError=code=>Object.assign(new Error(code),{code});
export function gpuVariant(info){
 if(!info?.supported)return 'gpu-file-required';
 if(info.format==='RAR5'&&info.gpuParameters)return null;
 if(info.format!=='ZIP')return ({RAR4:'gpu-rar4',RAR5:'gpu-rar5','7Z':'gpu-7z',PDF:'gpu-pdf'})[info.format]??'gpu-variant';
 return null;
}
export async function zipParameters(blob,info){
 const e=info.target,a=e.extraFieldAES,saltLength=a?[0,8,12,16][a.strength]:0;
 const bytes=new Uint8Array(await blob.slice(e.dataOffset,e.dataOffset+(a?saltLength+2:12)).arrayBuffer());
 return {kind:a?1:0,keyBytes:a?[0,16,24,32][a.strength]:0,header:bytes.slice(0,a?saltLength:12),expected:a?bytes[saltLength]|bytes[saltLength+1]<<8:e.bitFlag.dataDescriptor?(e.rawLastModDate>>>8)&255:e.signature>>>24};
}
export class ArchiveGpu{
 constructor(device){this.device=device;this.closed=false;this.lost=false;device.lost.then(()=>{if(!this.closed)this.lost=true;});}
 static async create({gpu=globalThis.navigator?.gpu,source,allowSoftware=false,variant='all'}={}){
  if(!gpu)throw gpuError('gpu-interface');let engine,device;
  try{
   let adapter=null,sawSoftware=false;
   for(const options of [{powerPreference:'high-performance'},{},{featureLevel:'compatibility'}]){
    let candidate;try{candidate=await gpu.requestAdapter(options);}catch{continue;}if(!candidate)continue;
    const software=candidate.isFallbackAdapter||/swiftshader|llvmpipe|lavapipe|swrast|software/i.test([candidate.info?.vendor,candidate.info?.architecture,candidate.info?.description].join(' '));
    if(software&&!allowSoftware){sawSoftware=true;continue;}adapter=candidate;break;
   }
   if(!adapter)throw gpuError(sawSoftware?'gpu-software':'gpu-adapter');
   try{device=await adapter.requestDevice();}catch{throw gpuError('gpu-device');}
   engine=new ArchiveGpu(device);
   engine.info={vendor:adapter.info?.vendor??'',architecture:adapter.info?.architecture??'',description:adapter.info?.description??'',fallback:Boolean(adapter.isFallbackAdapter)};
   if(device.limits.maxComputeInvocationsPerWorkgroup<32||device.limits.maxComputeWorkgroupSizeX<32||device.limits.maxComputeWorkgroupsPerDimension<8||device.limits.maxStorageBuffersPerShaderStage<3||device.limits.maxStorageBufferBindingSize<257*4*256)throw gpuError('gpu-capabilities');
   const code=source??await(await fetch(new URL('./crypto.wgsl?v=20261014-48-drain1',import.meta.url))).text();
   try{
    const module=device.createShaderModule({code});const report=await module.getCompilationInfo();
    if(report.messages.some(m=>m.type==='error'))throw gpuError('gpu-shader');
    engine.pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}});
   }catch{throw gpuError('gpu-shader');}
   await engine.selftest(variant);return engine;
  }catch(e){engine?.dispose();if(!engine)device?.destroy();throw e.code?e:gpuError('gpu-init');}
 }
 async selftest(variant='all'){
  // Compare the actual 16-bit PBKDF2 results, not only a boolean match.
  const passwords=['','päss🔐','x'.repeat(65),'y'.repeat(128),'z'.repeat(256)];
  if(variant!=='rar5')for(const keyBytes of [16,24,32]){
   const header=Uint8Array.from({length:keyBytes/2},(_,i)=>i),param={kind:1,keyBytes,header,expected:0};
   const got=await this.compute(passwords,param);
   for(let i=0;i<passwords.length;i++){
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(passwords[i]),'PBKDF2',false,['deriveBits']);
    const bytes=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-1',salt:header,iterations:1000},key,(keyBytes*2+2)*8));
    const expected=bytes.at(-2)|bytes.at(-1)<<8;bytes.fill(0);
    if(got[i]>>>1!==expected)throw gpuError('gpu-selftest');
   }
  }
  // RAR5 KAT uses the precise additional 32 rounds and eight-byte XOR fold.
  const salt=Uint8Array.from({length:16},(_,i)=>i);
  if(variant!=='zip')for(const [password,iterations] of [['päss🔐',64],['x'.repeat(65),64],['z'.repeat(256),65568]]){
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
   const bytes=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256));
   const folded=Uint8Array.from({length:8},(_,i)=>bytes[i]^bytes[i+8]^bytes[i+16]^bytes[i+24]),view=new DataView(folded.buffer);bytes.fill(0);
   const flags=await this.compute([password,'wrong'],{kind:2,keyBytes:32,header:salt,iterations,expected:view.getUint32(0),expected2:view.getUint32(4)});
   if(!(flags[0]&1)||(flags[1]&1))throw gpuError('gpu-selftest');
  }
  // Independently generated ZipCrypto header, including its CRC key schedule.
  if(variant==='rar5')return;
  const header=new Uint8Array([176,146,210,36,219,164,33,53,182,195,93,63]);
  const result=await this.compute(['päss🔐','wrong'],{kind:0,keyBytes:0,header,expected:0x5a});
  if(!(result[0]&1)||(result[1]&1))throw gpuError('gpu-selftest');
 }
 async compute(passwords,param){
  if(this.closed||this.lost)throw gpuError(this.lost?'gpu-lost':'gpu-cancelled');
  if(!passwords.length||passwords.length>256)throw gpuError('gpu-batch');
  const input=new Uint32Array(passwords.length*257),settings=new Uint32Array(32),buffers=[];let mapped=false,scope=false;
  try{
   for(let i=0;i<passwords.length;i++){
    const bytes=new TextEncoder().encode(passwords[i]);if(bytes.length>256)throw gpuError('gpu-password-length');
    input[i*257]=bytes.length;input.set(bytes,i*257+1);bytes.fill(0);
   }
   settings.set([passwords.length,param.kind,param.header.length,param.keyBytes,param.expected]);settings[5]=param.iterations??0;settings[6]=param.expected2??0;settings.set(param.header,8);
   const d=this.device;d.pushErrorScope('validation');scope=true;
   const make=(size,usage)=>{const b=d.createBuffer({size,usage});buffers.push(b);return b;};
   const ib=make(input.byteLength,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),pb=make(settings.byteLength,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),ob=make(passwords.length*4,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC),rb=make(passwords.length*4,GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ);
   d.queue.writeBuffer(ib,0,input);d.queue.writeBuffer(pb,0,settings);
   const group=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[ib,pb,ob].map((buffer,binding)=>({binding,resource:{buffer}}))});
   const encoder=d.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(this.pipeline);pass.setBindGroup(0,group);pass.dispatchWorkgroups(Math.ceil(passwords.length/32));pass.end();encoder.copyBufferToBuffer(ob,0,rb,0,passwords.length*4);d.queue.submit([encoder.finish()]);
   await rb.mapAsync(GPUMapMode.READ);mapped=true;const values=new Uint32Array(rb.getMappedRange()).slice();rb.unmap();mapped=false;
   const error=await d.popErrorScope();scope=false;if(this.lost)throw gpuError('gpu-lost');if(error)throw gpuError('gpu-execution');return values;
  }catch(e){throw this.lost?gpuError('gpu-lost'):e.code?e:gpuError('gpu-execution');}
  finally{input.fill(0);settings.fill(0);if(mapped)buffers.at(-1).unmap();for(const b of buffers)b.destroy();if(scope)try{await this.device.popErrorScope();}catch{}}
 }
 dispose(){if(!this.closed){this.closed=true;this.device.destroy();}}
}
