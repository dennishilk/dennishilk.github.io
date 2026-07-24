#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parseLogLine } from './site-traffic-observer.mjs';

const require = createRequire(import.meta.url);
const { runSelfCheck } = require('../server/wopr-auth/server.js');

export const INTENT_CATEGORIES = Object.freeze(['git_exposure','secret_hunting','wordpress_probing','path_traversal','admin_discovery','credential_file_probing','backup_file_probing','exploit_probe','unknown']);
const SENSITIVE_STATUS = new Set([200]);

function decodePath(value) {
  let out = String(value || '/').replace(/[?#].*$/, '').replace(/\\/g, '/');
  for (let i = 0; i < 3; i++) { try { const d = decodeURIComponent(out); if (d === out) break; out = d; } catch { break; } }
  return out.toLowerCase();
}

// These are the only WordPress-looking endpoints intentionally served by the
// static site. Keep this exact: nested wp-admin paths and all other WordPress
// probes must remain eligible for sensitive-response findings.
export function isKnownDecoyRoute(pathname) {
  let normalized = String(pathname || '/').replace(/[?#].*$/, '').replace(/\\/g, '/');
  for (let i = 0; i < 3; i++) { try { const decoded = decodeURIComponent(normalized); if (decoded === normalized) break; normalized = decoded; } catch { break; } }
  normalized = normalized.replace(/\/{2,}/g, '/');
  return normalized === '/wp-login.php' || normalized === '/wp-admin/';
}

export function classifySecurityIntent(req) {
  const p = decodePath(req?.path);
  const f = p.split('/').pop() || '';
  if (/(^|\/)\.git(\/|$)/.test(p)) return 'git_exposure';
  if (/(\.\.)(\/|$)/.test(p) || /(^|\/)(etc\/passwd|proc\/self|boot\.ini|win\.ini)/.test(p) || /windows\/system32/.test(p)) return 'path_traversal';
  if (/(^|\/)\.env([._-]|$|\/)/.test(p) || /(^|\/)\.aws(\/|$)/.test(p) || /(secret|token|api[-_]?key|access[-_]?key)/.test(f)) return 'secret_hunting';
  if (/(credential|credentials|passwd|shadow|htpasswd|id_rsa|id_dsa|id_ecdsa|id_ed25519|private[-_]?key|authorized_keys)/.test(f) || /(^|\/)\.ssh(\/|$)/.test(p)) return 'credential_file_probing';
  if (/(^|\/)(wp-admin|wp-login\.php|wp-config\.php(?:[._-][^/]+)?|xmlrpc\.php|wp-content|wp-includes)(\/|$)/.test(p)) return 'wordpress_probing';
  if (/^\/(admin|administrator|login|panel|phpmyadmin|manager|console|debug|dashboard)(\/|$)/.test(p)) return 'admin_discovery';
  if (/(~|\.(bak|backup|old|orig|save|swp|sql|dump|tar|tgz|gz|zip|7z))$/.test(f) || /(config|database|db|backup).*(\.|_)(json|ya?ml|ini|sql|dump|bak)$/.test(f)) return 'backup_file_probing';
  if (/(cmd=|exec=|command=|shell_exec|system\(|vendor\/phpunit|eval-stdin|webshell|c99|r57|(shell|upload|cmd)\.php|cgi-bin|boaform|setup\.cgi)/.test(p)) return 'exploit_probe';
  return 'unknown';
}

export function isSensitivePath(pathname) {
  return classifySecurityIntent({ path: pathname }) !== 'unknown';
}

export function severityForSensitivePath(pathname) {
  const p = decodePath(pathname);
  const f = p.split('/').pop() || '';
  if (/(^|\/)\.git(\/|$)/.test(p) || /(id_rsa|id_dsa|id_ecdsa|id_ed25519|private[-_]?key|credentials|shadow|htpasswd)/.test(f)) return 'CRITICAL';
  if (/(^|\/)\.env([._-]|$|\/)/.test(p) || /(^|\/)\.aws(\/|$)/.test(p) || /(config|database|db|backup).*(\.|_)(json|ya?ml|ini|sql|dump|bak)$/.test(f)) return 'HIGH';
  if (/^\/(admin|administrator|login|panel|phpmyadmin|manager|console|debug|dashboard)(\/|$)/.test(p)) return 'MEDIUM';
  return 'INFORMATIONAL';
}

function historicalFinding() {
  return { id:'hist-2026-07-18-git-exposure', type:'git_exposure', severity:'CRITICAL', title:'Git metadata exposure blocked', first_seen:'2026-07-18T03:00:00.000Z', last_seen:'2026-07-18T03:59:59.000Z', status:'remediated', request_count:5718, http_statuses:[200], summary:'Historical incident: 5718 scanner requests occurred during the hour, including 5683 classified as Git exposure probing. Sensitive Git paths returned HTTP 200 before dotfile blocking was added in nginx.', remediation_status:'Dotfile access blocked in nginx; current self-checks return secure statuses.' };
}

function selfCheckCategories(selfCheck) {
  const checked = new Set();
  const exposed = new Set();
  for (const check of selfCheck?.checks || []) {
    if (!isSensitivePath(check?.path)) continue;
    const category = classifySecurityIntent({ path: check.path });
    checked.add(category);
    if (SENSITIVE_STATUS.has(check?.status)) exposed.add(category);
  }
  return { checked, exposed };
}

function currentExposureVerified(selfCheck, finding) {
  if (!Array.isArray(selfCheck?.checks)) return true;
  const { checked, exposed } = selfCheckCategories(selfCheck);
  return !checked.has(finding.type) || exposed.has(finding.type);
}

function markRemediated(finding) {
  return {
    ...finding,
    status: 'remediated',
    title: finding.title.replace(' returned HTTP 200', ' returned HTTP 200 historically'),
    remediation_status: 'Current defensive self-check no longer reproduces HTTP 200 exposure for this sensitive path category.',
  };
}

export function buildSecurityState(lines, { now = new Date(), selfCheck = null } = {}) {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const intent = Object.fromEntries(INTENT_CATEGORIES.map(c => [c, 0]));
  const findings = [historicalFinding()];
  const findingsByType = new Map();
  let scannerRequests = 0, successfulSensitiveRequests = 0, decoyHits = 0;
  for (const line of lines) {
    const req = parseLogLine(line); if (!req?.time || req.time < since || req.time > now) continue;
    const category = classifySecurityIntent(req); if (category !== 'unknown') scannerRequests++;
    intent[category]++;
    if (SENSITIVE_STATUS.has(req.status) && isKnownDecoyRoute(req.path)) {
      decoyHits++;
      continue;
    }
    if (SENSITIVE_STATUS.has(req.status) && isSensitivePath(req.path)) {
      successfulSensitiveRequests++;
      const severity = severityForSensitivePath(req.path);
      const id = `finding-${category}-${severity.toLowerCase()}`;
      const existing = findingsByType.get(id) || { id, type:category, severity, title:`Sensitive ${category.replaceAll('_',' ')} returned HTTP 200`, first_seen:req.time.toISOString(), last_seen:req.time.toISOString(), status:'active', request_count:0, http_statuses:[], summary:'One or more requests to a sensitive path returned HTTP 200. Review nginx rules and deployed files without exposing file contents.', remediation_status:'Needs operator review.' };
      existing.request_count += 1;
      existing.last_seen = req.time.toISOString();
      if (!existing.http_statuses.includes(req.status)) existing.http_statuses.push(req.status);
      findingsByType.set(id, existing);
    }
  }
  findings.unshift(...Array.from(findingsByType.values(), finding => currentExposureVerified(selfCheck, finding) ? finding : markRemediated(finding)));
  const activeFindings = findings.filter(f => f.status === 'active').length;
  return { generated_at: now.toISOString(), window_hours:24, scanner_requests: scannerRequests, successful_sensitive_requests: successfulSensitiveRequests, decoy_hits: decoyHits, active_findings: activeFindings, system_status: activeFindings ? (findings.some(f => f.status === 'active' && f.severity === 'CRITICAL') ? 'CRITICAL' : 'ATTENTION') : 'SECURE', scanner_intent:intent, findings, self_check:selfCheck };
}

export function containsRawIp(value) { return /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(JSON.stringify(value)); }

export async function generateSecurityState(lines, { now = new Date(), selfCheck = undefined } = {}) {
  const currentSelfCheck = selfCheck === undefined ? await runSelfCheck() : selfCheck;
  return buildSecurityState(lines, { now, selfCheck: currentSelfCheck });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.env.WOPR_SECURITY_STATE_FILE || '/var/lib/wopr/security/security-state.json';
  const logs = process.argv.slice(2);
  const lines = logs.flatMap(file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : []);
  const state = await generateSecurityState(lines);
  if (containsRawIp(state)) throw new Error('privacy guard blocked raw IP persistence');
  fs.mkdirSync(path.dirname(out), { recursive:true, mode:0o750 });
  fs.writeFileSync(out, `${JSON.stringify(state, null, 2)}\n`, { mode:0o640 });
}
