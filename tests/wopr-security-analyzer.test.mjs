import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSecurityState, classifySecurityIntent, containsRawIp, severityForSensitivePath } from '../scripts/wopr-security-analyzer.mjs';

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
