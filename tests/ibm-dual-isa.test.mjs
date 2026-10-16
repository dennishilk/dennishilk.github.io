import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {TeachingCPU,makeCPU,programFor,riskScore,ServiceScenario,ControlledRunner} from '../assets/ibm-dual-isa/model.mjs';
const finish=c=>{while(!c.halted)c.step();return c;},inst=(op,args)=>({op,args,source:op});
for(const isa of ['z','arm']){
 test(isa+': arithmetic, store/load, PC, end-of-listing halt, reset and deterministic replay',()=>{
  const c=makeCPU(isa,'add',17,25);assert.equal(c.pc,0);assert.equal(c.step().pc,0);assert.equal(c.pc,1);assert.equal(c.registers[0],17n);finish(c);assert.equal(c.pc,5);assert.equal(c.count,5);assert.equal(c.read(128),42n);assert.equal(c.registers[3],42n);assert.equal(c.step(),null);assert.equal(c.count,5);
  const bytes=[...c.memory.slice(128,136)];assert.deepEqual(bytes,isa==='z'?[0,0,0,0,0,0,0,42]:[42,0,0,0,0,0,0,0]);assert.deepEqual(finish(makeCPU(isa,'add',17,25)).memory,c.memory);
  c.reset();assert.equal(c.pc,0);assert.equal(c.count,0);assert.equal(c.halted,false);assert.equal(c.read(128),0n);assert.ok(c.registers.every(n=>n===0n));
 });
 test(isa+': branch taken, not taken and explicit PC path',()=>{
  const yes=makeCPU(isa,'branch',17,25);for(let i=0;i<6;i++)yes.step();assert.equal(yes.pc,7);finish(yes);assert.equal(yes.count,8);assert.equal(yes.read(128),42n);
  const no=makeCPU(isa,'branch',1,25);for(let i=0;i<6;i++)no.step();assert.equal(no.pc,6);finish(no);assert.equal(no.read(128),0n);assert.equal(no.count,9);
 });
 test(isa+': invalid input, addresses and unsupported instruction forms fail',()=>{
  for(const n of [-1,1.5,1001,NaN,Infinity])assert.throws(()=>programFor(isa,'add',n,1));
  assert.throws(()=>new TeachingCPU(isa,[inst('FAKE',[])]));assert.throws(()=>new TeachingCPU(isa,[inst(isa==='z'?'LGHI':'MOVZ',[99,1])]));
  const c=makeCPU(isa,'add',1,2);for(const n of [-8,1,256,NaN]){assert.throws(()=>c.read(n));assert.throws(()=>c.write(n,1));}
  assert.throws(()=>new TeachingCPU(isa,[inst(isa==='z'?'BRC':'B.EQ',isa==='z'?[8,99]:[99])]));
 });
}
test('equivalent teaching programs agree across inputs and exercises',()=>{for(const kind of ['add','branch'])for(const [a,b]of [[0,0],[17,25],[1000,1000],[1,41],[40,1]])assert.equal(finish(makeCPU('z',kind,a,b)).read(128),finish(makeCPU('arm',kind,a,b)).read(128));});
test('IBM AGR wraps 64-bit arithmetic and sets signed overflow CC=3',()=>{const c=new TeachingCPU('z',[inst('AGR',[0,1])]);c.registers[0]=(1n<<63n)-1n;c.registers[1]=1n;c.step();assert.equal(c.registers[0],1n<<63n);assert.equal(c.cc,3);});
test('IBM signed comparisons and all four CC masks branch correctly',()=>{for(const [x,y,cc]of [[0n,0n,0],[-1n,0n,1],[1n,0n,2]]){const c=new TeachingCPU('z',[inst('CGR',[0,1]),inst('BRC',[8>>cc,0])]);c.registers[0]=BigInt.asUintN(64,x);c.registers[1]=y;c.step();assert.equal(c.cc,cc);c.step();assert.equal(c.pc,0);}const c=new TeachingCPU('z',[inst('BRC',[1,0])]);c.cc=3;c.step();assert.equal(c.pc,0);});
test('Arm ADD wraps without setting flags; CMP has subtraction NZCV semantics',()=>{
 const c=new TeachingCPU('arm',[inst('ADD',[2,0,1])]);c.registers[0]=(1n<<64n)-1n;c.registers[1]=1n;const f={...c.flags};c.step();assert.equal(c.registers[2],0n);assert.deepEqual(c.flags,f);
 for(const [a,b,expected]of [[0n,0n,{N:0,Z:1,C:1,V:0}],[0n,1n,{N:1,Z:0,C:0,V:0}],[1n<<63n,1n,{N:0,Z:0,C:1,V:1}]]){const c=new TeachingCPU('arm',[inst('CMP',[0,1])]);c.registers[0]=a;c.registers[1]=b;c.step();assert.deepEqual(c.flags,expected);}
});
test('Arm memory uses the value of a base register, not a fixed diagram address',()=>{const c=new TeachingCPU('arm',[inst('STR',[0,4]),inst('LDR',[3,4])]);c.registers[0]=123n;c.registers[4]=64n;finish(c);assert.equal(c.read(64),123n);assert.equal(c.registers[3],123n);assert.equal(c.read(128),0n);});
test('synthetic risk rule has deterministic threshold and rejects malformed input',()=>{assert.equal(riskScore({amount:2400,foreign:false}).score,20);assert.equal(riskScore({amount:2400,foreign:true}).score,45);assert.equal(riskScore({amount:5000,foreign:false}).decision,'review');assert.equal(riskScore({amount:100000,foreign:true}).score,100);for(const input of [{amount:0,foreign:false},{amount:1.5,foreign:false},{amount:NaN,foreign:false},{amount:1,foreign:'yes'}])assert.throws(()=>riskScore(input));});
test('service request/response ordering, immutable input copy and reset',()=>{const s=new ServiceScenario();assert.equal(s.step(),false);const input={amount:2400,foreign:false};s.submit(input);input.amount=99999;s.step();assert.equal(s.request,null);s.step();assert.equal(s.request.amount,2400);assert.equal(s.response,null);s.step();assert.equal(s.response.score,20);s.step();s.step();assert.equal(s.phase,5);assert.equal(s.step(),false);assert.deepEqual(s.history,['queued','validate','request','risk','response','complete']);s.reset();assert.equal(s.request,null);assert.equal(s.response,null);assert.equal(s.input,null);});
test('runner cannot create duplicate intervals and pause cancels future work',async()=>{let n=0;const r=new ControlledRunner(()=>{n++;return n<3;},()=>{},()=>5);r.start();const id=r.timer;r.start();assert.equal(r.timer,id);await new Promise(res=>setTimeout(res,35));assert.equal(n,3);assert.equal(r.running,false);r.start();r.pause();const paused=n;await new Promise(res=>setTimeout(res,15));assert.equal(n,paused);});
test('safety limit stops an infinite teaching loop',()=>{const c=new TeachingCPU('z',[inst('BRC',[15,0])]);for(let i=0;i<10000;i++)c.step();assert.throws(()=>c.step(),/limit/);});
test('both static shells expose eleven selectable same-type cores and honest model boundaries',()=>{for(const lang of ['en','de']){const s=readFileSync(new URL('../'+(lang==='de'?'de/':'')+'museum/ibm-dual-isa/index.html',import.meta.url),'utf8');assert.equal((s.match(/data-core="/g)||[]).length,11);for(const i of ['step','run','pause','reset','service-step','service-run','service-pause','service-reset'])assert.ok(s.includes('id="'+i+'"'));assert.ok(s.includes('hreflang="en"'));assert.ok(s.includes('hreflang="de"'));assert.ok(s.includes('IBM Z + Arm'));assert.doesNotMatch(s,/\d+\s*(?:ms|watts|W\/transaction)/);}});
