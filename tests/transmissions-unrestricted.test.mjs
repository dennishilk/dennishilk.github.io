import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("guestbook preserves history, auto-publishes pending records, and has no write quota", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "transmissions-"));
  process.env.WOPR_TRANSMISSIONS_DIR = dir;
  process.env.WOPR_TRANSMISSIONS_MODERATION = "false";
  process.env.WOPR_AUTH_IDENTIFIER = "test";
  process.env.WOPR_AUTH_PASSWORD = "test";
  process.env.WOPR_SESSION_SECRET = "temporary-secret-for-node-test-only-at-least-32-bytes";

  const store = path.join(dir, "transmissions.jsonl");
  const existing = [
    { id: "old-a", callsign: "ARCHIVE-1", origin: "Earth", message: "Old pending #1", status: "PENDING", receivedAt: "2026-10-01T00:00:00Z" },
    { id: "old-b", callsign: "ARCHIVE-2", origin: "Moon", message: "Old pending #2", status: "PENDING", receivedAt: "2026-10-02T00:00:00Z" },
    { id: "old-r", callsign: "SPAM", origin: "", message: "Rejected stays rejected", status: "REJECTED", receivedAt: "2026-10-03T00:00:00Z" },
  ];
  await fs.writeFile(store, existing.map((record) => JSON.stringify(record)).join("\n") + "\n");
  const { route, initializeTransmissions } = require("../server/wopr-auth/server.js");
  await initializeTransmissions();

  const server = http.createServer(route);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (index) => fetch(`${base}/api/transmissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://www.dennishilk.com" },
    body: JSON.stringify({ callsign: `VISITOR-${index}`, origin: "DE", message: `Message ${index}`, contact_channel: "" }),
  });

  try {
    for (let i = 1; i <= 15; i++) {
      const response = await post(i);
      assert.equal(response.status, 201, `post ${i} should not be rate-limited`);
      assert.match((await response.json()).message, /NOW LIVE/);
    }
    const concurrent = await Promise.all(Array.from({ length: 20 }, (_, i) => post(i + 16)));
    for (const response of concurrent) {
      assert.equal(response.status, 201, "parallel posts must be accepted");
      assert.equal((await response.json()).ok, true);
    }

    const all = [];
    for (let page = 1; page <= 4; page++) {
      const response = await fetch(`${base}/api/transmissions?page=${page}`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.page, page);
      assert.equal(data.total, 37);
      assert.equal(data.total_pages, 4);
      assert.equal(data.per_page, 10);
      assert.equal(data.transmissions.length, page === 4 ? 7 : 10);
      all.push(...data.transmissions);
    }
    assert.equal(new Set(all.map((record) => record.id)).size, 37);
    assert.deepEqual(all.map((record) => record.signal_number).sort((a, b) => a - b),
      Array.from({ length: 37 }, (_, i) => i + 1));
    assert.ok(all.some((record) => record.id === "old-a"));
    assert.ok(all.some((record) => record.id === "old-b"));
    assert.ok(!all.some((record) => record.id === "old-r"));

    const persisted = (await fs.readFile(store, "utf8")).trim().split("\n").map(JSON.parse);
    assert.equal(persisted.length, 38, "historical rejected records must not be deleted");
    assert.equal(persisted.find((record) => record.id === "old-a").status, "APPROVED");
    assert.equal(persisted.find((record) => record.id === "old-r").status, "REJECTED");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
