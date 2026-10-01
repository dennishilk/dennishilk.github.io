import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

function title(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
}
function meta(html, name) {
  return html.match(new RegExp('<meta\\s+[^>]*name=["\\\']' + name + '["\\\'][^>]*content=["\\\']([^"\\\']+)["\\\']', "i"))?.[1] || "";
}
function canonical(html) {
  return html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] || "";
}
function graph(html) {
  const block = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(block, "missing JSON-LD");
  return JSON.parse(block[1])["@graph"];
}

const en = read("boringos/index.html");
const de = read("de/boringos/index.html");

test("BoringOS targets from-scratch operating-system intent in both languages", () => {
  assert.match(title(en), /x86_64/i);
  assert.match(title(en), /Built from Scratch/i);
  assert.match(meta(en, "description"), /own kernel/i);
  assert.match(meta(en, "description"), /BoringFS/i);
  assert.match(meta(en, "description"), /BoringWM/i);

  assert.match(title(de), /x86_64/i);
  assert.match(title(de), /von Grund auf/i);
  assert.match(meta(de, "description"), /eigenem Kernel/i);
  assert.match(meta(de, "description"), /BoringFS/i);
  assert.match(meta(de, "description"), /BoringWM/i);
});

test("BoringOS pages expose the current M68 physical baseline", () => {
  for (const [label, html] of [["en", en], ["de", de]]) {
    assert.match(html, /M68/);
    assert.match(html, /1920×1080/);
    assert.match(html, /7a9594508bc02b6a5c8d5d13c2ed5c858c9cb54e/);
    assert.doesNotMatch(html, /\/tree\/freeze\//, label + " still links a removed freeze branch");
    assert.doesNotMatch(html, /current physical GOP\/firmware mode is 800×600|physische Auflösung bleibt 800×600/i);
  }
});

test("BoringOS pages explain why the project is independent", () => {
  assert.match(en, /id="from-scratch"/);
  assert.match(en, /Is BoringOS Linux\?/);
  assert.match(en, /not a Linux distribution/i);
  assert.match(en, /BoringKernel/);
  assert.match(en, /BoringFS/);
  assert.match(en, /without X11 or Wayland/i);

  assert.match(de, /id="from-scratch"/);
  assert.match(de, /Ist BoringOS Linux\?/);
  assert.match(de, /keine Linux-Distribution/i);
  assert.match(de, /BoringKernel/);
  assert.match(de, /BoringFS/);
  assert.match(de, /ohne X11 oder Wayland/i);
});

test("BoringOS structured data connects source, page, creator and FAQ", () => {
  for (const [label, html] of [["en", en], ["de", de]]) {
    const items = graph(html);
    const source = items.find(item => item["@type"] === "SoftwareSourceCode");
    const page = items.find(item => item["@type"] === "WebPage");
    const person = items.find(item => item["@type"] === "Person");
    const faq = items.find(item => item["@type"] === "FAQPage");
    const breadcrumb = items.find(item => item["@type"] === "BreadcrumbList");
    assert.ok(source && page && person && faq && breadcrumb, label + " schema graph incomplete");
    assert.equal(source.creator?.["@id"], "https://www.dennishilk.com/#dennis-hilk");
    assert.equal(page.isPartOf?.["@id"], "https://www.dennishilk.com/#website");
    assert.equal(source.codeRepository, "https://github.com/dennishilk/boringos");
    assert.equal(source.softwareVersion, "0.0.62-dev");
    assert.ok(faq.mainEntity.length >= 6);
  }
});

test("BoringOS language pair stays reciprocal and canonical", () => {
  assert.equal(canonical(en), "https://www.dennishilk.com/boringos/");
  assert.equal(canonical(de), "https://www.dennishilk.com/de/boringos/");
  assert.match(en, /hreflang="de" href="https:\/\/www\.dennishilk\.com\/de\/boringos\/"/);
  assert.match(de, /hreflang="en" href="https:\/\/www\.dennishilk\.com\/boringos\/"/);
});
