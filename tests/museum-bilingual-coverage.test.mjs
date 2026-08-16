import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const museumRoot = path.join(root, "museum");

function listHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listHtmlFiles(fullPath);
      return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
    });
}

function routeForFile(file) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  return `/${relative.replace(/index\.html$/, "")}`;
}

function sourceFileForRoute(route) {
  const relative = route.startsWith("/") ? route.slice(1) : route;
  return path.join(root, relative.endsWith("/") ? `${relative}index.html` : relative);
}

function germanFileForRoute(route) {
  const relative = route.startsWith("/") ? route.slice(1) : route;
  return path.join(root, "de", relative.endsWith("/") ? `${relative}index.html` : relative);
}

function hasNoindex(file) {
  const html = fs.readFileSync(file, "utf8");
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return tags.some(tag => /\bname\s*=\s*["']robots["']/i.test(tag) && /\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(tag));
}

function loadMuseumBundles() {
  const context = vm.createContext({ window: {} });
  for (const file of [
    "site-i18n-de.js",
    "site-i18n-de-extra.js",
    "site-i18n-de-home-computing.js",
    "site-i18n-de-museum-classics.js",
    "site-i18n-de-museum-crypto.js",
    "site-i18n-de-museum-malware.js",
    "site-i18n-de-museum-polish.js",
  ]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(source, context, { filename: file });
  }
  return context.window.DennisSiteI18nDE;
}

function hasDedicatedGermanFile(file) {
  const relative = path.relative(root, file);
  return fs.existsSync(path.join(root, "de", relative));
}

function hasSpecificRuntimeCoverage(route, bundle) {
  if (bundle.pages?.[route]) return true;
  return Object.keys(bundle.prefixes || {}).some(prefix =>
    prefix.startsWith("/museum/") &&
    prefix !== "/museum/" &&
    route.startsWith(prefix)
  );
}

function assertAuditFamily(bundle, key, expectedCount) {
  const routes = bundle.audit?.[key]?.routes || [];
  assert.equal(routes.length, expectedCount, `${key} route count changed unexpectedly`);
  assert.equal(new Set(routes).size, routes.length, `${key} contains duplicate routes`);
  for (const route of routes) {
    assert.ok(bundle.pages?.[route], `${route} is missing page-level German metadata`);
    assert.ok(bundle.pages[route].title?.trim(), `${route} is missing a German title`);
    assert.ok(bundle.pages[route].description?.trim(), `${route} is missing a German description`);
  }
}

test("every Computer Museum HTML page has a concrete German path or runtime translation family", () => {
  const bundle = loadMuseumBundles();
  const pages = listHtmlFiles(museumRoot);
  const uncovered = pages
    .filter(file => !hasDedicatedGermanFile(file))
    .map(file => ({ file, route: routeForFile(file) }))
    .filter(({ route }) => !hasSpecificRuntimeCoverage(route, bundle))
    .map(({ route }) => route)
    .sort();

  assert.deepEqual(
    uncovered,
    [],
    `Museum pages without concrete German coverage:\n${uncovered.join("\n")}`,
  );
});

test("audited Museum translation families declare complete page-level metadata", () => {
  const bundle = loadMuseumBundles();
  assertAuditFamily(bundle, "museumClassics", 21);
  assertAuditFamily(bundle, "museumCrypto", 17);
  assertAuditFamily(bundle, "museumMalware", 18);
});

test("all newly audited Museum routes have physical German mirror entry points", () => {
  const bundle = loadMuseumBundles();
  const routes = [
    ...bundle.audit.museumClassics.routes,
    ...bundle.audit.museumCrypto.routes,
    ...bundle.audit.museumMalware.routes,
  ];
  assert.equal(routes.length, 56);
  for (const route of routes) {
    const file = germanFileForRoute(route);
    assert.ok(fs.existsSync(file), `${route} is missing ${path.relative(root, file)}`);
    assert.match(fs.readFileSync(file, "utf8"), /museum-de-mirror-loader\.js/, `${route} does not use the German mirror loader`);
  }
});

test("all indexable audited English Museum routes expose the shared language control", () => {
  const bundle = loadMuseumBundles();
  const routes = [
    ...bundle.audit.museumClassics.routes,
    ...bundle.audit.museumCrypto.routes,
    ...bundle.audit.museumMalware.routes,
  ];
  const missing = routes.filter(route => {
    const file = sourceFileForRoute(route);
    if (hasNoindex(file)) return false;
    const source = fs.readFileSync(file, "utf8");
    return !/(?:\/stars\.js|\/site-language\.js)/.test(source);
  }).sort();
  assert.deepEqual(missing, [], `Indexable English Museum routes without a language control loader:\n${missing.join("\n")}`);
});

test("Museum mirror loader and language router preserve EN/DE route identity", () => {
  const loader = fs.readFileSync(path.join(root, "museum-de-mirror-loader.js"), "utf8");
  const router = fs.readFileSync(path.join(root, "site-language.js"), "utf8");

  assert.match(loader, /__DENNIS_MUSEUM_MIRROR_SOURCE_PATH/);
  assert.match(loader, /__DENNIS_FORCE_SITE_LANGUAGE/);
  assert.match(loader, /data-site-language-loader/);
  assert.match(router, /site-i18n-de-museum-classics\.js/);
  assert.match(router, /site-i18n-de-museum-crypto\.js/);
  assert.match(router, /site-i18n-de-museum-malware\.js/);
  assert.match(router, /site-i18n-de-museum-polish\.js/);
  assert.match(router, /MUSEUM_MIRROR_PREFIXES/);
  assert.match(router, /rewriteMuseumMirrorLinks/);
  assert.match(router, /syncMuseumMirrorMetadata/);
});

test("Museum terminology polish fixes callsign label", () => {
  const bundle = loadMuseumBundles();
  assert.equal(
    bundle.pages["/museum/linux-game-install/lab.html"].text["ENTER CALLSIGN"],
    "RUFZEICHEN EINGEBEN",
  );
});

test("Museum translations preserve key safety boundaries", () => {
  const bundle = loadMuseumBundles();
  assert.match(bundle.pages["/museum/malware-history/love-letter-incident/"].description, /Browser/i);
  assert.match(bundle.pages["/museum/cryptography-lab/broken-crypto/lab.html"].description, /fiktiv|sicher/i);
  assert.match(bundle.pages["/museum/apollo-dsky/dsky.html"].description, /Browser/i);
});
