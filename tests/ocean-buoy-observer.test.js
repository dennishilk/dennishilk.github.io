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

test("each capability filter includes only stations with a finite measurement", () => {
  const stations = [
    { station_id: "all", latitude: 1, longitude: 1, significant_wave_height_m: 0, wind_speed_m_s: 4, sea_surface_temperature_c: 12 },
    { station_id: "wave", latitude: 2, longitude: 2, significant_wave_height_m: 1.2, wind_speed_m_s: null, sea_surface_temperature_c: null },
    { station_id: "wind", latitude: 3, longitude: 3, significant_wave_height_m: null, wind_speed_m_s: 0, sea_surface_temperature_c: null },
    { station_id: "temp", latitude: 4, longitude: 4, significant_wave_height_m: null, wind_speed_m_s: null, sea_surface_temperature_c: 0 }
  ];
  const base = { search: "", condition: "", freshness: "", waves: false, wind: false, temperature: false };
  assert.deepEqual(filterStations(stations, { ...base, waves: true }).map(s => s.station_id), ["all", "wave"]);
  assert.deepEqual(filterStations(stations, { ...base, wind: true }).map(s => s.station_id), ["all", "wind"]);
  assert.deepEqual(filterStations(stations, { ...base, temperature: true }).map(s => s.station_id), ["all", "temp"]);
  assert.match(script, /markers\.forEach\(\(node,s\)=>node\.hidden=!ids\.has\(s\)\)/);
  assert.match(script, /Showing \$\{visible\.length\} of \$\{all\.length\} stations/);
  assert.match(script, /renderTable\(\)/);
});

test("checkboxes and categorical marker palette remain explicit and accessible", () => {
  const css = fs.readFileSync("style.css", "utf8");
  assert.equal((page.match(/class="buoy-checkbox"/g) || []).length, 3);
  assert.match(css, /\.buoy-checkbox input:checked/);
  assert.match(css, /\.buoy-checkbox input:focus-visible/);
  assert.match(css, /background-image:url/);
  assert.deepEqual(["calm", "slight", "moderate", "rough", "very_rough", "high", "phenomenal"].map(conditionColor), ["#45b8ad", "#16d9ee", "#3478f6", "#f1cc45", "#f39a32", "#f05a32", "#e53434"]);
  assert.equal(conditionColor(null), "#566873");
});
