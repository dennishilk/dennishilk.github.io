import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const labRoot = path.join(root, "museum", "home-computing-lab");
const dedicatedBilingualRoutes = new Set([
  "/museum/home-computing-lab/field-notes/field-note-7/",
]);

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

function loadGermanBundle() {
  const context = vm.createContext({ window: {} });
  for (const file of ["site-i18n-de.js", "site-i18n-de-home-computing.js"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(source, context, { filename: file });
  }
  return context.window.DennisSiteI18nDE;
}

test("every runtime-translated Home Computing Lab HTML route is declared by the German bundle", () => {
  const bundle = loadGermanBundle();
  const actualRoutes = listHtmlFiles(labRoot).map(routeForFile).sort();
  const runtimeTranslatedRoutes = actualRoutes.filter(route => !dedicatedBilingualRoutes.has(route));
  const declaredRoutes = [...bundle.audit.homeComputingLab.routes].sort();

  assert.deepEqual(declaredRoutes, runtimeTranslatedRoutes);
  assert.equal(actualRoutes.length, 18);
});

test("dedicated bilingual Home Computing Lab routes have real German counterparts", () => {
  for (const route of dedicatedBilingualRoutes) {
    const englishFile = path.join(root, route.replace(/^\//, ""), "index.html");
    const germanFile = path.join(root, "de", route.replace(/^\//, ""), "index.html");
    assert.ok(fs.existsSync(englishFile), `${route} is missing its English page`);
    assert.ok(fs.existsSync(germanFile), `${route} is missing its German counterpart`);

    const english = fs.readFileSync(englishFile, "utf8");
    const german = fs.readFileSync(germanFile, "utf8");
    assert.match(english, /hreflang="de"/);
    assert.match(german, /hreflang="en"/);
  }

  const languageSource = fs.readFileSync(path.join(root, "site-language.js"), "utf8");
  assert.match(languageSource, /\/museum\/home-computing-lab\/field-notes\/field-note-7\//);
  assert.match(languageSource, /\/de\/museum\/home-computing-lab\/field-notes\/field-note-7\//);
});

test("every Home Computing Lab route in the German bundle has page-level German metadata and content", () => {
  const bundle = loadGermanBundle();

  for (const route of bundle.audit.homeComputingLab.routes) {
    const spec = bundle.pages[route];
    assert.ok(spec, `${route} is missing a page translation spec`);
    assert.ok(spec.title?.trim(), `${route} is missing a German title`);
    assert.ok(spec.description?.trim(), `${route} is missing a German description`);
    assert.ok(Object.keys(spec.text || {}).length >= 3, `${route} has too little page-specific translated text`);
  }

  assert.ok(bundle.prefixes["/museum/home-computing-lab/"], "Home Computing Lab shared translation prefix is missing");
});

test("representative Home Computing Lab translations preserve the documented meaning", () => {
  const bundle = loadGermanBundle();

  assert.equal(
    bundle.pages["/museum/home-computing-lab/field-notes/"].text["GROWING COLLECTION"],
    "WACHSENDE SAMMLUNG",
  );
  assert.equal(
    bundle.pages["/museum/home-computing-lab/field-notes/field-note-1/"].text["The terminal was."],
    "Das Terminal war es.",
  );
  assert.match(
    bundle.pages["/museum/home-computing-lab/worldnode/"].text[
      "The photographed 1U machine was an earlier Worldnode server. It is retained in this archive as evidence of the infrastructure before the project migrated to newer hardware. The artifact documents one historical stage in the project’s evolution; it is not presented as the current public server."
    ],
    /nicht als aktueller öffentlicher Server dargestellt/,
  );
  assert.equal(
    bundle.pages["/museum/home-computing-lab/cthulhu/"].text["Cthulhu — Modern Linux Workstation"],
    "Cthulhu — Moderne Linux-Arbeitsstation",
  );
});

test("the site language loader includes the Home Computing Lab bundle and safe phrase matching", () => {
  const source = fs.readFileSync(path.join(root, "site-language.js"), "utf8");

  assert.match(source, /site-i18n-de-home-computing\.js/);
  assert.match(source, /const replaceLiteralPhrase =/);
  assert.match(source, /meta\[property="og:title"\]/);
  assert.match(source, /meta\[name="twitter:title"\]/);
});
