import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrafficPayload, parseNginxTime } from '../scripts/site-traffic-observer.mjs';

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
