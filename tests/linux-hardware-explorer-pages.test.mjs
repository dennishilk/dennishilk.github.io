import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadProfiles, validateCatalog, publicationState } from '../scripts/build-linux-hardware-explorer.mjs';
import { loadProblems, problemPath } from '../scripts/build-linux-fix-lab.mjs';
import { catalog } from '../assets/linux-hardware-explorer/catalog.js';
import { workflows } from '../content/linux-hardware-explorer/workflows.mjs';
import { knowledge, distributions } from '../content/linux-hardware-explorer/knowledge.mjs';
import { identifyDevices, parseHardwareReport, parseIdentifier } from '../assets/linux-hardware-explorer/core.js';
import { hardwarePublication, hardwareIntegration } from '../scripts/hardware-integration.mjs';

const root = new URL('../', import.meta.url), read = path => readFileSync(new URL(path.replace(/^\//, ''), root), 'utf8');
const profiles = loadProfiles(), problemMap = new Map(loadProblems().map(p => [p.id, p]));
const manifest = JSON.parse(read('content/linux-hardware-explorer/generated-manifest.json'));
const state = hardwarePublication(root.pathname), today = new Date().toISOString().slice(0, 10);
test('catalog has 154 substantive profiles, 122 numeric and 32 explicit contexts in twelve categories', () => {
  validateCatalog(profiles); assert.equal(profiles.length, 154); assert.equal(profiles.filter(p => p.ids.length).length, 122);
  assert.equal(Object.keys(catalog.categories).length, 12); assert.equal(new Set(profiles.map(p => p.id)).size, 154);
  assert.deepEqual(profiles.map(p => p.id), catalog.profiles.map(p => p.id));
  assert.equal(Object.keys(manifest.pages).length, 330); assert.equal(manifest.localizedDevicePages, 308); assert.equal(manifest.knowledgePages, 20);
});
test('activation is fail-closed and unsupported combinations cannot index navigation or sitemap', () => {
  assert.deepEqual(publicationState({ phase: 'review', allowIndexing: false }), { phase: 'review', robots: 'noindex,follow', sitemapActive: false, integrationActive: false });
  assert.throws(() => publicationState({ phase: 'review', allowIndexing: true, activateSitemap: true }));
  assert.throws(() => publicationState({ phase: 'public-launch', allowIndexing: false, activateIntegration: true }));
  if (!state.approved) { assert.equal(state.sitemapActive, false); assert.equal(state.integrationActive, false); assert.equal(hardwareIntegration(root.pathname).nav('de'), ''); }
});

for (const p of profiles) test(`profile ${p.id}: bilingual evidence, working Lab anchors and static sections`, () => {
  for (const field of ['summary', 'identity', 'driverNotes', 'limitations']) for (const lang of ['en', 'de']) assert.ok(p[field][lang].length >= 60, `${field}/${lang}`);
  for (const lang of ['en', 'de']) {
    const path = catalog.profiles.find(v => v.id === p.id).path[lang], html = read(path + 'index.html');
    assert.ok(html.includes(`<html lang="${lang}">`)); assert.ok(html.includes(`href="https://www.dennishilk.com${path}"`));
    assert.ok(html.includes(`hreflang="en" href="https://www.dennishilk.com${catalog.profiles.find(v => v.id === p.id).path.en}"`));
    assert.ok(html.includes(`hreflang="de" href="https://www.dennishilk.com${catalog.profiles.find(v => v.id === p.id).path.de}"`));
    for (const id of ['overview', 'driver', 'firmware', 'diagnostics', 'known-issues', 'references']) assert.ok(html.includes(`id="${id}"`));
    assert.ok(html.includes(state.approved ? 'index,follow,max-image-preview:large' : 'noindex,follow'));
    for (const id of p.fixLab) { const problem = problemMap.get(id); assert.ok(html.includes(problemPath(problem, lang) + '#' + problem.solutions[0].id)); }
    assert.equal(createHash('sha256').update(html).digest('hex'), manifest.pages[path].hash);
    assert.ok(manifest.pages[path].lastmod <= today);
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld['@graph'][0]['@type'], 'TechArticle'); assert.equal(ld['@graph'][0].inLanguage, lang);
    assert.deepEqual(ld['@graph'][0].citation, p.sources.map(s => s.url));
  }
});
test('all new static local links and anchors resolve including localized Lab deep links', () => {
  for (const path of Object.keys(manifest.pages)) {
    const html = read(path + 'index.html');
    for (const m of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
      const href = m[1]; if (!href.startsWith('/') && !href.startsWith('#')) continue;
      const u = new URL(href.replaceAll('&amp;', '&'), 'https://www.dennishilk.com' + path);
      const file = u.pathname + (u.pathname.endsWith('/') ? 'index.html' : '');
      assert.ok(existsSync(new URL(file.slice(1), root)), `${path} -> ${file}`);
      if (u.hash && !u.hash.startsWith('#explorer?') && file.endsWith('.html')) assert.ok(read(file).includes(`id="${decodeURIComponent(u.hash.slice(1))}"`), `${path} -> ${href}`);
    }
  }
});
test('knowledge is localized with concrete distro checks and safe original text', () => {
  assert.equal(knowledge.length, 10); assert.deepEqual(distributions.map(d => d.id), ['debian', 'ubuntu', 'fedora', 'arch', 'nixos', 'gentoo']);
  for (const topic of knowledge) {
    for (const lang of ['en', 'de']) {
      const path = `${lang === 'de' ? '/de' : ''}/linux-hardware-explorer/${topic.id}/`;
      const html = read(path + 'index.html'); assert.ok(html.includes(topic.summary[lang].replaceAll('&', '&amp;')));
      assert.ok(topic.sections.every(s => s.body[lang].length > 100)); assert.equal(html.includes('Source review records a checked implementation') && lang === 'de', false);
    }
  }
});
test('all 18 distinct workflows are reachable and have specific evidence plus existing guides', () => {
  assert.equal(workflows.length, 18); assert.equal(new Set(workflows.map(w => w.nodes.evidence.explanation.en)).size, 18);
  for (const w of workflows) {
    const reached = new Set(); const walk = (id, route = []) => {
      assert.equal(route.includes(id), false); const node = w.nodes[id]; assert.ok(node); reached.add(id);
      for (const field of ['question', 'heading', 'explanation', 'hypothesis']) if (node[field]) for (const lang of ['en', 'de']) assert.ok(node[field][lang]);
      for (const choice of node.choices || []) { assert.ok(choice.label.de); walk(choice.next, [...route, id]); }
      for (const pid of node.problemIds || []) assert.ok(problemMap.has(pid));
    }; walk(w.start); assert.equal(reached.size, Object.keys(w.nodes).length);
  }
});
test('prepared sitemap covers each canonical page once, with truthful dates and reciprocal languages', () => {
  const xml = read('content/linux-hardware-explorer/prepared-launch-sitemap.xml');
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1]); assert.equal(entries.length, 330);
  const urls = entries.map(e => e.match(/<loc>([^<]+)<\/loc>/)[1]); assert.equal(new Set(urls).size, 330);
  for (const e of entries) { const url = e.match(/<loc>([^<]+)<\/loc>/)[1], path = new URL(url).pathname;
    assert.ok(manifest.pages[path]); assert.ok(e.includes(`<lastmod>${manifest.pages[path].lastmod}</lastmod>`));
    for (const lang of ['en', 'de', 'x-default']) assert.ok(e.includes(`hreflang="${lang}"`));
  }
  if (!state.sitemapActive) { assert.equal(read('sitemap-index.xml').includes('sitemap-linux-hardware-explorer.xml'), false); assert.equal(read('robots.txt').includes('sitemap-linux-hardware-explorer.xml'), false); }
});
test('numeric matching enforces actual subsystem, PCI class and USB interface qualifications', () => {
  const match = d => identifyDevices({ devices: [d] }, catalog)[0];
  const intel = parseIdentifier('pci:8086:095a'); assert.equal(match(intel).matches[0].reason, 'needs-subsystem-or-revision');
  intel.subsystemDevice = '5010'; assert.equal(match(intel).matches[0].profileId, 'wifi-intel-7265'); assert.equal(match(intel).coverage, 'curated-id');
  intel.subsystemDevice = '9999'; assert.equal(match(intel).coverage, 'unknown');
  const marvell = parseIdentifier('pci:1b4b:9123'); assert.equal(match(marvell).coverage, 'context-only'); marvell.classCode = '010601'; assert.equal(match(marvell).coverage, 'curated-id');
  marvell.classCode = '010400'; assert.equal(match(marvell).matches.some(m => m.profileId === 'marvell-88se912x-ahci'), false);
  const asix = parseIdentifier('usb:0b95:1790'); assert.equal(match(asix).coverage, 'context-only'); asix.usbInterfaceTriplets = ['ff:ff:00']; assert.equal(match(asix).coverage, 'curated-id');
  asix.usbInterfaceTriplets = ['03:01:01']; assert.equal(match(asix).matches.some(m => m.profileId === 'asix-ax88179-usb'), false);
});
test('short PCI class remains contextual while complete ProgIf can satisfy an AHCI rule', () => {
  let parsed = parseHardwareReport('01:00.0 SATA controller [0106]: Marvell [1b4b:9123] (prog-if 01 [AHCI 1.0])');
  assert.equal(parsed.devices[0].classCode, '010601'); assert.equal(identifyDevices(parsed, catalog)[0].coverage, 'curated-id');
  parsed = parseHardwareReport('01:00.0 USB controller [0c03]: Unknown [ffff:1234]');
  assert.equal(identifyDevices(parsed, catalog)[0].coverage, 'context-only'); assert.ok(identifyDevices(parsed, catalog)[0].ambiguous);
});
test('USB composite classes select Bluetooth only with the complete HCI interface triplet', () => {
  const raw = 'Bus 001 Device 002: ID ffff:1234 Composite\n bDeviceClass 0\n bInterfaceClass 224\n bInterfaceSubClass 1\n bInterfaceProtocol 1';
  assert.ok(identifyDevices(parseHardwareReport(raw), catalog)[0].matches.some(m => m.profileId === 'bluetooth-usb-hci-class'));
  assert.equal(identifyDevices(parseHardwareReport(raw.replace('bInterfaceProtocol 1', 'bInterfaceProtocol 2')), catalog)[0].matches.some(m => m.profileId === 'bluetooth-usb-hci-class'), false);
});
test('conflicting unbound versus bound observations cannot silently overwrite one another', () => {
  const parsed = parseHardwareReport('01:00.0 Network [0280]: Intel [8086:2723]\n Kernel driver in use: iwlwifi\nSlot: 01:00.0\nDriver: unbound');
  assert.equal(parsed.devices[0].binding, 'conflicting'); assert.equal(parsed.devices[0].boundDriver, null);
});
test('new browser code has no report uploads, persistent storage, remote imports or HTML sinks', () => {
  for (const path of ['app.js', 'core.js', 'controller.js', 'inspector-worker.js']) {
    const source = read('assets/linux-hardware-explorer/' + path);
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB)\b/);
    assert.doesNotMatch(source, /\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval)\b|new Function\b/);
    assert.doesNotMatch(source, /import\s+.*?from\s+['"]https?:/);
  }
  for (const path of Object.keys(manifest.pages)) {
    const html = read(path + 'index.html'); assert.ok(html.includes("connect-src 'none'")); assert.ok(html.includes("form-action 'none'")); assert.ok(html.includes('name="referrer" content="no-referrer"'));
    assert.doesNotMatch(html, /<script[^>]+src="https?:|<iframe|<form\b/);
  }
  const css = read('assets/linux-hardware-explorer/explorer.css'); assert.ok(css.includes('@media (max-width: 650px)')); assert.ok(css.includes(':focus-visible')); assert.ok(css.includes('prefers-reduced-motion')); assert.ok(css.includes('min-height: 44px'));
});
