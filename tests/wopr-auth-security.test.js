const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const securityTestDir = path.join(os.tmpdir(), `wopr-security-test-${process.pid}`);
process.env.WOPR_SESSION_SECRET = 'x'.repeat(40);
process.env.WOPR_SECURITY_STATE_FILE = path.join(securityTestDir, 'security-state.json');
process.env.WOPR_SECURITY_REVIEWS_FILE = path.join(securityTestDir, 'operator-reviews.json');
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

test('operator review validation and presentation preserve analyzer facts', () => {
  const { validateOperatorReview, presentSecurityState } = require('../server/wopr-auth/server.js');
  assert.deepEqual(validateOperatorReview({ status: 'RESOLVED', note: 'Fixed safely.' }), { status: 'RESOLVED', note: 'Fixed safely.' });
  assert.equal(validateOperatorReview({ status: 'DISMISSED' }), null);
  assert.equal(validateOperatorReview({ status: 'OPEN', note: 'x'.repeat(1001) }), null);
  const state = { findings: [{ id: 'finding-secret_hunting-high', status: 'active', severity: 'HIGH', last_seen: '2026-07-24T08:00:00.000Z' }] };
  const presentation = presentSecurityState(state, { reviews: { 'finding-secret_hunting-high': { status: 'RESOLVED', note: '<b>kept as text</b>', reviewed_at: '2026-07-24T07:00:00.000Z', resolved_at: '2026-07-24T07:00:00.000Z', history: [] } } });
  assert.equal(presentation.findings[0].status, 'active');
  assert.equal(presentation.findings[0].operator_review.recurrence, true);
  assert.equal(presentation.activeFindings, 1);
});

test('security review mutation endpoint rejects unauthenticated requests', async () => {
  const req = { method: 'PUT', url: '/wopr/api/security/reviews/finding-secret_hunting-high', headers: { host: 'localhost', 'content-type': 'application/json' }, socket: {} };
  let statusCode = 0;
  const res = { writeHead(status) { statusCode = status; }, end() {} };
  await route(req, res);
  assert.equal(statusCode, 401);
});

test('operator review persists independently across analyzer state changes and closed findings stop counting', () => {
  const { presentSecurityState } = require('../server/wopr-auth/server.js');
  const saved = { reviews: { 'finding-git_exposure-critical': { status: 'RESOLVED', note: 'nginx rule verified', reviewed_at: '2026-07-24T07:00:00.000Z', resolved_at: '2026-07-24T07:00:00.000Z', history: [{ status: 'RESOLVED', at: '2026-07-24T07:00:00.000Z' }] } } };
  const before = presentSecurityState({ findings: [{ id: 'finding-git_exposure-critical', status: 'active', severity: 'CRITICAL', request_count: 1, last_seen: '2026-07-24T06:59:00.000Z' }] }, saved);
  const after = presentSecurityState({ findings: [{ id: 'finding-git_exposure-critical', status: 'active', severity: 'CRITICAL', request_count: 99, last_seen: '2026-07-24T08:00:00.000Z' }] }, saved);
  assert.equal(before.activeFindings, 0);
  assert.equal(before.findings[0].operator_review.note, 'nginx rule verified');
  assert.equal(after.activeFindings, 1);
  assert.equal(after.findings[0].operator_review.recurrence, true);
  const historical = presentSecurityState({ findings: [{ id: 'hist-2026-07-18-git-exposure', status: 'remediated' }] }, { reviews: {} });
  assert.equal(historical.findings[0].operator_review.status, 'UNREVIEWED');
});


function sessionCookie() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.WOPR_SESSION_SECRET).update(payload).digest('base64url');
  return `wopr_session=${payload}.${signature}`;
}

test('authenticated review API stores acknowledged, resolved, expected, and reopened notes separately', async () => {
  await fs.mkdir(securityTestDir, { recursive: true });
  await fs.writeFile(process.env.WOPR_SECURITY_STATE_FILE, JSON.stringify({ findings: [{ id: 'finding-secret_hunting-high', status: 'active', last_seen: '2026-07-24T06:00:00.000Z' }] }));
  const server = http.createServer(route);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/wopr/api/security/reviews/finding-secret_hunting-high`;
  try {
    for (const [status, note] of [['ACKNOWLEDGED', 'Investigating'], ['RESOLVED', 'Rule added'], ['EXPECTED', 'Verified decoy'], ['OPEN', 'New activity']]) {
      const response = await fetch(url, { method: 'PUT', headers: { Cookie: sessionCookie(), 'Content-Type': 'application/json' }, body: JSON.stringify({ status, note }) });
      assert.equal(response.status, 200);
    }
    const stored = JSON.parse(await fs.readFile(process.env.WOPR_SECURITY_REVIEWS_FILE, 'utf8'));
    assert.equal(stored.reviews['finding-secret_hunting-high'].status, 'OPEN');
    assert.equal(stored.reviews['finding-secret_hunting-high'].note, 'New activity');
    assert.equal(stored.reviews['finding-secret_hunting-high'].history.length, 4);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
