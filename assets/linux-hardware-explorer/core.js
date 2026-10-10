// Deterministic local parsing and evidence classification. Never execute commands.
import { normalizeSearch, redactSensitive, SITE_ORIGIN } from '../linux-fix-lab/core.js';

export const LIMITS = Object.freeze({ characters: 2_000_000, lines: 20_000, lineLength: 4096, devices: 512, jsonDepth: 16 });
export const FORMATS = Object.freeze(['auto', 'lspci', 'lsusb', 'inxi', 'lshw', 'sysfs']);
const HEX4 = /^[a-f0-9]{4}$/i;
const MODULE = /^[a-z0-9][a-z0-9_.-]{0,63}$/i;
const BDF = /^(?:[a-f0-9]{4}:)?[a-f0-9]{2}:[a-f0-9]{2}\.[0-7]$/i;
const clean = value => String(value ?? '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 500);
const hex = (value, length = 4) => {
  const v = clean(value).replace(/^0x/i, '').toLowerCase();
  return new RegExp(`^[a-f0-9]{${length}}$`).test(v) ? v : null;
};
const moduleName = value => MODULE.test(clean(value)) ? clean(value) : null;
const normalizeModule = value => String(value).replaceAll('-', '_').toLowerCase();
export function normalizeBdf(value) {
  const v = clean(value).toLowerCase();
  if (!BDF.test(v) || parseInt(v.split(':').at(-1).split('.')[0], 16) > 31) return null;
  return v.split(':').length === 2 ? '0000:' + v : v;
}

function device(format, bus = 'unknown') {
  return { bus, vendor: null, device: null, classCode: null, subsystemVendor: null, subsystemDevice: null,
    revision: null, bdf: null, usbAddress: null, reportedLabel: '', boundDriver: null, binding: 'unreported',
    reportedModules: [], usbInterfaceClasses: [], usbInterfaceTriplets: [], usbDeviceClassTriplet: null, programmingInterface: null, origins: [format] };
}
function setBinding(d, value) {
  if (/^(?:none|\(none\)|unbound|unclaimed)$/i.test(clean(value))) { d.binding = 'unbound'; d.boundDriver = null; return; }
  const name = moduleName(value);
  if (name) { d.boundDriver = name; d.binding = 'reported-bound'; }
}
function setPair(d, v, p) { if (hex(v) && hex(p)) { d.vendor = hex(v); d.device = hex(p); } }

export function parseModalias(value) {
  const v = clean(value).replace(/^MODALIAS\s*[:=]\s*/i, '');
  let m = v.match(/^pci:v([a-f0-9]{8})d([a-f0-9]{8})sv([a-f0-9]{8})sd([a-f0-9]{8})bc([a-f0-9]{2})sc([a-f0-9]{2})i([a-f0-9]{2})$/i);
  if (m && m.slice(1, 5).every(n => n.startsWith('0000'))) {
    const d = device('sysfs', 'pci'); setPair(d, m[1].slice(4), m[2].slice(4));
    d.subsystemVendor = m[3].slice(4).toLowerCase(); d.subsystemDevice = m[4].slice(4).toLowerCase();
    d.classCode = m.slice(5).join('').toLowerCase(); return d;
  }
  m = v.match(/^usb:v([a-f0-9]{4})p([a-f0-9]{4})d([a-f0-9]{4})dc([a-f0-9]{2})dsc([a-f0-9]{2})dp([a-f0-9]{2})ic([a-f0-9]{2})isc([a-f0-9]{2})ip([a-f0-9]{2})in([a-f0-9]{2})$/i);
  if (m) {
    const d = device('sysfs', 'usb'); setPair(d, m[1], m[2]); d.revision = m[3].toLowerCase();
    d.classCode = m[4].toLowerCase(); d.usbInterfaceClasses = [m[7].toLowerCase()];
    d.usbInterfaceTriplets = [m.slice(7, 10).join(':').toLowerCase()]; d.usbDeviceClassTriplet = m.slice(4, 7).join(':').toLowerCase(); return d;
  }
  return null; // Wildcard module aliases are not observed device identifiers.
}

function parsePci(lines) {
  const found = []; let current = null;
  const start = d => { found.push(d); current = d; };
  for (const line of lines) {
    let m = line.match(/^((?:[a-f0-9]{4}:)?[a-f0-9]{2}:[a-f0-9]{2}\.[0-7])\s+(.+)$/i);
    if (m && normalizeBdf(m[1])) {
      const d = device('lspci', 'pci'); d.bdf = normalizeBdf(m[1]); d.reportedLabel = clean(m[2]);
      const pair = [...m[2].matchAll(/\[([a-f0-9]{4}):([a-f0-9]{4})\]/gi)].at(-1) || m[2].match(/(?:^|\s)([a-f0-9]{4}):([a-f0-9]{4})(?:\s|$)/i);
      if (pair) setPair(d, pair[1], pair[2]);
      const cls = m[2].match(/\[([a-f0-9]{4})\]/i) || m[2].match(/^([a-f0-9]{4}):\s/i);
      if (cls) d.classCode = cls[1].toLowerCase();
      const rev = m[2].match(/\(rev ([a-f0-9]{2})\)/i); if (rev) d.revision = rev[1].toLowerCase();
      const prog = m[2].match(/\(prog-if ([a-f0-9]{2})\b/i); if (prog) d.programmingInterface = prog[1].toLowerCase();
      start(d); continue;
    }
    m = line.match(/^Slot:\s*(.+)$/i);
    if (m && normalizeBdf(m[1])) { const d = device('lspci', 'pci'); d.bdf = normalizeBdf(m[1]); start(d); continue; }
    if (!current) continue;
    m = line.match(/^\s*(Kernel driver in use|Driver):\s*(.+)$/i); if (m) { setBinding(current, m[2]); continue; }
    m = line.match(/^\s*(Kernel modules|Module):\s*(.+)$/i);
    if (m) { current.reportedModules.push(...m[2].split(/[,\s]+/).map(moduleName).filter(Boolean)); continue; }
    m = line.match(/^\s*Subsystem:\s*(.+)$/i);
    if (m) { const p = m[1].match(/\[([a-f0-9]{4}):([a-f0-9]{4})\]/i); if (p) { current.subsystemVendor = p[1].toLowerCase(); current.subsystemDevice = p[2].toLowerCase(); } continue; }
    m = line.match(/^(Vendor|Device|SVendor|SDevice|Class|Rev|ProgIf):\s*(.+)$/i);
    if (m) {
      const field = { vendor: 'vendor', device: 'device', svendor: 'subsystemVendor', sdevice: 'subsystemDevice', class: 'classCode', rev: 'revision', progif: 'programmingInterface' }[m[1].toLowerCase()];
      const n = m[2].match(/\[([a-f0-9]{2,6})\]/i) || m[2].match(/^([a-f0-9]{2,6})$/i);
      if (n) current[field] = n[1].toLowerCase();
      if (field === 'device') current.reportedLabel = clean(m[2]);
    }
  }
  return found.map(d => { if (d.classCode?.length === 4 && d.programmingInterface?.length === 2) d.classCode += d.programmingInterface; return d; });
}

function parseUsb(lines) {
  const found = []; let current = null, interfaceParts = [], deviceParts = [];
  for (const line of lines) {
    let m = line.match(/^Bus (\d{3}) Device (\d{3}): ID ([a-f0-9]{4}):([a-f0-9]{4})(?:\s+(.*))?$/i);
    if (m) { current = device('lsusb', 'usb'); interfaceParts = []; deviceParts = []; current.usbAddress = `${m[1]}:${m[2]}`; setPair(current, m[3], m[4]); current.reportedLabel = clean(m[5]); found.push(current); continue; }
    if (!current) continue;
    m = line.match(/^\s*(bDeviceClass|bInterfaceClass|bDeviceSubClass|bDeviceProtocol|bInterfaceSubClass|bInterfaceProtocol)\s+(0x[a-f0-9]+|\d+)\b/i);
    if (m) {
      const n = /^0x/i.test(m[2]) ? parseInt(m[2].slice(2), 16) : Number(m[2]);
      if (n < 0 || n > 255) continue;
      const code = n.toString(16).padStart(2, '0');
      const key = m[1].toLowerCase();
      if (key === 'bdeviceclass') { current.classCode = code; deviceParts = [code]; }
      else if (key === 'bdevicesubclass') deviceParts[1] = code;
      else if (key === 'bdeviceprotocol') { deviceParts[2] = code; if (deviceParts.every(Boolean) && deviceParts.length === 3) current.usbDeviceClassTriplet = deviceParts.join(':'); }
      else if (key === 'binterfaceclass') { current.usbInterfaceClasses.push(code); interfaceParts = [code]; }
      else if (key === 'binterfacesubclass') interfaceParts[1] = code;
      else if (key === 'binterfaceprotocol') { interfaceParts[2] = code; if (interfaceParts.every(Boolean) && interfaceParts.length === 3) current.usbInterfaceTriplets.push(interfaceParts.join(':')); }
    }
    m = line.match(/^\s*bcdDevice\s+(\d{1,2})\.(\d{2})\b/); if (m) current.revision = m[1].padStart(2, '0') + m[2];
    // iSerial and USB descriptor strings are deliberately not retained.
  }
  return found;
}

function parseInxi(lines) {
  const blocks = []; let current = null;
  for (const line of lines) {
    if (/\bDevice-\d+:/.test(line)) { current = clean(line.replace(/^.*?Device-\d+:\s*/, '')); blocks.push(current); }
    else if (current !== null && /^\s/.test(line) && !/^\s*(?:[A-Z][A-Za-z]+:|Device-\d+:)/.test(line)) { blocks[blocks.length - 1] += ' ' + clean(line); }
    else current = null;
  }
  return blocks.map(block => {
    const d = device('inxi'); d.reportedLabel = clean(block.split(/\s+(?:vendor|driver|bus-ID|chip-ID|class-ID|type):/i)[0]);
    const addr = block.match(/\bbus-ID:\s*([^\s]+)/i); if (addr) d.bdf = normalizeBdf(addr[1]);
    d.bus = d.bdf ? 'pci' : /\btype:\s*USB\b/i.test(block) || (addr && /^\d+-\d+(?:[.:]\d+)*$/.test(addr[1])) ? 'usb' : 'unknown';
    const pair = block.match(/\bchip-ID:\s*([a-f0-9]{4}):([a-f0-9]{4})\b/i); if (pair) setPair(d, pair[1], pair[2]);
    const cls = block.match(/\bclass-ID:\s*([a-f0-9]{4,6})\b/i); if (cls) d.classCode = cls[1].toLowerCase();
    const driver = block.match(/\bdriver:\s*([^\s,]+)/i); if (driver && !/^N\/A$/i.test(driver[1])) setBinding(d, driver[1]);
    return d;
  });
}

function lshwNode(node) {
  const d = device('lshw'); const businfo = clean(node.businfo || node['bus info']);
  d.bdf = normalizeBdf(businfo.replace(/^pci@/, '')); d.bus = d.bdf ? 'pci' : /^usb@/.test(businfo) ? 'usb' : 'unknown';
  d.reportedLabel = clean(node.product || node.description);
  const p = clean(node.product).match(/\[([a-f0-9]{4}):([a-f0-9]{4})\]/i);
  if (p) setPair(d, p[1], p[2]);
  else { const v = clean(node.vendor).match(/\[([a-f0-9]{4})\]/i), product = clean(node.product).match(/\[([a-f0-9]{4})\]/i); if (v && product) setPair(d, v[1], product[1]); }
  const driver = node.configuration?.driver; if (typeof driver === 'string') setBinding(d, driver);
  if (node.unclaimed === true || /\bUNCLAIMED\b/.test(node.heading || '')) setBinding(d, 'unclaimed');
  d.revision = clean(node.version) || null;
  return d;
}
function parseLshwJson(input) {
  const found = []; const root = JSON.parse(input); let visited = 0;
  function walk(node, depth) {
    if (depth > LIMITS.jsonDepth || ++visited > 4096) throw new RangeError('json-depth-or-node-limit');
    if (Array.isArray(node)) { for (const child of node) walk(child, depth + 1); return; }
    if (!node || typeof node !== 'object') return;
    if (node.businfo || node['bus info'] || node.configuration?.driver) found.push(lshwNode(node));
    if (Array.isArray(node.children)) walk(node.children, depth + 1);
  }
  walk(root, 0); return found;
}
function parseLshw(lines) {
  const found = []; let node = null;
  const flush = () => { if (node) found.push(lshwNode(node)); };
  for (const line of lines) {
    if (/^\s*\*-[a-z0-9_-]+/i.test(line)) { flush(); node = { heading: clean(line) }; continue; }
    if (!node) continue;
    const m = line.match(/^\s*(description|product|vendor|bus info|version|configuration):\s*(.*)$/i);
    if (!m) continue;
    if (m[1].toLowerCase() === 'configuration') { const driver = m[2].match(/(?:^|\s)driver=([^\s]+)/); if (driver) node.configuration = { driver: driver[1] }; }
    else node[m[1].toLowerCase()] = clean(m[2]);
  }
  flush(); return found;
}

function parseSysfs(lines) {
  const found = []; let current = null;
  const fresh = (bus = 'unknown') => { current = device('sysfs', bus); found.push(current); return current; };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { current = null; continue; }
    const addr = trimmed.match(/(?:\/sys\/bus\/pci\/devices\/|^)([a-f0-9]{4}:[a-f0-9]{2}:[a-f0-9]{2}\.[0-7])(?:\/|:|\s|$)/i);
    if (addr && normalizeBdf(addr[1]) && (!current || current.bdf !== normalizeBdf(addr[1]))) { fresh('pci').bdf = normalizeBdf(addr[1]); }
    const alias = trimmed.match(/(?:^|[=:\s])(pci:v[a-f0-9]+d[a-f0-9]+sv[a-f0-9]+sd[a-f0-9]+bc[a-f0-9]+sc[a-f0-9]+i[a-f0-9]+|usb:v[a-f0-9]+p[a-f0-9]+d[a-f0-9]+dc[a-f0-9]+dsc[a-f0-9]+dp[a-f0-9]+ic[a-f0-9]+isc[a-f0-9]+ip[a-f0-9]+in[a-f0-9]+)$/i);
    if (alias) {
      const parsed = parseModalias(alias[1]); if (!parsed) continue;
      if (!current || (current.vendor && (current.vendor !== parsed.vendor || current.device !== parsed.device))) fresh(parsed.bus);
      Object.assign(current, { ...parsed, bdf: current.bdf, origins: ['sysfs'], boundDriver: current.boundDriver, binding: current.binding }); continue;
    }
    const pairs = [...trimmed.matchAll(/(?:^|[\/\s])(vendor|device|subsystem_vendor|subsystem_device|class|revision|idVendor|idProduct|driver|DRIVER)\s*[:=]\s*([^\s]+)/gi)];
    for (const m of pairs) {
      const key = m[1].toLowerCase();
      if (key === 'driver') { if (current) setBinding(current, m[2]); continue; }
      const field = { vendor: 'vendor', device: 'device', subsystem_vendor: 'subsystemVendor', subsystem_device: 'subsystemDevice', class: 'classCode', revision: 'revision', idvendor: 'vendor', idproduct: 'device' }[key];
      const length = field === 'revision' ? 2 : field === 'classCode' ? 6 : 4;
      const value = hex(m[2], length); if (!value) continue;
      if (!current) fresh(key.startsWith('id') ? 'usb' : 'pci'); current[field] = value;
      if (key.startsWith('id')) current.bus = 'usb';
    }
  }
  return found;
}

function usable(d) { return (d.vendor && HEX4.test(d.vendor) && d.device && HEX4.test(d.device)) || d.bdf || d.boundDriver || (d.origins.includes('lspci') && d.reportedLabel); }
function mergeDevices(items) {
  const out = [];
  for (const item of items.filter(usable)) {
    const same = out.find(d => d.bus === item.bus && ((d.bdf && d.bdf === item.bdf) || (d.usbAddress && d.usbAddress === item.usbAddress))
      && (!d.vendor || !item.vendor || (d.vendor === item.vendor && d.device === item.device)));
    if (!same) { out.push(item); continue; }
    if ((same.boundDriver && item.boundDriver && normalizeModule(same.boundDriver) !== normalizeModule(item.boundDriver)) ||
      (same.binding === 'reported-bound' && item.binding === 'unbound') || (same.binding === 'unbound' && item.binding === 'reported-bound')) { same.binding = 'conflicting'; same.boundDriver = null; }
    else if (same.binding !== 'conflicting' && item.binding !== 'unreported') { same.binding = item.binding; same.boundDriver = item.boundDriver; }
    for (const key of ['vendor', 'device', 'classCode', 'subsystemVendor', 'subsystemDevice', 'revision', 'reportedLabel']) if (!same[key] && item[key]) same[key] = item[key];
    same.reportedModules.push(...item.reportedModules); same.usbInterfaceClasses.push(...item.usbInterfaceClasses); same.usbInterfaceTriplets.push(...item.usbInterfaceTriplets); same.origins.push(...item.origins);
  }
  return out.map((d, index) => ({ ...d, index, origins: [...new Set(d.origins)], reportedModules: [...new Set(d.reportedModules)], usbInterfaceClasses: [...new Set(d.usbInterfaceClasses)], usbInterfaceTriplets: [...new Set(d.usbInterfaceTriplets)] }));
}

export function parseHardwareReport(input, { format = 'auto' } = {}) {
  if (typeof input !== 'string') throw new TypeError('invalid-input');
  if (!FORMATS.includes(format)) throw new TypeError('invalid-format');
  if (input.length > LIMITS.characters) throw new RangeError('too-large');
  const original = input.split(/\r\n|\n|\r/); if (original.length > LIMITS.lines) throw new RangeError('too-many-lines');
  const shortened = original.filter(line => line.length > LIMITS.lineLength).length;
  const lines = original.map(line => line.slice(0, LIMITS.lineLength).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ''));
  const trimmed = input.trim(); const isJson = (format === 'lshw' || format === 'auto') && /^[\[{]/.test(trimmed);
  let items = [];
  if (isJson) items = parseLshwJson(trimmed);
  else {
    if (format === 'auto' || format === 'lspci') items.push(...parsePci(lines));
    if (format === 'auto' || format === 'lsusb') items.push(...parseUsb(lines));
    if (format === 'auto' || format === 'inxi') items.push(...parseInxi(lines));
    if (format === 'auto' || format === 'lshw') items.push(...parseLshw(lines));
    if (format === 'sysfs' || (format === 'auto' && (!/^Slot:\s/m.test(input) || /modalias|\/sys\/bus\//i.test(input)))) items.push(...parseSysfs(lines));
  }
  if (items.length > LIMITS.devices * 4) throw new RangeError('too-many-devices');
  const devices = mergeDevices(items); if (devices.length > LIMITS.devices) throw new RangeError('too-many-devices');
  const firmware = lines.filter(line => /(?:Direct firmware load for|firmware: failed to load|failed to load.*firmware|firmware.*(?:failed|not found))/i.test(line)).length;
  const warnings = []; if (shortened) warnings.push('shortened-lines'); if (!devices.length && trimmed) warnings.push('no-devices-recognized');
  return { schemaVersion: 1, devices, formats: [...new Set(devices.flatMap(d => d.origins))], lineCount: lines.length, shortened, firmwareObservations: firmware, warnings };
}

export function parseIdentifier(input, bus = 'unknown') {
  if (typeof input !== 'string' || input.length > 50 || !['unknown', 'pci', 'usb'].includes(bus)) throw new TypeError('invalid-identifier');
  const match = input.trim().match(/^(?:(pci|usb):)?([a-f0-9]{4}):([a-f0-9]{4})$/i);
  if (!match) throw new TypeError('invalid-identifier');
  const d = device('identifier', match[1]?.toLowerCase() || bus); setPair(d, match[2], match[3]); d.index = 0; return d;
}

function idMatch(d, id) {
  if ((d.bus !== 'unknown' && d.bus !== id.bus) || d.vendor !== id.vendor?.toLowerCase() || d.device !== id.device?.toLowerCase()) return null;
  let partial = false;
  for (const [key, field] of [['subvendor', 'subsystemVendor'], ['subdevice', 'subsystemDevice'], ['revision', 'revision']]) {
    if (id[key] && d[field] && String(id[key]).toLowerCase() !== d[field]) return null;
    if (id[key] && !d[field]) partial = true;
  }
  if (id.pciClass) {
    if (!d.classCode || d.classCode.length < id.pciClass.length) partial = true;
    if (d.classCode && !id.pciClass.startsWith(d.classCode) && !d.classCode.startsWith(id.pciClass)) return null;
  }
  if (id.usbInterface) {
    if (!d.usbInterfaceTriplets.length) partial = true;
    else if (!d.usbInterfaceTriplets.includes(id.usbInterface)) return null;
  }
  return partial ? 'needs-subsystem-or-revision' : d.bus === 'unknown' ? 'id-with-unconfirmed-bus' : id.identityLevel === 'family' ? 'family-id' : 'exact-id';
}
export function identifyDevices(parsed, catalog) {
  const profiles = catalog.profiles || [];
  return parsed.devices.map(d => {
    const identities = profiles.flatMap(p => (p.ids || []).map(id => idMatch(d, id)).filter(Boolean).map(reason => ({ profileId: p.id, reason })));
    const exact = identities.filter(m => m.reason === 'exact-id');
    const family = identities.filter(m => m.reason === 'family-id');
    let matches = exact.length ? exact : family.length ? family : identities;
    matches = [...new Map(matches.map(m => [m.profileId, m])).values()];
    // Context never establishes identity. Only explicitly class-scoped profiles without
    // product IDs can supply it; a shared bound or candidate module is insufficient.
    const contexts = profiles.filter(p => !p.ids.length && p.match?.autoContext !== false).filter(p => {
      const pci = d.bus === 'pci' && d.classCode && (p.match?.pciClasses || []).some(c => d.classCode.startsWith(c.toLowerCase()));
      const usb = d.bus === 'usb' && (p.match?.usbClasses || []).some(c =>
        [d.usbDeviceClassTriplet, ...d.usbInterfaceTriplets].some(v => v && (v === c.toLowerCase() || v.startsWith(c.toLowerCase() + ':'))));
      return pci || usb;
    }).map(p => ({ profileId: p.id, reason: 'device-class-context' }));
    const matched = matches.filter(m => ['exact-id', 'family-id'].includes(m.reason)).map(m => profiles.find(p => p.id === m.profileId));
    const candidates = [...new Set(matched.flatMap(p => p.drivers.filter(x => x.role === 'kernel').map(x => x.module)))];
    return { device: d, matches, contexts, coverage: exact.length ? 'curated-id' : family.length ? 'curated-family' : matches.length ? 'context-only' : 'unknown',
      ambiguous: matches.length > 1 || matches.some(m => !['exact-id', 'family-id'].includes(m.reason)), candidateDrivers: candidates,
      binding: d.binding, boundDriver: d.boundDriver,
      boundMatchesCandidate: d.boundDriver && candidates.length ? candidates.some(n => normalizeModule(n) === normalizeModule(d.boundDriver)) : null };
  });
}

export function filterProfiles(profiles, { query = '', category = '', sort = 'name', language = 'en' } = {}) {
  const terms = normalizeSearch(String(query).slice(0, 200)).trim().split(/\s+/).filter(Boolean);
  const out = profiles.filter(p => (!category || p.category === category) && terms.every(term => normalizeSearch([
    p.name.en, p.name.de, p.summary[language], p.id, ...p.ids.flatMap(i => [i.vendor, i.device, `${i.vendor}:${i.device}`]),
    ...p.drivers.map(d => d.module), ...p.firmware.patterns,
  ].join(' ')).includes(term)));
  return out.sort((a, b) => sort === 'category' ? a.category.localeCompare(b.category) || a.name[language].localeCompare(b.name[language], language)
    : sort === 'reviewed' ? b.reviewed.localeCompare(a.reviewed) || a.id.localeCompare(b.id) : a.name[language].localeCompare(b.name[language], language));
}

export function redactHardwareReport(input) {
  return redactSensitive(String(input))
    .replace(/^([^\n]*(?:iSerial(?:Number)?|serial(?: number)?|seriennummer|uuid|wwn|hostname|host name|machine-id|chassis asset tag)\s*[:=]?\s+).+$/gim, '$1[REDACTED]')
    .replace(/\b(serial|uuid|wwn|hostname|machine-id)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/\bHost:\s*[^\s]+/gi, 'Host: [REDACTED]')
    .replace(/\b(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/gi, '[UUID]')
    .replace(/\/dev\/disk\/by-(?:id|uuid|partuuid|path)\/[^\s]+/gi, '/dev/disk/[REDACTED]');
}

export function publicSummary(results, catalog, language = 'en', { includeIds = false } = {}) {
  const de = language === 'de'; const profiles = catalog.profiles || [];
  const modules = new Set(profiles.flatMap(p => p.drivers.map(d => normalizeModule(d.module))));
  const lines = ['Linux Hardware & Driver Explorer', de ? 'Lokale Zusammenfassung — ohne Rohbericht oder persönliche Kennungen.' : 'Local summary — without the raw report or personal identifiers.',
    de ? 'Katalogtreffer sind Quellenhinweise, keine bestätigte Funktionsprüfung.' : 'Catalog matches are source evidence, not a confirmed operational test.'];
  for (const [i, result] of results.entries()) {
    lines.push('', `${de ? 'Gerät' : 'Device'} ${i + 1}: ${result.device.bus === 'unknown' ? (de ? 'Bustyp unbekannt' : 'unknown bus') : result.device.bus}`);
    if (includeIds && result.device.vendor && result.device.device) lines.push(`ID: ${result.device.vendor}:${result.device.device}`);
    const driver = result.boundDriver && modules.has(normalizeModule(result.boundDriver)) ? result.boundDriver : null;
    lines.push(driver ? `${de ? 'Gemeldeter Treiber' : 'Reported driver'}: ${driver}` : de ? 'Treiber: nicht berichtet oder Name im Export weggelassen.' : 'Driver: unreported or name omitted from export.');
    for (const match of result.matches) {
      const p = profiles.find(p => p.id === match.profileId); if (!p) continue;
      lines.push(`${p.name[language]} (${matchReason(match.reason, language)})`, SITE_ORIGIN + profilePath(p.id, language));
    }
    if (!result.matches.length) lines.push(de ? 'Kein passender kuratierter Profilnachweis.' : 'No matching curated profile evidence.');
  }
  return lines.join('\n');
}

export function matchReason(reason, language = 'en') {
  const labels = {
    'exact-id': ['Verified catalog ID and required conditions; product specifications not inferred', 'Belegte Katalog-ID und erforderliche Bedingungen; keine abgeleiteten Produktspezifikationen'],
    'family-id': ['Verified chip-family ID; retail board and reported model not independently verified', 'Belegte Chipfamilien-ID; Verkaufsplatine und gemeldetes Modell nicht unabhängig bestätigt'],
    'needs-subsystem-or-revision': ['Additional subsystem, revision or class evidence needed', 'Zusätzlicher Subsystem-, Revisions- oder Klassenbefund nötig'],
    'id-with-unconfirmed-bus': ['Bus type not confirmed', 'Bustyp nicht bestätigt'],
    'reported-driver-context': ['Reported driver context; no exact product identification', 'Gemeldeter Treiberkontext; keine exakte Produkterkennung'],
    'device-class-context': ['Device class context; no exact product identification', 'Geräteklassenkontext; keine exakte Produkterkennung'],
  };
  return (labels[reason] || ['Unconfirmed evidence', 'Unbestätigter Hinweis'])[language === 'de' ? 1 : 0];
}

export const landingPath = language => `${language === 'de' ? '/de' : ''}/linux-hardware-explorer/`;
export function profilePath(id, language = 'en') {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new TypeError('invalid-profile-id');
  return landingPath(language) + id + '/';
}
export function canonicalPublicUrl(path, anchor = '') {
  if (!/^\/(?:de\/)?linux-hardware-explorer\/(?:[a-z0-9-]+\/)?$/.test(path) || (anchor && !/^[a-z][a-z0-9-]*$/.test(anchor))) throw new TypeError('invalid-public-url');
  return SITE_ORIGIN + path + (anchor ? '#' + anchor : '');
}
export function validPublicContext(input, catalog, workflows = []) {
  const v = typeof input === 'string' ? new URLSearchParams(input.slice(0, 600)) : input || {};
  const get = key => v instanceof URLSearchParams ? v.get(key) : v[key]; const out = {};
  const profile = get('profile'); if ((catalog.profiles || []).some(p => p.id === profile)) out.profile = profile;
  const category = get('category'); if (Object.hasOwn(catalog.categories || {}, category || '')) out.category = category;
  const sort = get('sort'); if (['name', 'category', 'reviewed'].includes(sort)) out.sort = sort;
  const workflow = workflows.find(w => w.id === get('workflow'));
  if (workflow) { out.workflow = workflow.id; const node = get('node'); if (Object.hasOwn(workflow.nodes, node || '')) out.node = node; }
  return out; // Search text, raw reports, IDs, addresses and arbitrary parameters never survive.
}
export function contextHash(input, catalog, workflows) {
  const params = new URLSearchParams(validPublicContext(input, catalog, workflows));
  return params.size ? '#explorer?' + params.toString() : '';
}

// Deduplicate canonical resource URLs, never their human-readable titles.
export function deviceSources(profiles) {
  const seen = new Set();
  return profiles.flatMap(p => p.sources || []).filter(source => {
    const url = new URL(source.url); url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key);
    url.searchParams.sort(); const canonical = url.href;
    if (seen.has(canonical)) return false; seen.add(canonical); return true;
  });
}
