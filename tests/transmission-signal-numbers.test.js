"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { chronologicalTransmissionOrder, migrateSignalNumbers } = require("../server/wopr-auth/server.js");

function legacyRecords() {
  return [
    { id: "newest", status: "APPROVED", receivedAt: "2026-03-03T00:00:00.000Z" },
    { id: "oldest", status: "APPROVED", receivedAt: "2026-01-01T00:00:00.000Z" },
    { id: "middle", status: "APPROVED", receivedAt: "2026-02-02T00:00:00.000Z" },
  ];
}

test("legacy approved transmissions receive stable chronological signal numbers", () => {
  const records = legacyRecords();
  assert.equal(migrateSignalNumbers(records), 4);
  assert.equal(records.find(({ id }) => id === "oldest").signal_number, 1);
  assert.equal(records.find(({ id }) => id === "newest").signal_number, 3);

  records.reverse();
  assert.equal(migrateSignalNumbers(records, 4), 4, "sorting does not renumber migrated records");
  assert.deepEqual(records.sort(chronologicalTransmissionOrder).reverse().map(({ signal_number }) => signal_number), [3, 2, 1]);
});

test("the persistent counter is not reduced when earlier signal records are absent", () => {
  const later = [{ id: "later", status: "APPROVED", receivedAt: "2026-04-04T00:00:00.000Z" }];
  assert.equal(migrateSignalNumbers(later, 4), 5);
  assert.equal(later[0].signal_number, 4);
});

test("the archive renderer uses the persisted number rather than its array index", () => {
  const source = require("node:fs").readFileSync(require.resolve("../transmissions.js"), "utf8");
  assert.match(source, /String\(transmission\.signal_number\)\.padStart\(4, "0"\)/);
  assert.doesNotMatch(source, /String\(index \+ 1\)/);
});
