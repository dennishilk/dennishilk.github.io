import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSecurityState, classifySecurityIntent, containsRawIp, generateSecurityState, isKnownDecoyRoute, severityForSensitivePath } from '../scripts/wopr-security-analyzer.mjs';

const line = ({ ip = '203.0.113.42', at = '18/Jul/2026:04:00:00 +0000', path = '/', status = 404, ua = 'zgrab/0.x' }) =>
  `${ip} - - [${at}] "GET ${path} HTTP/1.1" ${status} 123 "-" "${ua}"`;
const now = new Date('2026-07-18T05:00:00.000Z');

test('classifies scanner security intent categories', () => {
  assert.equal(classifySecurityIntent({ path: '/.git/config' }), 'git_exposure');
  assert.equal(classifySecurityIntent({ path: '/.env.production' }), 'secret_hunting');
  assert.equal(classifySecurityIntent({ path: '/wp-login.php' }), 'wordpress_probing');
  assert.equal(classifySecurityIntent({ path: '/../../etc/passwd' }), 'path_traversal');
  assert.equal(classifySecurityIntent({ path: '/admin/' }), 'admin_discovery');
  assert.equal(classifySecurityIntent({ path: '/id_rsa' }), 'credential_file_probing');
  assert.equal(classifySecurityIntent({ path: '/config.sql' }), 'backup_file_probing');
  assert.equal(classifySecurityIntent({ path: '/cgi-bin/setup.cgi' }), 'exploit_probe');
});

test('detects successful sensitive requests and severity', () => {
  const state = buildSecurityState([line({ path: '/.git/HEAD', status: 200 }), line({ path: '/.env', status: 403 })], { now });
  assert.equal(state.successful_sensitive_requests, 1);
  assert.equal(state.system_status, 'CRITICAL');
  assert.equal(state.findings[0].severity, 'CRITICAL');
  assert.equal(severityForSensitivePath('/.env'), 'HIGH');
  assert.equal(severityForSensitivePath('/debug/'), 'MEDIUM');
});

test('records only exact intentional WordPress Easter eggs as known decoys', () => {
  const state = buildSecurityState([
    line({ path: '/wp-login.php', status: 200 }),
    line({ path: '/wp-login.php?something=1', status: 200 }),
    line({ path: '/wp-admin/', status: 200 }),
  ], { now });
  assert.equal(state.scanner_requests, 3);
  assert.equal(state.scanner_intent.wordpress_probing, 3);
  assert.equal(state.decoy_hits, 3);
  assert.equal(state.successful_sensitive_requests, 0);
  assert.equal(state.active_findings, 0);
  assert.equal(state.system_status, 'SECURE');
  assert.equal(state.findings.some(finding => finding.type === 'wordpress_probing' && finding.status === 'active'), false);
  assert.equal(isKnownDecoyRoute('/wp-login.php?something=1'), true);
  assert.equal(isKnownDecoyRoute('/wp-admin//'), true);
});

test('does not whitelist real WordPress or other sensitive paths', () => {
  const state = buildSecurityState([
    line({ path: '/wp-admin/install.php', status: 200 }),
    line({ path: '/wp-config.php', status: 200 }),
    line({ path: '/.env', status: 200 }),
  ], { now });
  assert.equal(state.decoy_hits, 0);
  assert.equal(state.successful_sensitive_requests, 3);
  assert.equal(state.scanner_intent.wordpress_probing, 2);
  assert.equal(state.scanner_intent.secret_hunting, 1);
  assert.equal(state.active_findings, 2);
  assert.equal(state.findings.some(finding => finding.type === 'wordpress_probing' && finding.status === 'active' && finding.request_count === 2), true);
  assert.equal(isKnownDecoyRoute('/wp-admin/install.php'), false);
  assert.equal(isKnownDecoyRoute('/wp-config.php'), false);
  assert.equal(isKnownDecoyRoute('/.env'), false);
});

test('generated security state does not leak raw IPs', () => {
  const state = buildSecurityState([line({ ip: '198.51.100.7', path: '/.git/config', status: 200 })], { now });
  assert.equal(containsRawIp(state), false);
  assert.equal(JSON.stringify(state).includes('198.51.100.7'), false);
});

test('historical Git exposure incident is represented as remediated without invented IPs', () => {
  const historical = buildSecurityState([], { now }).findings.find(f => f.id === 'hist-2026-07-18-git-exposure');
  assert.equal(historical.status, 'remediated');
  assert.equal(historical.request_count, 5718);
  assert.match(historical.summary, /5683 classified as Git exposure probing/);
});

const secureGitSelfCheck = {
  generated_at: '2026-07-18T05:00:00.000Z',
  checks: [
    { path: '/.git/HEAD', status: 404, expected: [403, 404], result: 'SECURE' },
    { path: '/.git/config', status: 404, expected: [403, 404], result: 'SECURE' },
    { path: '/.env', status: 404, expected: [403, 404], result: 'SECURE' },
  ],
};

const exposedGitSelfCheck = {
  generated_at: '2026-07-18T05:00:00.000Z',
  checks: [
    { path: '/.git/HEAD', status: 200, expected: [403, 404], result: 'ATTENTION' },
    { path: '/.git/config', status: 404, expected: [403, 404], result: 'SECURE' },
    { path: '/.env', status: 404, expected: [403, 404], result: 'SECURE' },
  ],
};

test('marks historical HTTP 200 Git exposure as remediated when current self-check is secure', () => {
  const state = buildSecurityState([line({ path: '/.git/HEAD', status: 200 })], { now, selfCheck: secureGitSelfCheck });
  const gitFinding = state.findings.find(f => f.type === 'git_exposure' && f.request_count === 1);
  assert.equal(gitFinding.status, 'remediated');
  assert.equal(state.active_findings, 0);
  assert.equal(state.system_status, 'SECURE');
});

test('keeps historical HTTP 200 Git exposure active when current self-check is exposed', () => {
  const state = buildSecurityState([line({ path: '/.git/HEAD', status: 200 })], { now, selfCheck: exposedGitSelfCheck });
  const gitFinding = state.findings.find(f => f.type === 'git_exposure' && f.request_count === 1);
  assert.equal(gitFinding.status, 'active');
  assert.equal(state.active_findings, 1);
  assert.equal(state.system_status, 'CRITICAL');
});

test('keeps historical sensitive request counts visible after remediation', () => {
  const state = buildSecurityState([
    line({ path: '/.git/HEAD', status: 200 }),
    line({ path: '/.git/objects/aa/bb', status: 200 }),
    line({ path: '/.git/config', status: 404 }),
  ], { now, selfCheck: secureGitSelfCheck });
  const gitFinding = state.findings.find(f => f.type === 'git_exposure' && f.request_count === 2);
  assert.equal(state.successful_sensitive_requests, 2);
  assert.equal(state.scanner_intent.git_exposure, 3);
  assert.equal(gitFinding.status, 'remediated');
  assert.deepEqual(gitFinding.http_statuses, [200]);
});

test('active_findings only counts currently active findings', () => {
  const state = buildSecurityState([
    line({ path: '/.git/HEAD', status: 200 }),
    line({ path: '/.env', status: 200 }),
  ], { now, selfCheck: secureGitSelfCheck });
  assert.equal(state.findings.filter(f => f.status === 'remediated').length >= 2, true);
  assert.equal(state.active_findings, 0);
  assert.equal(state.system_status, 'SECURE');
});


test('state generation path runs allowlisted self-check before building state', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (url, options) => {
    requested.push({ url: String(url), method: options?.method });
    const { hostname, pathname } = new URL(String(url));
    assert.equal(hostname, 'dennishilk.com');
    const secureSensitive = new Set(['/.git/HEAD', '/.git/config', '/.env', '/.env.production', '/.aws/credentials']);
    return { status: secureSensitive.has(pathname) ? 404 : 200 };
  };

  try {
    const state = await generateSecurityState([line({ path: '/.git/HEAD', status: 200 })], { now });
    const selfCheckPaths = state.self_check.checks.map(check => check.path);
    assert.deepEqual(selfCheckPaths, ['/.git/HEAD', '/.git/config', '/.env', '/.env.production', '/.aws/credentials', '/', '/sitemap.xml']);
    assert(requested.every(request => request.url.startsWith('https://dennishilk.com/')));
    assert(requested.every(request => request.method === 'HEAD'));
    assert.equal(state.successful_sensitive_requests, 1);
    assert.equal(state.active_findings, 0);
    assert.equal(state.system_status, 'SECURE');
    assert.equal(state.findings.find(f => f.type === 'git_exposure' && f.request_count === 1).status, 'remediated');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
