// Exactly three selectable, physically simulated arrays. All IDs index one active facet.
import {createArray} from './optics.mjs';
export const MIRROR_COUNTS=Object.freeze([448,666,1337]);
export function createMirrorArray(count=448){
 if(count===448)return createArray(28,16);
 if(count===666)return createArray(37,18);
 if(count!==1337)throw Error('Unsupported mirror count');
 // A balanced 51×27 surface with eight triangular-ish empty corner edges
 // (10 sites on both ends of the first and last row). 1377 - 40 = 1337.
 // Empty positions are NEVER assigned IDs, normals, or forward rays.
 return createArray(51,27).filter((m)=>{
  const x=m.id%51,z=Math.floor(m.id/51);
  return !((z===0||z===26)&&(x<10||x>=41));
 }).map((m,id)=>({...m,id}));
}
export const mirrorModeLabel=(count,lang='en')=>{
 if(count===448)return lang==='de'?'448 Spiegel · Classic':'448 mirrors · Classic';
 if(count===666)return lang==='de'?'666 Spiegel · DOOM of Love ❤️':'666 mirrors · DOOM of Love ❤️';
 if(count===1337)return lang==='de'?'1337 Spiegel · OVERDRIVE 🚀':'1337 mirrors · OVERDRIVE 🚀';
 throw Error('Unsupported mirror count');
};
