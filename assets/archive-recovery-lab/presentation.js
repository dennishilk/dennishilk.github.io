// Presentation only: completed checks, never allocations, decide completion.
export function phaseStatus(count,checked,{active=false,state='ready',matched=false}={}){
 if(checked>=count)return 'complete';
 if(matched)return 'matched';
 if(active&&state==='paused')return 'paused';
 if(active&&['running','draining'].includes(state))return 'active';
 if(checked>0n)return 'partial';
 return 'pending';
}
export function phaseGroup(phase){return phase.kind!=='dictionary'?'brute':phase.yearMin!==undefined?'years':phase.suffixDigits?'numbers':'words';}
export function groupStatus(rows){
 if(rows.every(row=>row.status==='complete'))return 'complete';
 for(const status of ['active','paused','matched','partial'])if(rows.some(row=>row.status===status))return status;
 return 'pending';
}
export function phaseView(phases,checked,pending=[],state='ready',winner=null){
 const active=new Set(pending);
 return phases.map((phase,index)=>({phase,index,checked:checked[index]??0n,status:phaseStatus(phase.count,checked[index]??0n,{active:active.has(index),state,matched:state==='found'&&winner===index}),group:phaseGroup(phase)}));
}
