import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const english = readFileSync(new URL("world-observer/north-korea-connectivity.html", root), "utf8");
const german = readFileSync(new URL("de/world-observer/north-korea-connectivity.html", root), "utf8");
const renderer = readFileSync(new URL("world-observer/north-korea-connectivity.js", root), "utf8");
const language = readFileSync(new URL("world-observer/north-korea-language.js", root), "utf8");
const styles = readFileSync(new URL("world-observer/north-korea-connectivity.css", root), "utf8");
const sitemap = readFileSync(new URL("sitemap-internet-observers.xml", root), "utf8");

const enUrl = "https://dennishilk.com/world-observer/north-korea-connectivity.html";
const deUrl = "https://dennishilk.com/de/world-observer/north-korea-connectivity.html";

test("North Korea Connectivity has crawlable English and German showcase pages", () => {
  assert.ok(english.includes('<html lang="en">'));
  assert.ok(german.includes('<html lang="de">'));
  assert.ok(english.includes(`<link rel="canonical" href="${enUrl}">`));
  assert.ok(german.includes(`<link rel="canonical" href="${deUrl}">`));
  assert.ok(english.includes(`<link rel="alternate" hreflang="de" href="${deUrl}">`));
  assert.ok(german.includes(`<link rel="alternate" hreflang="en" href="${enUrl}">`));
  assert.ok(english.includes('"inLanguage": "en"'));
  assert.ok(german.includes('"inLanguage": "de"'));
  assert.ok(sitemap.includes(`<loc>${enUrl}</loc>`));
  assert.ok(sitemap.includes(`<loc>${deUrl}</loc>`));
});

test("North Korea Connectivity uses compact showcase navigation and explicit language switching", () => {
  assert.ok(english.includes('<h1 class="nk-compact-title">NORTH KOREA CONNECTIVITY</h1>'));
  assert.ok(german.includes('<h1 class="nk-compact-title">NORDKOREA-KONNEKTIVITÄT</h1>'));
  assert.ok(english.includes("← Back to Internet Observers"));
  assert.ok(german.includes("← Zurück zu den Internet-Observern"));
  assert.ok(english.includes('class="nk-language"'));
  assert.ok(german.includes('class="nk-language"'));
  assert.ok(!english.includes('class="dashboard-header'));
  assert.ok(!german.includes('class="dashboard-header'));
  assert.doesNotThrow(() => new Function(language));
  assert.ok(language.includes('localStorage.setItem(STORAGE_KEY, language)'));
  assert.ok(language.includes('window.location.assign(link.href)'));
});

test("North Korea Connectivity renderer targets DOM IDs present on both language pages", () => {
  const ids = [...renderer.matchAll(/getElementById\("([^"]+)"\)/g)].map(match => match[1]);
  assert.ok(ids.length > 0);
  for (const id of new Set(ids)) {
    assert.ok(english.includes(`id="${id}"`), `missing English DOM target: ${id}`);
    assert.ok(german.includes(`id="${id}"`), `missing German DOM target: ${id}`);
  }
});

test("North Korea Connectivity preserves the public-export evidence boundary", () => {
  assert.ok(english.includes("PUBLIC PROBE WINDOW"));
  assert.ok(english.includes("OUTCOME"));
  assert.ok(english.includes("NOT EXPORTED"));
  assert.ok(english.includes("RESPONDERS · SUCCESS · ROUTE · RTT"));
  assert.ok(english.includes("Probe destinations, responders and per-probe success or failure"));
  assert.ok(english.includes("not hosts, packets, replies or paths"));
  assert.ok(german.includes("ÖFFENTLICHES PROBE-FENSTER"));
  assert.ok(german.includes("NICHT EXPORTIERT"));
  assert.ok(german.includes("Probe-Ziele, Antwortsysteme und Erfolg oder Fehlschlag"));
  assert.ok(!english.includes("Pyongyang"));
  assert.ok(!english.includes("China Unicom"));
});

test("North Korea Connectivity renderer derives presentation only from existing public exports", () => {
  assert.doesNotThrow(() => new Function(renderer));
  assert.ok(renderer.includes('const observerId = "north-korea-connectivity"'));
  assert.ok(renderer.includes('/world-observer/dashboard/internet.json'));
  assert.ok(renderer.includes('/world-observer/dashboard/history/internet-observers.json'));
  assert.ok(renderer.includes('["ICMP probes"]'));
  assert.ok(renderer.includes("distinctCount"));
  assert.ok(renderer.includes("changes"));
  assert.ok(renderer.includes("coverage"));
  assert.ok(renderer.includes("Math.min(numeric, 64)"));
  assert.ok(!renderer.includes("https://"));
});

test("North Korea Connectivity remains responsive and motion-safe", () => {
  assert.ok(styles.includes("@media (max-width: 900px)"));
  assert.ok(styles.includes("@media (max-width: 760px)"));
  assert.ok(styles.includes("@media (max-width: 520px)"));
  assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(styles.includes(".nk-probe-cells"));
  assert.ok(styles.includes(".nk-history-field"));
  assert.ok(styles.includes(".nk-outcome"));
});
