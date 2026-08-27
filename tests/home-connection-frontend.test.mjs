import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../traffic.html', import.meta.url), 'utf8');
const germanMirror = readFileSync(new URL('../de/traffic.html', import.meta.url), 'utf8');
const mirrorLoader = readFileSync(new URL('../world-observer-de-mirror-loader.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../home-connection.css', import.meta.url), 'utf8');
const script = readFileSync(new URL('../home-connection.js', import.meta.url), 'utf8');

const element = () => {
  const value = {
    attributes: {},
    className: '',
    dataset: {},
    hidden: false,
    href: '',
    innerHTML: '',
    textContent: '',
    setAttribute(name, content) { this.attributes[name] = String(content); },
  };
  return value;
};

const makeHarness = (language = 'en') => {
  const ids = [
    'home-connection-card', 'home-connection-state', 'home-download', 'home-upload', 'home-latency', 'home-jitter', 'home-test-data',
    'home-packet-loss', 'home-packet-loss-unit', 'home-account-usage', 'home-alltime', 'home-usage-since', 'home-usage-updated',
    'home-measured-at', 'home-server', 'home-ookla-link', 'home-starlink-link', 'home-connection-chart', 'home-chart-mode',
    'home-chart-min', 'home-chart-max', 'home-chart-current', 'home-chart-samples', 'home-referral-note', 'home-referral-terms',
  ];
  const elements = new Map(ids.map(id => [id, element()]));
  const context = {
    console,
    Date,
    Intl,
    Math,
    Number,
    String,
    TypeError,
    URL,
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe() { context.changeLanguage = this.callback; }
    },
    fetch: async () => { throw new Error('fetch disabled in unit test'); },
    document: {
      documentElement: { lang: language },
      getElementById: id => elements.get(id) || null,
      querySelectorAll: () => [],
    },
    window: {
      __DENNIS_WORLD_OBSERVER_MIRROR_SOURCE_PATH: language === 'de' ? '/traffic.html' : undefined,
      __HOME_CONNECTION_DISABLE_AUTO_START__: true,
      setInterval() { throw new Error('auto-start must remain disabled in tests'); },
    },
  };
  vm.runInNewContext(script, context);
  return { api: context.window.HomeConnectionObserver, elements, context };
};

const payload = (history = undefined) => ({
  schema: 1,
  connection: 'Starlink',
  probe: 'home-probe',
  generated_at: '2026-08-27T15:29:44Z',
  latest: {
    timestamp: '2026-08-27T15:29:44Z',
    download_mbps: 77.74,
    upload_mbps: 8.59,
    latency_ms: 23.96,
    jitter_ms: 0.12,
    packet_loss_percent: null,
    test_data_mb: 147.2,
    server: {
      name: 'Misaka Network, Inc.',
      location: 'Berlin',
      country: 'Germany',
      host: 'must-not-render.example',
      ip: '203.0.113.42',
    },
    result_url: 'https://www.speedtest.net/result/c/85dde6ec-9c62-4a85-96a6-c6ba1bbac915',
    interface: 'must-not-render',
    mac: '00:11:22:33:44:55',
  },
  history_24h: history ?? [{ timestamp: '2026-08-27T15:29:44Z', download_mbps: 77.74 }],
  usage: {
    all_time_gb: 3215,
    since: '2026-06-10',
    source: 'manual-starlink-account',
    updated_at: '2026-08-27',
  },
});

test('home connection is the final full-width dashboard panel with shared EN/DE assets', () => {
  const methodIndex = html.indexOf('class="traffic-card method-card"');
  const homeIndex = html.indexOf('id="home-connection-card"');
  assert.ok(methodIndex > 0 && homeIndex > methodIndex, 'home panel must follow the observation method at the bottom');
  assert.match(css, /\.home-connection-card\s*\{[\s\S]*grid-column:\s*1 \/ -1 !important/);
  assert.match(html, /home-connection\.css\?v=20260827-polish-3/);
  assert.match(html, /home-connection\.js\?v=20260827-polish-3/);
  assert.match(germanMirror, /world-observer-de-mirror-loader\.js\?v=20260827-traffic-1/);
  assert.match(mirrorLoader, /"\/de\/traffic\.html"/);
});

test('English home card contains clean English rather than mixed foundation labels', () => {
  const card = html.slice(html.indexOf('<article id="home-connection-card"'), html.indexOf('</article>', html.indexOf('<article id="home-connection-card"')));
  assert.match(card, /HOME CONNECTION/);
  assert.match(card, /DOWNLOAD · LATEST MEASUREMENT/);
  assert.match(card, /PUBLIC PERFORMANCE METRICS ONLY/);
  assert.doesNotMatch(card, /HEIMANSCHLUSS|LETZTE MESSUNG|GESAMTTRANSFER|KEINE ÖFFENTLICHE/);
});

test('language switch repaints existing telemetry in German and back to English', () => {
  const { api, elements, context } = makeHarness('en');
  const sample = payload();
  sample.latest.timestamp = new Date().toISOString();
  sample.history_24h[0].timestamp = sample.latest.timestamp;
  api.render(sample);
  const heading = element();
  heading.dataset.homeI18n = 'panelTitle';
  context.document.querySelectorAll = selector => selector === '[data-home-i18n]' ? [heading] : [];
  context.document.documentElement.lang = 'de';
  context.changeLanguage();
  assert.equal(heading.textContent, 'ECHTE STÜNDLICHE VERBINDUNGSTELEMETRIE');
  assert.equal(elements.get('home-download').textContent, '77,7');
  assert.equal(elements.get('home-alltime').textContent, '3,22 TB');
  assert.equal(elements.get('home-connection-state').textContent, 'AKTUELL');
  assert.equal(elements.get('home-chart-samples').textContent, '1 MESSPUNKT');
  context.document.documentElement.lang = 'en';
  context.changeLanguage();
  assert.equal(heading.textContent, 'REAL HOURLY CONNECTION TELEMETRY');
  assert.equal(elements.get('home-download').textContent, '77.7');
  assert.equal(elements.get('home-connection-state').textContent, 'CURRENT');
  assert.equal(elements.get('home-chart-samples').textContent, '1 SAMPLE');
});

test('real one-sample payload renders honestly, including nested server and actual Ookla result', () => {
  const { api, elements } = makeHarness('en');
  api.render(payload(), Date.parse('2026-08-27T16:29:44Z'));

  assert.equal(elements.get('home-download').textContent, '77.7');
  assert.equal(elements.get('home-upload').textContent, '8.6');
  assert.equal(elements.get('home-jitter').textContent, '0.12');
  assert.equal(elements.get('home-packet-loss').textContent, '—');
  assert.equal(elements.get('home-packet-loss-unit').textContent, 'NOT REPORTED');
  assert.equal(elements.get('home-alltime').textContent, '3.22 TB');
  assert.equal(elements.get('home-server').textContent, 'Misaka Network, Inc. · Berlin, Germany');
  assert.equal(elements.get('home-ookla-link').href, 'https://www.speedtest.net/result/c/85dde6ec-9c62-4a85-96a6-c6ba1bbac915');
  assert.equal(elements.get('home-connection-state').textContent, 'CURRENT');
  assert.match(elements.get('home-connection-state').className, /current/);
  assert.match(elements.get('home-connection-chart').innerHTML, /home-chart-single-marker/);
  assert.doesNotMatch(elements.get('home-connection-chart').innerHTML, /home-chart-line/);
  assert.match(elements.get('home-chart-mode').textContent, /1 REAL MEASUREMENT/);
  assert.doesNotMatch(elements.get('home-server').textContent, /\[object Object\]/);
});

test('two or more real samples connect without inventing a 24-hour series', () => {
  const history = [
    { timestamp: '2026-08-27T13:15:00Z', download_mbps: 61.2 },
    { timestamp: '2026-08-27T14:15:00Z', download_mbps: 83.4 },
    { timestamp: '2026-08-27T15:15:00Z', download_mbps: 77.7 },
  ];
  const { api, elements } = makeHarness('en');
  api.render(payload(history), Date.parse('2026-08-27T16:00:00Z'));
  const chart = elements.get('home-connection-chart');

  assert.match(chart.innerHTML, /<polyline class="home-chart-line"/);
  assert.match(chart.innerHTML, /<polygon class="home-chart-area"/);
  assert.equal((chart.innerHTML.match(/home-chart-point/g) || []).length, 3);
  assert.equal(elements.get('home-chart-samples').textContent, '3 SAMPLES');
  assert.match(elements.get('home-chart-mode').textContent, /3 REAL HOURLY MEASUREMENTS/);
  assert.equal(elements.get('home-chart-min').textContent, '61.2 Mbps');
  assert.equal(elements.get('home-chart-max').textContent, '83.4 Mbps');
});

test('hourly-source status thresholds are current through 95 minutes, delayed through 3 hours, then offline', () => {
  const { api } = makeHarness('en');
  const now = Date.parse('2026-08-27T18:00:00Z');
  assert.equal(api.statusForTimestamp(now - 74 * 60 * 1000, now).key, 'current');
  assert.equal(api.statusForTimestamp(now - 95 * 60 * 1000, now).key, 'current');
  assert.equal(api.statusForTimestamp(now - 95 * 60 * 1000 - 1, now).key, 'delayed');
  assert.equal(api.statusForTimestamp(now - 3 * 60 * 60 * 1000, now).key, 'delayed');
  assert.equal(api.statusForTimestamp(now - 3 * 60 * 60 * 1000 - 1, now).key, 'offline');
  assert.equal(api.statusForTimestamp('malformed', now).key, 'offline');
});

test('German mode renders German component status, null handling and decimal formatting', () => {
  const { api, elements, context } = makeHarness('de');
  api.render(payload(), Date.parse('2026-08-27T16:29:44Z'));
  assert.equal(context.document.documentElement.lang, 'de');
  assert.equal(elements.get('home-connection-state').textContent, 'AKTUELL');
  assert.equal(elements.get('home-packet-loss-unit').textContent, 'NICHT GEMELDET');
  assert.equal(elements.get('home-alltime').textContent, '3,22 TB');
  assert.match(elements.get('home-chart-mode').textContent, /1 ECHTE MESSUNG/);
});

test('frontend only renders allowlisted server fields and rejects unsafe result URLs', () => {
  const { api, elements } = makeHarness('en');
  api.render(payload(), Date.parse('2026-08-27T16:29:44Z'));
  const rendered = [...elements.values()].map(item => `${item.textContent}\n${item.innerHTML}\n${item.href}`).join('\n');

  assert.doesNotMatch(rendered, /203\.0\.113\.42|00:11:22:33:44:55|must-not-render|interface/i);
  assert.equal(api.formatServer({ name: 'Safe', location: 'Berlin', country: 'Germany', hostname: 'secret.internal' }), 'Safe · Berlin, Germany');
  assert.equal(api.formatServer({ toString: () => '[object Object]' }), 'NOT REPORTED');
  assert.equal(api.safeResultUrl('javascript:alert(1)'), 'https://www.speedtest.net/');
  assert.equal(api.safeResultUrl('https://evil.example/result/c/123'), 'https://www.speedtest.net/');
});

test('component preserves cache bypass, safe links, reduced motion and responsive layouts', () => {
  assert.equal(makeHarness('en').api.ENDPOINT, '/data/home-connection/current.json');
  assert.match(script, /fetch\(`\$\{ENDPOINT\}\?t=\$\{Date\.now\(\)\}`,[\s\S]*cache: "no-store"/);
  assert.match(html, /id="home-ookla-link"[^>]*target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /id="home-starlink-link"[^>]*target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /https:\/\/starlink\.com\?referral=RC-DF-12369685-91594-14/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*\.home-connection-chart \{ height: 180px; \}/);
  assert.match(css, /font-size:\s*clamp\(3\.7rem, 8vw, 7\.5rem\)/);
});


test('both languages use exact cadence boundaries and never substitute publication time', () => {
  const now = Date.parse('2026-08-27T18:00:00Z');
  for (const [language, labels] of [['en', ['CURRENT', 'DELAYED', 'OFFLINE']], ['de', ['AKTUELL', 'VERZÖGERT', 'OFFLINE']]]) {
    const { api, elements } = makeHarness(language);
    for (const [age, index] of [[74 * 60000, 0], [95 * 60000, 0], [95 * 60000 + 1, 1], [180 * 60000, 1], [180 * 60000 + 1, 2]]) {
      assert.equal(api.statusForTimestamp(now - age, now).label, labels[index]);
    }
    const data = payload();
    data.latest.timestamp = null;
    data.generated_at = new Date(now).toISOString();
    api.render(data, now);
    assert.equal(elements.get('home-connection-state').textContent, labels[2]);
    assert.equal(elements.get('home-measured-at').textContent, '—');
  }
});

test('referral fallback removes personal and free-month claims in both languages', () => {
  for (const language of ['en', 'de']) {
    const { elements } = makeHarness(language);
    assert.equal(elements.get('home-referral-note').hidden, true);
    assert.equal(elements.get('home-starlink-link').href, language === 'de' ? 'https://starlink.com/de/' : 'https://starlink.com/');
    assert.doesNotMatch(elements.get('home-starlink-link').textContent, /FREE|GRATIS|DENNIS/i);
    assert.equal(elements.get('home-referral-terms').href, language === 'de' ? 'https://starlink.com/de/referrals' : 'https://starlink.com/referrals');
  }
  const { context, elements } = makeHarness('en');
  elements.get('home-starlink-link').dataset.referralUrl = 'https://starlink.com?referral=RC-DF-12369685-91594-14';
  context.document.documentElement.lang = 'de';
  context.changeLanguage();
  assert.equal(elements.get('home-referral-note').hidden, false);
  assert.equal(elements.get('home-starlink-link').href, elements.get('home-starlink-link').dataset.referralUrl);
  assert.equal(elements.get('home-starlink-link').textContent, 'DENNIS’ STARLINK-EMPFEHLUNG →');
});

test('usage dates are localized and absent usage never becomes a false zero', () => {
  for (const [language, since] of [['en', 'SINCE 10 JUN 2026'], ['de', 'SEIT 10. JUNI 2026']]) {
    const { api, elements } = makeHarness(language);
    const data = payload();
    api.render(data);
    assert.equal(elements.get('home-usage-since').textContent, since);
    data.usage.all_time_gb = null;
    api.render(data);
    assert.equal(elements.get('home-account-usage').hidden, true);
  }
});
