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
  ].filter(file => fs.existsSync(path.join(root, file)));

  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return context.window.DennisSiteI18nDE || {};
}

function hasRuntimeCoverage(route, bundle) {
  if (bundle.pages?.[route]) return true;
  const normalized = route.endsWith("/index.html") ? route.slice(0, -"index.html".length) : route;
  if (bundle.pages?.[normalized]) return true;
  return Object.keys(bundle.prefixes || {}).some(prefix => {
    if (!normalized.startsWith(prefix)) return false;
    if (["/museum", "/museum/", "/world-observer", "/world-observer/"].includes(prefix)) return false;
    return prefix.split("/").filter(Boolean).length >= 2;
  });
}

function hasGermanFile(file) {
  return fs.existsSync(path.join(root, "de", path.relative(root, file)));
}

function isGermanSource(file) {
  return path.relative(root, file).split(path.sep).join("/").startsWith("de/");
}

const bundle = loadGermanBundles();
const uncovered = walkHtml(root)
  .filter(file => !isGermanSource(file))
  .filter(file => !hasGermanFile(file))
  .map(routeForFile)
  .filter(route => !hasRuntimeCoverage(route, bundle))
  .sort();

if (uncovered.length) {
  for (const route of uncovered) {
    const escaped = route.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
    process.stdout.write(`::error title=Missing German coverage::${escaped}\n`);
  }
  process.stdout.write(`Missing German coverage: ${uncovered.length} route(s).\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Sitewide bilingual coverage complete.\n");
}
