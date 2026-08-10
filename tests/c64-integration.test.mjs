import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDir, "..");
const c64 = path.join(root, "museum/c64");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const en = read("museum/c64/index.html");
const de = read("de/museum/c64/index.html");
const museum = read("museum/index.html");
const language = read("site-language.js");
const sitemap = read("sitemap.xml");
const sitemapDe = read("sitemap-de.xml");

function jsonLd(document) {
  return Array.from(document.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))
    .map(match => JSON.parse(match[1]));
}

test("English and German routes contain localized indexable metadata and H1s", () => {
  assert.match(en, /<html lang="en">/);
  assert.match(en, /<title>Learn Commodore 64 BASIC in Your Browser \| C64 Programming Lab<\/title>/);
  assert.match(en, /<h1>[\s\S]*Commodore 64 Programming Lab[\s\S]*<\/h1>/);
  assert.match(en, /<link rel="canonical" href="https:\/\/dennishilk\.com\/museum\/c64\/">/);

  assert.match(de, /<html lang="de">/);
  assert.match(de, /<title>Commodore 64 programmieren lernen \| Interaktives C64 BASIC Lab<\/title>/);
  assert.match(de, /<h1>[\s\S]*Commodore 64 programmieren lernen[\s\S]*<\/h1>/);
  assert.match(de, /<link rel="canonical" href="https:\/\/dennishilk\.com\/de\/museum\/c64\/">/);
  assert.match(de, /Die Maschine ist die Ausstellung/);
  assert.match(de, /Genauigkeit und Grenzen/);
});

test("both pages have reciprocal en/de/x-default hreflang and localized social metadata", () => {
  for (const document of [en, de]) {
    assert.match(document, /hreflang="en" href="https:\/\/dennishilk\.com\/museum\/c64\/"/);
    assert.match(document, /hreflang="de" href="https:\/\/dennishilk\.com\/de\/museum\/c64\/"/);
    assert.match(document, /hreflang="x-default" href="https:\/\/dennishilk\.com\/museum\/c64\/"/);
    assert.match(document, /property="og:image:alt"/);
    assert.match(document, /c64-programming-lab-preview\.png/);
  }
  assert.match(en, /og:locale" content="en_US"/);
  assert.match(de, /og:locale" content="de_DE"/);
});

test("LearningResource and SoftwareApplication structured data parse on both routes", () => {
  for (const document of [en, de]) {
    const blocks = jsonLd(document);
    assert.equal(blocks.length, 1);
    const graph = blocks[0]["@graph"];
    assert.ok(graph.some(item => item["@type"] === "LearningResource"));
    assert.ok(graph.some(item => item["@type"] === "SoftwareApplication"));
    assert.ok(graph.every(item => item.isAccessibleForFree === true));
  }
});

test("the active lab exposes semantic keyboard, transcript, canvas and status alternatives", () => {
  for (const document of [en, de]) {
    for (const id of [
      "c64Canvas", "c64CanvasDescription", "c64ScreenText", "c64Transcript",
      "c64Command", "c64Run", "c64Stop", "c64LessonNav", "c64MemoryBody",
      "c64LiveStatus"
    ]) assert.match(document, new RegExp('id="' + id + '"'));
    assert.match(document, /role="img"/);
    assert.match(document, /aria-live="polite"/);
    assert.doesNotMatch(document, /role="application"/);
  }
  const css = read("museum/c64/c64-lab.css");
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /focus-visible/);
});

test("the public accuracy boundary is explicit in both languages", () => {
  assert.match(en, /Educational BASIC V2 subset · No Commodore ROMs · Browser-rendered VIC\/SID concepts/);
  assert.match(en, /not SID emulation/);
  assert.match(en, /not a complete BASIC ROM implementation/);
  assert.match(de, /BASIC-V2-Lehrumfang · Keine Commodore-ROMs/);
  assert.match(de, /keine SID-Emulation/);
  assert.doesNotMatch(en, /cycle-exact|100% compatible|full C64 emulator/i);
  assert.doesNotMatch(de, /zyklusgenau|100.?% kompatibel|vollständiger C64-Emulator/i);
});

test("museum card stays second after WOPR and before PC XT with approved copy", () => {
  const wopr = museum.indexOf("museum-card-wopr");
  const card = museum.indexOf("museum-card-c64");
  const ibm = museum.indexOf("museum-card-ibm");
  assert.ok(wopr >= 0 && wopr < card && card < ibm);
  const segment = museum.slice(card, ibm);
  assert.match(segment, /Commodore 64 Programming Lab/);
  assert.match(segment, /Interactive BASIC learning lab/);
  assert.match(segment, /START PROGRAMMING/);
  assert.match(segment, /faithful browser-based subset/);
  assert.equal((museum.match(/museum-card-c64/g) || []).length, 1);
});

test("museum landing imports zero C64 runtime while the exhibit omits decorative stars", () => {
  assert.doesNotMatch(museum, /c64-(?:basic|lab|machine|screen|worker|lessons)\.js/);
  assert.doesNotMatch(museum, /c64-lab\.css/);
  assert.match(museum, /href="\/museum\/c64\/"/);
  assert.doesNotMatch(en, /stars\.js/);
  assert.doesNotMatch(de, /stars\.js/);
  assert.match(en, /c64-lab\.js/);
  assert.match(de, /\.\.\/\.\.\/\.\.\/museum\/c64\/c64-lab\.js/);
});

test("dedicated language routing preserves the established site language system", () => {
  for (const route of [
    '"/museum/c64/"',
    '"/museum/c64/index.html"',
    '"/de/museum/c64/"',
    '"/de/museum/c64/index.html"'
  ]) assert.match(language, new RegExp(route.replace(/[/.]/g, "\\$&")));
  assert.match(language, /2026-08-10-c64-1/);
  assert.match(read("site-i18n-de.js"), /Commodore 64 Programmierlabor/);
});

test("both sitemaps contain the reciprocal language pair", () => {
  assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(sitemap, /<loc>https:\/\/dennishilk\.com\/museum\/c64\/<\/loc>[\s\S]*hreflang="de" href="https:\/\/dennishilk\.com\/de\/museum\/c64\/"/);
  assert.match(sitemapDe, /<loc>https:\/\/dennishilk\.com\/de\/museum\/c64\/<\/loc>[\s\S]*hreflang="en" href="https:\/\/dennishilk\.com\/museum\/c64\/"/);
});

test("supporting HTML is crawlable and the Home Computing Lab supplies one incoming link", () => {
  for (const id of ["basic", "screen-colors", "petscii", "sprites", "sound", "accuracy", "sources"]) {
    assert.match(en, new RegExp('id="' + id + '"'));
    assert.match(de, new RegExp('id="' + id + '"'));
  }
  const homeLab = read("museum/home-computing-lab/index.html");
  assert.match(homeLab, /Program a 1982 Commodore 64 in the interactive BASIC lab/);
});

test("all local C64 page assets exist on both route variants", () => {
  const required = [
    "museum/c64/c64-lab.css",
    "museum/c64/c64-screen.js",
    "museum/c64/c64-lessons.js",
    "museum/c64/c64-lab.js",
    "museum/c64/c64-worker.js",
    "museum/c64/c64-machine.js",
    "museum/c64/c64-basic-core.js",
    "museum/c64/THIRD_PARTY_NOTICES.md"
  ];
  for (const relative of required) assert.equal(fs.existsSync(path.join(root, relative)), true, relative);
  assert.equal(fs.existsSync(path.join(c64, "basic.js")), false);
});

test("interpreter code uses an AST and worker without eval or generated JavaScript", () => {
  const javascript = fs.readdirSync(c64).filter(name => name.endsWith(".js"))
    .map(name => fs.readFileSync(path.join(c64, name), "utf8")).join("\n");
  assert.doesNotMatch(javascript, /\beval\s*\(|new\s+Function\s*\(|Function\s*\(/);
  assert.match(javascript, /class Tokenizer/);
  assert.match(javascript, /class Parser/);
  assert.match(javascript, /new Worker\(new URL\("c64-worker\.js", assetBase\)\)/);
  assert.match(read("museum/c64/c64-lab.js"), /item\.reason !== "error"/);
  assert.match(read("museum/c64/c64-worker.js"), /session\.step\(500, 4\)/);
  assert.match(read("museum/c64/c64-basic-core.js"), /noProgressStatementsLimit/);
  assert.match(read("museum/c64/c64-basic-core.js"), /outputLineLimit/);
});

test("no ROM-like binary, third-party runtime, fake CLS or DIR command is shipped", () => {
  const names = fs.readdirSync(c64);
  assert.ok(names.every(name => !/\.(?:rom|bin|wasm|prg|crt|d64)$/i.test(name)), names.join(", "));
  assert.ok(names.every(name => !/(?:kernal|basic-rom|char-rom|vice)/i.test(name)), names.join(", "));
  const core = read("museum/c64/c64-basic-core.js");
  assert.doesNotMatch(core, /trimmed === "CLS"|trimmed === "DIR"/);
  const notices = read("museum/c64/THIRD_PARTY_NOTICES.md");
  assert.match(notices, /no third-party runtime, ROM image/);
  assert.match(notices, /63-byte STAR RUNNER rocket sprite/);
});

test("compressed lab-specific assets stay below the 100 KiB activation budget", () => {
  const names = [
    "c64-basic-core.js", "c64-machine.js", "c64-worker.js",
    "c64-screen.js", "c64-lessons.js", "c64-lab.js", "c64-lab.css"
  ];
  const sizes = names.map(name => zlib.gzipSync(fs.readFileSync(path.join(c64, name)), { level: 9 }).length);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  assert.ok(total <= 100 * 1024, "gzip total " + total + " bytes");
});

test("dedicated C64 CI workflow exists and runs all four required suites", () => {
  const workflow = read(".github/workflows/c64-lab-check.yml");
  for (const file of [
    "c64-basic-core.test.mjs",
    "c64-machine.test.mjs",
    "c64-lessons.test.mjs",
    "c64-integration.test.mjs"
  ]) assert.match(workflow, new RegExp(file.replace(".", "\\.")));
  assert.match(workflow, /node --check museum\/c64\/\*\.js/);
});
