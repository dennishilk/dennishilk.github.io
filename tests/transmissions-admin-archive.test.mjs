import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("WOPR archive retains history, shows last 100 and updates public timestamp safely", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wopr-admin-transmissions-"));
  process.env.WOPR_TRANSMISSIONS_DIR = dir;
  process.env.WOPR_TRANSMISSIONS_MODERATION = "false";
  process.env.WOPR_AUTH_IDENTIFIER = "fixture-operator";
  process.env.WOPR_AUTH_PASSWORD = "fixture-password";
  process.env.WOPR_SESSION_SECRET = "temporary-test-secret-longer-than-32-characters";

  const store = path.join(dir, "transmissions.jsonl");
  const records = Array.from({ length: 115 }, (_, index) => ({
    id: "entry-" + (index + 1),
    callsign: "TEST-" + (index + 1),
    origin: "Earth",
    message: "Stored entry " + (index + 1),
    status: "APPROVED",
    signal_number: index + 1,
    receivedAt: new Date(Date.UTC(2026, 10, 12, 0, index)).toISOString(),
  }));
  await fs.writeFile(store, records.map(JSON.stringify).join("\n") + "\n");

  const { route, initializeTransmissions } = require("../server/wopr-auth/server.js");
  await initializeTransmissions();

  const server = http.createServer(route);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const get = (url, cookie) => fetch(base + url, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const post = (url, cookie, body, origin = "https://www.dennishilk.com") => fetch(base + url, {
    method: "POST",
    headers: {
      Cookie: cookie || "",
      Origin: origin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  try {
    assert.equal((await get("/wopr/api/transmissions/recent")).status, 401);

    const login = await post("/wopr/auth/login", "", {
      identifier: "fixture-operator", password: "fixture-password",
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    assert.match(cookie, /^wopr_session=/);

    const recent = await (await get("/wopr/api/transmissions/recent", cookie)).json();
    assert.equal(recent.total, 115);
    assert.equal(recent.count, 100);
    assert.equal(recent.limit, 100);
    assert.equal(recent.pending_count, 0);
    assert.equal(recent.recent.length, 100);
    assert.equal(recent.recent[0].id, "entry-115");
    assert.equal(recent.recent.at(-1).id, "entry-16");

    const id = "entry-2";
    const route = "/wopr/api/transmissions/" + id + "/time";
    assert.equal((await post(route, "", { displayAt: "2026-11-15T13:35:00.000Z" })).status, 401);
    assert.equal((await post(route, cookie, { displayAt: "2026-11-15T13:35:00.000Z" }, "https://evil.example")).status, 403);
    assert.equal((await post(route, cookie, { displayAt: "2026-02-30T13:35:00.000Z" })).status, 400);
    assert.equal((await post(route, cookie, { displayAt: "not-a-date" })).status, 400);

    const desiredTime = "2026-11-15T13:35:00.000Z"; // November in Berlin: 14:35 CET.
    const updated = await post(route, cookie, { displayAt: desiredTime });
    assert.equal(updated.status, 200);
    const updatedBody = await updated.json();
    assert.equal(updatedBody.transmission.receivedAt, records[1].receivedAt);
    assert.equal(updatedBody.transmission.displayAt, desiredTime);

    const firstPublicPage = await (await get("/api/transmissions?page=1")).json();
    assert.equal(firstPublicPage.total, 115);
    assert.equal(firstPublicPage.total_pages, 12);
    assert.equal(firstPublicPage.transmissions[0].id, id);
    assert.equal(firstPublicPage.transmissions[0].receivedAt, desiredTime);
    assert.equal(firstPublicPage.transmissions[0].signal_number, 2);

    const stored = (await fs.readFile(store, "utf8")).trim().split("\n").map(JSON.parse);
    assert.equal(stored.length, 115);
    assert.equal(stored[1].receivedAt, records[1].receivedAt, "the original receipt is immutable");
    assert.equal(stored[1].displayAt, desiredTime);

    const reset = await post(route, cookie, { displayAt: null });
    assert.equal(reset.status, 200);
    const resetBody = await reset.json();
    assert.equal(resetBody.transmission.displayAt, null);
    const afterReset = (await fs.readFile(store, "utf8")).trim().split("\n").map(JSON.parse);
    assert.equal(afterReset[1].receivedAt, records[1].receivedAt);
    assert.equal(Object.hasOwn(afterReset[1], "displayAt"), false);

    const hidden = await post("/wopr/api/transmissions/entry-2/hide", cookie);
    assert.equal(hidden.status, 200);
    assert.equal((await (await get("/api/transmissions?page=1")).json()).total, 114);
    const restored = await post("/wopr/api/transmissions/entry-2/restore", cookie);
    assert.equal(restored.status, 200);
    assert.equal((await (await get("/api/transmissions?page=1")).json()).total, 115);
    const restoredRecords = (await fs.readFile(store, "utf8")).trim().split("\n").map(JSON.parse);
    assert.equal(restoredRecords.find((record) => record.id === id).signal_number, 2);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
