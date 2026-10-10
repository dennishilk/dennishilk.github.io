import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { build, articlePath, landingPath, escape } from '../scripts/build-linux-gaming-repair.mjs';
import { articles } from '../content/linux-gaming-repair/articles.mjs';
import { assistants, LAUNCH_OPTIONS } from '../assets/linux-gaming-repair/diagnostics.js';
import { LIMITS, parseLog } from '../assets/linux-gaming-repair/core.js';
import { acceptanceFixture } from '../assets/linux-gaming-repair/fixtures.js';
import { gamingDom } from './support/gaming-dom.mjs';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(join(root, path), 'utf8');
const html = lang => read(landingPath(lang).slice(1) + 'index.html');
let appImport = 0;
async function app(lang = 'en', options = {}) {
  const harness = gamingDom(html(lang), options);
  await import(`../assets/linux-gaming-repair/app.js?test=${++appImport}`);
  return { ...harness, get: id => harness.document.getElementById(id) };
}
async function completeLog(harness, text) {
  harness.get('gaming-log').value = text;
  await harness.get('analyze-log').click();
  const worker = harness.workers.at(-1);
  worker.emit({ id: worker.message.id, report: parseLog(worker.message.input) });
  return worker;
}

test('build is deterministic, preserves lastmod and records public route hashes', () => {
  const first = build();
  const second = build();
  assert.deepEqual(second, first);
  assert.equal(first.articleCount, 23);
  assert.equal(first.assistantCount, 6);
  assert.equal(Object.keys(first.pages).length, 48);
  for (const [path, page] of Object.entries(first.pages)) {
    const text = read(path.slice(1) + 'index.html');
    assert.equal(page.hash, createHash('sha256').update(text).digest('hex'));
    assert.match(page.lastmod, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('EN/DE pages have canonical pairs, private CSP, static substance and valid IDs', () => {
  for (const lang of ['en', 'de']) {
    const pages = [[landingPath(lang), html(lang)], ...articles.map(article => [articlePath(article.id, lang), read(articlePath(article.id, lang).slice(1) + 'index.html')])];
    for (const [path, page] of pages) {
      const en = path.replace(/^\/de\//, '/');
      assert.ok(page.includes(`href="https://www.dennishilk.com${path}"`));
      assert.ok(page.includes(`hreflang="en" href="https://www.dennishilk.com${en}"`));
      assert.ok(page.includes(`hreflang="de" href="https://www.dennishilk.com/de${en}"`));
      assert.match(page, /connect-src 'none'/);
      assert.match(page, /worker-src 'self'/);
      assert.match(page, /<noscript>/);
      assert.doesNotMatch(page, /undefined|\[object Object\]/);
      const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
      assert.equal(new Set(ids).size, ids.length, path);
      for (const match of page.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `${path}#${match[1]}`);
      const structured = JSON.parse(page.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1]);
      assert.ok(structured['@graph'].some(item => item['@type'] === 'BreadcrumbList'));
      if (path !== landingPath(lang)) {
        assert.ok(structured['@graph'].some(item => item['@type'] === 'TechArticle'));
        assert.match(page, /id="diagnostics"/);
        assert.match(page, /id="safe-test"/);
        assert.match(page, /id="sources"/);
      }
    }
    const landing = html(lang);
    for (const id of ['assistants', 'log-inspector', 'graphics', 'launch-options', 'performance', 'knowledge']) assert.ok(landing.includes(`id="${id}"`));
    for (const assistant of assistants) assert.ok(landing.includes(`data-assistant="${assistant.id}"`));
    for (const option of LAUNCH_OPTIONS.filter(option => !['mesaDiscrete', 'nvidiaPrime'].includes(option.id))) assert.ok(landing.includes(`name="${option.id}"`));
    assert.ok(landing.includes(escape(acceptanceFixture.limitations[lang])));
  }
});

test('all generated diagnostic relationships point to existing static routes', () => {
  const integration = JSON.parse(read('content/linux-gaming-repair/integration.json'));
  for (const article of articles) {
    for (const id of article.fixLab || []) assert.ok(integration.articlesByProblem[id].some(item => item.id === article.id));
    for (const id of article.hardware || []) assert.ok(integration.articlesByHardware[id].some(item => item.id === article.id));
  }
  for (const lang of ['en', 'de']) for (const path of [landingPath(lang), ...articles.map(article => articlePath(article.id, lang))]) {
    for (const match of read(path.slice(1) + 'index.html').matchAll(/href="(\/(?:de\/)?linux-(?:gaming-repair|hardware-explorer|fix-lab)\/[^"#]*)/g)) assert.ok(existsSync(join(root, match[1], 'index.html')), `${path} -> ${match[1]}`);
  }
});

test('runtime source has no network, storage or raw HTML sinks; static escape contains hostile markup', () => {
  const source = read('assets/linux-gaming-repair/app.js');
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage)\b|\.innerHTML\b|insertAdjacentHTML/);
  assert.doesNotMatch(source, /location\.(?:search|hash)|URLSearchParams/);
  assert.doesNotMatch(source, /new Blob\(\[logInput|writeText\(logInput/);
  assert.equal(escape('<img src=x onerror="alert(1)">&'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;');
});

test('all EN/DE assistants support semantic button activation, back/restart and assistant-only summaries', async () => {
  for (const lang of ['en', 'de']) {
    const harness = await app(lang);
    try {
      for (const assistant of assistants) {
      const control = harness.document.querySelector(`[data-assistant="${assistant.id}"]`);
      assert.equal(control.tagName, 'BUTTON');
      assert.equal(control.type, 'button');
      await control.activateKey('Enter');
      assert.equal(control.getAttribute('aria-pressed'), 'true');
      assert.ok(harness.get('assistant-panel').textContent.includes(assistant.nodes[assistant.start].question[lang]));
      assert.equal(harness.document.activeElement.tagName, 'H3');
      assert.equal(harness.document.activeElement.tabIndex, -1);
      const choice = assistant.nodes[assistant.start].choices[0];
      await harness.document.querySelector(`[data-choice="${choice.id}"]`).activateKey(' ');
      assert.equal(harness.get('assistant-back').disabled, false);
      assert.ok(harness.get('diagnostic-summary').value.includes(choice.label[lang]));
      assert.equal(harness.get('summary-panel').hidden, false);
      await harness.get('assistant-back').activateKey('Enter');
      assert.equal(harness.get('assistant-back').disabled, true);
      assert.ok(!harness.get('diagnostic-summary').value.includes('\n→ ' + choice.label[lang]));
      await harness.document.querySelector(`[data-choice="${choice.id}"]`).click();
      await harness.get('assistant-restart').activateKey('Enter');
      assert.equal(harness.get('assistant-back').disabled, true);
      assert.ok(harness.get('diagnostic-summary').value.includes(assistant.nodes[assistant.start].question[lang]));
      await harness.get('assistant-summary').click();
      assert.equal(harness.document.activeElement.id, 'diagnostic-summary');
      }
    } finally { await harness.dispatchWindow('pagehide'); }
  }
});

test('log lifecycle analyzes locally, safely renders malicious evidence and rejects stale worker responses', async () => {
  const harness = await app();
  try {
    const fixture = await completeLog(harness, acceptanceFixture.log);
    assert.equal(fixture.terminated, true);
    assert.equal(harness.get('analyze-log').disabled, false);
    assert.ok(harness.get('log-results').children.length > 0);
    assert.ok(harness.get('diagnostic-summary').value.length > 0);
    const hostile = 'amdgpu: ring gfx timeout, <img src=x onerror="alert(1)"> /home/private-name/secret.log token=PRIVATE-TOKEN';
    await completeLog(harness, hostile);
    assert.equal(harness.get('log-results').querySelectorAll('img').length, 0);
    assert.ok(harness.get('log-results').textContent.includes('<img'));
    assert.doesNotMatch(harness.get('diagnostic-summary').value, /PRIVATE-TOKEN|private-name|onerror/);
    harness.get('gaming-log').value = 'amdgpu: ring gfx timeout';
    await harness.get('analyze-log').click();
    const stale = harness.workers.at(-1);
    harness.get('gaming-log').value = 'new excerpt';
    await harness.get('gaming-log').dispatch('input');
    assert.equal(stale.terminated, true);
    stale.emit({ id: stale.message.id, report: parseLog(stale.message.input) });
    assert.equal(harness.get('log-results').children.length, 0);
    assert.equal(harness.get('diagnostic-summary').value, '');
  } finally { await harness.dispatchWindow('pagehide'); }
});

test('oversize input, worker fallback and clear never parse a silent truncation or keep private fields', async () => {
  const harness = await app('de', { worker: false });
  try {
    harness.get('gaming-log').value = 'x'.repeat(LIMITS.characters + 1);
    await harness.get('analyze-log').click();
    assert.equal(harness.workers.length, 0);
    assert.equal(harness.get('log-results').children.length, 0);
    assert.match(harness.get('log-status').textContent, /Zeichengrenze/);
    harness.get('gaming-log').value = 'x'.repeat(256 * 1024 + 1);
    await harness.get('analyze-log').click();
    assert.match(harness.get('log-status').textContent, /256 Ki/);
    harness.get('gaming-log').value = 'amdgpu: ring gfx timeout';
    await harness.get('analyze-log').click();
    assert.match(harness.get('log-status').textContent, /Ersatzanalyse/);
    assert.ok(harness.get('log-results').children.length > 0);
    harness.get('graphics-input').value = '/home/private/graphics.txt';
    harness.get('performance-gpuUsage').value = '93';
    await harness.get('clear-log').click();
    assert.equal(harness.get('gaming-log').value, '');
    assert.equal(harness.get('graphics-input').value, '');
    assert.equal(harness.get('performance-gpuUsage').value, '');
    assert.equal(harness.get('log-results').children.length, 0);
    assert.equal(harness.get('summary-panel').hidden, true);
  } finally { await harness.dispatchWindow('pagehide'); }
});

test('local file reads handle size, cancellation and read errors without uploading', async () => {
  const harness = await app();
  try {
    harness.get('log-file').files = [{ size: LIMITS.characters + 1, text: () => assert.fail('oversized file read') }];
    await harness.get('log-file').dispatch('change');
    assert.match(harness.get('log-status').textContent, /1 MiB/);
    let resolveText;
    harness.get('log-file').files = [{ size: 20, text: () => new Promise(resolve => { resolveText = resolve; }) }];
    const pending = harness.get('log-file').dispatch('change');
    await harness.get('clear-log').click();
    resolveText('private restored text');
    await pending;
    assert.equal(harness.get('gaming-log').value, '');
    harness.get('log-file').files = [{ size: 20, text: async () => { throw new Error('read failed'); } }];
    await harness.get('log-file').dispatch('change');
    assert.match(harness.get('log-status').textContent, /Could not read/);
    assert.equal(harness.get('gaming-log').value, '');
  } finally { await harness.dispatchWindow('pagehide'); }
});

test('builder and copy use allow-listed choices, reject incompatible options and reset', async () => {
  const copied = [];
  const harness = await app('en', { clipboard: { async writeText(value) { copied.push(value); } } });
  try {
    const form = harness.get('launch-form');
    assert.equal(harness.get('launch-output').textContent, '%command%');
    form.elements.namedItem('protonLog').checked = true;
    await form.dispatch('change');
    assert.equal(harness.get('launch-output').textContent, 'PROTON_LOG=1 %command%');
    await harness.get('copy-launch').click();
    assert.equal(copied.at(-1), 'PROTON_LOG=1 %command%');
    form.elements.namedItem('wineD3D').checked = true;
    form.elements.namedItem('api').value = 'dx12';
    await form.dispatch('change');
    assert.equal(harness.get('copy-launch').disabled, true);
    assert.match(harness.get('launch-messages').textContent, /Direct3D 12/);
    await harness.get('reset-launch').click();
    assert.equal(harness.get('launch-output').textContent, '%command%');
    assert.equal(form.elements.namedItem('protonLog').checked, false);
    assert.equal(form.elements.namedItem('gpu').value, 'default');
  } finally { await harness.dispatchWindow('pagehide'); }
});

test('graphics, distro, performance and local knowledge search work in both languages', async () => {
  for (const lang of ['en', 'de']) {
    const harness = await app(lang);
    try {
      harness.get('graphics-input').value = 'VGA compatible controller [0300]: AMD Navi 44 [1002:7590]\nKernel driver in use: amdgpu\ndeviceName = AMD Radeon RX 9060 XT\ndriverName = radv';
      await harness.get('inspect-graphics').click();
      assert.ok(harness.get('graphics-results').children.length >= 4);
      assert.ok(harness.get('graphics-results').textContent.length > 100);
      harness.get('distro').value = 'nixos';
      await harness.get('distro').dispatch('change');
      assert.match(harness.get('distro-diagnostics').textContent, /hardware\.graphics\.enable32Bit/);
      assert.match(harness.get('distro-diagnostics').textContent, /nix-shell/);
      const form = harness.get('performance-form');
      await form.dispatch('submit');
      const emptyText = harness.get('performance-results').textContent;
      assert.match(emptyText, lang === 'de' ? /Mess|Beobacht|unbekannt|unvollständ/i : /measure|evidence|unknown|insufficient/i);
      form.elements.namedItem('gpuUsage').value = '98';
      form.elements.namedItem('frameTimeMs').value = '33';
      form.elements.namedItem('movementStalls').checked = true;
      await form.dispatch('submit');
      assert.notEqual(harness.get('performance-results').textContent, emptyText);
      harness.get('gaming-search').value = 'Vulkan';
      await harness.get('gaming-search').dispatch('input');
      const cards = harness.document.querySelectorAll('[data-gaming-guide]');
      assert.ok(cards.some(card => card.hidden));
      assert.ok(cards.some(card => !card.hidden));
      harness.get('gaming-search').value = 'unmatchable-query-xxx';
      await harness.get('gaming-search').dispatch('input');
      assert.ok(cards.every(card => card.hidden));
      assert.equal(harness.get('knowledge-empty').hidden, false);
      await harness.dispatchWindow('pageshow', { persisted: true });
      assert.equal(harness.get('graphics-input').value, '');
      assert.equal(form.elements.namedItem('gpuUsage').value, '');
      assert.equal(harness.get('gaming-search').value, '');
      assert.ok(cards.every(card => !card.hidden));
    } finally { await harness.dispatchWindow('pagehide'); }
  }
});

test('summary copy previews only the safe summary and falls back to manual selection', async () => {
  const harness = await app();
  try {
    await completeLog(harness, 'amdgpu: ring gfx timeout /home/private-person/game.exe token=PRIVATE-TOKEN');
    await harness.get('copy-summary').click();
    assert.equal(harness.get('diagnostic-summary').selected, true);
    assert.match(harness.get('summary-status').textContent, /manually/);
    assert.doesNotMatch(harness.get('diagnostic-summary').value, /PRIVATE-TOKEN|private-person/);
  } finally { await harness.dispatchWindow('pagehide'); }
});

test('summary download contains the reviewed metadata preview and never raw log input', async () => {
  const harness = await app('de');
  const originalCreate = URL.createObjectURL;
  let exportedBlob;
  URL.createObjectURL = blob => { exportedBlob = blob; return 'blob:local-summary-test'; };
  try {
    const privateLog = 'amdgpu: ring gfx timeout, /home/private-person/game.exe token=PRIVATE-TOKEN';
    await completeLog(harness, privateLog);
    const reviewed = harness.get('diagnostic-summary').value;
    await harness.get('download-summary').click();
    assert.equal(await exportedBlob.text(), reviewed);
    assert.doesNotMatch(await exportedBlob.text(), /PRIVATE-TOKEN|private-person|game\.exe/);
    assert.deepEqual(harness.downloads, [{ name: 'linux-gaming-diagnostic-summary-de.txt', href: 'blob:local-summary-test' }]);
  } finally {
    URL.createObjectURL = originalCreate;
    await harness.dispatchWindow('pagehide');
  }
});
