export const stages=['diagnose','isolate','reboot','power','communications','fences','doors'];
export class Recovery {
 constructor(){this.reset();}
 reset(){this.completed=new Set();this.moduleFound=false;}
 get next(){return stages.find(s=>!this.completed.has(s))||null;}
 get secured(){return this.completed.has('doors');}
 inspectDoor(){this.moduleFound=true;}
 apply(action){
  if(!stages.includes(action))return {ok:false,reason:'unknown'};
  if(this.completed.has(action))return {ok:true,reason:'already',action};
  if(this.next!==action)return {ok:false,reason:'dependency',required:this.next};
  if(action==='doors'&&!this.moduleFound)return {ok:false,reason:'module'};
  this.completed.add(action);return {ok:true,reason:'done',action};
 }
}
