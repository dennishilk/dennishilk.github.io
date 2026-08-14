import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const english = readFileSync(new URL("world-observer/internet-shrinkage-index.html", root), "utf8");
const german = readFileSync(new URL("de/world-observer/internet-shrinkage-index.html", root), "utf8");
const renderer = readFileSync(new URL("world-observer/internet-shrinkage-index.js", root), "utf8");
const language = readFileSync(new URL("world-observer/internet-shrinkage-language.js", root), "utf8");
const styles = readFileSync(new URL("world-observer/internet-shrinkage-index.css", root), "utf8");

const ids = [...renderer.matchAll(/byId\("([^"]+)"\)/g)].map(match => match[1]);

test("Internet Shrinkage showcase has dedicated English and German routes", () => {
  assert.ok(english.includes('<html lang="en">'));
  assert.ok(german.includes('<html lang="de">'));
  assert.ok(english.includes('class="shrink-language"'));
  assert.ok(german.includes('class="shrink-language"'));
  assert.ok(english.includes('href="/de/world-observer/internet-shrinkage-index.html"'));
  assert.ok(german.includes('href="/world-observer/internet-shrinkage-index.html"'));
  assert.ok(english.includes("← Back to Internet Observers"));
  assert.ok(german.includes("← Zurück zu den Internet-Observern"));
});

test("Internet Shrinkage showcase SEO keeps both language variants crawlable", () => {
  assert.ok(english.includes('<link rel="canonical" href="https://dennishilk.com/world-observer/internet-shrinkage-index.html">'));
  assert.ok(german.includes('<link rel="canonical" href="https://dennishilk.com/de/world-observer/internet-shrinkage-index.html">'));
  assert.ok(english.includes('hreflang="de" href="https://dennishilk.com/de/world-observer/internet-shrinkage-index.html"'));
  assert.ok(german.includes('hreflang="en" href="https://dennishilk.com/world-observer/internet-shrinkage-index.html"'));
  assert.ok(english.includes('"inLanguage": "en"'));
  assert.ok(german.includes('"inLanguage": "de"'));
});

test("Shrinkage renderer only targets DOM ids that exist in both pages", () => {
  assert.ok(ids.length > 10);
  for (const id of new Set(ids)) {
    assert.ok(english.includes(`id="${id}"`), `missing EN #${id}`);
    assert.ok(german.includes(`id="${id}"`), `missing DE #${id}`);
  }
});

test("Shrinkage renderer keeps the metric-path boundary explicit", () => {
  assert.doesNotThrow(() => new Function(renderer));
  assert.doesNotThrow(() => new Function(language));
  assert.ok(renderer.includes('point.metric_name === currentPath'));
  assert.ok(renderer.includes('point.metric_name && point.metric_name !== currentPath'));
  assert.ok(renderer.includes('legacyPoints'));
  assert.ok(renderer.includes('global.global_shrinkage_index'));
  assert.ok(english.includes("Legacy-path values are separated"));
  assert.ok(german.includes("Legacy-Segment"));
});

test("Shrinkage aperture is relative and never presented as Internet-size percentage", () => {
  assert.ok(english.includes("not a percentage and not a direct measurement of Internet size"));
  assert.ok(german.includes("kein Prozentwert und keine direkte Messung der Internetgröße"));
  assert.ok(renderer.includes('currentValue / peak'));
  assert.ok(renderer.includes('normalized * 38'));
  assert.ok(!english.includes("Internet size %"));
  assert.ok(!german.includes("Internetgröße %"));
});

test("Shrinkage history and provenance use only public World Observer exports", () => {
  assert.ok(renderer.includes('/world-observer/dashboard/internet.json'));
  assert.ok(renderer.includes('/world-observer/dashboard/history/internet-observers.json'));
  assert.ok(english.includes("World Observer Internet dashboard export"));
  assert.ok(german.includes("World Observer Internet-Dashboard-Export"));
  assert.ok(!renderer.includes("https://"));
});

test("Shrinkage view supports reduced motion", () => {
  assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(styles.includes("transition: none"));
});
