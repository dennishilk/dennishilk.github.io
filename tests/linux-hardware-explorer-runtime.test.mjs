import assert from 'node:assert/strict';
import test from 'node:test';
import { Worker as NodeWorker } from 'node:worker_threads';
import { LocalAnalysis } from '../assets/linux-hardware-explorer/controller.js';
import { parseHardwareReport, identifyDevices } from '../assets/linux-hardware-explorer/core.js';
import { catalog } from '../assets/linux-hardware-explorer/catalog.js';
import { workflows } from '../assets/linux-hardware-explorer/workflows.js';
import { hardwareDom } from './support/hardware-dom.mjs';

function controller(options = {}) {
  const workers = [], results = [], errors = [], timers = [];
  const control = new LocalAnalysis({ createWorker: () => { const w = { postMessage(data) { this.data = data; }, terminate() { this.stopped = true; } }; workers.push(w); return w; },
    onResult: value => results.push(value), onError: value => errors.push(value), schedule: fn => { timers.push(fn); return timers.length; }, cancel: () => {}, ...options });
  return { control, workers, results, errors, timers };
}
test('clearing analysis stops its Worker and rejects late private results', () => {
  const c = controller(); c.control.run('private', 'lspci'); const w = c.workers[0];
  c.control.clear(); w.onmessage({ data: { id: w.data.id, result: { private: true } } });
  assert.equal(w.stopped, true); assert.deepEqual(c.results, []);
});
test('a newer report supersedes the prior Worker and mismatched request IDs', () => {
  const c = controller(); c.control.run('old'); const old = c.workers[0]; c.control.run('new'); const next = c.workers[1];
  old.onmessage({ data: { id: old.data.id, result: 'old' } }); next.onmessage({ data: { id: 999, result: 'wrong' } });
  next.onmessage({ data: { id: next.data.id, result: 'new' } });
  assert.deepEqual(c.results, ['new']); assert.equal(old.stopped, true); assert.equal(next.stopped, true);
});
test('timeout and failed Worker creation leave no active analysis', () => {
  const c = controller(); c.control.run('report'); c.timers[0](); assert.deepEqual(c.errors, ['analysis-timeout']); assert.equal(c.workers[0].stopped, true);
  const fail = controller({ createWorker: () => { throw Error('blocked'); } }); fail.control.run('report'); assert.deepEqual(fail.errors, ['worker-unavailable']);
});
test('actual module Worker parses input and returns signature IDs without raw matched lines', async () => {
  const url = new URL('../assets/linux-hardware-explorer/inspector-worker.js', import.meta.url).href;
  const worker = new NodeWorker(`const {parentPort}=await import('node:worker_threads'); globalThis.self={postMessage:data=>parentPort.postMessage(data)}; await import(${JSON.stringify(url)}); parentPort.on('message',data=>self.onmessage({data}));`, { eval: true });
  try {
    const message = new Promise((resolve, reject) => { worker.once('message', resolve); worker.once('error', reject); });
    worker.postMessage({ id: 4, format: 'auto', report: '02:00.0 Network controller [0280]: Intel AX200 [8086:2723]\n\tKernel driver in use: iwlwifi\nfirmware: failed to load iwlwifi-example.ucode (-2)\nHost: SECRET-HOST' });
    const result = await message; assert.equal(result.id, 4); assert.equal(result.result.results[0].matches[0].profileId, 'wifi-intel-ax200');
    assert.equal(result.result.results[0].boundDriver, 'iwlwifi'); assert.ok(result.result.parsed.firmwareObservations);
    assert.equal(JSON.stringify(result).includes('SECRET-HOST'), false);
    for (const finding of result.result.findings) assert.deepEqual(Object.keys(finding).sort(), ['count', 'patternId', 'problemId']);
  } finally { await worker.terminate(); }
});

let serial = 0;
async function app(t, options = {}) {
  const env = hardwareDom(options), list = env.document.getElementById('hardware-profile-list');
  for (const p of catalog.profiles) { const node = new env.Node('li'); node.dataset.profile = p.id; list.append(node); }
  for (const w of workflows) env.add('button', w.id, { 'data-hardware-workflow': w.id });
  env.add('a', 'share', { 'data-hardware-share': '' });
  if (options.workerUnavailable) globalThis.Worker = undefined;
  t.after(() => env.dispatchWindow('pagehide'));
  await import(`../assets/linux-hardware-explorer/app.js?test=${serial++}`);
  return env;
}
function result(report) { const parsed = parseHardwareReport(report); return { parsed, results: identifyDevices(parsed, catalog), findings: [] }; }
function complete(env, report) { const w = env.workers.at(-1); w.emit({ id: w.message.id, result: result(report) }); }

test('real app events analyse multiple devices and expose working keyboard tabs', async t => {
  const env = await app(t), doc = env.document;
  await doc.getElementById('hardware-sample').click(); await doc.getElementById('hardware-analyse').click();
  assert.equal(env.workers.at(-1).options.type, 'module'); complete(env, doc.getElementById('hardware-report').value);
  const cards = doc.getElementById('hardware-results').querySelectorAll('article'); assert.equal(cards.length, 3);
  const tabs = cards[0].querySelectorAll('button').filter(n => n.getAttribute('role') === 'tab'); assert.equal(tabs.length, 6);
  await tabs[0].dispatch('keydown', { key: 'End' }); assert.equal(tabs[5].getAttribute('aria-selected'), 'true'); assert.equal(doc.activeElement, tabs[5]);
  await tabs[5].dispatch('keydown', { key: 'ArrowRight' }); assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
  const panel = doc.getElementById(tabs[0].getAttribute('aria-controls')); assert.equal(panel.hidden, false); assert.equal(panel.getAttribute('aria-labelledby'), tabs[0].id);
});
test('hostile labels remain text nodes and are absent from safe summary and sharing', async t => {
  let copied = '';
  const env = await app(t, { clipboard: { writeText: async value => { copied = value; } } }), doc = env.document;
  const raw = '01:00.0 VGA compatible controller [0300]: <img src=x onerror=steal()> SECRET-HOST [1002:67df]\n\tKernel driver in use: amdgpu';
  doc.getElementById('hardware-report').value = raw; await doc.getElementById('hardware-analyse').click(); complete(env, raw);
  assert.equal(doc.getElementById('hardware-results').querySelectorAll('img').length, 0);
  await doc.getElementById('hardware-copy-summary').click(); assert.equal(copied.includes('SECRET-HOST'), false); assert.equal(copied.includes('67df'), false);
  await doc.getElementById('share').click(); const dialog = doc.querySelector('dialog');
  assert.equal(dialog.textContent.includes('SECRET-HOST'), false);
  await dialog.querySelectorAll('button').find(n => n.textContent === 'X / Twitter').click();
  assert.equal(env.opened.length, 1); assert.equal(env.opened[0][0].includes('SECRET-HOST'), false); assert.equal(env.opened[0][2], 'noopener,noreferrer');
});
test('clear and pagehide remove input, redaction, exports and pending analysis', async t => {
  const env = await app(t), doc = env.document;
  await doc.getElementById('hardware-sample').click(); await doc.getElementById('hardware-analyse').click(); const w = env.workers.at(-1);
  await doc.getElementById('hardware-clear').click(); w.emit({ id: w.message.id, result: result('01:00.0 Device [0300]: AMD [1002:67df]') });
  assert.equal(doc.getElementById('hardware-report').value, ''); assert.equal(doc.getElementById('hardware-results').children.length, 0);
  doc.getElementById('hardware-report').value = 'serial: SECRET'; await doc.getElementById('hardware-redact').click();
  assert.equal(doc.getElementById('hardware-redacted').value.includes('SECRET'), false);
  await env.dispatchWindow('pagehide'); assert.equal(doc.getElementById('hardware-redacted').value, ''); assert.equal(doc.getElementById('hardware-redacted-panel').hidden, true);
});
test('late local file reads cannot repopulate a cleared report', async t => {
  const env = await app(t), input = env.document.getElementById('hardware-file'); let resolve;
  input.files = [{ size: 5, text: () => new Promise(done => { resolve = done; }) }];
  const read = input.dispatch('change'); await env.document.getElementById('hardware-clear').click(); resolve('SECRET'); await read;
  assert.equal(env.document.getElementById('hardware-report').value, '');
});
test('German language switch retains approved profile and workflow, never query or raw report', async t => {
  const env = await app(t, { hash: '#explorer?profile=wifi-intel-ax200&workflow=rfkill&node=qualify&report=SECRET&search=PRIVATE' });
  const doc = env.document; assert.ok(env.languageLink.href.includes('profile=wifi-intel-ax200')); assert.ok(env.languageLink.href.includes('node=qualify'));
  assert.equal(env.languageLink.href.includes('SECRET'), false); assert.equal(env.location.href.includes('PRIVATE'), false);
  doc.getElementById('hardware-report').value = 'RAW-PRIVATE'; await env.languageLink.click(); assert.equal(doc.getElementById('hardware-report').value, '');
  assert.ok(env.languageLink.href.startsWith('/de/linux-hardware-explorer/'));
});
test('all guided workflows move to evidence and back using the shared Lab engine', async t => {
  const env = await app(t, { language: 'de', path: '/de/linux-hardware-explorer/' }), doc = env.document;
  for (const w of workflows) {
    await doc.getElementById(w.id).click(); const panel = doc.getElementById('hardware-workflow-panel');
    await panel.querySelectorAll('button').find(n => n.textContent === w.nodes.start.choices[0].label.de).click();
    await panel.querySelectorAll('button').find(n => n.textContent === w.nodes.qualify.choices[0].label.de).click();
    assert.ok(panel.textContent.includes(w.nodes.evidence.explanation.de)); assert.ok(panel.querySelectorAll('a').length);
    await panel.querySelectorAll('button').find(n => n.textContent === 'Vorherige Frage').click();
    assert.ok(panel.textContent.includes(w.nodes.qualify.question.de));
  }
});
test('catalog filtering keeps search text private and supports category, ID and reset', async t => {
  const env = await app(t), doc = env.document;
  doc.getElementById('hardware-search').value = '8086:2723'; await doc.getElementById('hardware-search').dispatch('input');
  const visible = doc.getElementById('hardware-profile-list').children.filter(n => !n.hidden);
  assert.equal(visible.length, 1); assert.equal(visible[0].dataset.profile, 'wifi-intel-ax200'); assert.equal(env.location.href.includes('2723'), false);
  await doc.getElementById('hardware-search-reset').click(); assert.equal(doc.getElementById('hardware-profile-list').children.filter(n => !n.hidden).length, 154);
});
test('clipboard failure produces selected local text, then clear removes it', async t => {
  const env = await app(t, { clipboard: { writeText: async () => { throw Error('denied'); } } }), doc = env.document;
  await doc.getElementById('hardware-sample').click(); await doc.getElementById('hardware-analyse').click(); complete(env, doc.getElementById('hardware-report').value);
  await doc.getElementById('hardware-copy-summary').click(); assert.equal(doc.getElementById('hardware-copy-fallback').hidden, false); assert.equal(doc.getElementById('hardware-copy-fallback').selected, true);
  await doc.getElementById('hardware-clear').click(); assert.equal(doc.getElementById('hardware-copy-fallback').value, '');
});
test('unavailable Worker is explicit and leaves catalog filtering and workflows usable', async t => {
  const env = await app(t, { workerUnavailable: true }), doc = env.document;
  assert.equal(doc.getElementById('hardware-analyse').disabled, true);
  assert.match(doc.getElementById('hardware-parse-status').textContent, /analysis did not run/);
  await doc.getElementById('rfkill').click(); assert.ok(doc.getElementById('hardware-workflow-panel').textContent.includes(workflows.find(w => w.id === 'rfkill').nodes.start.question.en));
  doc.getElementById('hardware-search').value = '8086:2723'; await doc.getElementById('hardware-search').dispatch('input');
  assert.equal(doc.getElementById('hardware-profile-list').children.filter(n => !n.hidden).length, 1);
});
test('clipboard rejection after clearing cannot restore a private fallback field', async t => {
  let reject;
  const env = await app(t, { clipboard: { writeText: () => new Promise((_done, fail) => { reject = fail; }) } }), doc = env.document;
  await doc.getElementById('hardware-sample').click(); await doc.getElementById('hardware-analyse').click(); complete(env, doc.getElementById('hardware-report').value);
  const pending = doc.getElementById('hardware-copy-summary').click(); await doc.getElementById('hardware-clear').click(); reject(Error('denied')); await pending;
  assert.equal(doc.getElementById('hardware-copy-fallback').hidden, true); assert.equal(doc.getElementById('hardware-copy-fallback').value, '');
});
test('pagehide and BFcache restoration clear private search and edited share text', async t => {
  const env = await app(t, { hash: '#explorer?profile=wifi-intel-ax200&workflow=rfkill&node=qualify' }), doc = env.document;
  doc.getElementById('hardware-search').value = 'PRIVATE-HOST'; await doc.getElementById('hardware-search').dispatch('input');
  await doc.getElementById('share').click(); doc.querySelector('dialog').querySelector('textarea').value = 'PRIVATE-MESSAGE';
  doc.getElementById('hardware-report').value = 'PRIVATE-REPORT'; await env.dispatchWindow('pagehide'); await env.dispatchWindow('pageshow', { persisted: true });
  assert.equal(doc.getElementById('hardware-report').value, ''); assert.equal(doc.getElementById('hardware-search').value, '');
  assert.equal(doc.querySelector('dialog').querySelector('textarea').value, ''); assert.equal(doc.querySelector('dialog').open, false);
  assert.ok(doc.getElementById('hardware-workflow-panel').textContent.includes(workflows.find(w => w.id === 'rfkill').nodes.qualify.question.en));
});
test('large result sets render a bounded first page and allow explicit incremental inspection', async t => {
  const env = await app(t), doc = env.document;
  const lines = Array.from({ length: 50 }, (_, i) => `${Math.floor(i / 32).toString(16).padStart(2, '0')}:${(i % 32).toString(16).padStart(2, '0')}.0 Network controller [0280]: Intel [8086:2723]`).join('\n');
  doc.getElementById('hardware-report').value = lines; await doc.getElementById('hardware-analyse').click(); complete(env, lines);
  assert.equal(doc.getElementById('hardware-results').querySelectorAll('article').length, 12);
  await doc.getElementById('hardware-results').querySelectorAll('button').find(n => n.textContent === 'Show 12 more devices').click();
  assert.equal(doc.getElementById('hardware-results').querySelectorAll('article').length, 24);
});
test('public article supports sharing with no identification workbench or Worker activity', async t => {
  const path = '/de/linux-hardware-explorer/wifi-intel-ax200/';
  const env = hardwareDom({ language: 'de', path }), doc = env.document;
  for (const node of [...doc.body.children]) if (node.id?.startsWith('hardware-') && node.id !== 'hardware-ui-status') node.remove();
  doc.body.dataset.hardwareProfile = 'wifi-intel-ax200'; env.add('a', 'share', { 'data-hardware-share': '' });
  t.after(() => env.dispatchWindow('pagehide'));
  await import(`../assets/linux-hardware-explorer/app.js?test=${serial++}`);
  await doc.getElementById('share').click(); assert.equal(env.workers.length, 0);
  assert.equal(doc.querySelector('dialog').querySelector('input').value, 'https://www.dennishilk.com' + path);
  assert.equal(env.languageLink.href, '/linux-hardware-explorer/wifi-intel-ax200/');
});
