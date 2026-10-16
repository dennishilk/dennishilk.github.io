// Source-level teaching subset. PC is a listing index, never a machine address.
export const ISAS = ['z','arm'];
const u64=n=>BigInt.asUintN(64,n),s64=n=>BigInt.asIntN(64,n);
const arity={LGHI:2,AGR:2,CGR:2,BRC:2,LG:2,STG:2,MOVZ:2,ADD:3,CMP:2,'B.EQ':1,LDR:2,STR:2};
const allowed={z:['LGHI','AGR','CGR','BRC','LG','STG'],arm:['MOVZ','ADD','CMP','B.EQ','LDR','STR']};
const reg=(n,isa)=>{if(!Number.isInteger(n)||n<0||n>=(isa==='z'?16:31))throw Error('Invalid register');return n;};
const addr=n=>{if(!Number.isInteger(n)||n<0||n>248||n%8)throw Error('Memory address must be aligned in 0…248');return n;};
export class TeachingCPU {
 constructor(isa,program){
  if(!ISAS.includes(isa)||!Array.isArray(program)||!program.length||program.length>256)throw Error('Invalid ISA or program');
  this.isa=isa;this.program=structuredClone(program);
  for(const i of this.program){
   if(!i||!allowed[isa].includes(i.op)||!Array.isArray(i.args)||i.args.length!==arity[i.op]||typeof i.source!=='string')throw Error('Unsupported instruction');
   const a=i.args;
   if(['LGHI','MOVZ'].includes(i.op)){reg(a[0],isa);if(!Number.isInteger(a[1])||a[1]<(isa==='z'?-32768:0)||a[1]>(isa==='z'?32767:65535))throw Error('Invalid immediate');}
   if(['AGR','CGR','CMP'].includes(i.op)){a.forEach(n=>reg(n,isa));}
   if(i.op==='ADD')a.forEach(n=>reg(n,isa));
   if(['LG','STG','LDR','STR'].includes(i.op)){reg(a[0],isa);if(isa==='arm')reg(a[1],isa);else addr(a[1]);}
   if(i.op==='BRC'){if(!Number.isInteger(a[0])||a[0]<0||a[0]>15)throw Error('Invalid branch mask');}
   if(['BRC','B.EQ'].includes(i.op)){const target=a.at(-1);if(!Number.isInteger(target)||target<0||target>=program.length)throw Error('Invalid branch target');}
  }
  this.reset();
 }
 reset(){this.registers=Array(this.isa==='z'?16:31).fill(0n);this.memory=new Uint8Array(256);this.pc=0;this.cc=0;this.flags={N:0,Z:0,C:0,V:0};this.count=0;this.halted=false;this.trace=[];}
 read(address){addr(address);return new DataView(this.memory.buffer).getBigUint64(address,this.isa==='arm');}
 write(address,value){addr(address);new DataView(this.memory.buffer).setBigUint64(address,u64(BigInt(value)),this.isa==='arm');}
 step(){
  if(this.halted)return null;
  if(this.count>=10000)throw Error('Teaching instruction limit reached');
  const pc=this.pc,i=this.program[pc];if(!i)throw Error('Invalid listing PC');
  const a=i.args,r=this.registers;let next=pc+1;
  switch(i.op){
   case 'LGHI':case 'MOVZ':r[a[0]]=u64(BigInt(a[1]));break;
   case 'AGR':{const sum=s64(r[a[0]])+s64(r[a[1]]),v=u64(sum);r[a[0]]=v;this.cc=sum<-(1n<<63n)||sum>(1n<<63n)-1n?3:v===0n?0:s64(v)<0n?1:2;break;}
   case 'ADD':r[a[0]]=u64(r[a[1]]+r[a[2]]);break;
   case 'CGR':this.cc=s64(r[a[0]])===s64(r[a[1]])?0:s64(r[a[0]])<s64(r[a[1]])?1:2;break;
   case 'CMP':{const x=r[a[0]],y=r[a[1]],d=u64(x-y);this.flags={N:Number(d>>63n),Z:Number(d===0n),C:Number(x>=y),V:Number(((x^y)&(x^d)&(1n<<63n))!==0n)};break;}
   case 'BRC':if(a[0]&(8>>this.cc))next=a[1];break;
   case 'B.EQ':if(this.flags.Z)next=a[0];break;
   case 'LG':case 'LDR':r[a[0]]=this.read(this.isa==='arm'?Number(r[a[1]]):a[1]);break;
   case 'STG':case 'STR':this.write(this.isa==='arm'?Number(r[a[1]]):a[1],r[a[0]]);break;
  }
  this.pc=next;this.count++;this.halted=next===this.program.length;
  const event={pc,source:i.source,next,cc:this.cc,flags:{...this.flags}};this.trace.push(event);this.trace=this.trace.slice(-12);return event;
 }
}
const inst=(op,args,source)=>({op,args,source});
export function programFor(isa,kind='add',a=17,b=25){
 if(!ISAS.includes(isa)||!['add','branch'].includes(kind)||![a,b].every(n=>Number.isInteger(n)&&n>=0&&n<=1000))throw Error('Use whole numbers from 0 to 1000');
 if(isa==='z')return [inst('LGHI',[0,a],`LGHI R0,${a}`),inst('LGHI',[1,b],`LGHI R1,${b}`),inst('AGR',[0,1],'AGR R0,R1'),
 ...(kind==='branch'?[inst('LGHI',[2,42],'LGHI R2,42'),inst('CGR',[0,2],'CGR R0,R2'),inst('BRC',[8,7],'BRC 8,equal'),inst('LGHI',[0,0],'LGHI R0,0')]:[]),
 inst('STG',[0,128],`${kind==='branch'?'equal: ':''}STG R0,128`),inst('LG',[3,128],'LG R3,128')];
 return [inst('MOVZ',[0,a],`MOVZ X0,#${a}`),inst('MOVZ',[1,b],`MOVZ X1,#${b}`),inst('ADD',[0,0,1],'ADD X0,X0,X1'),
 ...(kind==='branch'?[inst('MOVZ',[2,42],'MOVZ X2,#42'),inst('CMP',[0,2],'CMP X0,X2'),inst('B.EQ',[7],'B.EQ equal'),inst('MOVZ',[0,0],'MOVZ X0,#0')]:[]),
 inst('STR',[0,4],`${kind==='branch'?'equal: ':''}STR X0,[X4]`),inst('LDR',[3,4],'LDR X3,[X4]')];
}
export function makeCPU(isa,kind,a,b){const c=new TeachingCPU(isa,programFor(isa,kind,a,b));if(isa==='arm')c.registers[4]=128n;return c;}
// X4 is a preinitialized data pointer in these two fixed Arm listings, not an addressing-mode emulator.
export function riskScore({amount,foreign}){
 if(!Number.isInteger(amount)||amount<1||amount>100000||typeof foreign!=='boolean')throw Error('Invalid synthetic transaction');
 const score=Math.min(100,Math.floor(amount/1000)*10+(foreign?25:0));return {score,decision:score>=50?'review':'approve',rule:'min(100, floor(amount / 1000) × 10 + (foreign ? 25 : 0))'};
}
export class ServiceScenario {
 constructor(){this.reset();}
 reset(){this.phase=0;this.request=null;this.response=null;this.history=[];this.input=null;}
 submit(input){riskScore(input);this.reset();this.input={...input};this.history=['queued'];}
 step(){if(!this.input||this.phase===5)return false;this.phase++;if(this.phase===2)this.request={id:'DEMO-001',amount:this.input.amount,currency:'DEMO',foreign:this.input.foreign};if(this.phase===3)this.response={id:'DEMO-001',...riskScore(this.input)};this.history.push(['','validate','request','risk','response','complete'][this.phase]);return true;}
}
export class ControlledRunner {
 constructor(tick,changed,delay=()=>600){this.tick=tick;this.changed=changed;this.delay=delay;this.timer=null;}
 start(){if(this.timer!==null)return;this.timer=setInterval(()=>{try{if(this.tick()===false)this.pause();}catch(e){this.pause();this.changed(e);return;}this.changed();},this.delay());this.changed();}
 pause(){if(this.timer!==null)clearInterval(this.timer);this.timer=null;}
 get running(){return this.timer!==null;}
}
