const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("world-observer/ocean-buoy-observer.html", "utf8");
const script = fs.readFileSync("world-observer/ocean-buoy-observer.js", "utf8");
const overview = fs.readFileSync("world-observer.js", "utf8");
const sitemap = fs.readFileSync("sitemap.xml", "utf8");

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
