import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { catalog } from '../assets/linux-hardware-explorer/catalog.js';
import { parseIdentifier, identifyDevices } from '../assets/linux-hardware-explorer/core.js';
import { loadProfiles } from '../scripts/build-linux-hardware-explorer.mjs';
const fixture = JSON.parse(readFileSync(new URL('fixtures/hardware-source-evidence.json', import.meta.url), 'utf8'));
const audit = JSON.parse(readFileSync(new URL('../docs/linux-hardware-explorer/SOURCE-AUDIT.json', import.meta.url), 'utf8'));
const profiles = new Map(loadProfiles().map(p => [p.id, p]));
for (const item of fixture.cases) test(`independent upstream identity fixture: ${item.profileId}`, () => {
  const { bus, vendor, device, ...extra } = item.observed;
  const d = { ...parseIdentifier(`${bus}:${vendor}:${device}`), ...extra };
  const result = identifyDevices({ devices: [d] }, catalog)[0];
  assert.equal(result.coverage, 'curated-id'); assert.equal(result.matches.some(m => m.profileId === item.profileId && m.reason === 'exact-id'), true);
  for (const driver of item.driverCandidates) assert.ok(result.candidateDrivers.includes(driver));
  assert.equal(result.boundDriver, null); assert.equal(result.binding, 'unreported');
  for (const evidence of item.evidence) {
    const record = audit.resources.find(r => r.url === evidence.url.split('#')[0]);
    assert.equal(record.status, 200); assert.equal(record.sha256, evidence.resourceSha256);
    assert.ok(profiles.get(item.profileId).sources.some(s => s.url === evidence.url));
  }
});
test('source audit is complete and all immutable Linux references use the documented snapshot', () => {
  assert.equal(audit.profileCount, 154); assert.equal(audit.resources.length, 267);
  for (const resource of audit.resources) { assert.equal(resource.status, 200); assert.equal(resource.error, undefined); assert.match(resource.sha256, /^[a-f0-9]{64}$/); }
  for (const p of profiles.values()) for (const source of p.sources) if (source.url.startsWith('https://github.com/torvalds/linux/blob/')) assert.ok(source.url.includes(fixture.snapshot));
});
test('specific identity constraints and unusual transport/module boundaries remain documented', () => {
  assert.deepEqual(profiles.get('wifi-intel-7265').ids[0], { bus: 'pci', vendor: '8086', device: '095a', subdevice: '5010' });
  assert.equal(profiles.get('asix-ax88179-usb').ids[0].usbInterface, 'ff:ff:00'); assert.equal(profiles.get('marvell-88se912x-ahci').ids[0].pciClass, '010601');
  assert.equal(profiles.get('audio-realtek-alc892-codec').ids.length, 0);
  assert.ok(profiles.get('pcie-root-port-context').drivers.some(d => d.module === 'pcieport' && d.builtIn === true && d.loadable === false));
  assert.equal(profiles.get('virtual-virtio-net-modern').match.modules.includes('virtio_pci'), false);
  assert.ok(profiles.get('lsi-sas2008').drivers.some(d => d.module === 'mpt3sas'));
});
