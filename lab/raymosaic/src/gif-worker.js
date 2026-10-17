// Dependency-free animated GIF89a encoder in a Web Worker.
// Fixed global palette: a 6x6x6 color cube + 40 neutral colors.
let parts=[],settings=null,canceled=false,frames=0;
function bytes(...values){parts.push(Uint8Array.from(values));}
function little(n){return [n&255,(n>>8)&255];}
function ascii(s){return Uint8Array.from(Array.from(s,c=>c.charCodeAt(0)));}
const palette=new Uint8Array(256*3);
for(let r=0;r<6;r++)for(let g=0;g<6;g++)for(let b=0;b<6;b++){const p=(r*36+g*6+b)*3;palette[p]=r*51;palette[p+1]=g*51;palette[p+2]=b*51;}
for(let i=0;i<40;i++){const p=(216+i)*3;palette[p]=palette[p+1]=palette[p+2]=Math.round(i*255/39);}
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function quantize(data,w,h){const idx=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const p=(y*w+x)*4,i=y*w+x;
 // Gentle ordered dithering for a small file and stable animation.
 const d=(bayer[(y&3)*4+(x&3)]-7.5)*.60;
 const r=Math.max(0,Math.min(255,data[p]+d)),g=Math.max(0,Math.min(255,data[p+1]+d)),b=Math.max(0,Math.min(255,data[p+2]+d));
 const lo=Math.min(r,g,b),hi=Math.max(r,g,b);
 if(hi-lo<16){idx[i]=216+Math.round((r+g+b)/3*39/255);}
 else idx[i]=Math.round(r/51)*36+Math.round(g/51)*6+Math.round(b/51);
 }return idx;}
function lzw(indices){const out=[];let bitBuf=0,bitCount=0,codeSize=9,next=258,dict=new Map();
 function emit(code){bitBuf|=code<<bitCount;bitCount+=codeSize;while(bitCount>=8){out.push(bitBuf&255);bitBuf>>>=8;bitCount-=8;}}
 function reset(){dict=new Map();codeSize=9;next=258;}
 emit(256);
 let prefix=indices[0];
 for(let i=1;i<indices.length;i++){
  const c=indices[i],key=prefix*256+c,entry=dict.get(key);
  if(entry!==undefined){prefix=entry;continue;}
  emit(prefix);
  if(next<4096){dict.set(key,next++);if(next>(1<<codeSize)&&codeSize<12)codeSize++;}
  else{emit(256);reset();}
  prefix=c;
 }
 emit(prefix);emit(257);if(bitCount)out.push(bitBuf&255);
 return Uint8Array.from(out);
}
function frame(data){const {width:w,height:h,fps}=settings;
 bytes(0x21,0xF9,0x04,0x08,...little(Math.round(100/fps)),0x00,0x00);
 bytes(0x2C,0,0,0,0,...little(w),...little(h),0x00); // Uses global color table.
 bytes(8);
 const compressed=lzw(quantize(data,w,h));for(let i=0;i<compressed.length;i+=255){const chunk=compressed.subarray(i,i+255);bytes(chunk.length);parts.push(chunk);}
 bytes(0);
}
onmessage=e=>{
 const m=e.data;
 if(m.type==='cancel'){canceled=true;parts=[];return;}
 if(m.type==='init'){canceled=false;frames=0;settings=m;parts=[];
  parts.push(ascii('GIF89a'));bytes(...little(m.width),...little(m.height),0xF7,0x00,0x00);parts.push(palette);
  bytes(0x21,0xFF,0x0B);parts.push(ascii('NETSCAPE2.0'));bytes(3,1,0,0,0);postMessage({type:'ready'});
 }
 if(m.type==='frame'&&!canceled){try{frame(new Uint8ClampedArray(m.buffer));frames++;postMessage({type:'progress',done:frames,total:settings.total});}catch(err){postMessage({type:'error',message:String(err)});}}
 if(m.type==='finish'&&!canceled){bytes(0x3B);const blob=new Blob(parts,{type:'image/gif'});postMessage({type:'complete',blob,frames,size:blob.size});parts=[];}
};