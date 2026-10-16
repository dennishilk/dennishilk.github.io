import {steps,stations} from './content.mjs';
export const intervalLimits = Object.freeze({min:8000,max:30000,default:18000});
export function createState(){return {station:'basics',step:0,playing:false,started:false,interval:intervalLimits.default};}
export function transition(state,action){
 const next={...state};
 switch(action.type){
  case 'station': if(stations.some(s=>s[0]===action.id)){next.station=action.id;if(action.id!=='sequence')next.playing=false;}break;
  case 'start': next.station='sequence';next.step=0;next.started=true;next.playing=true;break;
  case 'restart': next.step=0;next.started=true;next.playing=false;break;
  case 'pause': next.playing=false;break;
  case 'resume': next.started=true;next.playing=next.step<steps.length-1;break;
  case 'next': case 'tick':
   if(action.type==='tick'&&!state.playing)break;
   next.step=Math.min(steps.length-1,state.step+1);next.started=true;
   if(action.type==='next'||next.step===steps.length-1)next.playing=false;break;
  case 'previous': next.step=Math.max(0,state.step-1);next.started=true;next.playing=false;break;
  case 'seek': if(Number.isInteger(action.index)&&action.index>=0&&action.index<steps.length){next.step=action.index;next.started=true;next.playing=false;}break;
  case 'pace': {const value=Number(action.value);if(Number.isFinite(value))next.interval=Math.max(intervalLimits.min,Math.min(intervalLimits.max,value));break;}
 }
 return next;
}
