#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { readCaseLedger, caseFindings } = require("./security-case-ledger.cjs");

const CONFIG = {
  host: process.env.WOPR_AUTH_HOST || "127.0.0.1",
  port: Number(process.env.WOPR_AUTH_PORT || 8787),
  identifier: process.env.WOPR_AUTH_IDENTIFIER || "",
  password: process.env.WOPR_AUTH_PASSWORD || "",
  sessionSecret: process.env.WOPR_SESSION_SECRET || "",
  cookieName: process.env.WOPR_SESSION_COOKIE || "wopr_session",
  sessionTtlSeconds: Number(process.env.WOPR_SESSION_TTL_SECONDS || 8 * 60 * 60),
  secureCookie: process.env.WOPR_COOKIE_SECURE !== "false",
  sameSite: process.env.WOPR_COOKIE_SAMESITE || "Strict",
  allowedOrigin: process.env.WOPR_ALLOWED_ORIGIN || "https://dennishilk.com",
  transmissionsDir: process.env.WOPR_TRANSMISSIONS_DIR || "/var/lib/wopr/transmissions",
  securityStateFile: process.env.WOPR_SECURITY_STATE_FILE || "/var/lib/wopr/security/security-state.json",
  securityReviewsFile: process.env.WOPR_SECURITY_REVIEWS_FILE || "/var/lib/wopr/security/operator-reviews.json",
  securityCasesFile: process.env.WOPR_SECURITY_CASES_FILE || "/var/lib/wopr/security/case-ledger.json",
};

const MAX_BODY_BYTES = 16 * 1024;
const MAX_OPERATOR_NOTE_LENGTH = 1000;
const OPERATOR_STATUSES = new Set(["OPEN", "ACKNOWLEDGED", "RESOLVED", "EXPECTED"]);
const TRANSMISSION_FILE = "transmissions.jsonl";
const MAX_CALLSIGN_LENGTH = 40;
const MAX_ORIGIN_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 1200;
const PUBLIC_TRANSMISSION_LIMIT = 50;
const PENDING_TRANSMISSION_LIMIT = 200;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const ALLOWED_EVENTS = new Set([
  "wopr_view",
  "login_failed",
  "login_success",
  "tictactoe_started",
  "tictactoe_finished",
  "logout",
]);
const eventCounters = new Map();
const submissionCounters = new Map();
let writeQueue = Promise.resolve();

function requireConfig() {
  const missing = [];
  if (!CONFIG.identifier) missing.push("WOPR_AUTH_IDENTIFIER");
  if (!CONFIG.password) missing.push("WOPR_AUTH_PASSWORD");
  if (!CONFIG.sessionSecret) missing.push("WOPR_SESSION_SECRET");
  if (CONFIG.sessionSecret && Buffer.byteLength(CONFIG.sessionSecret) < 32) {
    missing.push("WOPR_SESSION_SECRET (minimum 32 bytes)");
  }
  if (missing.length) {
    console.error(`WOPR auth service missing required environment: ${missing.join(", ")}`);
    process.exit(1);
  }
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");
  const length = Math.max(left.length, right.length, 1);
  const paddedLeft = Buffer.concat([left, Buffer.alloc(length)]).subarray(0, length);
  const paddedRight = Buffer.concat([right, Buffer.alloc(length)]).subarray(0, length);
  return crypto.timingSafeEqual(paddedLeft, paddedRight) && left.length === right.length;
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value) {
  return crypto.createHmac("sha256", CONFIG.sessionSecret).update(value).digest("base64url");
}

function createSessionCookie() {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlJson({ iat: now, exp: now + CONFIG.sessionTtlSeconds, nonce: crypto.randomBytes(16).toString("base64url") });
  return `${payload}.${sign(payload)}`;
}

function isValidSession(token) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, mac] = parts;
  if (!timingSafeEqualString(mac, sign(payload))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(data.exp) && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function parseCookies(header) {
  const cookies = new Map();
  String(header || "").split(";").forEach((part) => {
    const index = part.indexOf("=");
    if (index < 0) return;
    cookies.set(part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim()));
  });
  return cookies;
}

function cookieHeader(value, maxAge) {
  const parts = [
    `${CONFIG.cookieName}=${encodeURIComponent(value)}`,
    "Path=/wopr/",
    "HttpOnly",
    `SameSite=${CONFIG.sameSite}`,
    `Max-Age=${maxAge}`,
  ];
  if (CONFIG.secureCookie) parts.push("Secure");
  return parts.join("; ");
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}

function sendEmpty(res, status, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-store", ...headers });
  res.end();
}

function requireJsonContent(req) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  return contentType.split(";")[0].trim() === "application/json";
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("request too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (error) { reject(Object.assign(error, { status: 400 })); }
    });
    req.on("error", reject);
  });
}

function hasTrustedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return origin === CONFIG.allowedOrigin;
}

function clientRateKey(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function rateLimitAllows(req) {
  const now = Date.now();
  const key = clientRateKey(req);
  const current = submissionCounters.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  current.count += 1;
  submissionCounters.set(key, current);
  return current.count <= RATE_LIMIT_MAX;
}

function recordEvent(type) {
  const current = eventCounters.get(type) || { count: 0, lastAt: null };
  current.count += 1;
  current.lastAt = new Date().toISOString();
  eventCounters.set(type, current);
}

function transmissionPath() {
  return path.join(CONFIG.transmissionsDir, TRANSMISSION_FILE);
}

async function ensureTransmissionStore() {
  await fs.mkdir(CONFIG.transmissionsDir, { recursive: true, mode: 0o750 });
  await fs.appendFile(transmissionPath(), "", { mode: 0o640 });
}

async function readTransmissions() {
  await writeQueue;
  await ensureTransmissionStore();
  const content = await fs.readFile(transmissionPath(), "utf8");
  return content.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function writeTransmissions(records) {
  writeQueue = writeQueue.then(async () => {
    await ensureTransmissionStore();
    const tmpPath = `${transmissionPath()}.${process.pid}.tmp`;
    const data = records.map((record) => JSON.stringify(record)).join("\n");
    await fs.writeFile(tmpPath, data ? `${data}\n` : "", { mode: 0o640 });
    await fs.rename(tmpPath, transmissionPath());
  });
  return writeQueue;
}

function appendTransmission(record) {
  writeQueue = writeQueue.then(async () => {
    await ensureTransmissionStore();
    await fs.appendFile(transmissionPath(), `${JSON.stringify(record)}\n`, { mode: 0o640 });
  });
  return writeQueue;
}

function requireSession(req) {
  const token = parseCookies(req.headers.cookie).get(CONFIG.cookieName);
  return isValidSession(token);
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeTransmission(body) {
  const keys = Object.keys(body || {});
  const allowed = new Set(["callsign", "origin", "message", "contact_channel"]);
  if (keys.some((key) => !allowed.has(key))) return { ok: false, status: 400 };
  if (cleanText(body.contact_channel, 200)) return { ok: false, honeypot: true };
  const callsign = cleanText(body.callsign, MAX_CALLSIGN_LENGTH);
  const origin = cleanText(body.origin, MAX_ORIGIN_LENGTH);
  const message = cleanText(body.message, MAX_MESSAGE_LENGTH);
  if (!callsign || !message) return { ok: false, status: 400 };
  return { ok: true, value: { callsign, origin, message } };
}

function publicTransmission(record) {
  return {
    id: record.id,
    callsign: record.callsign,
    origin: record.origin,
    message: record.message,
    receivedAt: record.receivedAt,
    status: record.status,
  };
}

async function handleLogin(req, res) {
  if (!hasTrustedOrigin(req)) return sendJson(res, 403, { ok: false });
  if (!requireJsonContent(req)) return sendJson(res, 415, { ok: false });
  const body = await readJson(req);
  const ok = timingSafeEqualString(body.identifier || "", CONFIG.identifier) && timingSafeEqualString(body.password || "", CONFIG.password);
  if (!ok) {
    recordEvent("login_failed");
    return sendJson(res, 401, { ok: false });
  }
  recordEvent("login_success");
  return sendJson(res, 200, { ok: true }, { "Set-Cookie": cookieHeader(createSessionCookie(), CONFIG.sessionTtlSeconds) });
}

async function handleSubmitTransmission(req, res) {
  if (!hasTrustedOrigin(req)) return sendJson(res, 403, { ok: false });
  if (!requireJsonContent(req)) return sendJson(res, 415, { ok: false, message: "TRANSMISSION FAILED. RETRY LATER." });
  if (!rateLimitAllows(req)) return sendJson(res, 429, { ok: false, message: "TRANSMISSION FAILED. RETRY LATER." });
  const body = await readJson(req);
  const sanitized = sanitizeTransmission(body);
  if (sanitized.honeypot) return sendJson(res, 200, { ok: true, message: "TRANSMISSION RECEIVED. AWAITING REVIEW." });
  if (!sanitized.ok) return sendJson(res, sanitized.status || 400, { ok: false, message: "TRANSMISSION FAILED. RETRY LATER." });
  await appendTransmission({
    id: crypto.randomUUID(),
    ...sanitized.value,
    status: "PENDING",
    receivedAt: new Date().toISOString(),
  });
  return sendJson(res, 202, { ok: true, message: "TRANSMISSION RECEIVED. AWAITING REVIEW." });
}

async function handlePublicTransmissions(_req, res) {
  const records = await readTransmissions();
  const approved = records.filter((record) => record.status === "APPROVED").slice(-PUBLIC_TRANSMISSION_LIMIT).reverse().map(publicTransmission);
  return sendJson(res, 200, { ok: true, transmissions: approved });
}

async function handlePendingTransmissions(req, res) {
  if (!requireSession(req)) return sendJson(res, 401, { ok: false });
  const records = await readTransmissions();
  const pending = records.filter((record) => record.status === "PENDING").slice(-PENDING_TRANSMISSION_LIMIT).reverse().map(publicTransmission);
  return sendJson(res, 200, { ok: true, pending, count: pending.length });
}

async function updateTransmissionStatus(req, res, id, status) {
  if (!requireSession(req)) return sendJson(res, 401, { ok: false });
  if (!hasTrustedOrigin(req)) return sendJson(res, 403, { ok: false });
  const records = await readTransmissions();
  const record = records.find((entry) => entry.id === id && entry.status === "PENDING");
  if (!record) return sendJson(res, 404, { ok: false });
  record.status = status;
  record.reviewedAt = new Date().toISOString();
  await writeTransmissions(records);
  return sendJson(res, 200, { ok: true });
}

async function handleEvent(req, res) {
  const body = await readJson(req).catch(() => ({}));
  if (ALLOWED_EVENTS.has(body.type)) recordEvent(body.type);
  return sendEmpty(res, 204);
}

function handleSession(req, res) {
  return sendEmpty(res, requireSession(req) ? 204 : 401);
}

function handleLogout(req, res) {
  if (!hasTrustedOrigin(req)) return sendJson(res, 403, { ok: false });
  recordEvent("logout");
  return sendJson(res, 200, { ok: true }, { "Set-Cookie": cookieHeader("", 0) });
}

const SELF_CHECK_HOST = "dennishilk.com";
const SELF_CHECK_PATHS = Object.freeze([
  { path: "/.git/HEAD", expected: [403, 404] },
  { path: "/.git/config", expected: [403, 404] },
  { path: "/.env", expected: [403, 404] },
  { path: "/.env.production", expected: [403, 404] },
  { path: "/.aws/credentials", expected: [403, 404] },
  { path: "/", expected: [200] },
  { path: "/sitemap.xml", expected: [200] },
]);

function assertAllowedSelfCheckUrl(target) {
  const url = new URL(target, `https://${SELF_CHECK_HOST}`);
  if (url.protocol !== "https:" || url.hostname !== SELF_CHECK_HOST || !SELF_CHECK_PATHS.some((entry) => entry.path === url.pathname)) {
    throw Object.assign(new Error("self-check target not allowlisted"), { status: 400 });
  }
  return url;
}

async function probeSelfCheckPath(entry) {
  const url = assertAllowedSelfCheckUrl(entry.path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "manual", signal: controller.signal });
    if (response.status === 405) response = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal });
    return { path: entry.path, status: response.status, expected: entry.expected, result: entry.expected.includes(response.status) ? (response.status === 200 ? "OK" : "SECURE") : "ATTENTION" };
  } catch {
    return { path: entry.path, status: null, expected: entry.expected, result: "UNKNOWN" };
  } finally {
    clearTimeout(timeout);
  }
}

async function runSelfCheck() {
  const checks = [];
  for (const entry of SELF_CHECK_PATHS) checks.push(await probeSelfCheckPath(entry));
  return { host: SELF_CHECK_HOST, generated_at: new Date().toISOString(), checks };
}

async function readSecurityState() {
  try {
    const data = JSON.parse(await fs.readFile(CONFIG.securityStateFile, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`WOPR security state unavailable: ${error.message}`);
    return { generated_at: null, window_hours: 24, scanner_requests: 0, successful_sensitive_requests: 0, decoy_hits: 0, active_findings: 0, system_status: "SECURE", scanner_intent: {}, findings: [] };
  }
}

async function readOperatorReviews() {
  try {
    const data = JSON.parse(await fs.readFile(CONFIG.securityReviewsFile, "utf8"));
    return data && typeof data === "object" && data.reviews && typeof data.reviews === "object" ? data : { version: 1, reviews: {} };
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`WOPR operator reviews unavailable: ${error.message}`);
    return { version: 1, reviews: {} };
  }
}

async function writeOperatorReviews(data) {
  await fs.mkdir(path.dirname(CONFIG.securityReviewsFile), { recursive: true, mode: 0o750 });
  const tmpPath = `${CONFIG.securityReviewsFile}.${process.pid}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
  await fs.rename(tmpPath, CONFIG.securityReviewsFile);
}

function operatorReviewFor(finding, saved) {
  const review = saved && typeof saved === "object" ? { ...saved } : null;
  if (!review) return { status: "OPEN", reviewed_at: null, note: "", recurrence: false };
  const recurrence = (review.status === "RESOLVED" || review.status === "EXPECTED") && review.resolved_at && finding.status === "active" && finding.last_seen && new Date(finding.last_seen) > new Date(review.resolved_at);
  return { status: review.status, note: review.note || "", reviewed_at: review.reviewed_at || null, resolved_at: review.resolved_at || null, history: Array.isArray(review.history) ? review.history : [], recurrence };
}

function presentSecurityState(state, reviewData) {
  const findings = (Array.isArray(state.findings) ? state.findings : []).map((finding) => {
    const operator_review = operatorReviewFor(finding, reviewData.reviews[finding.id]);
    return { ...finding, automated_status: operator_review.recurrence ? "REOCCURRED" : finding.automated_status, operator_review };
  });
  const activeFindings = findings.filter((finding) => {
    const review = finding.operator_review;
    return finding.currently_detected !== false && finding.status === "active" && (!review || review.status === "OPEN" || review.status === "ACKNOWLEDGED" || review.recurrence);
  }).length;
  return { findings, activeFindings };
}

async function securityPresentation() {
  const [state, reviews] = await Promise.all([readSecurityState(), readOperatorReviews()]);
  // Analyzer state is raw/current only. Reconciliation projects it into the durable,
  // sanitized case ledger without ever inserting old cases back into analyzer output.
  const ledger = readCaseLedger(CONFIG.securityCasesFile);
  const caseState = { ...state, findings: caseFindings(ledger) };
  return { state, reviews, ...presentSecurityState(caseState, reviews) };
}

async function handleSecuritySummary(req, res) {
  if (!requireSession(req)) return sendJson(res, 401, { ok: false });
  const { state, findings, activeFindings } = await securityPresentation();
  const systemStatus = activeFindings ? findings.some(f => f.status === "active" && f.severity === "CRITICAL" && (!f.operator_review || f.operator_review.status === "OPEN" || f.operator_review.status === "ACKNOWLEDGED" || f.operator_review.recurrence)) ? "CRITICAL" : "ATTENTION" : "SECURE";
  return sendJson(res, 200, { ok: true, summary: { generated_at: state.generated_at, window_hours: state.window_hours || 24, scanner_requests: state.scanner_requests || 0, successful_sensitive_requests: state.successful_sensitive_requests || 0, decoy_hits: state.decoy_hits || 0, active_findings: activeFindings, system_status: systemStatus, scanner_intent: state.scanner_intent || {}, last_self_check: state.self_check?.generated_at || null } });
}

async function handleSecurityFindings(req, res) {
  if (!requireSession(req)) return sendJson(res, 401, { ok: false });
  const { findings } = await securityPresentation();
  return sendJson(res, 200, { ok: true, findings });
}

function validateOperatorReview(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => key !== "status" && key !== "note")) return null;
  if (!OPERATOR_STATUSES.has(body.status) || (body.note !== undefined && (typeof body.note !== "string" || body.note.length > MAX_OPERATOR_NOTE_LENGTH))) return null;
  return { status: body.status, note: body.note || "" };
}

async function updateSecurityReview(req, res, findingId) {
  if (!requireSession(req)) return sendJson(res, 401, { ok: false });
  if (!hasTrustedOrigin(req)) return sendJson(res, 403, { ok: false });
  if (!requireJsonContent(req)) return sendJson(res, 415, { ok: false });
  if (!/^[-_a-z0-9]{3,160}$/i.test(findingId)) return sendJson(res, 400, { ok: false });
  const value = validateOperatorReview(await readJson(req));
  if (!value) return sendJson(res, 400, { ok: false });
  const state = await readSecurityState();
  const ledger = readCaseLedger(CONFIG.securityCasesFile);
  if (!ledger.cases[findingId]) return sendJson(res, 404, { ok: false });
  const data = await readOperatorReviews();
  const previous = data.reviews[findingId];
  const reviewedAt = new Date().toISOString();
  const record = { status: value.status, note: value.note, reviewed_at: reviewedAt, resolved_at: value.status === "RESOLVED" || value.status === "EXPECTED" ? reviewedAt : null, history: [...(Array.isArray(previous?.history) ? previous.history : []), { status: value.status, note: value.note, at: reviewedAt }] };
  data.reviews[findingId] = record;
  await writeOperatorReviews(data);
  return sendJson(res, 200, { ok: true, review: record });
}

async function handleSecuritySelfCheck(req, res) {
  if (!requireSession(req)) return sendJson(res, 401, { ok: false });
  return sendJson(res, 200, { ok: true, self_check: await runSelfCheck() });
}

function handleHealth(_req, res) {
  return sendJson(res, 200, { ok: true });
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method === "GET" && url.pathname === "/healthz") return handleHealth(req, res);
    if (req.method === "POST" && url.pathname === "/wopr/auth/login") return await handleLogin(req, res);
    if (req.method === "GET" && url.pathname === "/wopr/auth/session") return handleSession(req, res);
    if (req.method === "POST" && url.pathname === "/wopr/auth/logout") return handleLogout(req, res);
    if (req.method === "POST" && url.pathname === "/wopr/auth/event") return await handleEvent(req, res);
    if (req.method === "POST" && url.pathname === "/api/transmissions") return await handleSubmitTransmission(req, res);
    if (req.method === "GET" && url.pathname === "/api/transmissions") return await handlePublicTransmissions(req, res);
    if (req.method === "GET" && url.pathname === "/wopr/api/transmissions/pending") return await handlePendingTransmissions(req, res);
    if (req.method === "GET" && url.pathname === "/wopr/api/security/summary") return await handleSecuritySummary(req, res);
    if (req.method === "GET" && url.pathname === "/wopr/api/security/findings") return await handleSecurityFindings(req, res);
    if (req.method === "GET" && url.pathname === "/wopr/api/security/self-check") return await handleSecuritySelfCheck(req, res);
    const reviewMatch = url.pathname.match(/^\/wopr\/api\/security\/reviews\/([^/]+)$/);
    if ((req.method === "PUT" || req.method === "POST") && reviewMatch) return await updateSecurityReview(req, res, reviewMatch[1]);
    const approveMatch = url.pathname.match(/^\/wopr\/api\/transmissions\/([^/]+)\/approve$/);
    if (req.method === "POST" && approveMatch) return await updateTransmissionStatus(req, res, approveMatch[1], "APPROVED");
    const rejectMatch = url.pathname.match(/^\/wopr\/api\/transmissions\/([^/]+)\/reject$/);
    if (req.method === "POST" && rejectMatch) return await updateTransmissionStatus(req, res, rejectMatch[1], "REJECTED");
    return sendJson(res, 404, { ok: false });
  } catch (error) {
    return sendJson(res, error.status || 500, { ok: false });
  }
}

if (require.main === module) {
requireConfig();
ensureTransmissionStore().catch((error) => {
  console.error(`WOPR transmission store unavailable: ${error.message}`);
  process.exit(1);
}).then(() => {
  http.createServer(route).listen(CONFIG.port, CONFIG.host, () => {
    console.log(`WOPR auth service listening on ${CONFIG.host}:${CONFIG.port}`);
  });
});
}

module.exports = { assertAllowedSelfCheckUrl, SELF_CHECK_PATHS, route, isValidSession, runSelfCheck, operatorReviewFor, presentSecurityState, validateOperatorReview };
