import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalog } from '../assets/linux-hardware-explorer/catalog.js';
import { parseHardwareReport, identifyDevices, parseIdentifier, deviceSources, publicSummary, matchReason } from '../assets/linux-hardware-explorer/core.js';
const excerpt = (id='7590', subsystem='148c:2437', driver='amdgpu') => `55:00.0 VGA compatible controller [0300]: AMD Navi 44 [Radeon RX 9060 XT] [1002:${id}] (rev c0)\n${subsystem ? ` Subsystem: Board [${subsystem}]\n` : ''}${driver ? ` Kernel driver in use: ${driver}\n` : ''} Kernel modules: amdgpu`;
const identify = report => identifyDevices(parseHardwareReport(report), catalog)[0];
const profile = id => catalog.profiles.find(p => p.id === id);
for (const subsystem of ['148c:2437', '', 'ffff:0001']) test(`Navi44 chip family remains evidenced with subsystem '${subsystem}' but no board identity`, () => {
  const r=identify(excerpt('7590',subsystem)); assert.equal(r.coverage,'curated-family'); assert.deepEqual(r.matches,[{profileId:'amd-navi44',reason:'family-id'}]);
  assert.equal(r.boundDriver,'amdgpu');assert.equal(r.binding,'reported-bound');assert.deepEqual(r.candidateDrivers,['amdgpu']);
  assert.equal(profile('amd-navi44').ids[0].subdevice,undefined);assert.equal(r.device.subsystemDevice,subsystem ? subsystem.split(':')[1]:null);
});
for (const [id,expected] of [['6798','amd-tahiti'],['6658','amd-bonaire']]) test(`older AMD ${id} remains its own identity`,()=>{
  const actualId=profile(expected).ids[0].device; const r=identify(excerpt(actualId));assert.deepEqual(r.matches.map(m=>m.profileId),[expected]);assert.equal(r.coverage,'curated-id');
});
test('unknown AMD bound to amdgpu has no generation identity or generation firmware context',()=>{
 const r=identify(excerpt('ffff'));assert.equal(r.coverage,'unknown');assert.deepEqual(r.matches,[]);assert.deepEqual(r.contexts,[]);assert.equal(r.boundDriver,'amdgpu');assert.deepEqual(r.candidateDrivers,[]);
});
for (const p of ['nvidia-rtx-4090','intel-alder-lake-p-graphics','realtek-rtl8125-family','broadcom-bcm5720']) test(`shared module does not identify ${p}`,()=>{
 const m=profile(p).drivers.find(d=>d.role==='kernel').module;
 const r=identifyDevices(parseHardwareReport(`01:00.0 Device [ffff:ffff]\n Kernel driver in use: ${m}`),catalog)[0];assert.equal(r.coverage,'unknown');assert.deepEqual(r.matches,[]);
});
test('multiple AMD devices sharing amdgpu retain independent identities and binding evidence',()=>{
 const raw=excerpt()+'\n'+excerpt(profile('amd-tahiti').ids[0].device).replaceAll('55:00.0','56:00.0');const rs=identifyDevices(parseHardwareReport(raw),catalog);assert.equal(rs.length,2);assert.deepEqual(rs.map(r=>r.matches[0].profileId),['amd-navi44','amd-tahiti']);
});
test('candidate modules never become a bound driver',()=>{
 const r=identify(excerpt('7590','',null));assert.equal(r.binding,'unreported');assert.equal(r.boundDriver,null);assert.deepEqual(r.device.reportedModules,['amdgpu']);
});
test('exact rules outrank family rules and contradictory required qualifiers are excluded',()=>{
 const d=parseIdentifier('pci:1002:7590');d.subsystemDevice='2437';
 const base=profile('amd-navi44');const exact={...base,id:'board-fixture',ids:[{bus:'pci',vendor:'1002',device:'7590',subdevice:'2437'}]};
 const c={profiles:[base,exact]};assert.equal(identifyDevices({devices:[d]},c)[0].matches[0].profileId,'board-fixture');d.subsystemDevice='0001';assert.equal(identifyDevices({devices:[d]},c)[0].matches[0].profileId,'amd-navi44');
});
test('source deduplication uses resource URLs, preserves distinct sources with the same title',()=>{
 const sources=deviceSources([{sources:[{title:'Same',url:'https://example.org/doc#L1'},{title:'Different',url:'https://example.org/doc#L9'},{title:'Same',url:'https://example.org/other'},{title:'Same',url:'https://example.org/doc?utm_source=test'}]}]);assert.equal(sources.length,2);
});
test('Navi44 material has no legacy parameters, unrelated firmware or radeon driver candidates',()=>{
 const p=profile('amd-navi44');assert.deepEqual(p.drivers.map(d=>d.module),['amdgpu']);assert.deepEqual(p.firmware.patterns,[]);assert.equal(p.checkpoints.some(c=>/si_support|cik_support|\/radeon\//.test(c.command)),false);assert.ok(p.checkpoints.some(c=>c.command.includes('lspci -vv')));assert.ok(p.checkpoints.some(c=>c.command.includes('firmware|AER')));
});
test('every original profile remains manually searchable by stable identity',()=>{
 const ids=JSON.parse(readFileSync(new URL('./fixtures/hardware-original-profiles.json',import.meta.url)));assert.equal(ids.length,154);for(const id of ids)assert.ok(profile(id));
});
test('DE/EN family reasons and privacy-safe exports preserve epistemic limits',()=>{
 const r=identify(excerpt().replace('AMD Navi 44','<img onerror=steal()> PRIVATE-HOST AMD Navi 44'));
 for(const lang of ['de','en']){const s=publicSummary([r],catalog,lang);assert.equal(s.includes('PRIVATE-HOST'),false);assert.equal(s.includes('2437'),false);assert.equal(s.includes('55:00'),false);assert.ok(s.includes(profile('amd-navi44').path[lang]));assert.ok(matchReason('family-id',lang).includes(lang==='de'?'Chipfamilien':'chip-family'));}
});
test('all profile sources including Navi44 have independently recorded retrieval evidence',()=>{
 const audit=JSON.parse(readFileSync(new URL('../docs/linux-hardware-explorer/SOURCE-AUDIT.json',import.meta.url)));for(const p of catalog.profiles)for(const s of p.sources)assert.ok(audit.resources.some(r=>r.url===s.url.split('#')[0]&&r.status===200),s.url);
});
