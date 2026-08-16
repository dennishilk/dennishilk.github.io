import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pairs = {
  "/world-observer.html": "/de/world-observer.html",
  "/world-observer/environment.html": "/de/world-observer/environment.html",
  "/world-observer/technology.html": "/de/world-observer/technology.html",
  "/world-observer/geomagnetic-storm-observer.html": "/de/world-observer/geomagnetic-storm-observer.html",
  "/world-observer/earthquake-observer.html": "/de/world-observer/earthquake-observer.html",
  "/world-observer/ocean-buoy-observer.html": "/de/world-observer/ocean-buoy-observer.html",
};

function fileForRoute(route) {
  return path.join(root, route.slice(1));
}

function loadBundles() {
  const context = vm.createContext({ window: {} });
  for (const file of [
    "site-i18n-de.js",
    "site-i18n-de-observers.js",
    "site-i18n-de-world-observer-core.js",
  ]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return context.window.DennisSiteI18nDE;
}

test("World Observer core bilingual routes have physical German entry points", () => {
  for (const [en, de] of Object.entries(pairs)) {
    assert.ok(fs.existsSync(fileForRoute(en)), `${en} is missing`);
    assert.ok(fs.existsSync(fileForRoute(de)), `${de} is missing`);
    assert.match(
      fs.readFileSync(fileForRoute(de), "utf8"),
      /world-observer-de-mirror-loader\.js/,
      `${de} does not use the World Observer German mirror loader`,
    );
  }
});

test("World Observer core routes have page-level German metadata", () => {
  const bundle = loadBundles();
  for (const route of Object.keys(pairs)) {
    const spec = bundle.pages?.[route];
    assert.ok(spec, `${route} has no German page translation spec`);
    assert.ok(spec.title?.trim(), `${route} has no German title`);
    assert.ok(spec.description?.trim(), `${route} has no German description`);
  }
  assert.match(bundle.pages["/world-observer.html"].description, /öffentlichen Daten|öffentlicher Daten/i);
});

test("World Observer route, mirror and bootstrap scripts keep EN and DE identity", () => {
  const stars = fs.readFileSync(path.join(root, "stars.js"), "utf8");
  const routes = fs.readFileSync(path.join(root, "world-observer-language-route.js"), "utf8");
  const mirror = fs.readFileSync(path.join(root, "world-observer-de-mirror-loader.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "world-observer-de-bootstrap.js"), "utf8");

  assert.match(stars, /dedicatedWorldObserverEnglishPaths/);
  assert.match(stars, /world-observer-language-route\.js/);
  assert.match(stars, /world-observer-de-bootstrap\.js/);
  assert.match(mirror, /fetch\(sourcePath/);
  assert.match(bootstrap, /site-i18n-de-world-observer-core\.js/);
  assert.match(bootstrap, /MutationObserver/);
  assert.match(bootstrap, /hreflang/);

  for (const [en, de] of Object.entries(pairs)) {
    assert.ok(routes.includes(`"${en}": "${de}"`), `${en} is absent from route pairs`);
    assert.ok(bootstrap.includes(`"${de}": "${en}"`), `${de} is absent from bootstrap pairs`);
    assert.ok(mirror.includes(`"${de}"`), `${de} is absent from mirror allowlist`);
  }
});

test("World Observer core German sitemap exposes every new localized route", () => {
  const sitemap = fs.readFileSync(path.join(root, "sitemap-world-observer-de.xml"), "utf8");
  for (const [en, de] of Object.entries(pairs)) {
    assert.ok(sitemap.includes(`https://dennishilk.com${de}`), `${de} missing from German World Observer sitemap`);
    assert.ok(sitemap.includes(`href="https://dennishilk.com${en}"`), `${en} missing as alternate`);
  }
});

test("World Observer core polish covers overview and technology-only strings", () => {
  const bundle = loadBundles();
  assert.equal(bundle.pages["/world-observer.html"].text["Observe. Don't speculate."], "Beobachten. Nicht spekulieren.");
  assert.equal(bundle.pages["/world-observer/technology.html"].text["Space Technology"], "Weltraumtechnik");
  assert.equal(bundle.pages["/world-observer/technology.html"].attributes["Open Space / Satellites observer"], "Observer Weltraum / Satelliten öffnen");
});
