import test from 'node:test';
import assert from 'node:assert/strict';
import {crc32,probeUnsupportedFormat,FormatProbeError} from '../assets/archive-recovery-lab/format-probe.js';

// These are intentionally synthetic HEADER fixtures, not genuine encrypted
// RAR/7Z/PDF recovery fixtures. These tests do NOT claim decryption support.
const MARK_R4=[0x52,0x61,0x72,0x21,0x1a,7,0];
const MARK_R5=[0x52,0x61,0x72,0x21,0x1a,7,1,0];
function rar4(flags=0) {
 const h=new Uint8Array(20);h.set(MARK_R4);
 h[9]=0x73;const v=new DataView(h.buffer);
 v.setUint16(10,flags,true);v.setUint16(12,13,true);
 v.setUint16(7,crc32(h.subarray(9,20))&0xffff,true);
 return new Blob([h]);
}
function rar5(type=1,flags=0) {
 const h=new Uint8Array(16);h.set(MARK_R5);
 h[12]=3;h[13]=type;h[14]=0;h[15]=flags;
 const v=new DataView(h.buffer);
 v.setUint32(8,crc32(h.subarray(12)),true);
 return new Blob([h]);
}
function sevenZip(marker=0x17) {
 const h=new Uint8Array(33);h.set([0x37,0x7a,0xbc,0xaf,0x27,0x1c,0,4]);
 const v=new DataView(h.buffer);
 v.setBigUint64(12,0n,true);v.setBigUint64(20,1n,true);
 h[32]=marker;v.setUint32(28,crc32(h.subarray(32)),true);
 v.setUint32(8,crc32(h.subarray(12,32)),true);
 return new Blob([h]);
}
test('checksum implementation agrees with standard CRC-32 vector',()=>{
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
});
test('RAR4 reads actual main header flags but never claims recovery',async()=>{
 const p=await probeUnsupportedFormat(rar4(0x81),'RAR4');
 assert.equal(p.supported,false);assert.equal(p.encryptionStatus,'headers-encrypted');
 assert.equal(p.headerEncrypted,true);assert.equal(p.volume,true);
 assert.equal((await probeUnsupportedFormat(rar4(0),'RAR4')).encryptionStatus,'unknown');
});
test('RAR5 differentiates encryption header and ordinary main header',async()=>{
 const encrypted=await probeUnsupportedFormat(rar5(4),'RAR5');
 assert.equal(encrypted.headerEncrypted,true);assert.equal(encrypted.supported,false);
 const main=await probeUnsupportedFormat(rar5(1,1),'RAR5');
 assert.equal(main.headerEncrypted,false);assert.equal(main.volume,true);
 assert.equal(main.encryptionStatus,'unknown');
});
test('7Z CRCs and encoded header do NOT imply AES',async()=>{
 const encoded=await probeUnsupportedFormat(sevenZip(),'7Z');
 assert.equal(encoded.detail,'7z-encoded');assert.equal(encoded.encryptionStatus,'unknown');
 assert.equal(encoded.supported,false);
 assert.equal((await probeUnsupportedFormat(sevenZip(1),'7Z')).detail,'7z-plain');
});
test('PDF version is detected without claiming encryption',async()=>{
 const pdf=new Blob(['%PDF-1.7\n']);
 const p=await probeUnsupportedFormat(pdf,'PDF');
 assert.equal(p.version,'1.7');assert.equal(p.encryptionStatus,'unknown');
 assert.equal(p.supported,false);
});
test('corrupted RAR4 CRC and RAR5 CRC are rejected',async()=>{
 for(const [format,blob] of [['RAR4',rar4(0x80)],['RAR5',rar5(4)]]){
  const b=new Uint8Array(await blob.arrayBuffer());b[format==='RAR4'?7:8]^=0x55;
  await assert.rejects(probeUnsupportedFormat(new Blob([b]),format),FormatProbeError);
 }
});
test('corrupted 7Z start CRC, next CRC, and offsets are rejected',async()=>{
 const original=new Uint8Array(await sevenZip().arrayBuffer());
 for(const at of [8,12,28,32]){const bytes=original.slice();bytes[at]^=0x70;
  await assert.rejects(probeUnsupportedFormat(new Blob([bytes]),'7Z'),FormatProbeError);}
});
test('truncation and malformed PDF version are rejected',async()=>{
 await assert.rejects(probeUnsupportedFormat(new Blob(['%PDF-1.x\n']),'PDF'),FormatProbeError);
 for(const format of ['RAR4','RAR5','7Z','PDF']){
  await assert.rejects(probeUnsupportedFormat(new Blob(['xx']),format),FormatProbeError);
 }
});
test('input cap and unknown signatures do not enable unsupported recovery',async()=>{
 await assert.rejects(probeUnsupportedFormat({size:33*1024*1024},'RAR4'),e=>e.code==='limits');
 const unknown=await probeUnsupportedFormat(new Blob(['anything']),'UNKNOWN');
 assert.equal(unknown.supported,false);assert.equal(unknown.detail,'signature-only');
});
