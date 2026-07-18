#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseLogLine } from './site-traffic-observer.mjs';

export const INTENT_CATEGORIES = Object.freeze(['git_exposure','secret_hunting','wordpress_probing','path_traversal','admin_discovery','credential_file_probing','backup_file_probing','exploit_probe','unknown']);
const SENSITIVE_STATUS = new Set([200]);

function decodePath(value) {
  let out = String(value || '/').replace(/[?#].*$/, '').replace(/\\/g, '/');
  for (let i = 0; i < 3; i++) { try { const d = decodeURIComponent(out); if (d === out) break; out = d; } catch { break; } }
  return out.toLowerCase();
}

export function classifySecurityIntent(req) {
  const p = decodePath(req?.path);
  const f = p.split('/').pop() || '';
  if (/(^|\/)\.git(\/|$)/.test(p)) return 'git_exposure';
  if (/(\.\.)(\/|$)/.test(p) || /(^|\/)(etc\/passwd|proc\/self|boot\.ini|win\.ini)/.test(p) || /windows\/system32/.test(p)) return 'path_traversal';
  if (/(^|\/)\.env([._-]|$|\/)/.test(p) || /(^|\/)\.aws(\/|$)/.test(p) || /(secret|token|api[-_]?key|access[-_]?key)/.test(f)) return 'secret_hunting';
  if (/(credential|credentials|passwd|shadow|htpasswd|id_rsa|id_dsa|id_ecdsa|id_ed25519|private[-_]?key|authorized_keys)/.test(f) || /(^|\/)\.ssh(\/|$)/.test(p)) return 'credential_file_probing';
  if (/(^|\/)(wp-admin|wp-login\.php|xmlrpc\.php|wp-content|wp-includes)(\/|$)/.test(p)) return 'wordpress_probing';
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

export function buildSecurityState(lines, { now = new Date(), selfCheck = null } = {}) {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const intent = Object.fromEntries(INTENT_CATEGORIES.map(c => [c, 0]));
  const findings = [historicalFinding()];
  const activeByType = new Map();
  let scannerRequests = 0, successfulSensitiveRequests = 0;
  for (const line of lines) {
    const req = parseLogLine(line); if (!req?.time || req.time < since || req.time > now) continue;
    const category = classifySecurityIntent(req); if (category !== 'unknown') scannerRequests++;
    intent[category]++;
    if (SENSITIVE_STATUS.has(req.status) && isSensitivePath(req.path)) {
      successfulSensitiveRequests++;
      const severity = severityForSensitivePath(req.path);
      const id = `active-${category}-${severity.toLowerCase()}`;
      const existing = activeByType.get(id) || { id, type:category, severity, title:`Sensitive ${category.replaceAll('_',' ')} returned HTTP 200`, first_seen:req.time.toISOString(), last_seen:req.time.toISOString(), status:'active', request_count:0, http_statuses:[], summary:'One or more requests to a sensitive path returned HTTP 200. Review nginx rules and deployed files without exposing file contents.', remediation_status:'Needs operator review.' };
      existing.request_count += 1;
      existing.last_seen = req.time.toISOString();
      if (!existing.http_statuses.includes(req.status)) existing.http_statuses.push(req.status);
      activeByType.set(id, existing);
    }
  }
  findings.unshift(...activeByType.values());
  const activeFindings = findings.filter(f => f.status === 'active').length;
  return { generated_at: now.toISOString(), window_hours:24, scanner_requests: scannerRequests, successful_sensitive_requests: successfulSensitiveRequests, active_findings: activeFindings, system_status: activeFindings ? (findings.some(f => f.status === 'active' && f.severity === 'CRITICAL') ? 'CRITICAL' : 'ATTENTION') : 'SECURE', scanner_intent:intent, findings, self_check:selfCheck };
}

export function containsRawIp(value) { return /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(JSON.stringify(value)); }

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.env.WOPR_SECURITY_STATE_FILE || '/var/lib/wopr/security/security-state.json';
  const logs = process.argv.slice(2);
  const lines = logs.flatMap(file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : []);
  const state = buildSecurityState(lines);
  if (containsRawIp(state)) throw new Error('privacy guard blocked raw IP persistence');
  fs.mkdirSync(path.dirname(out), { recursive:true, mode:0o750 });
  fs.writeFileSync(out, `${JSON.stringify(state, null, 2)}\n`, { mode:0o640 });
}
