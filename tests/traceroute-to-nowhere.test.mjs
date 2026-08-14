import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const english = readFileSync(new URL("world-observer/traceroute-to-nowhere.html", root), "utf8");
const german = readFileSync(new URL("de/world-observer/traceroute-to-nowhere.html", root), "utf8");
const renderer = readFileSync(new URL("world-observer/traceroute-to-nowhere.js", root), "utf8");
const language = readFileSync(new URL("world-observer/traceroute-language.js", root), "utf8");
const styles = readFileSync(new URL("world-observer/traceroute-to-nowhere.css", root), "utf8");
const headerStyles = readFileSync(new URL("world-observer/traceroute-header-polish.css", root), "utf8");
const sitemap = readFileSync(new URL("sitemap-internet-observers.xml", root), "utf8");

const enUrl = "https://dennishilk.com/world-observer/traceroute-to-nowhere.html";
const deUrl = "https://dennishilk.com/de/world-observer/traceroute-to-nowhere.html";

test("Traceroute showcase has crawlable English and German pages", () => {
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

test("Traceroute header is compact and language switching is explicit", () => {
  assert.ok(english.includes('<h1 class="trace-compact-title">TRACEROUTE TO NOWHERE</h1>'));
  assert.ok(german.includes('<h1 class="trace-compact-title">TRACEROUTE INS NIRGENDWO</h1>'));
  assert.ok(!english.includes('class="trace-hero"'));
  assert.ok(!german.includes('class="trace-hero"'));
  assert.ok(!english.includes('trace-hero-copy'));
  assert.ok(!german.includes('trace-hero-copy'));
  assert.ok(english.includes('/world-observer/traceroute-language.js?v=1'));
  assert.ok(german.includes('/world-observer/traceroute-language.js?v=1'));
  assert.doesNotThrow(() => new Function(language));
  assert.ok(language.includes('localStorage.setItem(STORAGE_KEY, language)'));
  assert.ok(language.includes('window.location.assign(link.href)'));
  assert.ok(headerStyles.includes('.trace-compact-title'));
});

test("Traceroute renderer only targets DOM IDs present on both language pages", () => {
  const ids = [...renderer.matchAll(/getElementById\("([^"]+)"\)/g)].map(match => match[1]);
  assert.ok(ids.length > 0);
  for (const id of new Set(ids)) {
    assert.ok(english.includes(`id="${id}"`), `missing English DOM target: ${id}`);
    assert.ok(german.includes(`id="${id}"`), `missing German DOM target: ${id}`);
  }
  assert.ok(!renderer.includes('getElementById("trace-hero-count")'));
});

test("Traceroute showcase preserves the evidence boundary", () => {
  assert.ok(english.includes("UNRESOLVED"));
  assert.ok(english.includes("NOT EXPORTED"));
  assert.ok(english.includes("These lanes are not real network hops"));
  assert.ok(english.includes("Actual hop sequence, IP addresses and ASNs"));
  assert.ok(german.includes("NICHT EXPORTIERT"));
  assert.ok(german.includes("Die Spuren sind keine echten Netzwerk-Hops"));
  assert.ok(!english.includes("AMS-IX"));
  assert.ok(!english.includes("ISP EDGE"));
});

test("Traceroute renderer only derives presentation from public exports", () => {
  assert.doesNotThrow(() => new Function(renderer));
  assert.ok(renderer.includes('const observerId = "traceroute-to-nowhere"'));
  assert.ok(renderer.includes('/world-observer/dashboard/internet.json'));
  assert.ok(renderer.includes('/world-observer/dashboard/history/internet-observers.json'));
  assert.ok(renderer.includes("Math.min(count, 24)"));
  assert.ok(renderer.includes("distinctCount"));
  assert.ok(renderer.includes("changes"));
  assert.ok(renderer.includes("coverage"));
  assert.ok(!renderer.includes("https://"));
});

test("Traceroute view remains responsive and motion-safe", () => {
  assert.ok(styles.includes("@media (max-width: 760px)"));
  assert.ok(styles.includes("@media (max-width: 520px)"));
  assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(styles.includes(".trace-lane-pulse"));
  assert.ok(styles.includes(".trace-carrier-strip"));
  assert.ok(headerStyles.includes("@media (max-width: 520px)"));
});
