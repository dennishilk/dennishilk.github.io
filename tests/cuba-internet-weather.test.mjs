import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const english = readFileSync(new URL("world-observer/cuba-internet-weather.html", root), "utf8");
const german = readFileSync(new URL("de/world-observer/cuba-internet-weather.html", root), "utf8");
const renderer = readFileSync(new URL("world-observer/cuba-internet-weather.js", root), "utf8");
const language = readFileSync(new URL("world-observer/cuba-internet-weather-language.js", root), "utf8");
const css = readFileSync(new URL("world-observer/cuba-internet-weather.css", root), "utf8");
const dashboard = JSON.parse(readFileSync(new URL("world-observer/dashboard/internet.json", root), "utf8"));
const history = JSON.parse(readFileSync(new URL("world-observer/dashboard/history/internet-observers.json", root), "utf8"));

const enUrl = "https://dennishilk.com/world-observer/cuba-internet-weather.html";
const deUrl = "https://dennishilk.com/de/world-observer/cuba-internet-weather.html";

test("Cuba Internet Weather has crawlable English and German showcase pages", () => {
  assert.ok(english.includes('<html lang="en">'));
  assert.ok(german.includes('<html lang="de">'));
  assert.ok(english.includes(`<link rel="canonical" href="${enUrl}">`));
  assert.ok(german.includes(`<link rel="canonical" href="${deUrl}">`));
  assert.ok(english.includes(`hreflang="de" href="${deUrl}"`));
  assert.ok(german.includes(`hreflang="en" href="${enUrl}"`));
  assert.ok(english.includes('"inLanguage": "en"'));
  assert.ok(german.includes('"inLanguage": "de"'));
  assert.ok(english.includes("CUBA INTERNET WEATHER"));
  assert.ok(german.includes("KUBA INTERNET-WETTER"));
});

test("Cuba uses dedicated compact navigation and true EN/DE routes", () => {
  assert.ok(english.includes('class="cuba-back"'));
  assert.ok(german.includes('class="cuba-back"'));
  assert.ok(english.includes("← Back to Internet Observers"));
  assert.ok(german.includes("← Zurück zu den Internet-Observern"));
  assert.ok(english.includes('class="cuba-language"'));
  assert.ok(german.includes('class="cuba-language"'));
  assert.ok(english.includes('/world-observer/cuba-internet-weather.css?v=1'));
  assert.ok(english.includes('/world-observer/cuba-internet-weather.js?v=1'));
  assert.ok(english.includes('/world-observer/cuba-internet-weather-language.js?v=1'));
  assert.doesNotThrow(() => new Function(language));
  assert.ok(language.includes('localStorage.setItem(STORAGE_KEY, language)'));
  assert.ok(language.includes('window.location.assign(link.href)'));
});

test("Cuba renderer targets DOM IDs present on both language pages", () => {
  const ids = [...renderer.matchAll(/getElementById\("([^"]+)"\)/g)].map(match => match[1]);
  assert.ok(ids.length > 15);
  for (const id of new Set(ids)) {
    assert.ok(english.includes(`id="${id}"`), `missing EN #${id}`);
    assert.ok(german.includes(`id="${id}"`), `missing DE #${id}`);
  }
});

test("Cuba preserves the latency evidence boundary and metaphor warning", () => {
  assert.ok(english.includes("VISUAL METAPHOR // LATENCY ONLY // NO FORECAST"));
  assert.ok(german.includes("VISUELLE METAPHER // NUR LATENZ // KEINE VORHERSAGE"));
  assert.ok(english.includes("targets.1.ping.rtt_avg_ms"));
  assert.ok(german.includes("targets.1.ping.rtt_avg_ms"));
  assert.ok(english.includes(">Observed</h2>"));
  assert.ok(english.includes(">Derived</h2>"));
  assert.ok(english.includes(">Unknown</h2>"));
  assert.ok(german.includes(">Beobachtet</h2>"));
  assert.ok(german.includes(">Abgeleitet</h2>"));
  assert.ok(german.includes(">Unbekannt</h2>"));
});

test("Cuba renderer derives presentation only from existing public exports", () => {
  assert.doesNotThrow(() => new Function(renderer));
  assert.ok(renderer.includes('const DASHBOARD_URL = "/world-observer/dashboard/internet.json"'));
  assert.ok(renderer.includes('const HISTORY_URL = "/world-observer/dashboard/history/internet-observers.json"'));
  assert.ok(!renderer.includes('fetch("http://'));
  assert.ok(!renderer.includes('fetch("https://'));
  assert.ok(renderer.includes("quantile(sorted, 0.9)"));
  assert.ok(renderer.includes("cuba-iqr-band"));

  const observer = dashboard.observers.find(item => item.observer === "cuba-internet-weather");
  const series = history.observers["cuba-internet-weather"];
  assert.ok(observer);
  assert.ok(series);
  assert.equal(observer.primary_metric_path, "targets.1.ping.rtt_avg_ms");
  assert.ok(series.preferred_metric_paths.includes("targets.1.ping.rtt_avg_ms"));
  assert.ok(series.points.length > 0);
  assert.ok(series.points.filter(point => Number.isFinite(Number(point.value))).length > 0);
});

test("Cuba showcase remains responsive and motion-safe", () => {
  assert.ok(css.includes("@media (max-width: 900px)"));
  assert.ok(css.includes("@media (max-width: 680px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes(".cuba-barometer"));
  assert.ok(css.includes(".cuba-history-plot"));
});
