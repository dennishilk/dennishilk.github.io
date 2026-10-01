import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const museumRoot = path.join(root, "museum");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function source(file) {
  return fs.readFileSync(file, "utf8");
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function metaContent(html, name) {
  for (const quote of ['"', "'"]) {
    const escaped = quote === '"' ? '[^"]*' : "[^']*";
    const a = html.match(new RegExp('<meta\\s+[^>]*name=["\\\']' + name + '["\\\'][^>]*content=' + quote + '(' + escaped + ')' + quote, "i"));
    if (a) return a[1].trim();
    const b = html.match(new RegExp('<meta\\s+[^>]*content=' + quote + '(' + escaped + ')' + quote + '[^>]*name=["\\\']' + name + '["\\\']', "i"));
    if (b) return b[1].trim();
  }
  return "";
}

function canonical(html) {
  const a = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (a) return a[1];
  const b = html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return b?.[1] || "";
}

function title(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function hasH1(html) {
  return /<h1(?:\s|>)/i.test(html);
}

function robots(html) {
  return metaContent(html, "robots");
}

const htmlFiles = walk(museumRoot).filter(file => file.endsWith(".html"));
const indexable = htmlFiles.filter(file => !/\bnoindex\b/i.test(robots(source(file))));
const noindex = htmlFiles.filter(file => /\bnoindex\b/i.test(robots(source(file))));

test("every indexable Computer Museum HTML page has a crawlable SEO baseline", () => {
  assert.ok(indexable.length > 50, "expected broad museum coverage");
  for (const file of indexable) {
    const html = source(file);
    const rel = relative(file);
    const pageTitle = title(html);
    const description = metaContent(html, "description");
    assert.ok(pageTitle.length >= 20, rel + " has a weak or missing title");
    assert.ok(description.length >= 50, rel + " has a weak or missing meta description");
    assert.ok(canonical(html), rel + " is missing a canonical URL");
    assert.ok(hasH1(html), rel + " is missing an H1");

    const staticRobots = robots(html);
    const runtimeRobots = /(?:src=["'][^"']*stars\.js|src=["'][^"']*seo-runtime\.js)/i.test(html);
    assert.ok(
      /index/i.test(staticRobots) || runtimeRobots,
      rel + " has neither a static index directive nor the shared SEO runtime",
    );

    assert.doesNotMatch(
      description,
      /^A planned\b/i,
      rel + " still exposes stale planned-exhibit copy in its search description",
    );
  }
});

test("interactive instrument pages stay out of search and keep crawlable parent links", () => {
  assert.ok(noindex.length >= 20, "expected noindex coverage for interactive instrument pages");
  for (const file of noindex) {
    const html = source(file);
    const rel = relative(file);
    assert.doesNotMatch(robots(html), /nofollow/i, rel + " should use noindex,follow rather than nofollow");
    assert.ok(canonical(html), rel + " noindex page is missing a canonical parent or canonical route");
  }
});

test("Linux Terminal Academy landing pages expose direct static search intent", () => {
  const labs = [
    "terminal-first-steps",
    "filesystem-explorer",
    "files-directories",
    "permissions-users",
    "process-control",
    "pipes-shell-power",
    "system-admin-crash-lab",
    "break-it-recover",
  ];
  for (const slug of labs) {
    const html = source(path.join(museumRoot, "linux-terminal-academy", slug, "index.html"));
    assert.match(title(html), /Linux/i, slug + " title should identify Linux");
    assert.match(metaContent(html, "description"), /Linux/i, slug + " description should identify Linux");
    assert.match(robots(html), /index,follow/i, slug + " should be explicitly indexable");
  }
});

test("shared museum SEO runtime provides creator, breadcrumbs and social metadata", () => {
  const runtime = source(path.join(root, "seo-runtime.js"));
  for (const token of [
    "normalizedMuseumPath",
    "museumBreadcrumb",
    "addMuseumWebPageSchema",
    "enrichMuseumMetadata",
    "Dennis Hilk Computer Museum",
    "https://www.dennishilk.com/#dennis-hilk",
    "https://www.dennishilk.com/museum/#museum",
  ]) assert.ok(runtime.includes(token), "museum runtime missing " + token);

  for (const route of [
    "/museum/cryptography-lab/",
    "/museum/malware-history/internet-worms/",
    "/museum/home-computing-lab/cthulhu/",
    "/museum/linux-terminal-academy/system-admin-crash-lab/",
  ]) assert.ok(runtime.includes(route), "runtime metadata missing representative museum route " + route);
});

test("German museum translation mappings use stable selectors for new SEO content", () => {
  const academy = source(path.join(root, "site-i18n-de-extra.js"));
  const classics = source(path.join(root, "site-i18n-de-museum-classics.js"));

  assert.doesNotMatch(academy, /"\.linux-academy-note p:nth-of-type\(1\)"/);
  assert.match(academy, /\.linux-academy-command-context p:nth-of-type\(1\)/);
  assert.match(academy, /learn-linux-online-title/);
  assert.match(academy, /related-linux-title/);
  assert.match(academy, /Erstellt von Dennis Hilk als Teil des Interaktiven Computer Museums/);

  assert.match(classics, /Mehr Computergeschichte erkunden/);
  assert.match(classics, /Gib zweistellige VERB-Codes/);
  assert.match(classics, /Erstellt von Dennis Hilk als Teil des Interaktiven Computer Museums/);
});

test("Debian Server experiment is live, indexable and present in both sitemaps", () => {
  const en = source(path.join(root, "museum/debian-server-experiment/index.html"));
  const de = source(path.join(root, "de/museum/debian-server-experiment/index.html"));
  const sitemap = source(path.join(root, "sitemap.xml"));
  const sitemapDe = source(path.join(root, "sitemap-de.xml"));

  assert.match(robots(en), /index,follow/i);
  assert.doesNotMatch(en, /PLANNED|status=planned|Planned Interactive Experiment/i);
  assert.match(en, /AVAILABLE/);
  assert.match(title(en), /Debian.*Browser|Browser.*Debian/i);
  assert.match(metaContent(en, "description"), /Debian.*Linux|Linux.*Debian/i);

  assert.match(robots(de), /index,follow/i);
  assert.match(title(de), /Debian.*Browser|Browser.*Debian/i);
  assert.match(metaContent(de, "description"), /Debian.*Linux|Linux.*Debian/i);

  assert.match(sitemap, /https:\/\/www\.dennishilk\.com\/museum\/debian-server-experiment\//);
  assert.match(sitemapDe, /https:\/\/www\.dennishilk\.com\/de\/museum\/debian-server-experiment\//);
});

