// Build localized, static RSS 2.0 feeds from the published blog's JSON-LD metadata.
// Run: node scripts/generate-blog-rss.mjs
// Check without writing: node scripts/generate-blog-rss.mjs --check
// Publication metadata on each article is the source of truth (not sitemap lastmod).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = "https://www.dennishilk.com";
const check = process.argv.includes("--check");
const feedSettings = [
  { language: "en", directory: "blog", title: "Dennis Hilk — Blog (English)",
    description: "Linux, open source, retro computing, weird hardware and personal projects by Dennis Hilk." },
  { language: "de", directory: "de/blog", title: "Dennis Hilk — Blog (Deutsch)",
    description: "Linux, Open Source, Retro-Computer, ungewöhnliche Hardware und persönliche Projekte von Dennis Hilk." }
];

function xml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function loadJsonLd(html, file) {
  const match = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Missing JSON-LD in " + file);
  return JSON.parse(match[1]);
}
function isoDate(date, file) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T00:00:00Z")))
    throw new Error("Invalid article date in " + file + ": " + date);
  return date;
}
function rssDate(date) {
  // Article metadata gives calendar dates, not times: represent date-only at 00:00 UTC.
  return new Date(date + "T00:00:00Z").toUTCString();
}
function build(settings) {
  const homepageFile = resolve(root, settings.directory, "index.html");
  const index = loadJsonLd(readFileSync(homepageFile, "utf8"), homepageFile);
  const itemList = index["@graph"]?.find(node => node["@type"] === "ItemList");
  if (!itemList?.itemListElement?.length) throw new Error("No blog ItemList in " + homepageFile);
  const prefix = site + "/" + settings.directory + "/";
  const articles = itemList.itemListElement.map(entry => {
    if (typeof entry.url !== "string" || !entry.url.startsWith(prefix))
      throw new Error("Unexpected blog URL: " + entry.url);
    const slug = entry.url.slice(prefix.length).replace(/\/$/, "");
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Unexpected article slug: " + slug);
    const path = resolve(root, settings.directory, slug, "index.html");
    const data = loadJsonLd(readFileSync(path, "utf8"), path);
    const article = data["@graph"]?.find(node => node["@type"] === "BlogPosting");
    if (!article || article.url !== entry.url || article.inLanguage !== settings.language)
      throw new Error("BlogPosting URL/language mismatch: " + path);
    if (!article.headline || !article.description || !article.datePublished || !article.dateModified)
      throw new Error("Incomplete metadata: " + path);
    return { url: article.url, title: article.headline, description: article.description,
      published: isoDate(article.datePublished, path),
      modified: isoDate(article.dateModified, path), category: article.articleSection || "" };
  });
  if (new Set(articles.map(x => x.url)).size !== articles.length)
    throw new Error("Duplicate article URL in " + settings.directory);
  articles.sort((a, b) => b.published.localeCompare(a.published)
    || b.modified.localeCompare(a.modified) || a.url.localeCompare(b.url));
  const feedURL = prefix + "feed.xml";
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>' + xml(settings.title) + '</title>',
    '    <link>' + xml(prefix) + '</link>',
    '    <description>' + xml(settings.description) + '</description>',
    '    <language>' + settings.language + '</language>',
    '    <lastBuildDate>' + rssDate(articles.map(x => x.modified).sort().at(-1)) + '</lastBuildDate>',
    '    <atom:link href="' + xml(feedURL) + '" rel="self" type="application/rss+xml"/>'
  ];
  for (const a of articles) {
    lines.push('    <item>',
      '      <title>' + xml(a.title) + '</title>',
      '      <link>' + xml(a.url) + '</link>',
      '      <guid isPermaLink="true">' + xml(a.url) + '</guid>',
      '      <description>' + xml(a.description) + '</description>',
      '      <pubDate>' + rssDate(a.published) + '</pubDate>');
    if (a.category) lines.push('      <category>' + xml(a.category) + '</category>');
    lines.push('    </item>');
  }
  lines.push('  </channel>', '</rss>', '');
  return { content: lines.join("\n"), count: articles.length };
}
for (const settings of feedSettings) {
  const target = resolve(root, settings.directory, "feed.xml");
  const { content, count } = build(settings);
  if (check) {
    if (readFileSync(target, "utf8") !== content) {
      console.error("Outdated " + target + ". Run: node scripts/generate-blog-rss.mjs");
      process.exitCode = 1;
    } else {
      console.log("RSS OK: " + settings.language + " (" + count + " articles)");
    }
  } else {
    writeFileSync(target, content, "utf8");
    console.log("RSS generated: " + settings.language + " (" + count + " articles)");
  }
}
