import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function trackedHtmlFiles() {
  return execFileSync("git", ["ls-files", "-z", "--", "*.html"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .map(relative => path.join(root, relative));
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

function hasRuntimeCoverage(route, bundle, auditedRoutes) {
  const normalized = route.endsWith("/index.html") ? route.slice(0, -"index.html".length) : route;
  return Boolean(bundle.pages?.[route] || bundle.pages?.[normalized] || auditedRoutes.has(route) || auditedRoutes.has(normalized));
}

function hasGermanFile(file) {
  return fs.existsSync(path.join(root, "de", path.relative(root, file)));
}

function hasInternalBilingualMarkup(file) {
  const html = fs.readFileSync(file, "utf8");
  return /data-language-content=["']en["']/.test(html) && /data-language-content=["']de["']/.test(html);
}

function isGermanSource(file) {
  return path.relative(root, file).split(path.sep).join("/").startsWith("de/");
}

function isVerificationArtifact(file) {
  const name = path.basename(file);
  const html = fs.readFileSync(file, "utf8").trim();
  return /^google[0-9a-f]+\.html$/i.test(name) && /^google-site-verification:\s*google[0-9a-f]+\.html$/i.test(html);
}

const bundle = loadGermanBundles();
const auditedRoutes = auditedRuntimeRoutes(bundle);
const uncovered = trackedHtmlFiles()
  .filter(file => !isGermanSource(file))
  .filter(file => !isVerificationArtifact(file))
  .filter(file => !hasGermanFile(file))
  .filter(file => !hasInternalBilingualMarkup(file))
  .map(routeForFile)
  .filter(route => !hasRuntimeCoverage(route, bundle, auditedRoutes))
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
