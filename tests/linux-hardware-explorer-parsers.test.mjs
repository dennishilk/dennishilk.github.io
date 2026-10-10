import assert from 'node:assert/strict';
import test from 'node:test';
import { LIMITS, parseHardwareReport, parseIdentifier, parseModalias, normalizeBdf, identifyDevices,
  filterProfiles, redactHardwareReport, publicSummary, validPublicContext, contextHash, canonicalPublicUrl } from '../assets/linux-hardware-explorer/core.js';

// Synthetic fixtures test parsing semantics, not compatibility or physical devices.
const profile = (id, bus, vendor, device, module = 'example') => ({ id, category: 'wifi', name: { en: id, de: id }, summary: { en: 'Fixture profile', de: 'Testprofil' },
  ids: [{ bus, vendor, device }], match: { modules: [module], pciClasses: [], usbClasses: [] }, drivers: [{ module, role: 'kernel' }], firmware: { patterns: [] }, reviewed: '2026-10-10' });
const catalog = { categories: { wifi: { en: 'Wi-Fi', de: 'WLAN' } }, profiles: [profile('intel-fixture', 'pci', '8086', '2723', 'iwlwifi'), profile('usb-fixture', 'usb', '8087', '0032', 'btusb')] };

test('lspci -nnk preserves BDF, class, revision, subsystem and bound-vs-candidate distinction', () => {
  const parsed = parseHardwareReport('0000:01:00.0 Network controller [0280]: Intel Corporation AX200 [8086:2723] (rev 1a)\n\tSubsystem: Intel Corporation [8086:0084]\n\tKernel driver in use: iwlwifi\n\tKernel modules: iwlwifi, vfio-pci');
  assert.equal(parsed.devices.length, 1); const d = parsed.devices[0];
  assert.equal(d.bdf, '0000:01:00.0'); assert.equal(d.vendor, '8086'); assert.equal(d.device, '2723'); assert.equal(d.classCode, '0280');
  assert.equal(d.revision, '1a'); assert.equal(d.subsystemVendor, '8086'); assert.equal(d.subsystemDevice, '0084');
  assert.equal(d.binding, 'reported-bound'); assert.equal(d.boundDriver, 'iwlwifi'); assert.deepEqual(d.reportedModules, ['iwlwifi', 'vfio-pci']);
});
test('plain lspci observes a device but never invents a numeric ID or binding', () => {
  const d = parseHardwareReport('01:00.0 Network controller: Intel Corporation Wireless adapter').devices[0];
  assert.equal(d.vendor, null); assert.equal(d.device, null); assert.equal(d.binding, 'unreported'); assert.equal(d.boundDriver, null);
  assert.equal(identifyDevices({ devices: [d] }, catalog)[0].coverage, 'unknown');
});
test('lspci -n accepts numeric class and identity', () => {
  const d = parseHardwareReport('01:00.0 0280: 8086:2723 (rev 1a)').devices[0];
  assert.equal(d.vendor, '8086'); assert.equal(d.classCode, '0280');
});
test('lspci -vmm fields stay associated with their Slot and do not become phantom sysfs records', () => {
  const parsed = parseHardwareReport('Slot:\t0000:01:00.0\nClass:\tNetwork controller [0280]\nVendor:\tIntel Corporation [8086]\nDevice:\tAX200 [2723]\nSVendor:\tIntel [8086]\nSDevice:\tDevice [0084]\nRev:\t1a\nDriver:\tiwlwifi\nModule:\tiwlwifi');
  assert.equal(parsed.devices.length, 1); assert.equal(parsed.devices[0].device, '2723'); assert.equal(parsed.devices[0].binding, 'reported-bound');
});
test('module candidates alone do not imply a loaded or bound driver', () => {
  const d = parseHardwareReport('01:00.0 Network controller [0280]: Intel [8086:2723]\n Kernel modules: iwlwifi').devices[0];
  assert.equal(d.binding, 'unreported'); assert.equal(d.boundDriver, null); assert.deepEqual(d.reportedModules, ['iwlwifi']);
});
test('multiple PCI devices keep continuation fields separate', () => {
  const devices = parseHardwareReport('01:00.0 Network controller [0280]: Intel [8086:2723]\n Kernel driver in use: iwlwifi\n02:00.0 Ethernet controller [0200]: Example [10ec:8125]\n Kernel modules: r8169').devices;
  assert.equal(devices.length, 2); assert.equal(devices[0].boundDriver, 'iwlwifi'); assert.equal(devices[1].boundDriver, null);
});
test('lsusb -v reads decimal device/interface classes while deliberately discarding serials', () => {
  const parsed = parseHardwareReport('Bus 001 Device 004: ID 8087:0032 Intel Bluetooth\n bDeviceClass 224 Wireless\n bInterfaceClass 224 Wireless\n bcdDevice 0.01\n iSerial 3 SECRET-SERIAL\nBus 002 Device 009: ID 046d:c077 Mouse');
  assert.equal(parsed.devices.length, 2); const d = parsed.devices[0];
  assert.equal(d.bus, 'usb'); assert.equal(d.classCode, 'e0'); assert.deepEqual(d.usbInterfaceClasses, ['e0']); assert.equal(d.revision, '0001');
  assert.ok(!JSON.stringify(parsed).includes('SECRET-SERIAL')); assert.equal(d.boundDriver, null);
});
test('USB product strings are observations and never exact identity proofs', () => {
  const d = parseHardwareReport('Bus 001 Device 001: ID 1234:abcd Claimed RTX 9999').devices[0];
  const r = identifyDevices({ devices: [d] }, catalog)[0]; assert.equal(r.coverage, 'unknown'); assert.equal(r.matches.length, 0);
});
test('inxi wrapped device fields and USB bus hints remain distinct', () => {
  const parsed = parseHardwareReport('Graphics:\n  Device-1: Intel Example driver: i915 v: kernel\n    bus-ID: 00:02.0 chip-ID: 8086:46a6 class-ID: 0300\nBluetooth:\n  Device-1: Intel AX210 type: USB driver: btusb bus-ID: 1-2:3\n    chip-ID: 8087:0032');
  assert.equal(parsed.devices.length, 2); assert.equal(parsed.devices[0].bdf, '0000:00:02.0'); assert.equal(parsed.devices[0].boundDriver, 'i915');
  assert.equal(parsed.devices[1].bus, 'usb'); assert.equal(parsed.devices[1].boundDriver, 'btusb');
});
test('inxi without a bus hint does not silently assume PCI', () => {
  const d = parseHardwareReport('Device-1: Example chip-ID: 8087:0032 driver: N/A').devices[0];
  assert.equal(d.bus, 'unknown'); assert.equal(d.binding, 'unreported');
});
test('lshw numeric text distinguishes an explicit UNCLAIMED observation', () => {
  const parsed = parseHardwareReport('  *-network UNCLAIMED\n       product: AX200 [2723]\n       vendor: Intel Corporation [8086]\n       bus info: pci@0000:01:00.0\n       serial: PRIVATE-MAC\n  *-display\n       product: Example [1002:73bf]\n       bus info: pci@0000:55:00.0\n       configuration: driver=amdgpu latency=0');
  assert.equal(parsed.devices.length, 2); assert.equal(parsed.devices[0].binding, 'unbound'); assert.equal(parsed.devices[0].vendor, '8086');
  assert.equal(parsed.devices[1].boundDriver, 'amdgpu'); assert.ok(!JSON.stringify(parsed).includes('PRIVATE-MAC'));
});
test('lshw JSON walks bounded children and ignores private fields', () => {
  const parsed = parseHardwareReport(JSON.stringify({ id: 'SECRET-HOST', serial: 'SECRET-UUID', children: [{ product: 'AX200 [8086:2723]', businfo: 'pci@0000:01:00.0', serial: 'SECRET-MAC', configuration: { driver: 'iwlwifi', ip: '10.99.3.2' } }] }));
  assert.equal(parsed.devices.length, 1); assert.equal(parsed.devices[0].boundDriver, 'iwlwifi'); assert.doesNotMatch(JSON.stringify(parsed), /SECRET|10\.99/);
});
test('sysfs path fields and PCI modalias merge into one observed device', () => {
  const parsed = parseHardwareReport('/sys/bus/pci/devices/0000:01:00.0/vendor: 0x8086\n/sys/bus/pci/devices/0000:01:00.0/device: 0x2723\nMODALIAS=pci:v00008086d00002723sv00008086sd00000084bc02sc80i00\nDRIVER=iwlwifi');
  assert.equal(parsed.devices.length, 1); assert.equal(parsed.devices[0].classCode, '028000'); assert.equal(parsed.devices[0].subsystemDevice, '0084'); assert.equal(parsed.devices[0].boundDriver, 'iwlwifi');
});
test('USB modalias interprets vendor, product, revision and interface class', () => {
  const d = parseModalias('usb:v8087p0032d0001dcE0dsc01dp01icE0isc01ip01in00');
  assert.equal(d.bus, 'usb'); assert.equal(d.vendor, '8087'); assert.equal(d.device, '0032'); assert.equal(d.revision, '0001'); assert.deepEqual(d.usbInterfaceClasses, ['e0']);
});
test('wildcard modalias patterns are not accepted as observed device identities', () => {
  assert.equal(parseModalias('pci:v00008086d00002723sv*sd*bc*sc*i*'), null); assert.equal(parseModalias('usb:v8087p0032d*dc*dsc*dp*ic*isc*ip*in*'), null);
});
test('duplicate observations coalesce but contradicting driver binding stays uncertain', () => {
  const d = parseHardwareReport('01:00.0 Network [0280]: Intel [8086:2723]\n Kernel driver in use: iwlwifi\n01:00.0 Network [0280]: Intel [8086:2723]\n Kernel driver in use: vfio-pci').devices[0];
  assert.equal(d.binding, 'conflicting'); assert.equal(d.boundDriver, null);
});
test('BDF and identifier validation reject shell strings, impossible slots and public URL text', () => {
  for (const value of ['01:ff.0', '0000:01:00.8', '01:00.0;reboot']) assert.equal(normalizeBdf(value), null);
  for (const value of ['8086:2723<script>', 'https://x/8086:2723', '1002:xxxx', '8086:2723?serial=private']) assert.throws(() => parseIdentifier(value));
  assert.equal(parseIdentifier('USB:8087:0032').bus, 'usb'); assert.equal(parseIdentifier('8086:2723').bus, 'unknown');
});
test('exact identities, missing subsystem qualifiers and class context are different evidence levels', () => {
  const extended = { ...catalog, profiles: [...catalog.profiles, { ...profile('subsystem-fixture', 'pci', '8086', '9999'), ids: [{ bus: 'pci', vendor: '8086', device: '9999', subvendor: '8086', subdevice: '0001' }] }] };
  const exact = identifyDevices({ devices: [parseIdentifier('pci:8086:2723')] }, extended)[0]; assert.equal(exact.coverage, 'curated-id'); assert.equal(exact.ambiguous, false);
  const partial = identifyDevices({ devices: [parseIdentifier('pci:8086:9999')] }, extended)[0]; assert.equal(partial.coverage, 'context-only'); assert.equal(partial.matches[0].reason, 'needs-subsystem-or-revision');
  const mismatch = { ...parseIdentifier('pci:8086:9999'), subsystemDevice: '0002', subsystemVendor: '8086' }; assert.equal(identifyDevices({ devices: [mismatch] }, extended)[0].coverage, 'unknown');
});
test('unknown-bus identifiers cannot become exact product evidence', () => {
  const r = identifyDevices({ devices: [parseIdentifier('8086:2723')] }, catalog)[0]; assert.equal(r.matches[0].reason, 'id-with-unconfirmed-bus'); assert.equal(r.coverage, 'context-only');
});
test('driver/class context never certifies a specific hardware family', () => {
  const d = parseHardwareReport('01:00.0 Network controller: unnamed\n Kernel driver in use: iwlwifi').devices[0];
  const r = identifyDevices({ devices: [d] }, catalog)[0]; assert.equal(r.coverage, 'context-only'); assert.equal(r.matches[0].reason, 'reported-driver-context'); assert.equal(r.ambiguous, true);
});
test('firmware log failures are counts of observations, never an asserted package diagnosis', () => {
  const p = parseHardwareReport('Direct firmware load for example/file.bin failed with error -2'); assert.equal(p.firmwareObservations, 1); assert.equal(p.devices.length, 0);
});
test('bounded hostile input and malformed JSON fail predictably', () => {
  assert.throws(() => parseHardwareReport(null), TypeError); assert.throws(() => parseHardwareReport('x', { format: 'ai' }), TypeError);
  assert.throws(() => parseHardwareReport('x'.repeat(LIMITS.characters + 1)), RangeError); assert.throws(() => parseHardwareReport('\n'.repeat(LIMITS.lines)), RangeError);
  assert.throws(() => parseHardwareReport('{"malformed"')); let deep = { children: [] }; for (let i = 0; i < 30; i++) deep = { children: [deep] }; assert.throws(() => parseHardwareReport(JSON.stringify(deep)), RangeError);
  const parsed = parseHardwareReport('01:00.0 Example [1002:73bf]\n' + 'x'.repeat(8000)); assert.equal(parsed.shortened, 1);
});
test('ANSI/control sequences do not change a valid numeric identity', () => {
  const d = parseHardwareReport('\u001b[31m01:00.0\u001b[0m Network [0280]: Intel [8086:2723]').devices[0]; assert.equal(d.device, '2723');
});
test('catalog search spans localized names, numeric pairs and driver names without changing input', () => {
  assert.equal(filterProfiles(catalog.profiles, { query: '8086:2723' })[0].id, 'intel-fixture'); assert.equal(filterProfiles(catalog.profiles, { query: 'btusb' })[0].id, 'usb-fixture');
  assert.equal(filterProfiles(catalog.profiles, { query: '<script>' }).length, 0); assert.equal(filterProfiles(catalog.profiles, { category: 'audio' }).length, 0);
});
test('export allowlist excludes raw labels, addresses, unknown driver labels and all personal fields', () => {
  const d = { ...parseIdentifier('pci:8086:2723'), boundDriver: 'private-host', reportedLabel: 'serial=TOPSECRET host=PRIVATE', bdf: '0000:aa:00.0' };
  const text = publicSummary(identifyDevices({ devices: [d] }, catalog), catalog, 'de');
  assert.doesNotMatch(text, /private-host|TOPSECRET|PRIVATE|0000:aa|8086:2723/); assert.match(text, /intel-fixture/);
  assert.match(publicSummary(identifyDevices({ devices: [d] }, catalog), catalog, 'en', { includeIds: true }), /8086:2723/);
});
test('redaction catches common hardware serial, MAC, host, UUID and token formats', () => {
  const redacted = redactHardwareReport('Host: secret-host\n serial: ABC123\n iSerial 3 SECRETUSB\n mac: 00:11:22:33:44:55\n uuid: 12345678-abcd-1234-5678-123456789abc\n token=secret-token\n /home/private-user/log.txt');
  assert.doesNotMatch(redacted, /secret-host|ABC123|SECRETUSB|00:11:22:33:44:55|12345678-abcd|secret-token|private-user/);
});
test('public language context retains only known profile, category and workflow position', () => {
  const flows = [{ id: 'wifi-flow', nodes: { start: {}, evidence: {} } }];
  const state = validPublicContext('profile=intel-fixture&category=wifi&workflow=wifi-flow&node=evidence&search=HOST&report=SECRET&serial=ABC&sort=name', catalog, flows);
  assert.deepEqual(state, { profile: 'intel-fixture', category: 'wifi', sort: 'name', workflow: 'wifi-flow', node: 'evidence' });
  assert.doesNotMatch(contextHash(state, catalog, flows), /HOST|SECRET|ABC/); assert.deepEqual(validPublicContext('profile=made-up&category=bad&workflow=bad&node=evil', catalog, flows), {});
});
test('shareable URLs contain only the public namespace and semantic anchor', () => {
  assert.equal(canonicalPublicUrl('/de/linux-hardware-explorer/intel-fixture/', 'firmware'), 'https://www.dennishilk.com/de/linux-hardware-explorer/intel-fixture/#firmware');
  for (const path of ['/about/', '/linux-hardware-explorer/intel-fixture/?report=secret', '//evil.example/']) assert.throws(() => canonicalPublicUrl(path));
});
