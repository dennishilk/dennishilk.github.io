const test = require('node:test');
const assert = require('node:assert/strict');

process.env.WOPR_SESSION_SECRET = 'x'.repeat(40);
const { assertAllowedSelfCheckUrl, SELF_CHECK_PATHS, route } = require('../server/wopr-auth/server.js');

test('self-check allows only dennishilk.com allowlisted paths', () => {
  assert.equal(assertAllowedSelfCheckUrl('/.git/HEAD').href, 'https://dennishilk.com/.git/HEAD');
  assert.throws(() => assertAllowedSelfCheckUrl('https://example.com/.git/HEAD'));
  assert.throws(() => assertAllowedSelfCheckUrl('/not-allowlisted'));
  assert(SELF_CHECK_PATHS.every((entry) => entry.path.startsWith('/')));
});

test('security API requires existing WOPR session', async () => {
  const req = { method: 'GET', url: '/wopr/api/security/summary', headers: { host: 'localhost' }, socket: {} };
  let statusCode = 0;
  const res = {
    writeHead(status) { statusCode = status; },
    end() {},
  };
  await route(req, res);
  assert.equal(statusCode, 401);
});
