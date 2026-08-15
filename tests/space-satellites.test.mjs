import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const en = readFileSync(new URL("world-observer/technology/space-satellites.html", root), "utf8");
const de = readFileSync(new URL("de/world-observer/technology/space-satellites.html", root), "utf8");
const runtime = readFileSync(new URL("world-observer/technology/space-satellites.js", root), "utf8");
const language = readFileSync(new URL("world-observer/technology/space-satellites-language.js", root), "utf8");
const card = readFileSync(new URL("world-observer/technology/space-satellites-card.js", root), "utf8");
const css = readFileSync(new URL("world-observer/technology/space-satellites.css", root), "utf8");
const technology = readFileSync(new URL("world-observer/technology.html", root), "utf8");

const enUrl = "https://dennishilk.com/world-observer/technology/space-satellites.html";
const deUrl = "https://dennishilk.com/de/world-observer/technology/space-satellites.html";

test("Space Satellites has crawlable dedicated EN/DE routes", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(de.includes('<html lang="de">'));
  assert.ok(en.includes(`<link rel="canonical" href="${enUrl}">`));
  assert.ok(de.includes(`<link rel="canonical" href="${deUrl}">`));
  assert.ok(en.includes(`hreflang="de" href="${deUrl}"`));
  assert.ok(de.includes(`hreflang="en" href="${enUrl}"`));
  assert.match(en, /"inLanguage"\s*:\s*"en"/);
  assert.match(de, /"inLanguage"\s*:\s*"de"/);
  assert.ok(en.includes('data-observer-id="space-satellites"'));
  assert.ok(de.includes('data-observer-id="space-satellites"'));
  assert.ok(en.includes('/world-observer/technology/space-satellites.css?v=1'));
  assert.ok(en.includes('/world-observer/technology/space-satellites.js?v=1'));
  assert.ok(en.includes('/world-observer/technology/space-satellites-language.js?v=1'));
  assert.ok(!en.includes('/stars.js'));
  assert.ok(!de.includes('/stars.js'));
});

test("Space runtime JavaScript is valid and reads only the local published export", () => {
  assert.doesNotThrow(() => new Function(runtime));
  assert.doesNotThrow(() => new Function(language));
  assert.doesNotThrow(() => new Function(card));
  assert.ok(runtime.includes('const latestUrl = "/world-observer/dashboard/latest/space-satellites.json"'));
  assert.ok(runtime.includes('fetch(latestUrl, { cache: "no-store" })'));
  assert.equal(/fetch\(\s*["']https?:\/\//.test(runtime), false);
  assert.equal(/fetch\(\s*["']https?:\/\//.test(card), false);
  assert.ok(!runtime.includes("total_satellites"));
  assert.ok(!runtime.includes("satellite_total"));
});

test("runtime DOM targets exist in both localized pages", () => {
  const ids = [...runtime.matchAll(/\$\("([^"]+)"\)/g)].map((match) => match[1]);
  assert.ok(ids.length > 15);
  for (const id of new Set(ids)) {
    assert.ok(en.includes(`id="${id}"`), `EN missing ${id}`);
    assert.ok(de.includes(`id="${id}"`), `DE missing ${id}`);
  }
});

test("evidence boundary rejects positions, trajectories and summed population claims", () => {
  assert.ok(en.includes("SCHEMATIC RINGS // NOT TRAJECTORIES"));
  assert.ok(de.includes("SCHEMATISCHE RINGE // KEINE FLUGBAHNEN"));
  assert.ok(en.includes("selected groups may overlap and are not summed"));
  assert.ok(de.includes("Gruppen können sich überschneiden und werden nicht addiert"));
  assert.ok(en.includes(">Observed</h3>"));
  assert.ok(en.includes(">Derived</h3>"));
  assert.ok(en.includes(">Unknown</h3>"));
  assert.ok(de.includes(">Beobachtet</h3>"));
  assert.ok(de.includes(">Abgeleitet</h3>"));
  assert.ok(de.includes(">Unbekannt</h3>"));
  assert.ok(en.includes("No orbit propagation is performed"));
  assert.ok(de.includes("keine Orbitpropagation"));
});

test("Technology category promotes Space Satellites and removes its planned duplicate", () => {
  assert.ok(technology.includes('id="technology-space-title">Space Technology</h2>'));
  assert.ok(technology.includes('href="/world-observer/technology/space-satellites.html"'));
  assert.ok(technology.includes('/world-observer/technology/space-satellites-card.js?v=1'));
  assert.ok(technology.includes('id="technology-space-status"'));
  assert.ok(card.includes('heading?.textContent.trim() === "Space Technology"'));
  assert.ok(card.includes("MutationObserver"));
  assert.ok(card.includes('const latestUrl = "/world-observer/dashboard/latest/space-satellites.json"'));
});

test("language switching persists the existing site language preference", () => {
  assert.ok(language.includes('localStorage.getItem("dennishilk-language")'));
  assert.ok(language.includes('localStorage.setItem("dennishilk-language", language)'));
  assert.ok(language.includes('localStorage.setItem("about-language", language)'));
  assert.ok(language.includes('en: "/world-observer/technology/space-satellites.html"'));
  assert.ok(language.includes('de: "/de/world-observer/technology/space-satellites.html"'));
});

test("orbital styling is responsive and visually schematic", () => {
  assert.ok(css.includes(".space-orbit-ring"));
  assert.ok(css.includes(".space-orbit-core"));
  assert.ok(css.includes(".space-orbit-legend"));
  assert.ok(css.includes(".space-group-grid"));
  assert.ok(css.includes(".space-memory"));
  assert.ok(css.includes("@media (max-width: 900px)"));
  assert.ok(css.includes("@media (max-width: 650px)"));
  assert.ok(css.includes("@media (max-width: 460px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
});

test("visual polish keeps one-point history deliberate and telemetry-driven", () => {
  assert.ok(runtime.includes('points.length === 1'));
  assert.ok(runtime.includes('renderBaseline(memory, points[0])'));
  assert.ok(runtime.includes('space-card-freshness'));
  assert.ok(runtime.includes('space-orbit-legend'));
  assert.ok(css.includes('.space-baseline-state'));
  assert.ok(css.includes('.space-card-freshness-track'));
  assert.ok(css.includes('SCHEMATIC') === false);
});
