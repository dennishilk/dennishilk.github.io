(function(root){
'use strict';
const S=[99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22];
const R=[1,2,4,8,16,32,64,128,27,54];
const hex=s=>Uint8Array.from((s.match(/../g)||[]).map(x=>parseInt(x,16)));
const hx=a=>Array.from(a,x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
const xt=x=>((x<<1)^(x&128?0x11b:0))&255;
function subBytes(s){return Uint8Array.from(s,x=>S[x]);}
function shiftRows(s){let o=new Uint8Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[r+4*c]=s[r+4*((c+r)%4)];return o;}
function mixColumns(s){let o=new Uint8Array(16);for(let c=0;c<4;c++){let i=4*c,a=s[i],b=s[i+1],d=s[i+2],e=s[i+3];o[i]=xt(a)^(xt(b)^b)^d^e;o[i+1]=a^xt(b)^(xt(d)^d)^e;o[i+2]=a^b^xt(d)^(xt(e)^e);o[i+3]=(xt(a)^a)^b^d^xt(e);}return o;}
function addRoundKey(s,k){return Uint8Array.from(s,(x,i)=>x^k[i]);}
function keyExpansion(k){let w=new Uint8Array(176);w.set(k);for(let i=16;i<176;i+=4){let t=w.slice(i-4,i);if(i%16===0){t=Uint8Array.of(S[t[1]]^R[i/16-1],S[t[2]],S[t[3]],S[t[0]]);}for(let j=0;j<4;j++)w[i+j]=w[i-16+j]^t[j];}return w;}
function encrypt(block,key,trace=false){let e=keyExpansion(key),s=addRoundKey(block,e.slice(0,16)),steps=[{round:0,stage:'ADD ROUND KEY',state:s}];for(let r=1;r<=10;r++){s=subBytes(s);steps.push({round:r,stage:'SUB BYTES',state:s});s=shiftRows(s);steps.push({round:r,stage:'SHIFT ROWS',state:s});if(r<10){s=mixColumns(s);steps.push({round:r,stage:'MIX COLUMNS',state:s});}s=addRoundKey(s,e.slice(r*16,r*16+16));steps.push({round:r,stage:'ADD ROUND KEY',state:s});}return trace?steps:s;}
const api={S,hex,hx,subBytes,shiftRows,mixColumns,addRoundKey,keyExpansion,encrypt}; if(typeof module!=='undefined')module.exports=api;root.AESLab=api;
})(typeof window!=='undefined'?window:globalThis);
