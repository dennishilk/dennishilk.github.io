import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../traffic.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>\n?([\s\S]*?)<\/script>/g)];
const script = scripts.at(-1)?.[1];

const makeElement = () => {
  const element = {
    innerHTML: '',
    textContent: '',
    hidden: false,
    className: '',
    children: [],
    attributes: {},
    classList: { add(name) { element.className = `${element.className} ${name}`.trim(); }, remove(name) { element.className = element.className.split(/\s+/).filter(c => c && c !== name).join(' '); } },
    setAttribute(name, value) { this.attributes[name] = value; if (name === 'class') this.className = value; },
    appendChild(child) { this.children.push(child); return child; },
    remove() { this.removed = true; },
    querySelectorAll(selector) { const wanted = selector.split(',').map(s => s.trim().replace(/^\./, '').split('.')); return this.children.filter(child => wanted.some(parts => parts.every(part => child.className.split(/\s+/).includes(part)))); },
  };
  return element;
};

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

const runTrafficScript = async (responses, now = '2026-07-08T18:30:00.000Z', options = {}) => {
  assert.ok(script, 'traffic inline script should be found');
  const elements = new Map();
  const getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  };
  const intervalCallbacks = [];
  const timeoutCallbacks = [];
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return new RealDate(now).getTime(); }
    static parse(value) { return RealDate.parse(value); }
  }
  const context = {
    document: { hidden: false, getElementById, addEventListener() {}, createElementNS: () => makeElement() },
    window: {
      matchMedia: () => ({ matches: options.reducedMotion ?? true }),
      setInterval: (fn) => { intervalCallbacks.push(fn); return intervalCallbacks.length; },
      clearInterval() {},
      setTimeout: (fn, delay) => { timeoutCallbacks.push({ fn, delay }); return timeoutCallbacks.length; },
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
  return { getElementById, intervalCallbacks, timeoutCallbacks };
};


test('traffic dashboard card layout replaces Top Referrers with one compact signal matrix', () => {
  assert.doesNotMatch(html, /TOP REFERRERS/);
  assert.equal((html.match(/SIGNAL ACTIVITY MATRIX <span>\(24H\)<\/span>/g) || []).length, 1);
  assert.doesNotMatch(html, /top-referrers/);
  assert.doesNotMatch(html, /traffic-card timeline wide/);

  const rowPattern = /MOST OBSERVED PAGES[\s\S]*CRAWLER SPECIES[\s\S]*<article class="traffic-card signal-matrix-card"><h2>SIGNAL ACTIVITY MATRIX <span>\(24H\)<\/span>/;
  assert.match(html, rowPattern, 'matrix should occupy the former third card position after pages and crawler species');
  assert.match(html, /HONEYPOT/);
  assert.match(html, /OBSERVATION METHOD/);
  assert.match(html, /GLOBAL SIGNAL MAP/);
});


test('Wiesmoor is the only permanent map node and country data does not render persistent map dots', async () => {
  const { getElementById } = await runTrafficScript([basePayload({
    countries: [{ country: 'US', count: 4 }, { country: 'DE', count: 2 }, { country: 'AU', count: 1 }],
  })], '2026-07-08T18:30:00.000Z', { reducedMotion: true });

  const destination = getElementById('map-destination-node').innerHTML;
  assert.match(destination, /destination-node[\s\S]*WIESMOOR/);
  assert.match(destination, /cx="496" cy="137"/);
  assert.equal(getElementById('map-points').innerHTML, '', 'no non-Wiesmoor persistent map dots should render at rest');
  assert.equal(getElementById('map-signal-routes').innerHTML, '', 'reduced-motion idle state has no route-origin dots');
});

test('temporary decorative origin appears only during an active route and is removed after completion', async () => {
  const { getElementById, timeoutCallbacks } = await runTrafficScript([basePayload()], '2026-07-08T18:30:00.000Z', { reducedMotion: false });

  const routeLayer = getElementById('map-signal-routes');
  assert.equal(routeLayer.children.length, 1, 'one active route starts immediately');
  const activeRoute = routeLayer.children[0];
  assert.match(activeRoute.innerHTML, /class="signal-origin"/);
  assert.match(activeRoute.innerHTML, /signal-origin-halo" cx="260" cy="220"/);
  assert.match(activeRoute.innerHTML, /class="signal-arc"/);

  const completion = timeoutCallbacks.find(({ delay }) => delay === 3650);
  assert.ok(completion, 'route completion timeout should be registered');
  completion.fn();

  assert.match(activeRoute.className, /done/);
  assert.ok(activeRoute.removed, 'completed route group, including temporary origin marker, should be removed');
});

test('decorative map signals render for ZZ or unknown country data without deriving origins from payload', async () => {
  const { getElementById } = await runTrafficScript([basePayload({
    countries: [{ country: 'ZZ', count: 9 }, { country: 'UNKNOWN', count: 4 }],
    live_requests: [{ time: '12:00:00', kind: 'SCANNER', country: 'ZZ', path: '/unknown-origin' }],
  })], '2026-07-08T18:30:00.000Z', { reducedMotion: false });

  const routeLayer = getElementById('map-signal-routes');
  assert.equal(routeLayer.children.length, 1, 'one bounded decorative signal launches immediately');
  assert.match(routeLayer.children[0].innerHTML, /M260\.0 220\.0 Q[\s\S]*496\.0 137\.0/, 'first fixed decorative land origin routes toward Wiesmoor');
  assert.match(routeLayer.children[0].innerHTML, /signal-origin-halo" cx="260" cy="220"/, 'temporary origin marker uses first fixed decorative origin');
  assert.doesNotMatch(routeLayer.children[0].innerHTML, /ZZ|UNKNOWN|unknown-origin|12:00:00/);
  assert.match(routeLayer.children[0].className, /signal-route human/);
});

test('decorative map signal origins are fixed land-position constants and not derived from visitor fields', () => {
  assert.match(script, /const decorativeSignalOrigins = \[/);
  assert.match(script, /Visual-only, privacy-safe origins/);
  assert.match(script, /not derived from visitors, IPs, countries, paths, or identities/);

  const originsBlock = script.match(/const decorativeSignalOrigins = \[([\s\S]*?)\n  \];/)?.[1];
  assert.ok(originsBlock, 'decorative origins block should be present');
  const configuredOrigins = [...originsBlock.matchAll(/\{ code: "([^"]+)", xy: \[(\d+), (\d+)\], kind: "(human|bot)" \}/g)]
    .map(([, code, x, y, kind]) => ({ code, xy: [Number(x), Number(y)], kind }));

  assert.deepEqual(configuredOrigins, [
    { code: 'EASTERN_NORTH_AMERICA', xy: [260, 220], kind: 'human' },
    { code: 'WESTERN_NORTH_AMERICA', xy: [150, 190], kind: 'bot' },
    { code: 'NORTHERN_SOUTH_AMERICA', xy: [350, 335], kind: 'human' },
    { code: 'WESTERN_CENTRAL_EUROPE', xy: [500, 185], kind: 'human' },
    { code: 'SOUTHERN_AFRICA', xy: [535, 325], kind: 'bot' },
    { code: 'EAST_ASIA', xy: [815, 245], kind: 'human' },
    { code: 'SOUTHEAST_ASIA', xy: [745, 315], kind: 'bot' },
    { code: 'EASTERN_AUSTRALIA', xy: [860, 410], kind: 'human' },
  ]);
  assert.match(script, /signalState\.routes = decorativeSignalOrigins\.map[\s\S]*\.slice\(0, 6\)/);
  assert.doesNotMatch(script, /signalState\.routes = arr\(countries\)/);
  assert.doesNotMatch(script, /classifyRouteKind/);
});

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
