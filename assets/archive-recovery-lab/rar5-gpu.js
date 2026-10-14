// A deliberately narrow, CRC-bounded RAR5 archive-encryption-record reader.
// It does not parse/extract files or replace the native archive safety checks.
export async function rar5Parameters(blob){
 const b=new Uint8Array(await blob.slice(0,128).arrayBuffer());let at=12,end=b.length;
 const vint=(max=10)=>{let n=0n;for(let i=0;i<max;i++){if(at>=end)throw Error();const x=b[at++];n|=BigInt(x&127)<<BigInt(i*7);if(!(x&128)){if(n>BigInt(Number.MAX_SAFE_INTEGER))throw Error();return Number(n);}}throw Error();};
 try{
  if(![82,97,114,33,26,7,1,0].every((v,i)=>b[i]===v)||b.length<48)return null;
  const size=vint(3);end=at+size;if(size>64||end>b.length)return null;
  let crc=0xffffffff;for(let i=12;i<end;i++){crc^=b[i];for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const dv=new DataView(b.buffer);if(((crc^0xffffffff)>>>0)!==dv.getUint32(8,true))return null;
  if(vint()!==4||vint()!==0||vint()!==0||vint()!==1)return null;
  const log=b[at++];if(log>16||at+28!==end)return null;
  const header=b.slice(at,at+16),check=b.slice(at+16,at+24),sum=b.slice(at+24,at+28);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',check));if(!sum.every((v,i)=>digest[i]===v))return null;
  const c=new DataView(check.buffer);return {kind:2,keyBytes:32,header,expected:c.getUint32(0),expected2:c.getUint32(4),iterations:2**log+32,kdfLog:log};
 }catch{return null;}
}
// Match the native CLI guard and RAR5's 127 UTF-16-unit preparation. Do not
// guess the native treatment of a surrogate split at the truncation boundary.
export function rar5Candidate(password){
 const fail=()=>{throw Object.assign(new Error('gpu-rar5-encoding'),{code:'gpu-rar5-encoding'});};
 const wellFormed=s=>{for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){const d=s.charCodeAt(++i);if(!(d>=0xdc00&&d<=0xdfff))return false;}else if(c>=0xdc00&&c<=0xdfff)return false;}return true;};
 if(typeof password!=='string'||!password||/[\x00-\x1f\x7f]/.test(password)||!wellFormed(password)||new TextEncoder().encode(password).length>256)fail();
 const prepared=password.slice(0,127);if(!wellFormed(prepared))fail();return prepared;
}
