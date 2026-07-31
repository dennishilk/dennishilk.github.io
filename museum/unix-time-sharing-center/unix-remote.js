import { createBbsBridge, HANDSHAKE_AUDIO } from '../bbs-system/bbs.js';
export const CONNECTION_TIMING=Object.freeze({handshakeFallbackMs:12000,postConnectPauseMs:650});
export const REMOTE_TARGETS=Object.freeze([Object.freeze({name:'midnight-relay',aliases:Object.freeze(['research-net']),number:'5550194',displayNumber:'555-0194',device:'/dev/cu1',speed:9600,format:'8N1',service:'The Midnight Relay BBS'})]);
export const REMOTE_TARGET=REMOTE_TARGETS[0];
export const SUPPORTED_SPEEDS=Object.freeze([300,1200,2400,9600,14400]);
export function targetByName(name){return REMOTE_TARGETS.find(target=>target.name===name||target.aliases.includes(name))||null}
export function targetByNumber(number){return REMOTE_TARGETS.find(target=>target.number===number)||null}
export function parseDialCommand(name,args){
 if(name==='tip'){const target=targetByName(args[0]);if(args.length!==1||!target)return {error:`tip: unknown host ${args[0]||''}`};return {target,program:'tip',speed:target.speed}}
 let device=REMOTE_TARGET.device,speed=REMOTE_TARGET.speed,number;
 for(let i=0;i<args.length;i++){if(args[i]==='-l')device=args[++i];else if(args[i]==='-s')speed=Number(args[++i]);else if(args[i].startsWith('-'))return {error:`cu: unsupported option ${args[i]}`};else if(number)return {error:'cu: unsupported arguments'};else number=args[i]}
 if(device!==REMOTE_TARGET.device)return {error:`cu: ${device||''}: No such device`};if(!SUPPORTED_SPEEDS.includes(speed))return {error:`cu: unsupported speed ${speed}`};
 const target=targetByNumber(number);return target?{target,program:'cu',speed}:{error:'NO CARRIER'};
}
export function createHandshakeAudio(view=window,{fallbackMs=CONNECTION_TIMING.handshakeFallbackMs}={}){
 let audio=null,timer=null,settle=null,startedAt=0;
 const clear=()=>{if(timer!==null)(view.clearTimeout||clearTimeout)(timer),timer=null};
 const finish=()=>{clear();settle?.();settle=null};
 const fallback=()=>{const elapsed=Math.max(0,(view.performance?.now?.()??Date.now())-startedAt);clear();timer=(view.setTimeout||setTimeout)(finish,Math.max(0,fallbackMs-elapsed))};
 return {
  start(){
   startedAt=view.performance?.now?.()??Date.now();
   return new Promise(resolve=>{settle=resolve;try{audio=new view.Audio(HANDSHAKE_AUDIO);audio.volume=.22;audio.addEventListener?.('ended',finish,{once:true});audio.addEventListener?.('error',fallback,{once:true});const playback=audio.play();if(playback?.catch)playback.catch(fallback);else if(!audio.addEventListener)fallback()}catch{fallback()}});
  },
  stop(){clear();settle?.();settle=null;if(audio){audio.pause();audio.removeAttribute?.('src');audio=null}}
 };
}
export {createBbsBridge};
