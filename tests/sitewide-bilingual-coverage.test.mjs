import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const excludedDirectories = new Set([".git", "node_modules"]);

function walkHtml(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) return [];
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkHtml(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function routeForFile(file) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/index\.html$/, "")}`;
}

function germanFileForSource(file) {
  return path.join(root, "de", path.relative(root, file));
}

function loadGermanBundles() {
  const context = vm.createContext({ window: {} });
  const files = [
    "site-i18n-de.js",
    "site-i18n-de-extra.js",
    "site-i18n-de-observers.js",
    "site-i18n-de-wiesmoor.js",
    "site-i18n-de-peatland-polish.js",
    "site-i18n-de-personnel.js",
    "site-i18n-de-home-computing.js",
    "site-i18n-de-museum-classics.js",
    "site-i18n-de-museum-crypto.js",
    "site-i18n-de-museum-malware.js",
    "site-i18n-de-museum-polish.js",
    "site-i18n-de-sitewide.js",
  ].filter(file => fs.existsSync(path.join(root, file)));

  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return context.window.DennisSiteI18nDE || {};
}

function auditedRuntimeRoutes(bundle) {
  const routes = new Set();
  for (const record of Object.values(bundle.audit || {})) {
    if (!record || !Array.isArray(record.routes)) continue;
    for (const route of record.routes) routes.add(route);
  }
  return routes;
}

function hasExplicitRuntimeTranslation(route, bundle, auditedRoutes) {
  const normalized = route.endsWith("/index.html") ? route.slice(0, -"index.html".length) : route;
  return Boolean(bundle.pages?.[route] || bundle.pages?.[normalized] || auditedRoutes.has(route) || auditedRoutes.has(normalized));
}

function hasDedicatedGermanRoute(file) {
  return fs.existsSync(germanFileForSource(file));
}

function hasInternalBilingualMarkup(file) {
  const html = fs.readFileSync(file, "utf8");
  return /data-language-content=["']en["']/.test(html) && /data-language-content=["']de["']/.test(html);
}

function isGermanSource(file) {
  return path.relative(root, file).split(path.sep).join("/").startsWith("de/");
}

test("internally paired EN/DE pages count as maintained bilingual sources", () => {
  const about = path.join(root, "about", "index.html");
  assert.equal(hasInternalBilingualMarkup(about), true);
});

test("every site HTML source has a dedicated German route, internal EN/DE pair, or explicit audited runtime translation", () => {
  const bundle = loadGermanBundles();
  const auditedRoutes = auditedRuntimeRoutes(bundle);
  const sources = walkHtml(root).filter(file => !isGermanSource(file));
  const uncovered = sources
    .filter(file => !hasDedicatedGermanRoute(file))
    .filter(file => !hasInternalBilingualMarkup(file))
    .map(file => ({ file, route: routeForFile(file) }))
    .filter(({ route }) => !hasExplicitRuntimeTranslation(route, bundle, auditedRoutes))
    .map(({ route }) => route)
    .sort();

  if (process.env.GITHUB_ACTIONS === "true") {
    for (const route of uncovered) {
      const message = route.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
      console.error(`::error title=Missing German coverage::${message}`);
    }
  }

  assert.deepEqual(
    uncovered,
    [],
    `HTML routes without explicit maintained German coverage:\n${uncovered.join("\n")}`,
  );
});
