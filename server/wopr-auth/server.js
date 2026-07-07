#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const http = require("node:http");

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
};

const MAX_BODY_BYTES = 16 * 1024;
const ALLOWED_EVENTS = new Set([
  "wopr_view",
  "login_failed",
  "login_success",
  "tictactoe_started",
  "tictactoe_finished",
  "logout",
]);
const eventCounters = new Map();

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

function recordEvent(type) {
  const current = eventCounters.get(type) || { count: 0, lastAt: null };
  current.count += 1;
  current.lastAt = new Date().toISOString();
  eventCounters.set(type, current);
}

async function handleLogin(req, res) {
  if (!hasTrustedOrigin(req)) return sendJson(res, 403, { ok: false });
  const body = await readJson(req);
  const ok = timingSafeEqualString(body.identifier || "", CONFIG.identifier) && timingSafeEqualString(body.password || "", CONFIG.password);
  if (!ok) {
    recordEvent("login_failed");
    return sendJson(res, 401, { ok: false });
  }
  recordEvent("login_success");
  return sendJson(res, 200, { ok: true }, { "Set-Cookie": cookieHeader(createSessionCookie(), CONFIG.sessionTtlSeconds) });
}

async function handleEvent(req, res) {
  const body = await readJson(req).catch(() => ({}));
  if (ALLOWED_EVENTS.has(body.type)) recordEvent(body.type);
  return sendEmpty(res, 204);
}

function handleSession(req, res) {
  const token = parseCookies(req.headers.cookie).get(CONFIG.cookieName);
  return sendEmpty(res, isValidSession(token) ? 204 : 401);
}

function handleLogout(req, res) {
  if (!hasTrustedOrigin(req)) return sendJson(res, 403, { ok: false });
  recordEvent("logout");
  return sendJson(res, 200, { ok: true }, { "Set-Cookie": cookieHeader("", 0) });
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
    return sendJson(res, 404, { ok: false });
  } catch (error) {
    return sendJson(res, error.status || 500, { ok: false });
  }
}

requireConfig();
http.createServer(route).listen(CONFIG.port, CONFIG.host, () => {
  console.log(`WOPR auth service listening on ${CONFIG.host}:${CONFIG.port}`);
});
