import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrafficPayload, classifyScannerIntent, parseNginxTime, SCANNER_INTENT_DECORATIVE_MASKS, SITE_TRAFFIC_INITIAL_TOTAL } from '../scripts/site-traffic-observer.mjs';

const line = ({ ip = '203.0.113.10', at, method = 'GET', path = '/', status = 200, ref = '-', ua = 'Mozilla/5.0' }) =>
  `${ip} - - [${at}] "${method} ${path} HTTP/1.1" ${status} 123 "${ref}" "${ua}"`;
const now = new Date('2026-07-08T10:00:00.000Z'); // 12:00 Berlin
const at = '08/Jul/2026:11:30:00 +0200';

test('pageviews include only successful human document GET/HEAD requests', () => {
  const payload = buildTrafficPayload([
    line({ at, path: '/' }),
    line({ at, method: 'HEAD', path: '/about.html' }),
    line({ at, path: '/wp-admin/install.php' }),
    line({ at, path: '/style.css' }),
    line({ at, path: '/app.js' }),
    line({ at, path: '/image.png' }),
    line({ at, path: '/favicon.ico' }),
    line({ at, method: 'POST', path: '/contact.html' }),
    line({ at, status: 404, path: '/missing.html' }),
    line({ at, path: '/bot.html', ua: 'Googlebot/2.1' }),
    line({ at, path: '/scan', ua: 'zgrab/0.x' }),
  ], { now });
  assert.equal(payload.pageviews_today, 2);
  assert.deepEqual(payload.top_pages.map(r => r.path).sort(), ['/', '/about.html']);
  assert(!payload.top_pages.some(r => r.path === '/wp-admin/install.php' || r.path.endsWith('.css') || r.path.endsWith('.js')));
  assert.equal(payload.human_requests_today, 8);
});

test('live stream includes human, bot, and scanner without IP addresses', () => {
  const payload = buildTrafficPayload([
    line({ at, path: '/' }),
    line({ at, path: '/robots.txt', ua: 'Googlebot/2.1' }),
    line({ at, path: '/wp-admin/install.php', ua: 'Mozilla/5.0' }),
  ], { now });
  assert.deepEqual(new Set(payload.live_requests.map(r => r.kind)), new Set(['HUMAN', 'BOT', 'SCANNER']));
  assert.equal(JSON.stringify(payload).includes('203.0.113.10'), false);
  assert(payload.live_requests.every(r => r.country && !('ip' in r)));
});

test('top paths and top pages can differ', () => {
  const payload = buildTrafficPayload([
    line({ at, path: '/wp-admin/install.php' }),
    line({ at, path: '/wp-admin/install.php' }),
    line({ at, path: '/' }),
    line({ at, path: '/style.css' }),
  ], { now });
  assert(payload.top_paths.some(r => r.path === '/wp-admin/install.php'));
  assert.deepEqual(payload.top_pages, [{ path: '/', count: 1 }]);
});

test('Berlin today uses log timezone offset and 24h is rolling', () => {
  const payload = buildTrafficPayload([
    line({ at: '08/Jul/2026:00:30:00 +0200', path: '/' }), // Berlin today, within 24h
    line({ at: '07/Jul/2026:23:30:00 +0200', path: '/yesterday.html' }), // rolling 24h but not Berlin today
    line({ at: '07/Jul/2026:09:00:00 +0200', path: '/old.html' }), // outside rolling 24h
  ], { now });
  assert.equal(payload.pageviews_today, 1);
  assert.equal(payload.requests_24h, 2);
});


test('newest live request is first and uses current newest log entry Berlin time', () => {
  const payload = buildTrafficPayload([
    line({ at: '08/Jul/2026:11:58:01 +0200', path: '/older.html' }),
    line({ at: '08/Jul/2026:11:59:59 +0200', path: '/newest.html' }),
    line({ at: '08/Jul/2026:11:58:59 +0200', path: '/middle.html' }),
  ], { now });
  assert.equal(payload.live_requests[0].path, '/newest.html');
  assert.equal(payload.live_requests[0].timestamp, '2026-07-08T09:59:59.000Z');
  assert.equal(payload.live_requests[0].time, '11:59:59');
  assert.deepEqual(payload.live_requests.map(r => r.path), ['/newest.html', '/middle.html', '/older.html']);
});

test('writer output derives live stream from supplied logs instead of stale output snapshot', async () => {
  const { mkdtemp, readFile, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { writeTrafficPayload } = await import('../scripts/site-traffic-observer.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'site-traffic-'));
  try {
    const output = join(dir, 'site-traffic.json');
    const log = join(dir, 'access.log');
    await writeFile(output, JSON.stringify({
      generated_at: '2026-07-08T00:00:00.000Z',
      live_requests: [{ time: '00:38:18', kind: 'HUMAN', country: 'GB', path: '/stale.html' }]
    }));
    await writeFile(log, `${line({ at: '08/Jul/2026:11:59:59 +0200', path: '/fresh.html' })}\n`);
    writeTrafficPayload([log], output, { now });
    const payload = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(payload.generated_at, now.toISOString());
    assert.equal(payload.live_requests[0].path, '/fresh.html');
    assert.equal(payload.live_requests.some(r => r.path === '/stale.html' || r.country === 'GB'), false);
    assert.equal(payload.requests_24h, 1);
    assert.equal(payload.requests_total, 1);
    assert('top_pages' in payload);
    assert('top_paths' in payload);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('persistent total starts at 50000, increments appended pageviews once, and survives reloads', async () => {
  const { mkdtemp, readFile, writeFile, appendFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { writeTrafficPayload } = await import('../scripts/site-traffic-observer.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'site-traffic-total-'));
  try {
    const output = join(dir, 'data', 'site-traffic.json');
    const stateFile = join(dir, 'state', 'site-traffic-total.json');
    const log = join(dir, 'access.log');
    await writeFile(log, `${line({ at, path: '/before-migration.html' })}\n`);
    assert.equal(writeTrafficPayload([log], output, { now, stateFile }).total_pageviews, SITE_TRAFFIC_INITIAL_TOTAL);
    await appendFile(log, `${line({ at: '08/Jul/2026:11:45:00 +0200', path: '/first.html' })}\n`);
    assert.equal(writeTrafficPayload([log], output, { now, stateFile }).total_pageviews, 50001);
    assert.equal(writeTrafficPayload([log], output, { now, stateFile }).total_pageviews, 50001);
    await appendFile(log, `${line({ at: '09/Jul/2026:00:05:00 +0200', path: '/after-midnight.html' })}\n`);
    const reloaded = writeTrafficPayload([log], output, { now: new Date('2026-07-09T01:00:00.000Z'), stateFile });
    assert.equal(reloaded.total_pageviews, 50002);
    assert.equal(JSON.parse(await readFile(output, 'utf8')).total_pageviews, 50002);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('traffic dashboard navigation remains a pageview while its polling payload is observer-internal noise', () => {
  const payload = buildTrafficPayload([
    line({ ip: '8.8.8.8', at, path: '/traffic.html' }),
    line({ ip: '8.8.8.8', at, path: '/data/site-traffic.json' }),
    line({ ip: '1.1.1.1', at, path: '/about.html' }),
    line({ ip: '9.9.9.9', at, path: '/data/site-traffic.json', ua: 'Googlebot/2.1' }),
    line({ ip: '9.9.9.8', at, path: '/data/site-traffic.json', ua: 'zgrab/0.x' }),
  ], { now, countryResolver: () => 'US' });
  assert.equal(payload.pageviews_today, 2);
  assert.equal(payload.human_requests_today, 2);
  assert.equal(payload.estimated_unique_visitors, 4);
  assert(payload.live_requests.some(request => request.path === '/traffic.html' && request.kind === 'HUMAN'));
  assert(payload.live_requests.some(request => request.path === '/about.html'));
  assert.equal(payload.live_requests.some(request => request.path === '/data/site-traffic.json' && request.kind === 'HUMAN'), false);
  assert(payload.live_requests.some(request => request.path === '/data/site-traffic.json' && request.kind === 'BOT'));
  assert(payload.live_requests.some(request => request.path === '/data/site-traffic.json' && request.kind === 'SCANNER'));
  assert.equal(payload.top_paths.some(row => row.path === '/data/site-traffic.json'), true);
});

test('traffic frontend has no all-time pageview baseline', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../traffic.html', import.meta.url), 'utf8');
  assert.equal(source.includes('TOTAL_PAGEVIEWS_BASELINE'), false);
  assert.equal(source.includes('totalPageviewsWithBaseline'), false);
  assert.equal(source.includes('45000'), false);
});

test('requests_total remains a backward-compatible alias for requests_24h', () => {
  const payload = buildTrafficPayload([
    line({ at: '08/Jul/2026:00:30:00 +0200', path: '/' }),
    line({ at: '07/Jul/2026:23:30:00 +0200', path: '/yesterday.html' }),
    line({ at: '07/Jul/2026:09:00:00 +0200', path: '/old.html' }),
  ], { now });
  assert.equal(payload.requests_total, payload.requests_24h);
  assert.equal(payload.requests_total, 2);
});

test('nginx timestamps preserve their explicit timezone offset', () => {
  assert.equal(parseNginxTime('08/Jul/2026:00:30:00 +0200').toISOString(), '2026-07-07T22:30:00.000Z');
});


const scannerReq = (path, userAgent = 'zgrab/0.x') => ({ path, userAgent, method: 'GET', status: 404, referrer: '-' });

test('scanner intent helper assigns the documented exact priority categories', () => {
  const cases = [
    ['/wp-admin/install.php', 'wordpress_probing'],
    ['/.env', 'secret_hunting'],
    ['/.env.backup', 'secret_hunting'],
    ['/.git/config', 'secret_hunting'],
    ['/../../etc/passwd', 'path_traversal'],
    ['/%2e%2e/%2e%2e/etc/passwd', 'path_traversal'],
    ['/%252e%252e/%252e%252e/etc/passwd', 'path_traversal'],
    ['/phpmyadmin', 'admin_discovery'],
    ['/cgi-bin/goform/setup.cgi?next=router', 'iot_camera_probing'],
    ['/uploads/webshell.php?cmd=wget', 'generic_exploit_probing'],
    ['/just-noisy', 'unknown_scanner_noise'],
  ];

  for (const [path, expected] of cases) {
    assert.equal(classifyScannerIntent(scannerReq(path)), expected, path);
  }
  assert.doesNotThrow(() => classifyScannerIntent(scannerReq('/%E0%A4%A')));
});

test('scanner intent aggregate matches scanner_requests_today and excludes humans and known bots', () => {
  const payload = buildTrafficPayload([
    line({ at, path: '/wp-admin/install.php' }),
    line({ at, path: '/.env' }),
    line({ at, path: '/%252e%252e/%252e%252e/etc/passwd' }),
    line({ at, path: '/', ua: 'zgrab/0.x' }),
    line({ at, path: '/human.html' }),
    line({ at, path: '/robots.txt', ua: 'Googlebot/2.1' }),
    line({ at, path: '/robots.txt', ua: 'bingbot/2.0' }),
  ], { now });

  const categorySum = payload.scanner_intent.categories.reduce((sum, category) => sum + category.count, 0);
  assert.equal(payload.scanner_requests_today, 4);
  assert.equal(payload.scanner_intent.total_scanner_requests, payload.scanner_requests_today);
  assert.equal(categorySum, payload.scanner_requests_today);
  assert.equal(payload.human_requests_today, 1);
  assert.equal(payload.bot_requests_today, 6);
  assert.equal(payload.scanner_intent.categories.find(c => c.id === 'unknown_scanner_noise').count, 1);
});

test('recent scanner intent events are newest first, bounded, privacy safe, and use fixed decorative masks', () => {
  const lines = Array.from({ length: 12 }, (_, index) => line({
    ip: `203.0.113.${index}`,
    at: `08/Jul/2026:11:${String(index).padStart(2, '0')}:00 +0200`,
    path: `/.env?token=${index}`,
    status: 500,
    ua: `zgrab/${index}`,
    ref: `https://example.test/?q=${index}`,
  }));
  const payload = buildTrafficPayload(lines, { now });
  const events = payload.scanner_intent.recent_events;

  assert.equal(events.length, 10);
  assert.deepEqual(events.map(event => event.timestamp), [...events.map(event => event.timestamp)].sort().reverse());
  for (const event of events) {
    assert.deepEqual(Object.keys(event).sort(), ['decorative_mask', 'intent_id', 'intent_label', 'time', 'timestamp']);
    assert(SCANNER_INTENT_DECORATIVE_MASKS.includes(event.decorative_mask));
  }
  assert.equal(JSON.stringify(payload.scanner_intent).includes('203.0.113'), false);
  assert.equal(JSON.stringify(payload.scanner_intent).includes('/.env'), false);
  assert.equal(JSON.stringify(payload.scanner_intent).includes('token='), false);
  assert.equal(JSON.stringify(payload.scanner_intent).includes('zgrab'), false);
  assert.equal(JSON.stringify(payload.scanner_intent).includes('500'), false);
  assert.equal(JSON.stringify(payload.scanner_intent).includes('GET'), false);
});

test('scanner intent timing metadata derives from actual rolling scanner timestamps', () => {
  const payload = buildTrafficPayload([
    line({ at: '08/Jul/2026:09:00:00 +0200', path: '/old-human.html' }),
    line({ at: '08/Jul/2026:09:15:00 +0200', path: '/.env' }),
    line({ at: '08/Jul/2026:11:45:00 +0200', path: '/wp-admin/install.php' }),
  ], { now });

  assert.equal(payload.scanner_intent.observation_window_started_at, '2026-07-08T07:15:00.000Z');
  assert.equal(payload.scanner_intent.last_probe_at, '2026-07-08T09:45:00.000Z');
  assert.equal(payload.scanner_intent.trapping_duration_seconds, 9000);
});

test('GeoIP resolver maps known public IPs to mocked country codes', () => {
  const payload = buildTrafficPayload([
    line({ ip: '8.8.8.8', at, path: '/' }),
  ], { now, countryResolver: ip => ip === '8.8.8.8' ? 'US' : 'ZZ' });

  assert.deepEqual(payload.countries, [{ country: 'US', count: 1 }]);
  assert.equal(payload.live_requests[0].country, 'US');
});

test('GeoIP unknown, private, local, and invalid addresses resolve to ZZ', () => {
  const payload = buildTrafficPayload([
    line({ ip: '8.8.4.4', at, path: '/' }),
    line({ ip: '10.0.0.5', at, path: '/private.html' }),
    line({ ip: '127.0.0.1', at, path: '/local.html' }),
    line({ ip: 'not-an-ip', at, path: '/invalid.html' }),
  ], { now, countryResolver: () => 'ZZ' });

  assert.deepEqual(payload.countries, [{ country: 'ZZ', count: 4 }]);
  assert(payload.live_requests.every(request => request.country === 'ZZ'));
});

test('countries aggregate counts use resolved country codes', () => {
  const countries = new Map([['8.8.8.8', 'US'], ['1.1.1.1', 'AU'], ['8.8.4.4', 'US']]);
  const payload = buildTrafficPayload([
    line({ ip: '8.8.8.8', at, path: '/' }),
    line({ ip: '1.1.1.1', at, path: '/about.html' }),
    line({ ip: '8.8.4.4', at, path: '/contact.html' }),
  ], { now, countryResolver: ip => countries.get(ip) || 'ZZ' });

  assert.deepEqual(payload.countries, [{ country: 'US', count: 2 }, { country: 'AU', count: 1 }]);
});

test('live requests expose country code only, never IP', () => {
  const payload = buildTrafficPayload([
    line({ ip: '8.8.8.8', at, path: '/' }),
  ], { now, countryResolver: () => 'US' });

  assert.equal(payload.live_requests[0].country, 'US');
  assert.equal('ip' in payload.live_requests[0], false);
  assert.equal(JSON.stringify(payload.live_requests).includes('8.8.8.8'), false);
});

test('estimated unique visitors uses distinct source IPs in the rolling window', () => {
  const payload = buildTrafficPayload([
    line({ ip: '8.8.8.8', at, path: '/' }),
    line({ ip: '8.8.8.8', at, path: '/again.html' }),
    line({ ip: '8.8.4.4', at, path: '/same-country.html' }),
    line({ ip: '1.1.1.1', at, path: '/other-country.html' }),
    line({ ip: '9.9.9.9', at: '07/Jul/2026:09:00:00 +0200', path: '/old.html' }),
  ], { now, countryResolver: ip => ip === '1.1.1.1' ? 'AU' : 'US' });

  assert.equal(payload.estimated_unique_visitors, 3);
  assert.deepEqual(payload.countries, [{ country: 'US', count: 3 }, { country: 'AU', count: 1 }]);
});

test('country lookup cache is in-run only and avoids repeated resolver calls', () => {
  const seen = [];
  const payload = buildTrafficPayload([
    line({ ip: '8.8.8.8', at, path: '/' }),
    line({ ip: '8.8.8.8', at, path: '/again.html' }),
  ], { now, countryResolver: ip => { seen.push(ip); return 'US'; } });

  assert.equal(payload.estimated_unique_visitors, 1);
  assert.deepEqual(seen, ['8.8.8.8']);
});

test('scanner intent contains no IP or country leakage and invariants remain exact with GeoIP enabled', () => {
  const payload = buildTrafficPayload([
    line({ ip: '8.8.8.8', at, path: '/.env', ua: 'zgrab/0.x' }),
    line({ ip: '1.1.1.1', at, path: '/wp-admin/install.php' }),
  ], { now, countryResolver: ip => ip === '1.1.1.1' ? 'AU' : 'US' });

  const scannerJson = JSON.stringify(payload.scanner_intent);
  assert.equal(payload.scanner_intent.total_scanner_requests, payload.scanner_requests_today);
  assert.equal(payload.scanner_intent.categories.reduce((sum, category) => sum + category.count, 0), payload.scanner_requests_today);
  assert.equal(scannerJson.includes('8.8.8.8'), false);
  assert.equal(scannerJson.includes('1.1.1.1'), false);
  assert.equal(scannerJson.includes('US'), false);
  assert.equal(scannerJson.includes('AU'), false);
});

test('raw IPs do not appear anywhere in output JSON for ordinary log input', () => {
  const payload = buildTrafficPayload([
    line({ ip: '8.8.8.8', at, path: '/' }),
    line({ ip: '1.1.1.1', at, path: '/wp-admin/install.php' }),
  ], { now, countryResolver: ip => ip === '1.1.1.1' ? 'AU' : 'US' });
  const output = JSON.stringify(payload);

  assert.equal(output.includes('8.8.8.8'), false);
  assert.equal(output.includes('1.1.1.1'), false);
});

test('novel reader counts only canonical successful human GET documents from the manifest', () => {
  const chapter = '/lost-administrator/novel/chapters/day-zero/';
  const payload = buildTrafficPayload([
    line({ ip: '8.8.8.8', at, path: '/lost-administrator/novel/?from=home' }),
    line({ ip: '8.8.8.8', at, path: `${chapter}?ref=x`, status: 304 }),
    line({ ip: '1.1.1.1', at, path: chapter }),
    line({ at, method: 'HEAD', path: chapter }),
    line({ at, status: 301, path: chapter }),
    line({ at, path: '/lost-administrator/novel/index.html' }),
    line({ at, path: '/lost-administrator/novel/chapters/unpublished/' }),
    line({ at, path: '/lost-administrator/novel/chapter-01-day-zero.md' }),
    line({ at, path: chapter, ua: 'Googlebot/2.1' }),
    line({ at, path: chapter, ua: 'zgrab/0.x' }),
  ], { now });
  assert.equal(payload.novel_reader.today.novel_pageviews, 3);
  assert.equal(payload.novel_reader.today.chapter_opens, 2);
  assert.equal(payload.novel_reader.last_24_hours.estimated_readers, 2);
  assert.equal(payload.novel_reader.last_24_hours.most_opened_chapter.slug, 'day-zero');
  assert.equal(payload.novel_reader.chapters.length, 10);
  assert.equal(payload.novel_reader.method.completion_tracking, false);
  assert.equal(JSON.stringify(payload.novel_reader).includes('8.8.8.8'), false);
});

test('novel all-time chapter opens initializes once at 2400 and counts only new qualifying chapter opens', async () => {
  const { mkdtemp, readFile, writeFile, appendFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { writeTrafficPayload, NOVEL_CHAPTER_OPENS_HISTORICAL_BASELINE } = await import('../scripts/site-traffic-observer.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'site-traffic-novel-'));
  try {
    const output = join(dir, 'data', 'site-traffic.json');
    const stateFile = join(dir, 'state', 'site-traffic-total.json');
    const log = join(dir, 'access.log');
    const chapter = '/lost-administrator/novel/chapters/day-zero/';
    await writeFile(log, `${line({ at, path: chapter })}\n`);
    assert.equal(writeTrafficPayload([log], output, { now, stateFile }).novel_reader.all_time.chapter_opens, NOVEL_CHAPTER_OPENS_HISTORICAL_BASELINE);
    await appendFile(log, `${line({ at: '08/Jul/2026:11:45:00 +0200', path: chapter })}\n`);
    assert.equal(writeTrafficPayload([log], output, { now, stateFile }).novel_reader.all_time.chapter_opens, 2401);
    assert.equal(writeTrafficPayload([log], output, { now, stateFile }).novel_reader.all_time.chapter_opens, 2401);
    await appendFile(log, `${line({ at: '08/Jul/2026:11:46:00 +0200', path: chapter, ua: 'Googlebot/2.1' })}\n${line({ at: '08/Jul/2026:11:47:00 +0200', path: '/lost-administrator/novel/' })}\n${line({ at: '08/Jul/2026:11:48:00 +0200', path: '/style.css' })}\n${line({ at: '08/Jul/2026:11:49:00 +0200', method: 'HEAD', path: chapter })}\n${line({ at: '08/Jul/2026:11:50:00 +0200', path: chapter, status: 404 })}\n`);
    assert.equal(writeTrafficPayload([log], output, { now, stateFile }).novel_reader.all_time.chapter_opens, 2401);
    const state = JSON.parse(await readFile(stateFile, 'utf8'));
    assert.equal(state.novel_reader.historical_baseline, 2400);
    assert.equal(state.novel_reader.counted_since_cutover, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('novel all-time migration checkpoints existing logs without adding pre-cutover requests', async () => {
  const { mkdtemp, writeFile, appendFile, mkdir, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join, resolve } = await import('node:path');
  const { writeTrafficPayload } = await import('../scripts/site-traffic-observer.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'site-traffic-novel-migrate-'));
  try {
    const output = join(dir, 'data', 'site-traffic.json');
    const stateFile = join(dir, 'state', 'site-traffic-total.json');
    const log = join(dir, 'access.log');
    const chapter = '/lost-administrator/novel/chapters/day-zero/';
    await writeFile(log, `${line({ at, path: chapter })}\n`);
    await mkdir(join(dir, 'state'), { recursive: true });
    await writeFile(stateFile, JSON.stringify({ total_pageviews: 50010, initialized_at: now.toISOString(), novel_reader: { since: now.toISOString(), novel_pageviews: 0, chapter_opens: 3 }, sources: { [resolve(log)]: { dev: 0, ino: 0, offset: 0 } } }));
    assert.equal(writeTrafficPayload([log], output, { now, stateFile }).novel_reader.all_time.chapter_opens, 2400);
    await appendFile(log, `${line({ at: '08/Jul/2026:11:45:00 +0200', path: chapter })}\n`);
    assert.equal(writeTrafficPayload([log], output, { now, stateFile }).novel_reader.all_time.chapter_opens, 2401);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('novel all-time survives day changes, restarts, and rename log rotation without double counting', async () => {
  const { mkdtemp, writeFile, appendFile, rename, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { writeTrafficPayload } = await import('../scripts/site-traffic-observer.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'site-traffic-novel-rotate-'));
  try {
    const output = join(dir, 'data', 'site-traffic.json');
    const stateFile = join(dir, 'state', 'site-traffic-total.json');
    const log = join(dir, 'access.log');
    const chapter = '/lost-administrator/novel/chapters/day-zero/';
    await writeFile(log, '');
    writeTrafficPayload([log], output, { now, stateFile });
    await appendFile(log, `${line({ at: '08/Jul/2026:23:55:00 +0200', path: chapter })}\n`);
    assert.equal(writeTrafficPayload([log], output, { now: new Date('2026-07-08T22:00:00.000Z'), stateFile }).novel_reader.all_time.chapter_opens, 2401);
    assert.equal(writeTrafficPayload([log], output, { now: new Date('2026-07-09T01:00:00.000Z'), stateFile }).novel_reader.today.chapter_opens, 0);
    assert.equal(writeTrafficPayload([log], output, { now: new Date('2026-07-09T01:00:00.000Z'), stateFile }).novel_reader.all_time.chapter_opens, 2401);
    await rename(log, join(dir, 'access.log.1'));
    await writeFile(log, `${line({ at: '09/Jul/2026:03:05:00 +0200', path: chapter })}\n`);
    assert.equal(writeTrafficPayload([log], output, { now: new Date('2026-07-09T01:10:00.000Z'), stateFile }).novel_reader.all_time.chapter_opens, 2402);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('corrupt traffic state is backed up and not reset to the novel baseline', async () => {
  const { mkdtemp, writeFile, readdir, mkdir, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { writeTrafficPayload } = await import('../scripts/site-traffic-observer.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'site-traffic-corrupt-'));
  try {
    const output = join(dir, 'data', 'site-traffic.json');
    const stateFile = join(dir, 'state', 'site-traffic-total.json');
    const log = join(dir, 'access.log');
    await writeFile(log, '');
    await mkdir(join(dir, 'state'), { recursive: true });
    await writeFile(stateFile, '{not json');
    assert.throws(() => writeTrafficPayload([log], output, { now, stateFile }), /not reset automatically/);
    assert((await readdir(join(dir, 'state'))).some(name => name.startsWith('site-traffic-total.json.corrupt-')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('atomic JSON write leaves a complete target document', async () => {
  const { mkdtemp, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { atomicWriteJson } = await import('../scripts/site-traffic-observer.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'site-traffic-atomic-'));
  try {
    const file = join(dir, 'state', 'counter.json');
    atomicWriteJson(file, { ok: true, count: 2400 });
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { ok: true, count: 2400 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
