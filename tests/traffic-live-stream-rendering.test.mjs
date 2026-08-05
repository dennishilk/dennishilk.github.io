import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../traffic.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../content/lost-administrator/novel/novel-manifest.json', import.meta.url), 'utf8'));
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
    fetch: async (url) => String(url).includes('/content/lost-administrator/novel/novel-manifest.json') ? ({ ok: true, json: async () => manifest }) : ({ ok: true, json: async () => responses.shift() }),
  };
  vm.runInNewContext(script, context);
  await new Promise((resolve) => setImmediate(resolve));
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
  assert.match(html, /NOVEL READER SIGNAL/);
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

test('traffic page replaces the visual honeypot with an honest novel reader signal', () => {
  assert.match(html, /NOVEL READER SIGNAL/);
  assert.match(html, /EST\. READERS · 24H/);
  assert.doesNotMatch(html, /CHAPTER OPENS · TODAY/);
  assert.match(html, /not evidence of completion, reading time, or progress/);
  assert.doesNotMatch(html, /HONEYPOT|Honeypot|honeypot-body|renderHoneypot/);
});

test('traffic page re-renders live requests and novel aggregates on every poll', async () => {
  const novel = { today: { novel_pageviews: 3, chapter_opens: 2 }, last_24_hours: { estimated_readers: 2, most_opened_chapter: { title: 'Day Zero', chapter_opens: 2 } }, all_time: { chapter_opens: 10 } };
  const { getElementById, intervalCallbacks } = await runTrafficScript([
    payload('00:38:18', '/old'),
    payload('20:30:42', '/fresh', 'BOT'),
  ].map(value => ({ ...value, novel_reader: novel })));
  assert.match(getElementById('request-stream').innerHTML, /00:38:18[\s\S]*\/old/);
  assert.match(getElementById('novel-reader-body').innerHTML, /NOVEL PAGEVIEWS · TODAY[\s\S]*3[\s\S]*EST\. READERS · 24H[\s\S]*2[\s\S]*CHAPTER OPENS · ALL TIME[\s\S]*10[\s\S]*Day Zero/);
  assert.doesNotMatch(getElementById('novel-reader-body').innerHTML, /CHAPTER OPENS · TODAY/);
  assert.equal(intervalCallbacks.length, 1, 'only the 30-second traffic polling interval should be registered');
  await intervalCallbacks[0]();
  assert.match(getElementById('request-stream').innerHTML, /20:30:42[\s\S]*BOT[\s\S]*\/fresh/);
});



test('novel reader most-opened chapter resolves to the canonical published chapter link', async () => {
  const novel = { today: { novel_pageviews: 3 }, last_24_hours: { estimated_readers: 2, most_opened_chapter: { title: 'No Such Vehicle', chapter_opens: 3 } }, all_time: { chapter_opens: 10 } };
  const { getElementById } = await runTrafficScript([basePayload({ novel_reader: novel })]);
  const body = getElementById('novel-reader-body').innerHTML;
  const chapter = manifest.chapters.find(({ number }) => number === 6);

  assert.equal(chapter.title, 'No Such Vehicle');
  assert.match(body, new RegExp(`<a class="novel-reader-top novel-reader-top-link" href="/lost-administrator/novel/chapters/${chapter.slug}/" aria-label="Open Chapter 06 — No Such Vehicle">[\\s\\S]*No Such Vehicle · 3 opens[\\s\\S]*</a>`));
  assert.match(body, /<em aria-hidden="true">OPEN CHAPTER →<\/em>/);
  assert.doesNotMatch(body, /target="_blank"/);
});

test('novel reader links follow whichever reported chapter resolves through manifest metadata', async () => {
  const novel = { today: { novel_pageviews: 5 }, last_24_hours: { estimated_readers: 1, most_opened_chapter: { slug: 'day-zero', title: 'Day Zero', chapter_opens: 4 } }, all_time: { chapter_opens: 12 } };
  const { getElementById } = await runTrafficScript([basePayload({ novel_reader: novel })]);

  assert.match(getElementById('novel-reader-body').innerHTML, /<a class="novel-reader-top novel-reader-top-link" href="\/lost-administrator\/novel\/chapters\/day-zero\/"/);
  assert.match(script, /novel-manifest\.json/);
  assert.match(script, /resolveNovelChapter\(top\)/);
});

test('novel reader unknown or unpublished most-opened result stays plain text', async () => {
  const novel = { today: { novel_pageviews: 3 }, last_24_hours: { estimated_readers: 1, most_opened_chapter: { title: 'Unpublished Draft', chapter_opens: 7 } }, all_time: { chapter_opens: 10 } };
  const { getElementById } = await runTrafficScript([basePayload({ novel_reader: novel })]);
  const body = getElementById('novel-reader-body').innerHTML;

  assert.match(body, /<p class="novel-reader-top">[\s\S]*Unpublished Draft · 7 opens[\s\S]*<\/p>/);
  assert.doesNotMatch(body, /<a class="novel-reader-top/);
  assert.doesNotMatch(body, /href="\/lost-administrator\/novel\/chapters\/unpublished-draft\//);
});

test('novel reader privacy explanation remains unchanged and non-clickable', () => {
  const note = 'Chapter opens are successful page requests, not evidence of completion, reading time, or progress. Only aggregate counts are published.';
  assert.match(html, new RegExp(`<p class="novel-reader-note">${note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/p>`));
  const card = html.match(/<article class="traffic-card novel-reader-card panel-novel-reader"[\s\S]*?<\/article>/)?.[0] || '';
  assert.doesNotMatch(card, /<a[^>]*class="novel-reader-note"|class="novel-reader-note"[\s\S]*<a\b/);
});

test('novel reader link styling preserves visible keyboard focus and mobile cue', () => {
  assert.match(css, /\.novel-reader-top-link:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)[^}]*outline-offset:\s*3px/);
  assert.match(css, /\.novel-reader-top-link:hover em,\.novel-reader-top-link:focus-visible em\s*\{[^}]*opacity:1/);
  assert.match(css, /@media \(hover: none\), \(pointer: coarse\), \(max-width: 620px\) \{[^}]*\.novel-reader-top-link em \{ opacity:1;/);
});

test('novel reader changes do not alter analytics values or counting fields', async () => {
  const novel = { today: { novel_pageviews: 9, chapter_opens: 99 }, last_24_hours: { estimated_readers: 8, most_opened_chapter: { title: 'No Such Vehicle', chapter_opens: 3 } }, all_time: { chapter_opens: 77 } };
  const { getElementById } = await runTrafficScript([basePayload({ novel_reader: novel })]);
  const body = getElementById('novel-reader-body').innerHTML;

  assert.match(body, /NOVEL PAGEVIEWS · TODAY[\s\S]*9/);
  assert.match(body, /EST\. READERS · 24H[\s\S]*8/);
  assert.match(body, /CHAPTER OPENS · ALL TIME[\s\S]*77/);
  assert.match(body, /No Such Vehicle · 3 opens/);
  assert.doesNotMatch(body, /CHAPTER OPENS · TODAY/);
});

test('novel reader signal handles zero activity and missing payloads', async () => {
  const zero = { today: { novel_pageviews: 0, chapter_opens: 0 }, last_24_hours: { estimated_readers: 0, most_opened_chapter: null }, all_time: { chapter_opens: 0 } };
  let result = await runTrafficScript([basePayload({ novel_reader: zero })]);
  assert.match(result.getElementById('novel-reader-body').innerHTML, /No chapter opens observed in the last 24 hours/);
  result = await runTrafficScript([basePayload({ novel_reader: undefined })]);
  assert.equal(result.getElementById('novel-reader-body').textContent, 'novel signal unavailable');
});
