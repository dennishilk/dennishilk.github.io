import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const origin = "https://www.dennishilk.com";
const sitemapNames = [
  "sitemap.xml",
  "sitemap-de.xml",
  "sitemap-internet-observers.xml",
  "sitemap-technology-observers.xml",
  "sitemap-images.xml",
  "sitemap-cisco-doom.xml",
];

const technicalPages = new Set([
  "404.html",
  "blog/post.html",
  "googlebe6f4cac81733577.html",
]);

const legacyAliases = new Set([
  "world-observer/index.html",
  "world-observer/east-frisia-water-observer.html",
]);

const germanRootPages = new Set([
  "datenschutzerklaerung.html",
  "impressum.html",
]);

const importantImagePages = new Set([
  `${origin}/about/`,
  `${origin}/about/cats/`,
  `${origin}/de/about/cats/`,
  `${origin}/museum/`,
  `${origin}/museum/home-computing-lab/`,
  `${origin}/museum/home-computing-lab/field-notes/`,
  ...Array.from({ length: 7 }, (_, index) => `${origin}/museum/home-computing-lab/field-notes/field-note-${index + 1}/`),
]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && [".git", "node_modules"].includes(entry.name)) return [];
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function rel(path) {
  return relative(root, path).split(sep).join("/");
}

function publicPath(file) {
  const path = typeof file === "string" && file.startsWith(`${root}${sep}`) ? rel(file) : String(file);
  if (path === "index.html") return "/";
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"index.html".length)}`;
  return `/${path}`;
}

function publicUrl(file) {
  return `${origin}${publicPath(file)}`;
}

function fileForUrl(value) {
  const url = new URL(value);
  if (url.origin !== origin) return null;
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") return join(root, "index.html");
  if (pathname.endsWith("/")) return join(root, pathname.slice(1), "index.html");
  return join(root, pathname.slice(1));
}

function tagAttributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map(match => [match[1].toLowerCase(), match[3]]));
}

function tags(source, name) {
  return [...source.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(match => ({ raw: match[0], attributes: tagAttributes(match[0]) }));
}

function meta(source, name) {
  return tags(source, "meta").find(tag => tag.attributes.name?.toLowerCase() === name.toLowerCase())?.attributes.content || "";
}

function property(source, name) {
  return tags(source, "meta").find(tag => tag.attributes.property?.toLowerCase() === name.toLowerCase())?.attributes.content || "";
}

function links(source, relName) {
  return tags(source, "link").filter(tag => tag.attributes.rel?.toLowerCase() === relName.toLowerCase());
}

function title(source) {
  return source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || "";
}

function language(source) {
  const html = source.match(/<html\b[^>]*>/i)?.[0] || "";
  return tagAttributes(html).lang || "";
}

function hasNoindex(source) {
  return tags(source, "meta").some(tag =>
    ["robots", "googlebot"].includes(tag.attributes.name?.toLowerCase()) &&
    /(?:^|[\s,])noindex(?:$|[\s,])/i.test(tag.attributes.content || ""));
}

function isMuseumMirror(source) {
  return source.includes("museum-de-mirror-loader.js");
}

function germanSourceFile(file) {
  return join(root, rel(file).slice("de/".length));
}

function isIndexable(file, source) {
  const path = rel(file);
  if (technicalPages.has(path) || legacyAliases.has(path) || hasNoindex(source)) return false;
  if (path.startsWith("de/") && isMuseumMirror(source)) {
    const counterpart = germanSourceFile(file);
    return existsSync(counterpart) && !hasNoindex(readFileSync(counterpart, "utf8"));
  }
  return true;
}

function classification(file, source, indexable) {
  const path = rel(file);
  if (!indexable) {
    if (path.startsWith("wopr/") || path.startsWith("museum/wopr/") || path.startsWith("de/museum/wopr/")) return "intentionally blocked page";
    if (technicalPages.has(path)) return "technical/internal/template/verification page";
    return "interactive/utility page that should NOT be in search";
  }
  if (path.startsWith("de/")) return "indexable localized alternate";
  if ((path.startsWith("museum/") && path !== "museum/index.html") || path.startsWith("world-observer/")) {
    return "interactive child/lab page that should still be indexable";
  }
  return "primary indexable page";
}

function decodeEntities(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

function reciprocalAlternateErrors(english, german) {
  const expected = new Map([
    ["en", english.url],
    ["de", german.url],
    ["x-default", english.url],
  ]);
  const errors = [];
  for (const page of [english, german]) {
    const actual = new Map(links(page.source, "alternate").map(link => [link.attributes.hreflang?.toLowerCase(), link.attributes.href]));
    for (const [hreflang, href] of expected) {
      if (actual.get(hreflang) !== href) errors.push(`${page.path}: hreflang ${hreflang} is ${actual.get(hreflang) || "missing"}; expected ${href}`);
    }
  }
  return errors;
}

function onlyLocalizedPair(paths) {
  if (paths.length !== 2) return false;
  const [a, b] = paths.sort();
  return a.startsWith("de/") ? a.slice(3) === b : b.startsWith("de/") && b.slice(3) === a;
}

const htmlFiles = walk(root).filter(path => path.endsWith(".html"));
const pages = htmlFiles.map(file => {
  const source = readFileSync(file, "utf8");
  const indexable = isIndexable(file, source);
  return { file, path: rel(file), source, url: publicUrl(file), indexable, className: classification(file, source, indexable) };
});
const indexablePages = pages.filter(page => page.indexable);
const excludedPages = pages.filter(page => !page.indexable);
const byPath = new Map(indexablePages.map(page => [page.path, page]));
const byUrl = new Map(indexablePages.map(page => [page.url, page]));

const failures = [];
const classificationCounts = Object.fromEntries([...new Set(pages.map(page => page.className))].sort().map(name => [name, pages.filter(page => page.className === name).length]));

const sitemapDocuments = sitemapNames.map(name => ({ name, source: readFileSync(join(root, name), "utf8") }));
const sitemapUrls = sitemapDocuments.flatMap(document =>
  [...document.source.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => ({ sitemap: document.name, url: decodeEntities(match[1]) })));
const imageUrls = sitemapDocuments.flatMap(document =>
  [...document.source.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(match => ({ sitemap: document.name, url: decodeEntities(match[1]) })));
const uniqueSitemapUrls = new Set(sitemapUrls.map(entry => entry.url));
const duplicates = [...new Set(sitemapUrls.map(entry => entry.url).filter((url, index, all) => all.indexOf(url) !== index))];
const missingIndexable = indexablePages.filter(page => !uniqueSitemapUrls.has(page.url));
const staleSitemap = sitemapUrls.filter(entry => !byUrl.has(entry.url));

if (duplicates.length) failures.push(...duplicates.map(url => `duplicate sitemap URL: ${url}`));
if (missingIndexable.length) failures.push(...missingIndexable.map(page => `indexable page missing from sitemaps: ${page.path}`));
if (staleSitemap.length) failures.push(...staleSitemap.map(entry => `${entry.sitemap}: sitemap URL has no indexable page: ${entry.url}`));

for (const { name, source } of sitemapDocuments) {
  if (!source.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) failures.push(`${name}: missing XML declaration`);
  if (!/<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(source)) failures.push(`${name}: invalid urlset envelope`);
  if (!source.trimEnd().endsWith("</urlset>")) failures.push(`${name}: missing closing urlset`);
  if (source.includes("https://dennishilk.com")) failures.push(`${name}: non-www URL remains`);
}

for (const entry of sitemapUrls) {
  let target;
  try {
    target = fileForUrl(entry.url);
  } catch {
    failures.push(`${entry.sitemap}: invalid URL ${entry.url}`);
    continue;
  }
  if (!target || !existsSync(target)) failures.push(`${entry.sitemap}: URL has no matching file: ${entry.url}`);
}

for (const entry of imageUrls) {
  const target = fileForUrl(entry.url);
  if (!target || !existsSync(target)) failures.push(`${entry.sitemap}: image URL has no matching local file: ${entry.url}`);
}

const sitemapEntries = sitemapDocuments.flatMap(document =>
  [...document.source.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => ({ sitemap: document.name, xml: match[1], url: decodeEntities(match[1].match(/<loc>([^<]+)<\/loc>/)?.[1] || "") })));
const imageCoveredPages = new Set(sitemapEntries.filter(entry => /<image:image>/.test(entry.xml)).map(entry => entry.url));
for (const url of importantImagePages) {
  if (!imageCoveredPages.has(url)) failures.push(`important photographic page lacks image sitemap coverage: ${url}`);
}

const canonicalMismatches = [];
const ogUrlMismatches = [];
const missingTitles = [];
const missingDescriptions = [];
const badLanguages = [];
const missingAlt = [];
const brokenInternalLinks = [];
const nonWwwMetadata = [];

for (const page of indexablePages) {
  const canonicalLinks = links(page.source, "canonical");
  if (canonicalLinks.length !== 1 || canonicalLinks[0].attributes.href !== page.url) {
    canonicalMismatches.push(`${page.path}: ${canonicalLinks.map(link => link.attributes.href).join(", ") || "missing"} (expected ${page.url})`);
  }
  const ogUrl = property(page.source, "og:url");
  if (ogUrl && ogUrl !== page.url) ogUrlMismatches.push(`${page.path}: ${ogUrl} (expected ${page.url})`);
  if (!title(page.source)) missingTitles.push(page.path);
  if (!meta(page.source, "description")) missingDescriptions.push(page.path);
  const lang = language(page.source).toLowerCase();
  const expectedLanguage = page.path.startsWith("de/") || germanRootPages.has(page.path) ? "de" : "en";
  if (!lang.startsWith(expectedLanguage)) badLanguages.push(`${page.path}: ${lang || "missing"} (expected ${expectedLanguage})`);
  for (const image of tags(page.source, "img")) {
    if (!("alt" in image.attributes)) missingAlt.push(`${page.path}: ${image.attributes.src || "unknown image"}`);
  }
}

for (const page of pages) {
  for (const link of [...links(page.source, "canonical"), ...links(page.source, "alternate")]) {
    if ((link.attributes.href || "").startsWith("https://dennishilk.com")) nonWwwMetadata.push(`${page.path}: ${link.attributes.href}`);
  }
  const ogUrl = property(page.source, "og:url");
  if (ogUrl.startsWith("https://dennishilk.com")) nonWwwMetadata.push(`${page.path}: ${ogUrl}`);
  for (const anchor of tags(page.source, "a")) {
    const href = anchor.attributes.href || "";
    if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/api/")) continue;
    const pathname = decodeURIComponent(href.split(/[?#]/, 1)[0]);
    const target = pathname === "/"
      ? join(root, "index.html")
      : pathname.endsWith("/")
        ? join(root, pathname.slice(1), "index.html")
        : join(root, pathname.slice(1));
    if (!existsSync(target)) brokenInternalLinks.push(`${page.path}: ${href}`);
  }
}

failures.push(...canonicalMismatches.map(item => `canonical mismatch: ${item}`));
failures.push(...ogUrlMismatches.map(item => `Open Graph URL mismatch: ${item}`));
failures.push(...missingTitles.map(path => `indexable page missing title: ${path}`));
failures.push(...missingDescriptions.map(path => `indexable page missing description: ${path}`));
failures.push(...badLanguages.map(item => `language mismatch: ${item}`));
failures.push(...missingAlt.map(item => `image missing alt attribute: ${item}`));
failures.push(...brokenInternalLinks.map(item => `broken crawlable internal link: ${item}`));
failures.push(...nonWwwMetadata.map(item => `non-www metadata URL: ${item}`));

const hreflangErrors = [];
for (const german of indexablePages.filter(page => page.path.startsWith("de/"))) {
  const english = byPath.get(german.path.slice("de/".length));
  if (!english) hreflangErrors.push(`${german.path}: missing indexable English counterpart`);
  else hreflangErrors.push(...reciprocalAlternateErrors(english, german));
}
failures.push(...hreflangErrors.map(item => `broken hreflang pair: ${item}`));

const titles = new Map();
for (const page of indexablePages) {
  const value = title(page.source).toLocaleLowerCase("en");
  if (!titles.has(value)) titles.set(value, []);
  titles.get(value).push(page.path);
}
const duplicateTitleGroups = [...titles.entries()].filter(([value, paths]) => value && paths.length > 1 && !onlyLocalizedPair(paths));
failures.push(...duplicateTitleGroups.map(([value, paths]) => `duplicate title "${value}": ${paths.join(", ")}`));

const robots = readFileSync(join(root, "robots.txt"), "utf8");
for (const name of sitemapNames) {
  if (!robots.includes(`Sitemap: ${origin}/${name}`)) failures.push(`robots.txt does not advertise ${origin}/${name}`);
}
for (const blocked of ["/wopr/", "/museum/wopr/", "/de/museum/wopr/"]) {
  if (!robots.includes(`Disallow: ${blocked}`)) failures.push(`robots.txt lost intentional exclusion ${blocked}`);
}
if (robots.includes("https://dennishilk.com")) failures.push("robots.txt contains a non-www sitemap URL");
if (readFileSync(join(root, "CNAME"), "utf8").trim() !== "www.dennishilk.com") failures.push("CNAME is not www.dennishilk.com");

console.log(`total HTML files: ${pages.length}`);
console.log(`total indexable pages: ${indexablePages.length}`);
console.log(`total excluded/non-indexable pages: ${excludedPages.length}`);
for (const [name, count] of Object.entries(classificationCounts)) console.log(`classification ${name}: ${count}`);
console.log(`total sitemap URLs: ${sitemapUrls.length}`);
console.log(`unique sitemap URLs: ${uniqueSitemapUrls.size}`);
console.log(`duplicate sitemap URLs: ${duplicates.length}`);
console.log(`indexable pages missing from all sitemaps: ${missingIndexable.length}`);
console.log(`sitemap URLs with no matching indexable page: ${staleSitemap.length}`);
console.log(`non-www URLs in sitemap/robots/canonical metadata: ${nonWwwMetadata.length + sitemapDocuments.filter(document => document.source.includes("https://dennishilk.com")).length + (robots.includes("https://dennishilk.com") ? 1 : 0)}`);
console.log(`broken hreflang pairs: ${hreflangErrors.length}`);
console.log(`canonical mismatches: ${canonicalMismatches.length}`);
console.log(`Open Graph URL mismatches: ${ogUrlMismatches.length}`);
console.log(`unintended duplicate title groups: ${duplicateTitleGroups.length}`);
console.log(`indexable pages missing titles: ${missingTitles.length}`);
console.log(`indexable pages missing descriptions: ${missingDescriptions.length}`);
console.log(`indexable pages with language mismatches: ${badLanguages.length}`);
console.log(`images missing alt attributes: ${missingAlt.length}`);
console.log(`broken crawlable internal links: ${brokenInternalLinks.length}`);
console.log(`important photographic pages missing image coverage: ${[...importantImagePages].filter(url => !imageCoveredPages.has(url)).length}`);
console.log(`validation errors: ${failures.length}`);

if (process.argv.includes("--details")) {
  console.log("\npage inventory:");
  for (const page of pages.sort((a, b) => a.path.localeCompare(b.path, "en"))) {
    console.log(`${page.path}\t${page.className}`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`ERROR: ${failure}`);
  process.exitCode = 1;
}
