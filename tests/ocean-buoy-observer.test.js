const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("world-observer/ocean-buoy-observer.html", "utf8");
const script = fs.readFileSync("world-observer/ocean-buoy-observer.js", "utf8");
const overview = fs.readFileSync("world-observer.js", "utf8");
const sitemap = fs.readFileSync("sitemap.xml", "utf8");

function loadPureFunctions() {
  const source = script
    .replace(/^import .*$/m, "")
    .replaceAll("export ", "")
    .split("let all =")[0];
  const module = { exports: {} };
  Function("module", `${source}\nmodule.exports = { filterStations, generationTime, conditionColor };`)(module);
  return module.exports;
}

const { filterStations, generationTime, conditionColor } = loadPureFunctions();

test("Ocean Buoy Observer production route and data source are wired", () => {
  assert.match(script, /dashboard\/latest\/ocean-buoy-observer\.json/);
  assert.match(page, /id="buoy-map"/);
  assert.match(page, /NOAA National Data Buoy Center/);
  assert.match(page, /not a complete worldwide buoy inventory/);
  assert.match(sitemap, /world-observer\/ocean-buoy-observer\.html/);
});

test("overview promotes the observer as active", () => {
  const card = overview.slice(overview.indexOf('title: "Ocean Buoy Observer"'), overview.indexOf('title: "Ocean Buoy Observer"') + 260);
  assert.match(card, /● ACTIVE/);
  assert.match(card, /ocean-buoy-observer\.html/);
  assert.doesNotMatch(card, /PLANNED/i);
});

test("details and accessibility affordances are present", () => {
  assert.match(page, /VIEW OFFICIAL NDBC STATION|buoy-detail-content/);
  assert.match(script, /noopener noreferrer/);
  assert.match(script, /e\.key==="Escape"/);
  assert.match(fs.readFileSync("style.css", "utf8"), /prefers-reduced-motion:reduce/);
  const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test("observer generation time comes from observer.generated_at and is formatted in UTC", () => {
  const fixture = JSON.parse(fs.readFileSync("tests/fixtures/ocean-buoy-observer.json", "utf8"));
  assert.equal(generationTime(fixture), "2026-07-25 14:37 UTC");
  assert.equal(generationTime({ generated_at: "2020-01-01T00:00:00Z" }), "Not reported");
  assert.equal(generationTime({ observer: null }), "Not reported");
});

test("remaining filters synchronize markers, count, and table", () => {
  const stations = [
    { station_id: "alpha", station_name: "North Point", wave_condition: "calm", freshness_status: "fresh" },
    { station_id: "bravo", station_name: "South Point", wave_condition: "rough", freshness_status: "stale" }
  ];
  const base = { search: "", condition: "", freshness: "" };
  assert.deepEqual(filterStations(stations, { ...base, search: "north" }).map(s => s.station_id), ["alpha"]);
  assert.deepEqual(filterStations(stations, { ...base, condition: "rough" }).map(s => s.station_id), ["bravo"]);
  assert.deepEqual(filterStations(stations, { ...base, freshness: "fresh" }).map(s => s.station_id), ["alpha"]);
  assert.match(script, /markers\.forEach\(\(node,s\)=>node\.hidden=!ids\.has\(s\)\)/);
  assert.match(script, /Showing \$\{visible\.length\} of \$\{all\.length\} stations/);
  assert.match(script, /renderTable\(\)/);
});

test("capability checkboxes, state, and handlers are removed", () => {
  const css = fs.readFileSync("style.css", "utf8");
  for (const id of ["buoy-waves", "buoy-wind", "buoy-temperature"]) {
    assert.doesNotMatch(page, new RegExp(`id="${id}"`));
    assert.doesNotMatch(script, new RegExp(`#${id}`));
  }
  assert.doesNotMatch(page, /class="buoy-checkbox"|type="checkbox"/);
  assert.doesNotMatch(css, /buoy-checkbox/);
  assert.doesNotMatch(script, /filters\.(waves|wind|temperature)|\.checked|type==="checkbox"/);
});

test("remaining filter controls and reset handler are present", () => {
  for (const id of ["buoy-search", "buoy-condition", "buoy-freshness", "buoy-reset-filters", "buoy-count"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(script, /\.buoy-toolbar input,\.buoy-toolbar select/);
  assert.match(script, /#buoy-reset-filters/);
  assert.match(script, /control=>control\.value=""/);
});

test("wave-condition legend is outside the map viewport and retains the marker palette", () => {
  const css = fs.readFileSync("style.css", "utf8");
  const legend = page.match(/<aside class="buoy-legend"[\s\S]*?<\/aside>/)?.[0];
  const map = page.match(/<div id="buoy-map"[\s\S]*?<\/div><\/div>/)?.[0];
  assert.ok(legend);
  assert.ok(map);
  assert.ok(page.indexOf(legend) < page.indexOf(map));
  assert.doesNotMatch(map, /buoy-legend/);
  assert.doesNotMatch(css.match(/\.buoy-legend\{[^}]*\}/)?.[0] || "", /position:absolute/);
  for (const label of ["calm", "slight", "moderate", "rough", "very rough", "high", "phenomenal", "unknown"]) {
    assert.match(legend, new RegExp(`>${label}<|[●○] ${label}`));
  }
  assert.match(legend, /Dashed or faded ring: stale station/);
  assert.deepEqual(["calm", "slight", "moderate", "rough", "very_rough", "high", "phenomenal"].map(conditionColor), ["#45b8ad", "#16d9ee", "#3478f6", "#f1cc45", "#f39a32", "#f05a32", "#e53434"]);
  assert.equal(conditionColor(null), "#566873");
});
