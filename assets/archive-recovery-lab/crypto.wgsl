// Archive Recovery Lab. Original WGSL, MIT (see LICENSE.gpu).
// Input passwords are UTF-8 bytes, not UTF-16 code units. Maximum 256 bytes.
@group(0) @binding(0) var<storage,read> input:array<u32>;
@group(0) @binding(1) var<storage,read> params:array<u32>;
@group(0) @binding(2) var<storage,read_write> output:array<u32>;
fn rol(x:u32,n:u32)->u32{return (x<<n)|(x>>(32u-n));}
fn compress(s:array<u32,5>,b:array<u32,16>)->array<u32,5>{
 var w:array<u32,80>;for(var i=0u;i<16u;i++){w[i]=b[i];}
 for(var i=16u;i<80u;i++){w[i]=rol(w[i-3u]^w[i-8u]^w[i-14u]^w[i-16u],1u);}
 var a=s[0];var c=s[2];var d=s[3];var e=s[4];var bb=s[1];
 for(var i=0u;i<80u;i++){
  var f=bb^c^d;var k=0xca62c1d6u;
  if(i<20u){f=(bb&c)|((~bb)&d);k=0x5a827999u;}
  else if(i<40u){k=0x6ed9eba1u;}
  else if(i<60u){f=(bb&c)|(bb&d)|(c&d);k=0x8f1bbcdcu;}
  let t=rol(a,5u)+f+e+k+w[i];e=d;d=c;c=rol(bb,30u);bb=a;a=t;
 }
 return array<u32,5>(s[0]+a,s[1]+bb,s[2]+c,s[3]+d,s[4]+e);
}
fn initial()->array<u32,5>{return array<u32,5>(0x67452301u,0xefcdab89u,0x98badcfeu,0x10325476u,0xc3d2e1f0u);}
fn keyBlock(base:u32,len:u32)->array<u32,16>{
 var block:array<u32,16>;
 if(len<=64u){for(var i=0u;i<len;i++){block[i/4u]|=input[base+1u+i]<<(24u-(i%4u)*8u);}return block;}
 var s=initial();let blocks=(len+9u+63u)/64u;
 for(var j=0u;j<blocks;j++){
  var b:array<u32,16>;for(var k=0u;k<16u;k++){b[k]=0u;}
  for(var i=0u;i<64u;i++){let p=j*64u+i;var v=0u;if(p<len){v=input[base+1u+p];}else if(p==len){v=128u;}b[i/4u]|=v<<(24u-(i%4u)*8u);}
  if(j+1u==blocks){b[15]=len*8u;}s=compress(s,b);
 }
 for(var i=0u;i<5u;i++){block[i]=s[i];}return block;
}
fn hmac20(inner:array<u32,5>,outer:array<u32,5>,message:array<u32,5>)->array<u32,5>{
 var b:array<u32,16>;for(var i=0u;i<5u;i++){b[i]=message[i];}b[5]=0x80000000u;b[15]=672u;
 let mid=compress(inner,b);for(var i=0u;i<5u;i++){b[i]=mid[i];}return compress(outer,b);
}
fn pbkdf(base:u32,len:u32)->u32{
 let key=keyBlock(base,len);var ib:array<u32,16>;var ob:array<u32,16>;
 for(var i=0u;i<16u;i++){ib[i]=key[i]^0x36363636u;ob[i]=key[i]^0x5c5c5c5cu;}
 let inner=compress(initial(),ib);let outer=compress(initial(),ob);
 let saltLen=params[2];let keyBytes=params[3];let offset=keyBytes*2u;let number=offset/20u+1u;
 var b:array<u32,16>;
 for(var i=0u;i<saltLen;i++){b[i/4u]|=params[8u+i]<<(24u-(i%4u)*8u);}
 // Salt length is 8,12 or16; the big-endian block number follows it.
 b[saltLen/4u]=number;b[(saltLen+4u)/4u]=0x80000000u;b[15]=(64u+saltLen+4u)*8u;
 let mid=compress(inner,b);var oblock:array<u32,16>;for(var i=0u;i<5u;i++){oblock[i]=mid[i];}oblock[5]=0x80000000u;oblock[15]=672u;
 var u=compress(outer,oblock);var t=u;
 for(var iteration=1u;iteration<1000u;iteration++){u=hmac20(inner,outer,u);for(var i=0u;i<5u;i++){t[i]^=u[i];}}
 let pos=offset%20u;let first=(t[pos/4u]>>(24u-(pos%4u)*8u))&255u;let second=(t[(pos+1u)/4u]>>(24u-((pos+1u)%4u)*8u))&255u;
 return first|(second<<8u);
}
fn crc(key:u32,value:u32)->u32{var v=key^value;for(var i=0u;i<8u;i++){v=(v>>1u)^select(0u,0xedb88320u,(v&1u)!=0u);}return v;}
fn update(keys:array<u32,3>,v:u32)->array<u32,3>{let a=crc(keys[0],v);let b=(keys[1]+(a&255u))*134775813u+1u;return array<u32,3>(a,b,crc(keys[2],b>>24u));}
fn legacy(base:u32,len:u32)->u32{
 var keys=array<u32,3>(0x12345678u,0x23456789u,0x34567890u);
 for(var i=0u;i<len;i++){keys=update(keys,input[base+1u+i]);}
 var last=0u;for(var i=0u;i<12u;i++){let t=keys[2]|2u;last=params[8u+i]^(((t*(t^1u))>>8u)&255u);keys=update(keys,last);}return last;
}
// RAR5 password check: PBKDF2-HMAC-SHA-256, 2^k + 32 iterations,
// XOR-folding the resulting 32 bytes into the stored eight-byte check value.
const K256=array<u32,64>(
0x428a2f98u,0x71374491u,0xb5c0fbcfu,0xe9b5dba5u,0x3956c25bu,0x59f111f1u,0x923f82a4u,0xab1c5ed5u,
0xd807aa98u,0x12835b01u,0x243185beu,0x550c7dc3u,0x72be5d74u,0x80deb1feu,0x9bdc06a7u,0xc19bf174u,
0xe49b69c1u,0xefbe4786u,0x0fc19dc6u,0x240ca1ccu,0x2de92c6fu,0x4a7484aau,0x5cb0a9dcu,0x76f988dau,
0x983e5152u,0xa831c66du,0xb00327c8u,0xbf597fc7u,0xc6e00bf3u,0xd5a79147u,0x06ca6351u,0x14292967u,
0x27b70a85u,0x2e1b2138u,0x4d2c6dfcu,0x53380d13u,0x650a7354u,0x766a0abbu,0x81c2c92eu,0x92722c85u,
0xa2bfe8a1u,0xa81a664bu,0xc24b8b70u,0xc76c51a3u,0xd192e819u,0xd6990624u,0xf40e3585u,0x106aa070u,
0x19a4c116u,0x1e376c08u,0x2748774cu,0x34b0bcb5u,0x391c0cb3u,0x4ed8aa4au,0x5b9cca4fu,0x682e6ff3u,
0x748f82eeu,0x78a5636fu,0x84c87814u,0x8cc70208u,0x90befffau,0xa4506cebu,0xbef9a3f7u,0xc67178f2u);
fn rr(x:u32,n:u32)->u32{return (x>>n)|(x<<(32u-n));}
fn init256()->array<u32,8>{return array<u32,8>(0x6a09e667u,0xbb67ae85u,0x3c6ef372u,0xa54ff53au,0x510e527fu,0x9b05688cu,0x1f83d9abu,0x5be0cd19u);}
fn sha256(s:array<u32,8>,block:array<u32,16>)->array<u32,8>{
 var w:array<u32,64>;for(var i=0u;i<16u;i++){w[i]=block[i];}
 for(var i=16u;i<64u;i++){let a=w[i-15u];let b=w[i-2u];w[i]=w[i-16u]+(rr(a,7u)^rr(a,18u)^(a>>3u))+w[i-7u]+(rr(b,17u)^rr(b,19u)^(b>>10u));}
 var a=s[0];var b=s[1];var c=s[2];var d=s[3];var e=s[4];var f=s[5];var g=s[6];var h=s[7];
 for(var i=0u;i<64u;i++){let t=h+(rr(e,6u)^rr(e,11u)^rr(e,25u))+((e&f)^((~e)&g))+K256[i]+w[i];let u=(rr(a,2u)^rr(a,13u)^rr(a,22u))+((a&b)^(a&c)^(b&c));h=g;g=f;f=e;e=d+t;d=c;c=b;b=a;a=t+u;}
 return array<u32,8>(s[0]+a,s[1]+b,s[2]+c,s[3]+d,s[4]+e,s[5]+f,s[6]+g,s[7]+h);
}
fn key256(base:u32,len:u32)->array<u32,16>{
 var key:array<u32,16>;for(var i=0u;i<16u;i++){key[i]=0u;}
 if(len<=64u){for(var i=0u;i<len;i++){key[i/4u]|=input[base+1u+i]<<(24u-(i%4u)*8u);}return key;}
 var s=init256();let blocks=(len+72u)/64u;
 for(var j=0u;j<blocks;j++){var b:array<u32,16>;for(var k=0u;k<16u;k++){b[k]=0u;}
  for(var i=0u;i<64u;i++){let p=j*64u+i;var v=0u;if(p<len){v=input[base+1u+p];}else if(p==len){v=128u;}b[i/4u]|=v<<(24u-(i%4u)*8u);}
  if(j+1u==blocks){b[15]=len*8u;}s=sha256(s,b);
 }for(var i=0u;i<8u;i++){key[i]=s[i];}return key;
}
fn mac256(inner:array<u32,8>,outer:array<u32,8>,message:array<u32,8>)->array<u32,8>{
 var b:array<u32,16>;for(var i=0u;i<16u;i++){b[i]=0u;}for(var i=0u;i<8u;i++){b[i]=message[i];}b[8]=0x80000000u;b[15]=768u;
 let mid=sha256(inner,b);for(var i=0u;i<8u;i++){b[i]=mid[i];}return sha256(outer,b);
}
fn rar5(base:u32,len:u32)->u32{
 let key=key256(base,len);var ib:array<u32,16>;var ob:array<u32,16>;
 for(var i=0u;i<16u;i++){ib[i]=key[i]^0x36363636u;ob[i]=key[i]^0x5c5c5c5cu;}
 let inner=sha256(init256(),ib);let outer=sha256(init256(),ob);
 var b:array<u32,16>;for(var i=0u;i<16u;i++){b[i]=0u;}for(var i=0u;i<16u;i++){b[i/4u]|=params[8u+i]<<(24u-(i%4u)*8u);}b[4]=1u;b[5]=0x80000000u;b[15]=672u;
 let mid=sha256(inner,b);for(var i=0u;i<16u;i++){b[i]=0u;}for(var i=0u;i<8u;i++){b[i]=mid[i];}b[8]=0x80000000u;b[15]=768u;
 var u=sha256(outer,b);var t=u;
 for(var j=1u;j<params[5];j++){u=mac256(inner,outer,u);for(var i=0u;i<8u;i++){t[i]^=u[i];}}
 return select(0u,1u,(t[0]^t[2]^t[4]^t[6])==params[4]&&(t[1]^t[3]^t[5]^t[7])==params[6]);
}
@compute @workgroup_size(32) fn main(@builtin(global_invocation_id) id:vec3<u32>){
 let i=id.x;if(i>=params[0]){return;}let base=i*257u;let len=input[base];
 if(params[1]==2u){output[i]=rar5(base,len);return;}
 var value=0u;if(params[1]==0u){value=legacy(base,len);}else{value=pbkdf(base,len);}
 output[i]=(value<<1u)|select(0u,1u,value==params[4]);
}
