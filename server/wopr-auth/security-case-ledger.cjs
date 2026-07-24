"use strict";

// The ledger intentionally contains only presentation-safe, aggregate facts.
const fs = require("node:fs");
const path = require("node:path");
const CASE_ID = /^[-_a-z0-9]{3,160}$/i;
const AUTOMATED = new Set(["ACTIVE", "NO LONGER DETECTED", "REMEDIATED", "REOCCURRED"]);

const LEGACY_GIT_CASE = Object.freeze({
  id: "hist-2026-07-18-git-exposure", type: "git_exposure", category: "git_exposure", severity: "CRITICAL", title: "Git metadata exposure blocked",
  first_seen: "2026-07-18T03:00:00.000Z", last_seen: "2026-07-18T03:59:59.000Z", currently_detected: false,
  automated_status: "REMEDIATED", last_automated_message: "Historical incident remediated: dotfile access was blocked in nginx.",
  summary: "Historical incident: Git metadata exposure was remediated after dotfile blocking was added in nginx.", remediation_status: "Dotfile access blocked in nginx; current self-checks return secure statuses.",
});

function validDate(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function validCase(record) {
  return record && typeof record === "object" && CASE_ID.test(record.id) && typeof record.title === "string" && typeof record.category === "string" && typeof record.severity === "string" && validDate(record.first_seen) && validDate(record.last_seen) && typeof record.currently_detected === "boolean" && AUTOMATED.has(record.automated_status);
}
function emptyLedger() { return { version: 1, cases: {} }; }
function readCaseLedger(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!data || typeof data !== "object" || data.version !== 1 || !data.cases || typeof data.cases !== "object" || Array.isArray(data.cases)) throw new Error("invalid schema");
    if (!Object.values(data.cases).every(validCase)) throw new Error("invalid case record");
    return data;
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`WOPR security case ledger unavailable: ${error.message}`);
    return emptyLedger();
  }
}
function writeCaseLedger(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o750 });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
  fs.renameSync(tmp, file);
}
function findingCase(finding) {
  return {
    id: finding.id, type: finding.type || finding.category || "unknown", category: finding.category || finding.type || "unknown", severity: finding.severity || "INFORMATIONAL", title: finding.title || "Security finding",
    first_seen: finding.first_seen, last_seen: finding.last_seen, currently_detected: true, automated_status: "ACTIVE",
    last_automated_message: finding.summary || "Automated finding requires operator review.", summary: finding.summary || "Automated finding requires operator review.",
    remediation_status: finding.remediation_status || "Needs operator review.", request_count: Number.isFinite(finding.request_count) ? finding.request_count : 0,
  };
}
function reconcileCaseLedger(ledger, findings) {
  const next = { version: 1, cases: { ...ledger.cases } };
  if (!next.cases[LEGACY_GIT_CASE.id]) next.cases[LEGACY_GIT_CASE.id] = { ...LEGACY_GIT_CASE };
  const current = new Map((Array.isArray(findings) ? findings : []).filter(f => f && CASE_ID.test(f.id) && validDate(f.first_seen) && validDate(f.last_seen)).map(f => [f.id, f]));
  for (const [id, finding] of current) {
    const existing = next.cases[id];
    next.cases[id] = { ...(existing || findingCase(finding)), ...findingCase(finding), first_seen: existing?.first_seen || finding.first_seen, currently_detected: true, automated_status: "ACTIVE" };
  }
  for (const [id, record] of Object.entries(next.cases)) {
    if (!current.has(id) && record.currently_detected) next.cases[id] = { ...record, currently_detected: false, automated_status: "NO LONGER DETECTED" };
  }
  return next;
}
function caseFindings(ledger) {
  return Object.values(ledger.cases).sort((a, b) => Date.parse(b.last_seen) - Date.parse(a.last_seen)).map(record => ({
    id: record.id, type: record.type, category: record.category, severity: record.severity, title: record.title, first_seen: record.first_seen, last_seen: record.last_seen,
    status: record.currently_detected ? "active" : "inactive", currently_detected: record.currently_detected, automated_status: record.automated_status,
    summary: record.summary, remediation_status: record.remediation_status, request_count: record.currently_detected ? record.request_count : 0,
  }));
}
module.exports = { readCaseLedger, writeCaseLedger, reconcileCaseLedger, caseFindings, validCase };
