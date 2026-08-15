import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const en = readFileSync(new URL("world-observer/undersea-cable-dependency-map.html", root), "utf8");
const de = readFileSync(new URL("de/world-observer/undersea-cable-dependency-map.html", root), "utf8");
const css = readFileSync(new URL("world-observer/undersea-cable-dependency-map.css", root), "utf8");
const runtime = readFileSync(new URL("world-observer/undersea-cable-dependency-map.js", root), "utf8");
const language = readFileSync(new URL("world-observer/undersea-cable-map-language.js", root), "utf8");
const latest = JSON.parse(readFileSync(new URL("world-observer/dashboard/latest/undersea-cable-dependency-map.json", root), "utf8"));
const history = JSON.parse(readFileSync(new URL("world-observer/dashboard/history/internet-observers.json", root), "utf8"));
const record = history.observers["undersea-cable-dependency-map"];

const enUrl = "https://dennishilk.com/world-observer/undersea-cable-dependency-map.html";
const deUrl = "https://dennishilk.com/de/world-observer/undersea-cable-dependency-map.html";

function numericPoints() {
  return record.points.filter((point) => typeof point.value === "number" && Number.isFinite(point.value));
}

test("premium cable atlas keeps crawlable EN/DE routes and dedicated assets", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(de.includes('<html lang="de">'));
  assert.ok(en.includes(`<link rel="canonical" href="${enUrl}">`));
  assert.ok(de.includes(`<link rel="canonical" href="${deUrl}">`));
  assert.ok(en.includes(`hreflang="de" href="${deUrl}"`));
  assert.ok(de.includes(`hreflang="en" href="${enUrl}"`));
  assert.match(en, /"inLanguage"\s*:\s*"en"/);
  assert.match(de, /"inLanguage"\s*:\s*"de"/);
  assert.ok(en.includes('/world-observer/undersea-cable-dependency-map.css?v=1'));
  assert.ok(en.includes('/world-observer/undersea-cable-dependency-map.js?v=1'));
  assert.ok(en.includes('/world-observer/undersea-cable-map-language.js?v=1'));
  assert.ok(de.includes('/world-observer/undersea-cable-dependency-map.css?v=1'));
  assert.ok(de.includes('/world-observer/undersea-cable-dependency-map.js?v=1'));
  assert.ok(de.includes('/world-observer/undersea-cable-map-language.js?v=1'));
  assert.ok(en.includes('class="cable-language"'));
  assert.ok(de.includes('class="cable-language"'));
  assert.ok(!en.includes('/world-observer/internet-observer-detail.js'));
  assert.ok(!de.includes('/world-observer/internet-observer-detail.js'));
});

test("premium page preserves stable semantic detail contract", () => {
  for (const html of [en, de]) {
    for (const id of [
      "current-observation-title",
      "history-title",
      "observed-title",
      "derived-title",
      "unknown-title",
      "methodology-title",
      "sources-title",
      "observer-loading",
    ]) {
      assert.ok(html.includes(`id="${id}"`), id);
    }
  }

  assert.ok(en.includes(">Observed</h3>"));
  assert.ok(en.includes(">Derived</h3>"));
  assert.ok(en.includes(">Unknown</h3>"));
  assert.ok(en.includes(">Methodology</h2>"));
  assert.ok(en.includes(">Sources</h2>"));
  assert.ok(en.includes("← Back to Internet Observers"));
  assert.ok(de.includes("← Zurück zu den Internet-Observern"));
});

test("runtime DOM targets exist in both localized pages", () => {
  assert.doesNotThrow(() => new Function(runtime));
  assert.doesNotThrow(() => new Function(language));

  const ids = [...runtime.matchAll(/\$\("([^"]+)"\)/g)].map((match) => match[1]);
  assert.ok(ids.length > 10);
  for (const id of new Set(ids)) {
    assert.ok(en.includes(`id="${id}"`), `EN missing ${id}`);
    assert.ok(de.includes(`id="${id}"`), `DE missing ${id}`);
  }
});

test("current export is rendered as three raw country profiles without geographic invention", () => {
  assert.equal(latest.observer, "undersea-cable-dependency-map");
  assert.equal(latest.data_status, "ok");
  assert.equal(latest.source_type, "static_open_dataset");
  assert.equal(latest.methodology_version, "1.0");
  assert.equal(latest.dataset_hash_sha256, "1c5f188283b8a6d8f5e62b61d7b706cb5d03aa4ac8493f5f7db930311376994a");
  assert.match(latest.notes, /Static, pinned mock of an open undersea-cable dataset/);
  assert.match(latest.notes, /No private infrastructure data and no live cable-state data/);

  assert.equal(latest.countries.length, 3);
  assert.deepEqual(latest.countries.map((row) => row.country), ["BR", "US", "ZA"]);
  for (const row of latest.countries) {
    assert.equal(row.cable_count, 2);
    assert.equal(row.landing_count, 2);
    assert.equal(row.dependency_score, 1.0);
    assert.equal(row.redundancy_score, 1.0);
    for (const forbidden of ["lat", "lon", "latitude", "longitude", "geometry", "route", "landing_points", "cable_names"]) {
      assert.equal(Object.hasOwn(row, forbidden), false, `${row.country} unexpectedly exports ${forbidden}`);
    }
  }

  assert.ok(en.includes("SUBSEA DEPENDENCY ATLAS // NON-GEOGRAPHIC"));
  assert.ok(en.includes("COUNT MARKERS // NOT LOCATIONS"));
  assert.ok(en.includes("no coordinates or cable geometry"));
  assert.ok(en.includes("not</strong> counts of distinct physical cables or distinct landing sites"));
  assert.ok(de.includes("NICHT GEOGRAFISCH"));
  assert.ok(de.includes("ANZAHL-MARKER // KEINE ORTE"));
  assert.ok(runtime.includes("formatScore"));
  assert.ok(!runtime.includes('`${formatScore'));
  assert.ok(!runtime.includes('dependency_score * 100'));
  assert.ok(!runtime.includes('redundancy_score * 100'));
});

test("published memory uses the real 105 numeric export-history points", () => {
  const points = numericPoints();
  assert.equal(record.numeric_point_count, 105);
  assert.equal(record.total_point_count, 105);
  assert.equal(points.length, 105);
  assert.ok(points.every((point) => point.value === 2));
  assert.ok(points.every((point) => point.metric_name === "countries.0.cable_count"));
  assert.equal(new Set(points.map((point) => point.value)).size, 1);

  let changes = 0;
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].value !== points[index - 1].value) changes += 1;
  }
  assert.equal(changes, 0);
  assert.ok(runtime.includes("not uninterrupted calendar-day coverage"));
  assert.ok(runtime.includes("keine lückenlose Kalender-Tagesabdeckung"));
});

test("runtime reads only existing local static exports", () => {
  assert.ok(runtime.includes('const latestUrl = `/world-observer/dashboard/latest/${observerId}.json`'));
  assert.ok(runtime.includes('const historyUrl = "/world-observer/dashboard/history/internet-observers.json"'));
  assert.ok(runtime.includes('fetch(url, { cache: "no-store" })'));
  assert.equal(/fetch\(\s*["']https?:\/\//.test(runtime), false);
  assert.equal(/latitude|longitude|\blat\b|\blon\b/.test(runtime), false);
});

test("language switching persists the existing site preference", () => {
  assert.ok(language.includes('localStorage.getItem("dennishilk-language")'));
  assert.ok(language.includes('localStorage.setItem("dennishilk-language", language)'));
  assert.ok(language.includes('localStorage.setItem("about-language", language)'));
  assert.ok(language.includes('en: "/world-observer/undersea-cable-dependency-map.html"'));
  assert.ok(language.includes('de: "/de/world-observer/undersea-cable-dependency-map.html"'));
});

test("premium styling is responsive and respects reduced motion", () => {
  assert.ok(css.includes(".cable-atlas-gridfield"));
  assert.ok(css.includes(".cable-country-grid"));
  assert.ok(css.includes(".cable-memory"));
  assert.ok(css.includes("@media (max-width: 980px)"));
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(css.includes("@media (max-width: 520px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes(".cable-atlas::after { animation: none; display: none; }"));
});
