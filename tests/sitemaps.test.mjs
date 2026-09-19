import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);
const siteRoot = root.pathname;
const base = "https://www.dennishilk.com";

const sitemapMain = readFileSync(new URL("sitemap.xml", root), "utf8");
const sitemapDe = readFileSync(new URL("sitemap-de.xml", root), "utf8");
const sitemapInternet = readFileSync(new URL("sitemap-internet-observers.xml", root), "utf8");
const sitemapTechnology = readFileSync(new URL("sitemap-technology-observers.xml", root), "utf8");
const sitemapImages = readFileSync(new URL("sitemap-images.xml", root), "utf8");
const sitemapCisco = readFileSync(new URL("sitemap-cisco-doom.xml", root), "utf8");
const robots = readFileSync(new URL("robots.txt", root), "utf8");
const allSitemaps = [sitemapMain, sitemapDe, sitemapInternet, sitemapTechnology, sitemapImages, sitemapCisco];

const excludedHtml = new Set([
  "404.html",
  "blog/post.html",
  "googlebe6f4cac81733577.html",
  "world-observer/index.html",
  "world-observer/east-frisia-water-observer.html",
]);

const internetSlugs = [
  "area51",
  "cuba-internet-weather",
  "dns-time-to-answer-index",
  "dns-tta-stress-index",
  "global-reachability-long-horizon",
  "global-reachability-score",
  "http-reachability-index",
  "internet-shrinkage-index",
  "ipv6-adoption-locked-states",
  "ipv6-global-compare",
  "ipv6-locked-states",
  "iran-dns-behavior",
  "mx-presence-by-country",
  "mx-presence-per-country",
  "north-korea-connectivity",
  "silent-countries-list",
  "tls-fingerprint-change",
  "traceroute-to-nowhere",
  "undersea-cable-dependency",
  "undersea-cable-dependency-map",
];

const wiesmoorSlugs = [
  "wiesmoor-weather",
  "wiesmoor-peatland",
  "wiesmoor-sky",
  "east-frisia-water",
  "horizon-observer",
  "wiesmoor-population",
  "wiesmoor-energy",
  "wiesmoor-groundwater",
  "wiesmoor-development",
  "wiesmoor-finance",
];

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function alternateLinks(xml) {
  return [...xml.matchAll(/<xhtml:link\s+[^>]*href="([^"]+)"[^>]*\/>/g)].map((match) => match[1]);
}

function imageLocs(xml) {
  return [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((match) => match[1]);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function pathToPublicUrl(path) {
  const rel = relative(siteRoot, path).split(sep).join("/");
  if (rel === "index.html") return `${base}/`;
  if (rel.endsWith("/index.html")) return `${base}/${rel.slice(0, -"index.html".length)}`;
  return `${base}/${rel}`;
}

function publicUrlToPath(url) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, base, `unexpected sitemap origin: ${url}`);
  const pathname = decodeURIComponent(parsed.pathname);
  if (pathname === "/") return join(siteRoot, "index.html");
  if (pathname.endsWith("/")) return join(siteRoot, pathname.slice(1), "index.html");
  return join(siteRoot, pathname.slice(1));
}

function hasNoindex(path) {
  const html = readFileSync(path, "utf8");
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return tags.some((tag) => /\bname\s*=\s*["']robots["']/i.test(tag) && /\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(tag));
}

function isMuseumMirrorWrapper(path) {
  return readFileSync(path, "utf8").includes("museum-de-mirror-loader.js");
}

function germanMirrorSourcePath(path) {
  const rel = relative(join(siteRoot, "de"), path);
  return join(siteRoot, rel);
}

function isIndexableGermanHtml(path) {
  if (!path.endsWith(".html")) return false;
  if (isMuseumMirrorWrapper(path)) {
    const source = germanMirrorSourcePath(path);
    assert.ok(existsSync(source), `German Museum mirror source missing: ${relative(siteRoot, source)}`);
    return !hasNoindex(source);
  }
  return !hasNoindex(path);
}

function isIndexableHtml(path) {
  if (!path.endsWith(".html")) return false;
  const rel = relative(siteRoot, path).split(sep).join("/");
  if (excludedHtml.has(rel)) return false;
  if (rel.startsWith("de/") && isMuseumMirrorWrapper(path)) {
    const source = germanMirrorSourcePath(path);
    assert.ok(existsSync(source), `German Museum mirror source missing: ${relative(siteRoot, source)}`);
    return !hasNoindex(source);
  }
  return !hasNoindex(path);
}

function assertWellFormedEnvelope(name, xml) {
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), `${name} missing XML declaration`);
  assert.match(xml, /<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/, `${name} missing sitemap namespace`);
  assert.ok(xml.trimEnd().endsWith("</urlset>"), `${name} missing closing urlset`);
  assert.equal((xml.match(/<url>/g) || []).length, (xml.match(/<\/url>/g) || []).length, `${name} has unbalanced url entries`);
}

test("all advertised sitemap files use a valid sitemap envelope", () => {
  for (const [name, xml] of [
    ["sitemap.xml", sitemapMain],
    ["sitemap-de.xml", sitemapDe],
    ["sitemap-internet-observers.xml", sitemapInternet],
    ["sitemap-technology-observers.xml", sitemapTechnology],
    ["sitemap-images.xml", sitemapImages],
    ["sitemap-cisco-doom.xml", sitemapCisco],
  ]) assertWellFormedEnvelope(name, xml);
  assert.match(sitemapImages, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
});

test("robots.txt advertises every maintained sitemap", () => {
  for (const name of [
    "sitemap.xml",
    "sitemap-de.xml",
    "sitemap-internet-observers.xml",
    "sitemap-technology-observers.xml",
    "sitemap-images.xml",
    "sitemap-cisco-doom.xml",
  ]) assert.ok(robots.includes(`Sitemap: ${base}/${name}`), `robots.txt missing ${name}`);
});

test("all sitemaps together contain every indexable HTML route exactly once", () => {
  const actualUrls = walk(siteRoot)
    .filter((path) => !path.includes(`${sep}node_modules${sep}`))
    .filter(isIndexableHtml)
    .map(pathToPublicUrl)
    .sort();
  const sitemapUrls = allSitemaps.flatMap(locs).sort();
  assert.deepEqual(sitemapUrls, actualUrls);
  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length);
  for (const url of sitemapUrls) assert.ok(existsSync(publicUrlToPath(url)), `sitemap points to missing file: ${url}`);
});

test("all ten Wiesmoor observers have German sitemap entries and reciprocal alternates", () => {
  const entries = new Set(allSitemaps.flatMap(locs));
  const links = new Set(allSitemaps.flatMap(alternateLinks));
  for (const slug of wiesmoorSlugs) {
    const en = `${base}/world-observer/${slug}.html`;
    const de = `${base}/de/world-observer/${slug}.html`;
    assert.ok(entries.has(de), `German sitemap missing ${de}`);
    assert.ok(links.has(en), `German sitemap missing EN alternate for ${slug}`);
    assert.ok(links.has(de), `German sitemap missing DE alternate for ${slug}`);
    assert.ok(existsSync(publicUrlToPath(en)), `missing English Wiesmoor route: ${en}`);
    assert.ok(existsSync(publicUrlToPath(de)), `missing German Wiesmoor route: ${de}`);
  }
});

test("the sitemap set contains all ten English Wiesmoor observer routes", () => {
  const main = new Set(allSitemaps.flatMap(locs));
  for (const slug of wiesmoorSlugs) {
    assert.ok(main.has(`${base}/world-observer/${slug}.html`), `main sitemap missing English Wiesmoor observer: ${slug}`);
  }
});

test("German sitemap entries carry reciprocal EN/DE/x-default alternates", () => {
  const links = new Set(allSitemaps.flatMap(alternateLinks));
  for (const deUrl of allSitemaps.flatMap(locs).filter((url) => url.startsWith(`${base}/de/`))) {
    const enUrl = deUrl
      .replace(`${base}/de/world-observer/technology/`, `${base}/world-observer/technology/`)
      .replace(`${base}/de/world-observer/`, `${base}/world-observer/`)
      .replace(`${base}/de/museum/`, `${base}/museum/`)
      .replace(`${base}/de/`, `${base}/`);
    assert.ok(links.has(deUrl), `missing DE alternate for ${deUrl}`);
    assert.ok(links.has(enUrl), `missing EN/x-default alternate for ${deUrl}`);
  }
});

test("Internet observer sitemap covers every bilingual observer pair", () => {
  const expected = new Set();
  for (const slug of internetSlugs) {
    expected.add(`${base}/world-observer/${slug}.html`);
    expected.add(`${base}/de/world-observer/${slug}.html`);
  }
  assert.deepEqual(new Set(locs(sitemapInternet)), expected);
  for (const url of expected) assert.ok(existsSync(publicUrlToPath(url)), `Internet sitemap points to missing file: ${url}`);
});

test("Sitemap owners expose the Internet and Technology category entry points", () => {
  assert.ok(new Set(locs(sitemapMain)).has(`${base}/world-observer/internet.html`));
  assert.ok(new Set(locs(sitemapTechnology)).has(`${base}/world-observer/technology.html`));
});

test("Technology sitemap covers every currently published Technology observer route", () => {
  const expected = new Set([
    `${base}/world-observer/technology.html`,
    `${base}/world-observer/time-observer.html`,
    `${base}/world-observer/technology/debian-package-count.html`,
    `${base}/world-observer/technology/arch-package-count.html`,
    `${base}/world-observer/technology/space-satellites.html`,
    `${base}/de/world-observer/technology.html`,
    `${base}/de/world-observer/time-observer.html`,
    `${base}/de/world-observer/technology/debian-package-count.html`,
    `${base}/de/world-observer/technology/arch-package-count.html`,
    `${base}/de/world-observer/technology/space-satellites.html`,
  ]);
  assert.deepEqual(new Set(locs(sitemapTechnology)), expected);
  for (const url of expected) assert.ok(existsSync(publicUrlToPath(url)), `Technology sitemap points to missing file: ${url}`);
});

test("Wiesmoor image sitemap references only real local images on both story routes", () => {
  const pages = new Set(locs(sitemapImages));
  assert.deepEqual(pages, new Set([
    `${base}/world-observer/wiesmoor.html`,
    `${base}/de/world-observer/wiesmoor.html`,
  ]));
  const images = imageLocs(sitemapImages);
  assert.equal(images.length, 16);
  assert.equal(new Set(images).size, 8);
  for (const url of pages) assert.ok(existsSync(publicUrlToPath(url)), `image sitemap page missing: ${url}`);
  for (const url of new Set(images)) assert.ok(existsSync(publicUrlToPath(url)), `image sitemap image missing: ${url}`);
});

test("bilingual sitemap alternates never point at missing local routes", () => {
  for (const xml of allSitemaps) {
    for (const url of alternateLinks(xml)) assert.ok(existsSync(publicUrlToPath(url)), `hreflang alternate points to missing file: ${url}`);
  }
});
