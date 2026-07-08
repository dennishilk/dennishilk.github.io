import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const scripts = [...readFileSync(new URL('../traffic.html', import.meta.url), 'utf8').matchAll(/<script(?:\s[^>]*)?>\n?([\s\S]*?)<\/script>/g)];
const script = scripts.at(-1)?.[1];

const makeElement = () => ({
  innerHTML: '',
  textContent: '',
  hidden: false,
  classList: { add() {}, remove() {} },
  querySelectorAll() { return []; },
});

const payload = (time, path, kind = 'HUMAN') => ({
  generated_at: '2026-07-08T18:30:00.000Z',
  pageviews_today: 1,
  human_requests_today: 1,
  bot_requests_today: kind === 'BOT' ? 1 : 0,
  requests_24h: 1,
  requests_total: 1,
  total_pageviews: 1,
  estimated_unique_visitors: 1,
  human_percent: 100,
  bot_percent: 0,
  hourly: [{ hour: '20', humans: 1, bots: 0, scanners: 0, total: 1 }],
  countries: [{ country: 'GB', count: 1 }],
  top_pages: [{ path, count: 1 }],
  crawler_species: [],
  top_referrers: [],
  live_requests: [{ time, kind, country: 'GB', path }],
});

test('traffic page re-renders live_requests on every poll', async () => {
  assert.ok(script, 'traffic inline script should be found');
  const elements = new Map();
  const getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  };
  const intervalCallbacks = [];
  const responses = [payload('00:38:18', '/old'), payload('20:30:42', '/fresh', 'BOT')];
  const context = {
    document: {
      hidden: false,
      getElementById,
      addEventListener() {},
    },
    window: {
      matchMedia: () => ({ matches: true }),
      setInterval: (fn) => { intervalCallbacks.push(fn); return intervalCallbacks.length; },
      clearInterval() {},
      setTimeout() {},
    },
    Date,
    Number,
    String,
    Math,
    Array,
    Object,
    RegExp,
    Intl,
    fetch: async () => ({ ok: true, json: async () => responses.shift() }),
  };

  vm.runInNewContext(script, context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(getElementById('request-stream').innerHTML, /00:38:18[\s\S]*\/old/);

  assert.equal(intervalCallbacks.length, 1, 'polling interval should be registered');
  await intervalCallbacks[0]();
  assert.match(getElementById('request-stream').innerHTML, /20:30:42[\s\S]*BOT[\s\S]*\/fresh/);
  assert.doesNotMatch(getElementById('request-stream').innerHTML, /00:38:18|\/old/);
});
