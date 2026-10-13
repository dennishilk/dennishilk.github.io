// FIPS 180-4 SHA-256. Each instance owns reusable scratch buffers; consume
// the returned digest before hashing the next candidate with that instance.
export const K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);
export const INITIAL = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
const rotate = (x,n) => (x>>>n)|(x<<(32-n));
export function digestHex(words) { return Array.from(words,x=>x.toString(16).padStart(8,'0')).join(''); }
export function hexWords(hex) {
  if(!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('Invalid SHA-256 digest');
  return Uint32Array.from({length:8},(_,i)=>parseInt(hex.slice(i*8,i*8+8),16));
}
export function equalDigest(a,b) { let diff=0;for(let i=0;i<8;i++) diff|=a[i]^b[i];return diff===0; }
export function encodeAsciiBlock(text,out=new Uint32Array(16),offset=0) {
  if(text.length>55) throw new Error('One-block SHA-256 supports at most 55 ASCII bytes');
  out.fill(0,offset,offset+16);
  for(let i=0;i<text.length;i++) {
    const byte=text.charCodeAt(i);if(byte>127) throw new Error('Candidate must be ASCII');
    out[offset+(i>>>2)]|=byte<<(24-(i&3)*8);
  }
  out[offset+(text.length>>>2)]|=0x80<<(24-(text.length&3)*8);
  out[offset+15]=text.length*8;return out;
}
export function createSha256() {
  const w=new Uint32Array(64),state=new Uint32Array(8),block=new Uint32Array(16);
  function compress(input,offset=0) {
    w.set(input.subarray(offset,offset+16),0);
    for(let i=16;i<64;i++) {
      const x=w[i-15],y=w[i-2];
      w[i]=(w[i-16]+(rotate(x,7)^rotate(x,18)^(x>>>3))+w[i-7]+(rotate(y,17)^rotate(y,19)^(y>>>10)))>>>0;
    }
    let [a,b,c,d,e,f,g,h]=state;
    for(let i=0;i<64;i++) {
      const t1=(h+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0;
      const t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))>>>0;
      h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    state[0]=(state[0]+a)>>>0;state[1]=(state[1]+b)>>>0;state[2]=(state[2]+c)>>>0;state[3]=(state[3]+d)>>>0;
    state[4]=(state[4]+e)>>>0;state[5]=(state[5]+f)>>>0;state[6]=(state[6]+g)>>>0;state[7]=(state[7]+h)>>>0;
    return state;
  }
  return {
    ascii(text) { state.set(INITIAL);encodeAsciiBlock(text,block);return compress(block); },
    hash(input) {
      const bytes=typeof input==='string'?new TextEncoder().encode(input):input;
      if(!(bytes instanceof Uint8Array)) throw new TypeError('Expected UTF-8 text or bytes');
      state.set(INITIAL);
      const padded=new Uint8Array(Math.ceil((bytes.length+9)/64)*64);padded.set(bytes);padded[bytes.length]=0x80;
      const view=new DataView(padded.buffer),bits=BigInt(bytes.length)*8n;
      view.setUint32(padded.length-8,Number(bits>>32n));view.setUint32(padded.length-4,Number(bits&0xffffffffn));
      for(let pos=0;pos<padded.length;pos+=64) {for(let i=0;i<16;i++) block[i]=view.getUint32(pos+i*4);compress(block);}
      padded.fill(0);if(typeof input==='string') bytes.fill(0);return state;
    },
    clear() {w.fill(0);state.fill(0);block.fill(0);}
  };
}
export function hashHex(text) {const sha=createSha256();const hex=digestHex(sha.hash(text));sha.clear();return hex;}
