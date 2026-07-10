import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../traffic.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>\n?([\s\S]*?)<\/script>/g)];
const script = scripts.at(-1)?.[1];

const makeElement = () => ({
  innerHTML: '',
  textContent: '',
  hidden: false,
  className: '',
  classList: { add() {}, remove() {} },
  querySelectorAll() { return []; },
});

const basePayload = (overrides = {}) => ({
  generated_at: '2026-07-08T18:30:00.000Z',
  pageviews_today: 1,
  human_requests_today: 1,
  bot_requests_today: 0,
  requests_24h: 1,
  requests_total: 1,
  total_pageviews: 1,
  estimated_unique_visitors: 1,
  human_percent: 100,
  bot_percent: 0,
  hourly: [{ hour: '20', humans: 1, bots: 0, scanners: 0, total: 1 }],
  countries: [{ country: 'GB', count: 1 }],
  top_pages: [{ path: '/current-page', count: 1 }],
  crawler_species: [],
  top_referrers: [],
  live_requests: [{ time: '00:38:18', kind: 'HUMAN', country: 'GB', path: '/current-page' }],
  ...overrides,
});

const payload = (time, path, kind = 'HUMAN') => basePayload({
  bot_requests_today: kind === 'BOT' ? 1 : 0,
  live_requests: [{ time, kind, country: 'GB', path }],
  top_pages: [{ path, count: 1 }],
});

const runTrafficScript = async (responses, now = '2026-07-08T18:30:00.000Z') => {
  assert.ok(script, 'traffic inline script should be found');
  const elements = new Map();
  const getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  };
  const intervalCallbacks = [];
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return new RealDate(now).getTime(); }
    static parse(value) { return RealDate.parse(value); }
  }
  const context = {
    document: { hidden: false, getElementById, addEventListener() {} },
    window: {
      matchMedia: () => ({ matches: true }),
      setInterval: (fn) => { intervalCallbacks.push(fn); return intervalCallbacks.length; },
      clearInterval() {},
      setTimeout() {},
    },
    Date: FixedDate,
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
  return { getElementById, intervalCallbacks };
};

test('traffic page contains HONEYPOT title and exact visual metaphor sentence', () => {
  assert.match(html, /HONEYPOT/);
  assert.match(html, /<b><i class="live-dot"><\/i> LIVE<\/b>/);
  assert.match(html, /Honeypot is a visual observer metaphor; no dedicated trap service is operated\./);
});

test('traffic page re-renders live_requests on every poll', async () => {
  const { getElementById, intervalCallbacks } = await runTrafficScript([
    payload('00:38:18', '/old'),
    payload('20:30:42', '/fresh', 'BOT'),
  ]);
  assert.match(getElementById('request-stream').innerHTML, /00:38:18[\s\S]*\/old/);

  assert.equal(intervalCallbacks.length, 2, 'traffic and honeypot age intervals should be registered');
  await intervalCallbacks[0]();
  assert.match(getElementById('request-stream').innerHTML, /20:30:42[\s\S]*BOT[\s\S]*\/fresh/);
  assert.doesNotMatch(getElementById('request-stream').innerHTML, /00:38:18|\/old/);
});

test('honeypot renders privacy-safe recent scanner events and excludes raw request fields', async () => {
  const { getElementById } = await runTrafficScript([basePayload({
    scanner_intent: {
      total_scanner_requests: 42,
      top_intent: 'WORDPRESS PROBING',
      trapping_duration_seconds: 7322,
      last_probe_at: '2026-07-08T18:25:00.000Z',
      recent_events: [{
        timestamp: '2026-07-08T18:29:45.000Z',
        time: '18:29:45',
        intent_id: 'wordpress',
        intent_label: 'WORDPRESS PROBING',
        decorative_mask: '███.██.███.█',
        ip: '203.0.113.10', path: '/wp-login.php', method: 'GET', status: 404,
        userAgent: 'BadScanner', referrer: 'https://example.test',
      }],
    },
  })]);
  const rendered = getElementById('honeypot-body').innerHTML;
  assert.match(rendered, /18:29:45/);
  assert.match(rendered, /███\.██\.███\.█/);
  assert.match(rendered, /WORDPRESS PROBING/);
  assert.match(rendered, /PROBES TODAY[\s\S]*42/);
  assert.match(rendered, /TRAPPING SINCE[\s\S]*2 hours/);
  assert.match(rendered, /LAST PROBE[\s\S]*5 minutes ago/);
  assert.doesNotMatch(rendered, /203\.0\.113\.10|wp-login|GET|404|BadScanner|referrer|example\.test/);
});

test('honeypot duration formats under a minute, minutes, singular and plural hours, and singular and plural days', async () => {
  const cases = [
    [59, /less than a minute/],
    [60, /1 minute/],
    [720, /12 minutes/],
    [3600, /1 hour/],
    [36000, /10 hours/],
    [86400, /1 day/],
    [172800, /2 days/],
  ];
  for (const [seconds, expected] of cases) {
    const { getElementById } = await runTrafficScript([basePayload({ scanner_intent: { total_scanner_requests: 1, top_intent: 'SCAN', trapping_duration_seconds: seconds, last_probe_at: '2026-07-08T18:29:55.000Z', recent_events: [] } })]);
    assert.match(getElementById('honeypot-body').innerHTML, expected);
  }
});

test('honeypot last_probe_at formats defensively', async () => {
  const { getElementById } = await runTrafficScript([basePayload({ scanner_intent: { total_scanner_requests: 1, top_intent: 'SCAN', trapping_duration_seconds: -1, last_probe_at: 'not-a-date', recent_events: [] } })]);
  const rendered = getElementById('honeypot-body').innerHTML;
  assert.match(rendered, /TRAPPING SINCE[\s\S]*unavailable/);
  assert.match(rendered, /LAST PROBE[\s\S]*unavailable/);
});

test('honeypot shows missing scanner_intent fallback', async () => {
  const { getElementById } = await runTrafficScript([basePayload({ scanner_intent: undefined })]);
  assert.equal(getElementById('honeypot-body').textContent, 'offline / no probe feed available');
});

test('honeypot shows empty recent_events fallback while preserving aggregate totals', async () => {
  const { getElementById } = await runTrafficScript([basePayload({ scanner_intent: { total_scanner_requests: 7, top_intent: 'ADMIN PROBING', trapping_duration_seconds: 120, last_probe_at: '2026-07-08T18:29:59.000Z', recent_events: [] } })]);
  const rendered = getElementById('honeypot-body').innerHTML;
  assert.match(rendered, /No recent scanner probes observed\./);
  assert.match(rendered, /PROBES TODAY[\s\S]*7/);
});
