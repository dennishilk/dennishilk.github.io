import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

function meta(html, name) {
  return html.match(new RegExp('<meta\\s+[^>]*name=["\\\']' + name + '["\\\'][^>]*content=["\\\']([^"\\\']+)["\\\']', "i"))?.[1] || "";
}
function title(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
}
function canonical(html) {
  return html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] || "";
}
function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)].map(match => JSON.parse(match[1]));
}

const en = read("tools/image-converter/index.html");
const de = read("de/tools/image-converter/index.html");

test("image converter pages target high-intent format conversions", () => {
  for (const [label, html] of [["en", en], ["de", de]]) {
    assert.match(title(html), /JPG/i, label + " title should mention JPG");
    assert.match(title(html), /PNG/i, label + " title should mention PNG");
    assert.match(title(html), /WebP/i, label + " title should mention WebP");
    assert.match(meta(html, "description"), /JPG/i, label + " description should mention JPG");
    assert.match(meta(html, "description"), /PNG/i, label + " description should mention PNG");
    assert.match(meta(html, "description"), /WebP/i, label + " description should mention WebP");
    assert.match(html, /id="jpg-to-webp"/);
    assert.match(html, /id="png-to-webp"/);
    assert.match(html, /id="webp-to-jpg"/);
  }
});

test("image converter language pair is canonical and reciprocal", () => {
  assert.equal(canonical(en), "https://www.dennishilk.com/tools/image-converter/");
  assert.equal(canonical(de), "https://www.dennishilk.com/de/tools/image-converter/");
  assert.match(en, /hreflang="de" href="https:\/\/www\.dennishilk\.com\/de\/tools\/image-converter\/"/);
  assert.match(de, /hreflang="en" href="https:\/\/www\.dennishilk\.com\/tools\/image-converter\/"/);
  assert.match(en, /href="\/de\/tools\/image-converter\/" hreflang="de"/);
  assert.match(de, /href="\/tools\/image-converter\/" hreflang="en"/);
});

test("image converter schema links the app to Dennis Hilk and the website", () => {
  for (const [label, html] of [["en", en], ["de", de]]) {
    const blocks = jsonLd(html);
    assert.equal(blocks.length, 1, label + " should have one JSON-LD block");
    const graph = blocks[0]["@graph"];
    assert.ok(Array.isArray(graph), label + " JSON-LD should use @graph");
    const app = graph.find(item => item["@type"] === "WebApplication");
    const page = graph.find(item => item["@type"] === "WebPage");
    const person = graph.find(item => item["@type"] === "Person");
    const faq = graph.find(item => item["@type"] === "FAQPage");
    const breadcrumb = graph.find(item => item["@type"] === "BreadcrumbList");
    assert.ok(app && page && person && faq && breadcrumb, label + " schema graph is incomplete");
    assert.equal(app.creator?.["@id"], "https://www.dennishilk.com/#dennis-hilk");
    assert.equal(page.isPartOf?.["@id"], "https://www.dennishilk.com/#website");
    assert.equal(app.isAccessibleForFree, true);
    assert.ok(app.featureList.some(item => /JPG|JPEG/.test(item)));
    assert.ok(app.featureList.some(item => /PNG/.test(item)));
    assert.ok(app.featureList.some(item => /WebP/.test(item)));
    assert.ok(faq.mainEntity.length >= 6);
  }
});

test("image converter stays explicit about local processing", () => {
  assert.match(en, /without (?:sending|uploading)|not uploaded|No upload/i);
  assert.match(de, /ohne Upload|nicht hochgeladen|lokal/i);
  assert.match(en, /100% client-side/i);
  assert.match(de, /100 % clientseitig/i);
});
