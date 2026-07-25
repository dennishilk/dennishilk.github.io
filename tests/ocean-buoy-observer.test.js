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
  Function("module", `${source}\nmodule.exports = { field, stationCoordinates, normalizeStations, filterStations, generationTime, conditionColor, PROJECTION_REFERENCES };`)(module);
  return module.exports;
}

const { field, stationCoordinates, normalizeStations, filterStations, generationTime, conditionColor, PROJECTION_REFERENCES } = loadPureFunctions();

function loadProjection() {
  const source = fs.readFileSync("assets/maps/world/projection.js", "utf8").replaceAll("export ", "");
  const module = { exports: {} };
  Function("module", `${source}\nmodule.exports = { MAP_WIDTH, MAP_HEIGHT, projectCoordinates };`)(module);
  return module.exports;
}

const projection = loadProjection();

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

test("station coordinates preserve the production schema's order, sign, and validation", () => {
  const western = { station_id: "west", latitude: 39.846, longitude: -104.656, coordinates: { latitude: -10, longitude: 120 } };
  assert.deepEqual(stationCoordinates(western), { latitude: 39.846, longitude: -104.656 });
  assert.equal(field(western, "longitude"), -104.656, "a western longitude must remain negative");
  assert.deepEqual(normalizeStations({ stations: [western, { latitude: -104.656, longitude: 39.846 }, { latitude: "39", longitude: -104 }, { latitude: 39, longitude: Infinity }] }), [western]);
  assert.deepEqual(stationCoordinates({ coordinates: { latitude: 42.674, longitude: -87.026 } }), { latitude: 42.674, longitude: -87.026 }, "documented nested compatibility fields remain supported");
});

test("Ocean Buoy and Earthquake observers share the canonical 1800 by 900 projection", () => {
  assert.match(script, /map\.projectCoordinates\(latitude,longitude\)/);
  assert.match(fs.readFileSync("world-observer/earthquake-observer.js", "utf8"), /map\.add(?:Pulse|Ring)?Marker\(\{[\s\S]{0,180}latitude:[\s\S]{0,180}longitude:/);
  assert.match(fs.readFileSync("assets/maps/world/world-map.js", "utf8"), /projectCoordinates\(latitude, longitude\) \{ return projectCoordinates\(latitude, longitude\); \}/);
  assert.match(fs.readFileSync("assets/maps/world/world-observer-basemap.svg", "utf8"), /viewBox="0 0 1800 900"/);
  const denver = projection.projectCoordinates(39.846, -104.656);
  const newYork = projection.projectCoordinates(40.369, -73.703);
  assert.ok(denver.x > 300 && denver.x < 500 && denver.y > 200 && denver.y < 350, "Denver projects to western North America");
  assert.ok(newYork.x > 500 && newYork.x < 600 && newYork.y > 200 && newYork.y < 350, "New York projects to eastern North America");
  assert.ok(denver.x < newYork.x, "negative longitudes are ordered west to east");
  assert.throws(() => projection.projectCoordinates(-104.656, 39.846), /Latitude/);
});

test("diagnostic reference locations follow the production station projection", () => {
  const points = Object.fromEntries(PROJECTION_REFERENCES.map(([name, latitude, longitude]) => [name, projection.projectCoordinates(latitude, longitude)]));
  assert.ok(points["San Francisco"].x < points["Los Angeles"].x && points["Los Angeles"].x < points["Las Vegas"].x);
  assert.ok(points["San Diego"].x < points["Las Vegas"].x, "San Diego stays west of Las Vegas");
  assert.ok(points["Las Vegas"].x < points.Denver.x && points.Denver.x < points["New York"].x);
  assert.ok(Math.abs(points.London.x - projection.MAP_WIDTH / 2) < 1, "London is by the prime meridian");
  assert.ok(points.Tokyo.x > 1500, "Tokyo is in East Asia");
  assert.match(script, /PROJECTION_REFERENCES\.forEach[\s\S]*map\.projectCoordinates\(latitude,longitude\)/, "the diagnostic calls the same map projection as station markers");
});

test("reference coast cities coincide with vertices in the equirectangular land geometry", () => {
  const basemap = fs.readFileSync("assets/maps/world/world-observer-basemap.svg", "utf8");
  assert.match(basemap, /data-projection="equirectangular"/);
  assert.match(basemap, /data-geographic-bounds="-180 -90 180 90"/);
  const vertices = [...basemap.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(match => ({ x: Number(match[1]), y: Number(match[2]) }));
  const nearestLandVertex = point => Math.min(...vertices.map(vertex => Math.hypot(point.x - vertex.x, point.y - vertex.y)));
  for (const name of ["San Francisco", "Los Angeles", "San Diego", "New York", "London", "Tokyo"]) {
    const [,, longitude] = PROJECTION_REFERENCES.find(reference => reference[0] === name);
    const [, latitude] = PROJECTION_REFERENCES.find(reference => reference[0] === name);
    const distance = nearestLandVertex(projection.projectCoordinates(latitude, longitude));
    assert.ok(distance < 3, `${name} is within 3 viewBox units of its expected coastline (actual ${distance.toFixed(2)})`);
  }
});

test("land and station markers share one SVG and one navigation transform", () => {
  assert.match(script, /map\.layers\.markers\.append\(fragment\)/);
  assert.match(script, /createNavigation\(map\.svgElement/);
  assert.match(script, /svg\.style\.transform=`translate3d/);
  assert.doesNotMatch(script, /layers\.markers\.style\.transform|landLayer\.style\.transform/);
  assert.doesNotMatch(fs.readFileSync("assets/maps/world/world-observer-basemap.svg", "utf8"), /<g class="land"[^>]*transform=/);
});

test("visible buoy symbols no longer exaggerate inland extent while retaining a large hit target", () => {
  assert.match(script, /class="buoy-hit-area" r="10"/);
  assert.match(script, /class="buoy-halo" r="5"/);
  assert.match(script, /class="buoy-ring" r="3"/);
  assert.match(fs.readFileSync("style.css", "utf8"), /\.buoy-hit-area\{fill:transparent;pointer-events:all\}/);
  assert.ok(3 / 5 < 1, "the visible ring radius covers less than one degree of longitude");
});

test("representative fixture stations project into expected broad North American regions", () => {
  const stations = normalizeStations(JSON.parse(fs.readFileSync("tests/fixtures/ocean-buoy-observer.json", "utf8")));
  assert.equal(stations.length, 6);
  const byId = Object.fromEntries(stations.map(station => [station.station_id, { ...station, ...projection.projectCoordinates(station.latitude, station.longitude) }]));
  assert.ok(byId.KDEN.x < byId.KTUL.x && byId.KTUL.x < byId["45007"].x && byId["45007"].x < byId["44065"].x);
  assert.ok(byId["46042"].x < byId.KDEN.x, "the offshore Pacific station plots west of Denver");
  assert.ok(byId["45007"].y < byId.TPLM2.y, "Lake Michigan plots north of Chesapeake Bay");
  for (const station of Object.values(byId)) {
    assert.ok(station.x > 250 && station.x < 550 && station.y > 200 && station.y < 300, `${station.station_id} remains in North America`);
  }
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
