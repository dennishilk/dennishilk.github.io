import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const pairs = [
  ["wiesmoor-weather", "Wiesmoor Weather Observer"],
  ["wiesmoor-peatland", "Wiesmoor Peatland Observer"],
  ["wiesmoor-sky", "Wiesmoor Sky Observer"],
  ["east-frisia-water", "East Frisia Water Observer"],
  ["horizon-observer", "Horizon Observer"],
  ["wiesmoor-population", "Wiesmoor Population Observer"],
  ["wiesmoor-energy", "Wiesmoor Energy Observer"],
  ["wiesmoor-groundwater", "Wiesmoor Groundwater Observer"],
  ["wiesmoor-development", "Wiesmoor City Development Observer"],
  ["wiesmoor-finance", "Wiesmoor City Finance Observer"],
];

const staticGermanPublicObservers = new Set([
  "wiesmoor-population",
  "wiesmoor-energy",
  "wiesmoor-groundwater",
  "wiesmoor-development",
  "wiesmoor-finance",
]);

const seoRuntime = read("seo-runtime.js");
const bootstrap = read("wiesmoor-de-bootstrap.js");
const routeScript = read("wiesmoor-language-route.js");
const stars = read("stars.js");
const hometownDe = read("de/world-observer/hometown.html");
const spaceLanguage = read("world-observer/technology/space-satellites-language.js");

test("all ten Wiesmoor observer pairs exist as crawlable local files", () => {
  for (const [slug] of pairs) {
    assert.ok(existsSync(new URL(`world-observer/${slug}.html`, root)), `missing EN ${slug}`);
    assert.ok(existsSync(new URL(`de/world-observer/${slug}.html`, root)), `missing DE ${slug}`);
  }
});

test("German Hometown hub links every observer card to the German route", () => {
  for (const [slug] of pairs) {
    assert.match(hometownDe, new RegExp(`href="/de/world-observer/${slug}\\.html"`));
  }
  assert.doesNotMatch(hometownDe, /href="\/world-observer\/(?:wiesmoor-(?:weather|peatland|sky|population|energy|groundwater|development|finance)|east-frisia-water|horizon-observer)\.html"/);
});

test("dedicated Wiesmoor language routing maps every EN and DE observer URL", () => {
  for (const [slug] of pairs) {
    assert.ok(routeScript.includes(`"/world-observer/${slug}.html": "/de/world-observer/${slug}.html"`));
    assert.ok(bootstrap.includes(`"/de/world-observer/${slug}.html": "/world-observer/${slug}.html"`));
    assert.ok(stars.includes(`"/world-observer/${slug}.html"`));
    assert.ok(stars.includes(`"/de/world-observer/${slug}.html"`));
  }
  assert.match(stars, /wiesmoor-language-route\.js/);
  assert.match(stars, /wiesmoor-de-bootstrap\.js/);
});

test("German public-data observers expose static German canonical and hreflang metadata", () => {
  for (const slug of staticGermanPublicObservers) {
    const page = read(`de/world-observer/${slug}.html`);
    assert.match(page, /<html lang="de">/);
    assert.match(page, new RegExp(`<link rel="canonical" href="https://dennishilk\\.com/de/world-observer/${slug}\\.html">`));
    assert.match(page, new RegExp(`hreflang="en" href="https://dennishilk\\.com/world-observer/${slug}\\.html"`));
    assert.match(page, new RegExp(`hreflang="de" href="https://dennishilk\\.com/de/world-observer/${slug}\\.html"`));
    assert.match(page, /inLanguage":"de"/);
  }
});

test("rendered metadata fallback fixes the five complex German Wiesmoor observer copies", () => {
  for (const slug of ["wiesmoor-weather", "wiesmoor-peatland", "wiesmoor-sky", "east-frisia-water", "horizon-observer"]) {
    assert.ok(bootstrap.includes(`"/de/world-observer/${slug}.html": "/world-observer/${slug}.html"`));
  }
  assert.match(bootstrap, /canonical\.href = `https:\/\/dennishilk\.com\$\{dePath\}`/);
  assert.match(bootstrap, /document\.documentElement\.lang = "de"/);
  assert.match(bootstrap, /site-i18n-de-wiesmoor\.js/);
});

test("sitewide SEO metadata replaces generic implementation-oriented hub copy", () => {
  for (const phrase of [
    "Public Data on Internet, Environment, Society & Technology",
    "DNS, IPv6, Reachability & Network Infrastructure",
    "Linux, Software Ecosystems, Time & Satellites",
    "Wiesmoor Public Data Observer",
    "Interactive Computer Museum – C64 BASIC, Modems, BBS & Retro Computing",
    "Wiesmoor, Germany – History of a Peat & Flower Town",
  ]) assert.ok(seoRuntime.includes(phrase), `missing SEO metadata phrase: ${phrase}`);

  assert.doesNotMatch(seoRuntime, /category page using the World Observer dashboard design language/i);
  assert.doesNotMatch(seoRuntime, /Static World Observer overview with project-level observational status data/i);
});

test("SEO runtime supplies robots, reciprocal hreflang and BreadcrumbList structured data", () => {
  assert.match(seoRuntime, /index,follow,max-image-preview:large/);
  assert.match(seoRuntime, /hreflang/);
  assert.match(seoRuntime, /BreadcrumbList/);
  assert.match(seoRuntime, /seo-breadcrumb-jsonld/);
});

test("Space language runtime carries natural German metadata and breadcrumbs", () => {
  assert.match(spaceLanguage, /Satelliten & Umlaufbahndaten – CelesTrak-Gruppen/);
  assert.match(spaceLanguage, /Beobachtung ausgewählter öffentlicher CelesTrak-GP-Gruppen/);
  assert.match(spaceLanguage, /BreadcrumbList/);
  assert.doesNotMatch(spaceLanguage, /Ein provenance-first Orbital Population Observatory/);
});

test("SEO work does not introduce ranking guarantees or fabricated traffic claims", () => {
  for (const source of [seoRuntime, bootstrap, routeScript, spaceLanguage]) {
    assert.doesNotMatch(source, /guaranteed ranking|rank #1|guaranteed traffic|millions of visitors/i);
  }
});
