// Bounded metadata probes ONLY. No password search, extraction or export for these formats.
export class FormatProbeError extends Error {
 constructor(code) { super(code); this.code = code; }
}
const fail = () => { throw new FormatProbeError('malformed'); };
async function read(blob, start, length) {
 if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 ||
  length < 0 || start + length > blob.size || length > 1024 * 1024) fail();
 return new Uint8Array(await blob.slice(start, start + length).arrayBuffer());
}
const view = b => new DataView(b.buffer, b.byteOffset, b.byteLength);
function vint(b, at) {
 let value = 0, factor = 1;
 for (let n = 0; n < 10; n++) {
  if (at >= b.length) fail();
  const digit = b[at++];
  value += (digit & 127) * factor;
  if (!Number.isSafeInteger(value)) fail();
  if (!(digit & 128)) return [value, at];
  factor *= 128;
 }
 fail();
}
const crcTable = Uint32Array.from({length: 256}, (_, i) => {
 for (let n = 0; n < 8; n++) i = (i >>> 1) ^ ((i & 1) ? 0xedb88320 : 0);
 return i >>> 0;
});
export function crc32(data) {
 let c = 0xffffffff;
 for (const byte of data) c = (c >>> 8) ^ crcTable[(c ^ byte) & 255];
 return (c ^ 0xffffffff) >>> 0;
}
async function rar4(blob) {
 if (blob.size < 20) fail();
 const h = await read(blob, 7, 13), v = view(h);
 if (h[2] !== 0x73 || v.getUint16(5, true) < 13 ||
  7 + v.getUint16(5, true) > blob.size) fail();
 const full = await read(blob, 7, v.getUint16(5, true));
 if ((crc32(full.subarray(2)) & 65535) !== v.getUint16(0, true)) fail();
 const flags = v.getUint16(3, true);
 return {format: 'RAR4', supported: false, headerEncrypted: Boolean(flags & 0x80),
  volume: Boolean(flags & 1), detail: 'rar4-main',
  encryptionStatus: flags & 0x80 ? 'headers-encrypted' : 'unknown'};
}
async function rar5(blob) {
 if (blob.size < 16) fail();
 const b = await read(blob, 8, Math.min(4096, blob.size - 8));
 let at = 4, size; [size, at] = vint(b, at);
 const start = at;
 if (size < 2 || size > 1024 * 1024 || 8 + at + size > blob.size) fail();
 let type; [type, at] = vint(b, at);
 let flags; [flags, at] = vint(b, at);
 if (![1, 4].includes(type) || at > start + size || start + size > b.length ||
  crc32(b.subarray(4, start + size)) !== view(b).getUint32(0, true)) fail();
 let volume = false;
 if (type === 1) {
  if (flags & 1) [, at] = vint(b, at);
  if (flags & 2) [, at] = vint(b, at);
  if (at >= start + size) fail();
  let archiveFlags; [archiveFlags, at] = vint(b, at);
  volume = Boolean(archiveFlags & 1);
 }
 return {format: 'RAR5', supported: false, headerEncrypted: type === 4, volume,
  detail: type === 4 ? 'rar5-encryption-block' : 'rar5-main',
  encryptionStatus: type === 4 ? 'headers-encrypted' : 'unknown'};
}
async function sevenZip(blob) {
 if (blob.size < 32) fail();
 const h = await read(blob, 0, 32), v = view(h);
 if (h[6] !== 0 || crc32(h.subarray(12)) !== v.getUint32(8, true)) fail();
 const offset = Number(v.getBigUint64(12, true));
 const size = Number(v.getBigUint64(20, true));
 if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) ||
  !size || size > 1024 * 1024 || 32 + offset + size > blob.size) fail();
 const next = await read(blob, 32 + offset, size);
 if (crc32(next) !== v.getUint32(28, true)) fail();
 // EncodedHeader (0x17) may be compressed without encryption. Never infer AES.
 return {format: '7Z', supported: false, headerEncrypted: null, volume: false,
  detail: next[0] === 0x17 ? '7z-encoded' : '7z-plain',
  encryptionStatus: 'unknown'};
}
async function pdf(blob) {
 if (blob.size < 9) fail();
 const b = await read(blob, 0, 9);
 if (b[5] < 48 || b[5] > 57 || b[6] !== 46 ||
  b[7] < 48 || b[7] > 57) fail();
 return {format: 'PDF', supported: false, headerEncrypted: null, volume: false,
  detail: 'pdf-version', version: String.fromCharCode(b[5], b[6], b[7]),
  encryptionStatus: 'unknown'};
}
export async function probeUnsupportedFormat(blob, format) {
 if (!blob || !Number.isSafeInteger(blob.size) || blob.size > 32 * 1024 ** 2)
  throw new FormatProbeError('limits');
 if (format === 'RAR4') return rar4(blob);
 if (format === 'RAR5') return rar5(blob);
 if (format === '7Z') return sevenZip(blob);
 if (format === 'PDF') return pdf(blob);
 return {format, supported: false, encryptionStatus: 'unknown', detail: 'signature-only'};
}
