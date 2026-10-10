import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const { ENDPOINT, POLL_INTERVAL_MS, validateSnapshot, snapshotState, formatBytes, renderStorage, startStorageObserver } =
  createRequire(import.meta.url)('../nebuverse-storage.js');
const html = readFileSync(new URL('../traffic.html', import.meta.url), 'utf8');
const GIB = 1024 ** 3;
const NOW = Date.parse('2026-10-10T13:40:00Z');
const sample = (total = 2 * GIB, free = 20 * GIB) => ({
  schema_version: 1, status: total >= 5 * GIB || free < 10 * GIB ? 'warning' : 'ok',
  measured_at: '2026-10-10T13:40:00Z', stale_after_seconds: 1200,
  storage: { media_bytes: total, database_bytes: 0, total_bytes: total, available_bytes: free },
  thresholds: { usage_warning_bytes: 5 * GIB, free_warning_bytes: 10 * GIB },
});

// Elements are grounded in the shipped markup; missing IDs cannot be invented.
function makeDocument(language = 'en') {
  const elements = new Map();
  const labels = [];
  for (const match of html.matchAll(/<([\w-]+)\b([^>]*)>([^<]*)/g)) {
    const attributes = Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(value => [value[1], value[2]]));
    const element = {
      textContent: match[3], hidden: /\bhidden\b/.test(match[2]), attributes, dataset: {},
      setAttribute(name, value) { this.attributes[name] = String(value); },
      removeAttribute(name) { delete this.attributes[name]; },
    };
    if (attributes['data-storage-copy']) { element.dataset.storageCopy = attributes['data-storage-copy']; labels.push(element); }
    if (attributes.id) elements.set(attributes.id, element);
  }
  elements.get('nebuverse-storage').querySelectorAll = selector => {
    assert.equal(selector, '[data-storage-copy]');
    return labels;
  };
  const listeners = new Map();
  return {
    hidden: false, documentElement: { lang: language },
    getElementById: id => elements.get(id), labels,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name), listeners,
  };
}

function makeWindow() {
  const intervals = new Map(), timeouts = new Map();
  let id = 0;
  return {
    intervals, timeouts,
    setInterval(callback, ms) { assert.equal(ms, POLL_INTERVAL_MS); intervals.set(++id, callback); return id; },
    clearInterval(key) { intervals.delete(key); },
    setTimeout(callback, ms) { assert.equal(ms, 8000); timeouts.set(++id, callback); return id; },
    clearTimeout(key) { timeouts.delete(key); },
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const response = payload => new Response(JSON.stringify(payload), { status: 200 });

test('zero measurements are valid while missing values remain unknown', () => {
  assert.equal(validateSnapshot(sample(0, 10 * GIB), NOW).status, 'ok');
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(null), '—');
  assert.equal(formatBytes(undefined), '—');
  const doc = makeDocument();
  renderStorage(doc, null, { now: NOW });
  for (const field of ['media', 'database', 'total', 'available']) assert.equal(doc.getElementById(`nebuverse-${field}`).textContent, '—');
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Awaiting telemetry');
  assert.equal(doc.getElementById('nebuverse-warning').textContent, '—');
  assert.equal(doc.getElementById('nebuverse-threshold').hidden, true);
});

for (const [name, change] of [
  ['null payload', () => null], ['unsupported schema', p => ({ ...p, schema_version: 2 })],
  ['string byte count', p => { p.storage.media_bytes = '0'; return p; }],
  ['null byte count', p => { p.storage.available_bytes = null; return p; }],
  ['negative bytes', p => { p.storage.database_bytes = -1; return p; }],
  ['unsafe integer', p => { p.storage.available_bytes = Number.MAX_SAFE_INTEGER + 1; return p; }],
  ['fractional bytes', p => { p.storage.database_bytes = 1.5; return p; }],
  ['incorrect total', p => { p.storage.total_bytes++; return p; }],
  ['zero warning threshold', p => { p.thresholds.usage_warning_bytes = 0; return p; }],
  ['invalid expiry', p => { p.stale_after_seconds = 86401; return p; }],
  ['timezone-less timestamp', p => { p.measured_at = '2026-10-10T13:40:00'; return p; }],
  ['impossible date', p => { p.measured_at = '2026-02-30T00:00:00Z'; return p; }],
  ['future timestamp', p => { p.measured_at = '2026-10-10T13:41:01Z'; return p; }],
  ['incorrect warning status', p => { p.status = 'warning'; return p; }],
]) test(`rejects ${name}`, () => assert.throws(() => validateSnapshot(change(sample()), NOW), /storage/));

test('freshness expires at its configured boundary and failed refreshes never look current', () => {
  const p = validateSnapshot(sample(), NOW);
  assert.equal(snapshotState(p, null, NOW + 1199_999), 'current');
  assert.equal(snapshotState(p, null, NOW + 1200_000), 'stale');
  assert.equal(snapshotState(p, 'unavailable', NOW), 'unavailable');
  assert.equal(snapshotState(p, 'unavailable', NOW + 1200_000), 'stale');
  assert.equal(snapshotState(p, null, NOW - 61_000), 'unavailable');
});

test('warning boundaries preserve at least 5 GiB used and strictly below 10 GiB free', () => {
  assert.equal(validateSnapshot(sample(5 * GIB - 1, 10 * GIB), NOW).status, 'ok');
  const doc = makeDocument();
  for (const [total, free, message] of [
    [5 * GIB, 10 * GIB, 'Storage threshold reached'],
    [2 * GIB, 10 * GIB - 1, 'Low disk space'],
    [5 * GIB, 10 * GIB - 1, 'Storage threshold reached · Low disk space'],
  ]) {
    renderStorage(doc, validateSnapshot(sample(total, free), NOW), { now: NOW });
    assert.equal(doc.getElementById('nebuverse-warning').textContent, message);
  }
});

test('adjusted thresholds reach the meter and copy without a frontend change', () => {
  const doc = makeDocument();
  const p = sample(2 * GIB, 20 * GIB);
  p.thresholds = { usage_warning_bytes: 3 * GIB, free_warning_bytes: 12 * GIB };
  renderStorage(doc, validateSnapshot(p, NOW), { now: NOW });
  assert.equal(doc.getElementById('nebuverse-meter').max, 3 * GIB);
  assert.equal(doc.getElementById('nebuverse-thresholds').textContent, 'Warning at 3 GiB used or below 12 GiB free.');
});

test('stale data retains actual values and the successful measurement timestamp', () => {
  const doc = makeDocument();
  renderStorage(doc, validateSnapshot(sample(), NOW), { now: NOW + 1200_000 });
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Stale data');
  assert.equal(doc.getElementById('nebuverse-total').textContent, '2 GiB');
  assert.equal(doc.getElementById('nebuverse-measured').dateTime, '2026-10-10T13:40:00Z');
  assert.match(doc.getElementById('nebuverse-measured').textContent, /15:40:00.*Europe\/Berlin/);
  assert.match(doc.getElementById('nebuverse-note').textContent, /overdue/);
});

test('German mirror receives localized states, labels and decimal formatting', () => {
  const doc = makeDocument('de');
  renderStorage(doc, sample(1.5 * GIB), { now: NOW, language: 'de' });
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Aktuell');
  assert.equal(doc.getElementById('nebuverse-total').textContent, '1,5 GiB');
  assert.equal(doc.labels.find(element => element.dataset.storageCopy === 'instance').textContent, 'Persönliche Mastodon-Instanz');
  assert.equal(doc.getElementById('nebuverse-warning').textContent, 'Innerhalb der Grenzwerte');
});

test('extra fields are discarded and never rendered', () => {
  const p = sample();
  p.private_path = '/private/example';
  p.error = '<script>alert(1)</script>';
  p.storage.hostname = 'private.example';
  const clean = validateSnapshot(p, NOW);
  assert.equal(clean.private_path, undefined);
  assert.equal(clean.storage.hostname, undefined);
  const doc = makeDocument();
  renderStorage(doc, clean, { now: NOW });
  assert.doesNotMatch(JSON.stringify(doc.labels), /private\.example|alert\(1\)/);
});

test('404 awaits installation, then polls independently and retains data after failure', async () => {
  const doc = makeDocument(), win = makeWindow(), requests = [];
  let currentTime = NOW;
  const responses = [new Response('', { status: 404 }), response(sample()), new Response('', { status: 503 })];
  const observer = startStorageObserver({ doc, win, now: () => currentTime, fetchSnapshot: async (url, options) => {
    requests.push({ url, options }); return responses.shift();
  } });
  await settle();
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Awaiting telemetry');
  await observer.refresh();
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Up to date');
  await observer.refresh();
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Data unavailable');
  assert.equal(doc.getElementById('nebuverse-total').textContent, '2 GiB');
  assert.match(doc.getElementById('nebuverse-note').textContent, /refresh failed/);
  currentTime += 1200_000;
  await observer.refresh();
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Stale data');
  for (const { url, options } of requests) {
    assert.equal(url.split('?')[0], ENDPOINT);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.mode, 'same-origin');
    assert.equal(options.cache, 'no-store');
  }
  observer.stop();
  assert.equal(win.intervals.size, 0);
});

for (const [name, fetchSnapshot] of [
  ['malformed JSON', async () => new Response('{')],
  ['oversized JSON', async () => new Response(' '.repeat(4097))],
  ['invalid schema', async () => response({})],
  ['network failure', async () => { throw new Error('private network failure'); }],
  ['redirected response', async () => ({ ok: true, redirected: true, status: 200 })],
]) test(`${name} shows unavailable metrics without publishing error details`, async () => {
  const doc = makeDocument(), win = makeWindow();
  const observer = startStorageObserver({ doc, win, now: () => NOW, fetchSnapshot });
  await settle();
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Data unavailable');
  assert.equal(doc.getElementById('nebuverse-total').textContent, '—');
  assert.equal(doc.getElementById('nebuverse-note').textContent, 'The storage snapshot could not be loaded.');
  observer.stop();
});

test('timeout aborts a request, prevents overlap and releases the next poll', async () => {
  const doc = makeDocument(), win = makeWindow();
  let calls = 0;
  const observer = startStorageObserver({ doc, win, now: () => NOW, fetchSnapshot: async (_, options) => {
    calls++;
    if (calls > 1) return response(sample());
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('Aborted'))));
  } });
  await observer.refresh();
  assert.equal(calls, 1);
  [...win.timeouts.values()][0]();
  await settle();
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Data unavailable');
  await observer.refresh();
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Up to date');
  observer.stop();
});

test('older responses cannot replace the latest successful measurement', async () => {
  const doc = makeDocument(), win = makeWindow();
  const older = sample(); older.measured_at = '2026-10-10T13:39:00Z';
  const responses = [response(sample()), response(older)];
  const observer = startStorageObserver({ doc, win, now: () => NOW, fetchSnapshot: async () => responses.shift() });
  await settle();
  await observer.refresh();
  assert.equal(doc.getElementById('nebuverse-measured').dateTime, '2026-10-10T13:40:00Z');
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Data unavailable');
  observer.stop();
});

test('hidden pages pause requests and refresh on return to the German mirror', async () => {
  const doc = makeDocument(), win = makeWindow();
  doc.hidden = true;
  win.__DENNIS_WORLD_OBSERVER_MIRROR_SOURCE_PATH = '/traffic.html';
  let calls = 0;
  const observer = startStorageObserver({ doc, win, now: () => NOW, fetchSnapshot: async () => { calls++; return response(sample()); } });
  await settle();
  assert.equal(calls, 0);
  doc.hidden = false;
  doc.listeners.get('visibilitychange')();
  await settle();
  assert.equal(calls, 1);
  assert.equal(doc.getElementById('nebuverse-state').textContent, 'Aktuell');
  observer.stop();
});

test('real collector output satisfies the frontend contract and renders from local fixture metadata', () => {
  const root = mkdtempSync(join(tmpdir(), 'nebuverse-integration-'));
  try {
    mkdirSync(join(root, 'media')); mkdirSync(join(root, 'database')); mkdirSync(join(root, 'public'));
    writeFileSync(join(root, 'media', 'upload'), 'test media');
    writeFileSync(join(root, 'database', 'sqlite.db'), 'test database metadata fixture');
    const output = join(root, 'public', 'storage.json');
    writeFileSync(join(root, 'config.json'), JSON.stringify({ media_path: join(root, 'media'), database_path: join(root, 'database', 'sqlite.db'), output_path: output }));
    const result = spawnSync('python3', [new URL('../scripts/collect-nebuverse-storage.py', import.meta.url).pathname, '--config', join(root, 'config.json')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const text = readFileSync(output, 'utf8');
    assert.doesNotMatch(text, new RegExp(root));
    const p = validateSnapshot(JSON.parse(text));
    const doc = makeDocument();
    renderStorage(doc, p);
    assert.equal(doc.getElementById('nebuverse-state').textContent, 'Up to date');
    assert.notEqual(doc.getElementById('nebuverse-media').textContent, '—');
    assert.equal(doc.getElementById('nebuverse-measured').dateTime, p.measured_at);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
