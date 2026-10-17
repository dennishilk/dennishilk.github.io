// Pure, deterministic scene planning: never discard user text or substitute a texture for light.
export const MAX_MESSAGE_GRAPHEMES=400;
const graphemes=s=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(s)].map(x=>x.segment):Array.from(s);
export function messageLength(text){return graphemes(String(text)).length;}
export function buildMessageScenes(text,capacity=12){
 if(typeof text!=='string'||messageLength(text)>MAX_MESSAGE_GRAPHEMES)throw Error('Message exceeds the supported length');
 if(!Number.isInteger(capacity)||capacity<6||capacity>18)throw Error('Invalid optical character capacity');
 if(!text.trim())return [];
 const out=[];
 for(const line of text.replace(/\r\n?/g,'\n').split('\n')){
  if(!line.trim())continue;
  const words=line.match(/\S+/gu)||[];
  let current='';
  const push=()=>{if(current){out.push(current);current='';}};
  for(const word of words){
   if(messageLength(word)>capacity){
    push();const parts=graphemes(word);
    for(let i=0;i<parts.length;i+=capacity)out.push(parts.slice(i,i+capacity).join(''));
    continue;
   }
   if(current&&messageLength(current+' '+word)>capacity)push();
   current=current?current+' '+word:word;
   // Prefer a new scene after a complete sentence, if possible.
   if(/[.!?…]$/u.test(word))push();
  }
  push();
 }
 return out;
}
export function opticalCapacity(mirrorCount){return mirrorCount===666?15:mirrorCount===1024?16:13;}
export function sceneDuration(count){return count<=1?0:Math.max(2.4,Math.min(3.25,40/Math.max(1,count)));}
export function exportSequencePlan(sceneCount,requestedSeconds=3,quality='compact'){
 if(!Number.isInteger(sceneCount)||sceneCount<1||sceneCount>120)throw Error('Invalid message scene count');
 if(sceneCount===1){const fps=quality==='compact'?10:quality==='high'?15:12;return {seconds:requestedSeconds,fps,total:Math.round(requestedSeconds*fps),segmentSeconds:requestedSeconds,adjusted:false};}
 const fps=quality==='compact'?8:quality==='high'?12:10;
 const segmentSeconds=Math.max(1.9,Math.min(2.6,38/sceneCount));
 const seconds=Math.ceil(sceneCount*segmentSeconds*10)/10;
 const total=Math.round(seconds*fps);
 if(total>420)throw Error('Too many frames. Shorten the message or export at Messaging quality.');
 return {seconds,fps,total,segmentSeconds,adjusted:seconds>requestedSeconds};
}
export function sequenceFrame(index,total,sceneCount){
 if(sceneCount<=1)return {index:0,from:0,to:0,alpha:1,hold:true};
 const t=(index/Math.max(1,total))*sceneCount,sceneIndex=Math.min(sceneCount-1,Math.floor(t)),fraction=t-sceneIndex;
 // Each scene enters over 24%, then stays fully readable for 76%.
 const alpha=Math.min(1,fraction/.24);
 return {index:sceneIndex,from:sceneIndex===0?0:sceneIndex-1,to:sceneIndex,alpha,hold:alpha>=1};
}
