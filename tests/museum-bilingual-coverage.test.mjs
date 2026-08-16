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

function loadMuseumBundles() {
  const context = vm.createContext({ window: {} });
  for (const file of [
    "site-i18n-de.js",
    "site-i18n-de-extra.js",
    "site-i18n-de-home-computing.js",
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
