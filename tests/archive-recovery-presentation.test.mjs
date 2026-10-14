import test from 'node:test';import assert from 'node:assert/strict';
import {phaseStatus,phaseGroup,phaseView,groupStatus} from '../assets/archive-recovery-lab/presentation.js';
test('phase completion requires confirmed checks, never allocated ranges or a recovered password',()=>{
 assert.equal(phaseStatus(100n,0n,{active:true,state:'running'}),'active');assert.equal(phaseStatus(100n,20n,{active:true,state:'paused'}),'paused');assert.equal(phaseStatus(100n,20n,{state:'stopped'}),'partial');assert.equal(phaseStatus(100n,20n,{state:'found',matched:true}),'matched');assert.equal(phaseStatus(100n,0n,{state:'found'}),'pending');assert.equal(phaseStatus(100n,100n,{state:'exhausted'}),'complete');
});
test('simultaneous worker phases remain active and completed groups require every real phase to finish',()=>{
 const phases=[{kind:'dictionary',language:'common',suffixDigits:0,count:10n},{kind:'dictionary',language:'de',suffixDigits:0,count:20n},{kind:'dictionary',language:'common',yearMin:1984,count:30n},{kind:'brute',length:1,count:10n}];
 const running=phaseView(phases,[5n,1n,0n,0n],[0,1],'running');assert.deepEqual(running.map(r=>r.status),['active','active','pending','pending']);assert.equal(groupStatus(running.filter(r=>r.group==='words')),'active');
 const found=phaseView(phases,[10n,4n,0n,0n],[],'found',1);assert.deepEqual(found.map(r=>r.status),['complete','matched','pending','pending']);assert.equal(groupStatus(found.filter(r=>r.group==='words')),'matched');
 const exhausted=phaseView(phases,[10n,20n,30n,10n],[],'exhausted');assert.ok(exhausted.every(r=>r.status==='complete'));assert.equal(groupStatus(exhausted),'complete');assert.equal(phaseGroup({kind:'dictionary',suffixDigits:2}),'numbers');
});
