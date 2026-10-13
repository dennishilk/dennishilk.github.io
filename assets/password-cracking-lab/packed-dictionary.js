import {VARIANT_PACKS} from './packed-variants.js?v=20261013-bud-1';
const tables=new Map(),views=new Map();let loading=null;
const decoder=new TextDecoder();
export function packedView(language){
  const descriptor=VARIANT_PACKS[language];if(!descriptor)return null;if(views.has(language))return views.get(language);
  const at=index=>{if(index<0)index+=descriptor.count;if(!Number.isInteger(index)||index<0||index>=descriptor.count)return undefined;
    const table=tables.get(language);if(!table)throw new Error('Dictionary index is still loading');
    return decoder.decode(table.bytes.subarray(table.offsets[index],table.offsets[index+1]));};
  const view=new Proxy(Object.freeze({length:descriptor.count,at,slice:(start=0,end=descriptor.count)=>Array.from({length:Math.max(0,end-start)},(_,i)=>at(start+i)),
    *[Symbol.iterator](){for(let i=0;i<descriptor.count;i++)yield at(i);},every(fn){for(let i=0;i<descriptor.count;i++)if(!fn(at(i),i))return false;return true;},includes(value){for(let i=0;i<descriptor.count;i++)if(at(i)===value)return true;return false;}}),{
    get:(target,key)=>typeof key==='string'&&/^(0|[1-9][0-9]*)$/.test(key)?at(Number(key)):Reflect.get(target,key)
  });views.set(language,view);return view;
}
export function initializeDictionaryVariants(){
  if(loading)return loading;
  loading=(async()=>{
    if(typeof DecompressionStream==='undefined')throw new Error('This browser needs gzip DecompressionStream support for local dictionary indexes');
    for(const [language,descriptor] of Object.entries(VARIANT_PACKS)){
      const raw=atob(descriptor.parts.join('')),compressed=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++){compressed[i]=raw.charCodeAt(i);if((i&262143)===262143)await new Promise(resolve=>setTimeout(resolve,0));}
      const buffer=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();const bytes=new Uint8Array(buffer),header=new DataView(buffer);
      const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',buffer));const checksum=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
      if(checksum!==descriptor.sha256||bytes.length!==descriptor.uncompressedBytes||header.getUint32(0,true)!==descriptor.count)throw new Error('Invalid dictionary index: '+language);
      const offsets=new Uint32Array(descriptor.count+1);let next=4+descriptor.count;
      for(let i=0;i<descriptor.count;i++){
        const length=bytes[4+i];if(length<1||length>20)throw new Error('Invalid indexed base length');offsets[i]=next;next+=length;
        if((i&65535)===65535)await new Promise(resolve=>setTimeout(resolve,0));
      }
      offsets[descriptor.count]=next;if(next!==bytes.length)throw new Error('Dictionary index size mismatch');tables.set(language,{bytes,offsets});
    }
  })();return loading;
}
export function dictionaryIndexStats(){return Object.fromEntries([...tables].map(([language,t])=>[language,{count:t.offsets.length-1,bytes:t.bytes.byteLength+t.offsets.byteLength}]));}
