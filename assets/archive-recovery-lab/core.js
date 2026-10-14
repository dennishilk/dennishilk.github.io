import zip from './zip-api.js';
export const LIMITS=Object.freeze({input:32*1024**2,entry:16*1024**2,total:32*1024**2,entries:256,directory:1024**2,ratio:200,workers:4});
export class RecoveryError extends Error{constructor(code){super(code);this.code=code;}}
const fail=code=>{throw new RecoveryError(code);};
const read=async(blob,start,length)=>{if(!Number.isSafeInteger(start)||start<0||length<0||start+length>blob.size)fail('malformed');return new Uint8Array(await blob.slice(start,start+length).arrayBuffer());};
const view=bytes=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
export function safePath(name){
 const path=String(name).replace(/\\/g,'/');
 if(!path||path.length>1024||path.startsWith('/')||/[\x00-\x1f\x7f:<>"|?*]/.test(path)||path.split('/').some((p,i,a)=>p==='.'||p==='..'||(!p&&i<a.length-1)||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))fail('unsafe-path');
 return path;
}
export async function recognize(blob){
 const b=await read(blob,0,Math.min(16,blob.size));const starts=hex=>hex.every((v,i)=>b[i]===v);
 if(starts([0x50,0x4b,3,4])||starts([0x50,0x4b,5,6]))return 'ZIP';
 if(starts([0x52,0x61,0x72,0x21,0x1a,7,0]))return 'RAR4';
 if(starts([0x52,0x61,0x72,0x21,0x1a,7,1,0]))return 'RAR5';
 if(starts([0x37,0x7a,0xbc,0xaf,0x27,0x1c]))return '7Z';
 if(starts([0x25,0x50,0x44,0x46,0x2d]))return 'PDF';return 'UNKNOWN';
}
// Bound the directory before asking a general-purpose ZIP parser to allocate it.
async function preflight(blob){
 const start=Math.max(0,blob.size-65557),tail=await read(blob,start,blob.size-start),dv=view(tail);let i=tail.length-22;
 for(;i>=0;i--)if(dv.getUint32(i,true)===0x06054b50&&i+22+dv.getUint16(i+20,true)===tail.length)break;
 if(i<0)fail('malformed');if(dv.getUint16(i+4,true)||dv.getUint16(i+6,true))fail('split');
 let count=dv.getUint16(i+10,true),size=dv.getUint32(i+12,true),offset=dv.getUint32(i+16,true);
 if(count===65535||size===0xffffffff||offset===0xffffffff){
  const locator=view(await read(blob,start+i-20,20));if(locator.getUint32(0,true)!==0x07064b50||locator.getUint32(4,true)||locator.getUint32(16,true)!==1)fail('split');
  const pos=Number(locator.getBigUint64(8,true)),z=view(await read(blob,pos,56));
  if(z.getUint32(0,true)!==0x06064b50||z.getUint32(16,true)||z.getUint32(20,true))fail('malformed');
  count=Number(z.getBigUint64(32,true));size=Number(z.getBigUint64(40,true));offset=Number(z.getBigUint64(48,true));
 }
 if(!Number.isSafeInteger(count)||count<1||count>LIMITS.entries||size>LIMITS.directory)fail('limits');
 if(!Number.isSafeInteger(offset)||offset+size>start+i)fail('malformed');
 const cd=view(await read(blob,offset,size));let at=0;
 for(let n=0;n<count;n++){
  if(at+46>size||cd.getUint32(at,true)!==0x02014b50)fail('malformed');
  const flags=cd.getUint16(at+8,true);if(flags&(0x40|0x2000))fail('encryption');
  if(cd.getUint16(at+34,true))fail('split');
  const name=cd.getUint16(at+28,true),extra=cd.getUint16(at+30,true),comment=cd.getUint16(at+32,true);if(name>1024)fail('limits');at+=46+name+extra+comment;
 }if(at!==size)fail('malformed');
}
export async function inspect(blob){
 if(!(blob instanceof Blob)||blob.size>LIMITS.input)fail('limits');
 const format=await recognize(blob);if(format!=='ZIP')return {format,supported:false};
 await preflight(blob);const reader=new zip.ZipReader(new zip.BlobReader(blob));
 try{
  const entries=await reader.getEntries(),names=new Set();let total=0;
  for(const entry of entries){
   entry.safeName=safePath(entry.filename);const key=entry.safeName.replace(/\/$/,'').normalize('NFC').toLowerCase();if(names.has(key))fail('duplicate');names.add(key);
   if(((entry.externalFileAttributes>>>16)&0xf000)===0xa000)fail('symlink');
   if(![0,8].includes(entry.compressionMethod))fail('compression');
   if(!Number.isSafeInteger(entry.uncompressedSize)||!Number.isSafeInteger(entry.compressedSize)||entry.uncompressedSize>LIMITS.entry||entry.uncompressedSize/Math.max(1,entry.compressedSize)>LIMITS.ratio)fail('limits');
   total+=entry.uncompressedSize;if(total>LIMITS.total)fail('limits');
   if(entry.extraFieldAES){const a=entry.extraFieldAES,d=a.data;if(entry.compressedSize<[0,8,12,16][a.strength]+12)fail('malformed');if(![1,2,3].includes(a.strength)||![1,2].includes(a.vendorVersion)||d[2]!==65||d[3]!==69)fail('encryption');}
   const local=view(await read(blob,entry.offset,30));
   if(local.getUint16(6,true)&(0x40|0x2000))fail('encryption');
   if(local.getUint32(0,true)!==0x04034b50||Boolean(local.getUint16(6,true)&1)!==entry.encrypted||local.getUint16(8,true)!==(entry.extraFieldAES?99:entry.compressionMethod))fail('malformed');
   entry.dataOffset=entry.offset+30+local.getUint16(26,true)+local.getUint16(28,true);
   if(entry.dataOffset+entry.compressedSize>blob.size)fail('malformed');
  }
  const plainPaths=new Set(entries.filter(e=>!e.directory).map(e=>e.safeName.normalize('NFC').toLowerCase()));
  for(const e of entries){const parts=e.safeName.normalize('NFC').toLowerCase().split('/');for(let i=1;i<parts.length;i++)if(plainPaths.has(parts.slice(0,i).join('/')))fail('duplicate');}
  const encrypted=entries.filter(e=>e.encrypted&&!e.directory);
  if(!encrypted.length)fail('unencrypted');
  const targets=encrypted.filter(e=>e.extraFieldAES?e.compressedSize>=[0,8,12,16][e.extraFieldAES.strength]+12:e.uncompressedSize>0).sort((a,b)=>a.compressedSize-b.compressedSize);
  if(!targets.length)fail('empty-zipcrypto');
  const algorithms=[...new Set(encrypted.map(e=>e.extraFieldAES?`ZIP-AES-${[0,128,192,256][e.extraFieldAES.strength]} AE-${e.extraFieldAES.vendorVersion}`:'ZipCrypto'))];
  return {format,supported:true,entries,total,target:targets[0],algorithms,encryptedCount:encrypted.length,filenamesEncrypted:false};
 }finally{await reader.close();}
}
const zipPassword=password=>Array.from(new TextEncoder().encode(password),b=>String.fromCharCode(b)).join('');
export async function boundedExtract(entry,password,{collect=false,signal}={}){
 let size=0;const chunks=[];
 const writer=new WritableStream({write(chunk){size+=chunk.length;if(size>LIMITS.entry||size>entry.uncompressedSize)fail('limits');if(collect)chunks.push(chunk.slice());}});
 await entry.getData(writer,{password:entry.zipCrypto?zipPassword(password):password,checkSignature:true,checkOverlappingEntry:true,useWebWorkers:false,useCompressionStream:true,signal});
 if(size!==entry.uncompressedSize)fail('malformed');return collect?new Blob(chunks):null;
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0;});
const crc=(key,b)=>(key>>>8)^crcTable[(key^b)&255];
export function zipCryptoHeader(password,header,check){
 let a=0x12345678,b=0x23456789,c=0x34567890;
 const update=x=>{a=crc(a,x);b=(Math.imul((b+(a&255))>>>0,134775813)+1)>>>0;c=crc(c,b>>>24);};
 for(const x of new TextEncoder().encode(password))update(x);
 let last=0;for(const x of header){const t=(c|2)>>>0;last=x^((Math.imul(t,t^1)>>>8)&255);update(last);}return last===check;
}
export async function verifier(blob,signal){
 const info=await inspect(blob);if(!info.supported)fail('format');const e=info.target,a=e.extraFieldAES;
 const header=await read(blob,e.dataOffset,a?[0,8,12,16][a.strength]+2:12);
 return {info,async check(password){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  let plausible;
  if(a){
   const salt=header.subarray(0,-2),keyBytes=[0,16,24,32][a.strength];
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
   const derived=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-1',salt,iterations:1000},key,(keyBytes*2+2)*8));
   plausible=derived[derived.length-2]===header[header.length-2]&&derived[derived.length-1]===header[header.length-1];derived.fill(0);
  }else plausible=zipCryptoHeader(password,header,e.bitFlag.dataDescriptor?(e.rawLastModDate>>>8)&255:e.signature>>>24);
  if(!plausible)return false;
  try{await boundedExtract(e,password,{signal});return true;}catch(error){if(error.name==='AbortError'||error instanceof RecoveryError)throw error;return false;}
 }};
}
// Fresh parse and complete decrypt: the fast password header never authorizes output.
export async function recover(blob,password,signal){
 const info=await inspect(blob);if(!info.supported)fail('format');const files=[];
 for(const entry of info.entries){if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  if(entry.directory){files.push({name:entry.safeName,directory:true});continue;}
  const data=await boundedExtract(entry,password,{collect:true,signal});files.push({name:entry.safeName,blob:data,directory:false});
 }return {files,info};
}
export async function exportZip(files){
 const writer=new zip.ZipWriter(new zip.BlobWriter('application/zip'),{useWebWorkers:false,useCompressionStream:true});
 for(const f of files)await writer.add(safePath(f.name),f.directory?undefined:new zip.BlobReader(f.blob),{directory:f.directory,level:0});return writer.close();
}
export async function createDemo(password,method='aes256'){
 if(typeof password!=='string'||!password||new TextEncoder().encode(password).length>128)fail('password');
 if(!['zipcrypto','aes128','aes192','aes256'].includes(method))fail('encryption');
 const writer=new zip.ZipWriter(new zip.BlobWriter('application/zip'),{useWebWorkers:false,useCompressionStream:true});
 const options={password:method==='zipcrypto'?zipPassword(password):password,zipCrypto:method==='zipcrypto',encryptionStrength:{aes128:1,aes192:2,aes256:3}[method]??3};
 await writer.add('demo/readme.txt',new zip.TextReader('Archive Recovery Lab\nHarmless local demonstration. Real encryption, real verification.\n'),options);
 await writer.add('demo/empty.txt',new zip.TextReader(''),{...options,level:6});return writer.close();
}
