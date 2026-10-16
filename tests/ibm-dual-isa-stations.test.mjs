import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
test('Mission 10.1 leaves the complete teaching computation model byte-for-byte unchanged',()=>{
 assert.equal(createHash('sha256').update(read('assets/ibm-dual-isa/model.mjs')).digest('hex'),'cc701fb4986b6ba9496ec5357dee2a7d2e3f5ffbd5e6bbfb037fc1180ab31d52');
});
for(const lang of ['en','de'])test(lang+': progressively enhanced station shell, pagination and visible limitations are reproducible',()=>{
 const path=(lang==='de'?'de/':'')+'museum/ibm-dual-isa/index.html',html=read(path);
 assert.equal((html.match(/class="station" data-station/g)||[]).length,4);
 assert.equal((html.match(/class="station-footer"/g)||[]).length,4);
 assert.equal((html.match(/class="station-next"/g)||[]).length,3);
 for(const id of ['architecture','instructions','services','comparison']){
  assert.ok(html.includes(`id="tab-${id}" href="#${id}"`));
  assert.ok(html.includes(`id="${id}" class="station" data-station`));
  assert.ok(html.includes(`id="heading-${id}" tabindex="-1"`));
 }
 assert.doesNotMatch(html,/<section[^>]+data-station[^>]*hidden|role="tab"/);
 assert.match(html,/class="lab-boundary"/);assert.match(html,/class="sources-details"/);
 assert.equal((html.match(/data-core="/g)||[]).length,11);
 execFileSync(process.execPath,['scripts/build-ibm-dual-isa.mjs'],{cwd:root});assert.equal(read(path),html);
});
test('station presentation owns no computation state, timers or context recreation',()=>{
 const s=read('assets/ibm-dual-isa/stations.mjs');
 assert.doesNotMatch(s,/TeachingCPU|ServiceScenario|makeCPU|setInterval|setTimeout|requestAnimationFrame|innerHTML|replaceChildren/);
 for(const token of ['aria-controls','aria-labelledby','aria-selected','ArrowRight','ArrowLeft','Home','End','popstate','hashchange','pushState','preventScroll','onLeave(active)'])assert.ok(s.includes(token),token);
 assert.match(read('assets/ibm-dual-isa/ui.mjs'),/onLeave\(\)\{runner.pause\(\);serviceRunner.pause\(\)/);
});
