import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const origin = "https://www.dennishilk.com";

const i18nFiles = [
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
  "site-i18n-de-world-observer-core.js",
];

const internetObserverSlugs = new Set([
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
]);

const technologyRoutes = new Set([
  "world-observer/technology.html",
  "world-observer/time-observer.html",
  "world-observer/technology/debian-package-count.html",
  "world-observer/technology/arch-package-count.html",
  "world-observer/technology/space-satellites.html",
]);

const imageRoutes = new Set([
  "world-observer/wiesmoor.html",
  "de/world-observer/wiesmoor.html",
]);

const ciscoRoutes = new Set([
  "museum/home-computing-lab/field-notes/field-note-7/index.html",
  "de/museum/home-computing-lab/field-notes/field-note-7/index.html",
]);

const technicalPages = new Set([
  "404.html",
  "blog/post.html",
  "googlebe6f4cac81733577.html",
]);

const legacyAliases = new Set([
  "world-observer/index.html",
  "world-observer/east-frisia-water-observer.html",
]);

const failureLabGerman = {
  title: "Failure Lab: Interaktiver Linux-Fehlersimulator | Dennis Hilk",
  description: "Interaktiver Linux-Fehlersimulator: Kernel-Panic, DNS- und Speicherplatzfehler untersuchen, Protokolle auswerten und sichere Wiederherstellungsschritte lernen.",
};

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

function htmlFiles() {
  return walk(root).filter(path => path.endsWith(".html"));
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

function htmlFileForPublicPath(pathname) {
  if (pathname === "/") return join(root, "index.html");
  if (pathname.endsWith("/")) return join(root, pathname.slice(1), "index.html");
  return join(root, pathname.slice(1));
}

function germanSourceFile(file) {
  return join(root, rel(file).slice("de/".length));
}

function hasNoindex(source) {
  return /<meta\b(?=[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'])(?=[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b)[^>]*>/i.test(source);
}

function isMuseumMirror(source) {
  return source.includes("museum-de-mirror-loader.js");
}

function isIndexable(file, source = readFileSync(file, "utf8")) {
  const path = rel(file);
  if (technicalPages.has(path) || legacyAliases.has(path) || hasNoindex(source)) return false;
  if (path.startsWith("de/") && isMuseumMirror(source)) {
    const counterpart = germanSourceFile(file);
    return existsSync(counterpart) && !hasNoindex(readFileSync(counterpart, "utf8"));
  }
  return true;
}

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function escapeText(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insertIntoHead(source, tag) {
  return source.replace(/<head(?:\s[^>]*)?>/i, match => `${match}\n  ${tag}`);
}

function setHtmlLanguage(source, language) {
  return source.replace(/<html\b([^>]*)>/i, (match, attributes) => {
    if (/\blang\s*=\s*["'][^"']*["']/i.test(attributes)) {
      return `<html${attributes.replace(/\blang\s*=\s*["'][^"']*["']/i, `lang="${language}"`)}>`;
    }
    return `<html lang="${language}"${attributes}>`;
  });
}

function setTitle(source, value) {
  const tag = `<title>${escapeText(value)}</title>`;
  return /<title\b[^>]*>[\s\S]*?<\/title>/i.test(source)
    ? source.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, tag)
    : insertIntoHead(source, tag);
}

function setMeta(source, attribute, key, value) {
  const tag = `<meta ${attribute}="${key}" content="${escapeAttribute(value)}">`;
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}\\s*=\\s*["']${escapeRegExp(key)}["'])[^>]*>`, "i");
  return pattern.test(source) ? source.replace(pattern, tag) : insertIntoHead(source, tag);
}

function setCanonical(source, href) {
  const tag = `<link rel="canonical" href="${escapeAttribute(href)}">`;
  const pattern = /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i;
  return pattern.test(source) ? source.replace(pattern, tag) : insertIntoHead(source, tag);
}

function setAlternates(source, englishUrl, germanUrl) {
  source = source.replace(/\s*<link\b(?=[^>]*\brel\s*=\s*["']alternate["'])(?=[^>]*\bhreflang\s*=)[^>]*>\s*/gi, "\n");
  const tags = [
    `<link rel="alternate" hreflang="en" href="${englishUrl}">`,
    `<link rel="alternate" hreflang="de" href="${germanUrl}">`,
    `<link rel="alternate" hreflang="x-default" href="${englishUrl}">`,
  ].join("\n  ");
  return source.replace(/(<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>)/i, `$1\n  ${tags}`);
}

function setGermanJsonLdUrl(source, englishUrl, germanUrl, title, description) {
  return source.replace(/<script\b([^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi, (match, attributes, json) => {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      return match;
    }
    let changed = false;
    const update = node => {
      if (!node || typeof node !== "object") return;
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === "string" && value === englishUrl) {
          node[key] = germanUrl;
          changed = true;
        } else if (Array.isArray(value)) value.forEach(update);
        else if (value && typeof value === "object") update(value);
      }
      if (node.url === germanUrl) {
        if (node.inLanguage !== "de") {
          node.inLanguage = "de";
          changed = true;
        }
        if (title && typeof node.name === "string" && node.name !== title) {
          node.name = title;
          changed = true;
        }
        if (description && typeof node.description === "string" && node.description !== description) {
          node.description = description;
          changed = true;
        }
      }
    };
    update(data);
    return changed ? `<script${attributes}>${JSON.stringify(data)}</script>` : match;
  });
}

function loadGermanBundle() {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of i18nFiles) {
    vm.runInContext(readFileSync(join(root, file), "utf8"), context, { filename: file });
  }
  return context.window.DennisSiteI18nDE;
}

function resolveGermanSpec(bundle, route) {
  if (route === "/museum/failure-lab/") return failureLabGerman;
  const prefixes = Object.entries(bundle.prefixes || {})
    .filter(([prefix]) => route.startsWith(prefix))
    .sort((a, b) => a[0].length - b[0].length)
    .map(([, spec]) => spec);
  const page = (bundle.pages || {})[route] || {};
  return {
    title: page.title || prefixes.map(spec => spec.title).filter(Boolean).at(-1) || null,
    description: page.description || null,
  };
}

function synchronizeMetadata() {
  const bundle = loadGermanBundle();
  const files = htmlFiles();
  const indexable = new Map();

  for (const file of files) {
    let source = readFileSync(file, "utf8");
    const path = rel(file);

    if (path.startsWith("de/") && isMuseumMirror(source) && !isIndexable(file, source)) {
      const directive = path === "de/museum/wopr/index.html" ? "noindex, nofollow, noarchive" : "noindex, follow";
      source = setMeta(source, "name", "robots", directive);
      writeFileSync(file, source);
      continue;
    }

    if (isIndexable(file, source)) indexable.set(path, file);
  }

  for (const [path, file] of indexable) {
    if (!path.startsWith("de/")) continue;
    const englishPath = path.slice("de/".length);
    const englishFile = indexable.get(englishPath);
    if (!englishFile) throw new Error(`Indexable German page lacks an indexable English counterpart: ${path}`);

    const englishUrl = publicUrl(englishFile);
    const germanUrl = publicUrl(file);
    const englishRoute = publicPath(englishFile);

    let german = readFileSync(file, "utf8");
    let english = readFileSync(englishFile, "utf8");
    const wrapper = isMuseumMirror(german) || german.includes("world-observer-de-mirror-loader.js");
    const repairStaticTranslation = wrapper || !/<html\b[^>]*\blang\s*=\s*["']de(?:-|["'])/i.test(german);
    const spec = repairStaticTranslation ? resolveGermanSpec(bundle, englishRoute) : { title: null, description: null };

    if (wrapper && (!spec.title || !spec.description)) {
      throw new Error(`German mirror metadata is incomplete for ${path} (${englishRoute})`);
    }

    german = setHtmlLanguage(german, "de");
    german = setCanonical(german, germanUrl);
    german = setAlternates(german, englishUrl, germanUrl);
    german = setMeta(german, "property", "og:url", germanUrl);
    if (wrapper) {
      german = setTitle(german, spec.title);
      german = setMeta(german, "name", "description", spec.description);
      german = setMeta(german, "name", "robots", "index,follow,max-image-preview:large");
      german = setMeta(german, "property", "og:title", spec.title);
      german = setMeta(german, "property", "og:description", spec.description);
      german = setMeta(german, "property", "og:type", "website");
      german = setMeta(german, "property", "og:locale", "de_DE");
      german = setMeta(german, "property", "og:locale:alternate", "en_US");
    } else if (repairStaticTranslation && spec.title && spec.description) {
      german = setTitle(german, spec.title);
      german = setMeta(german, "name", "description", spec.description);
      if (/meta\b[^>]*property=["']og:title/i.test(german)) german = setMeta(german, "property", "og:title", spec.title);
      if (/meta\b[^>]*property=["']og:description/i.test(german)) german = setMeta(german, "property", "og:description", spec.description);
      if (/meta\b[^>]*name=["']twitter:title/i.test(german)) german = setMeta(german, "name", "twitter:title", spec.title);
      if (/meta\b[^>]*name=["']twitter:description/i.test(german)) german = setMeta(german, "name", "twitter:description", spec.description);
    }
    german = setGermanJsonLdUrl(german, englishUrl, germanUrl, spec.title, spec.description);

    english = setCanonical(english, englishUrl);
    english = setAlternates(english, englishUrl, germanUrl);
    if (/meta\b[^>]*property=["']og:url/i.test(english)) english = setMeta(english, "property", "og:url", englishUrl);

    writeFileSync(file, german);
    writeFileSync(englishFile, english);
  }

  const experience = join(root, "museum/malware-history/defense-lab-experience/index.html");
  let source = readFileSync(experience, "utf8");
  source = setTitle(source, "Defense Lab Interactive Exercise | Malware History Lab");
  writeFileSync(experience, source);

  const waterAlias = join(root, "world-observer/east-frisia-water-observer.html");
  source = readFileSync(waterAlias, "utf8").replaceAll(
    `${origin}/world-observer/east-frisia-water-observer.html`,
    `${origin}/world-observer/east-frisia-water.html`,
  );
  writeFileSync(waterAlias, source);
}

function tagAttributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map(match => [match[1].toLowerCase(), match[3]]));
}

function localImageUrls(file) {
  const source = readFileSync(file, "utf8");
  const pageUrl = publicUrl(file);
  const urls = [];
  for (const match of source.matchAll(/<img\b[^>]*>/gi)) {
    const attributes = tagAttributes(match[0]);
    const src = attributes.src;
    const classes = attributes.class || "";
    if (!src || !attributes.alt || /^https?:\/\//i.test(src) || /^data:/i.test(src)) continue;
    if (/\bnebby\b/i.test(classes) || /(?:^|\/)(?:nebby|avatar|favicon)(?:[.@/-]|$)/i.test(src)) continue;
    const url = new URL(src, pageUrl);
    const path = decodeURIComponent(url.pathname);
    if (!existsSync(htmlFileForPublicPath(path))) continue;
    urls.push(`${origin}${url.pathname}`);
  }
  return [...new Set(urls)];
}

const explicitImages = new Map([
  ["museum/index.html", [`${origin}/museum/c64/c64-programming-lab-preview.jpg`]],
  ["lost-administrator/index.html", [`${origin}/assets/lost-administrator/thelostadministrator.webp`]],
  ["museum/home-computing-lab/field-notes/field-note-7/index.html", [`${origin}/assets/home-computing-lab/field-notes/cisco-9951-cat-card.webp`]],
  ["de/museum/home-computing-lab/field-notes/field-note-7/index.html", [`${origin}/assets/home-computing-lab/field-notes/cisco-9951-cat-card.webp`]],
  ["world-observer/wiesmoor.html", [
    "1783513449100.jpg", "1783513449217.jpg", "1783513449513.jpg", "1783513449676.jpg",
    "1783513449869.jpg", "1783513449947.jpg", "1783513449999.jpg",
  ].map(name => `${origin}/assets/wiesmoor/${name}`)],
  ["de/world-observer/wiesmoor.html", [
    "1783513449100.jpg", "1783513449217.jpg", "1783513449513.jpg", "1783513449676.jpg",
    "1783513449869.jpg", "1783513449947.jpg", "1783513449999.jpg",
  ].map(name => `${origin}/assets/wiesmoor/${name}`)],
]);

function imagesFor(file) {
  return [...new Set([...localImageUrls(file), ...(explicitImages.get(rel(file)) || [])])];
}

function sitemapOwner(path) {
  const basePath = path.startsWith("de/") ? path.slice("de/".length) : path;
  if (ciscoRoutes.has(path)) return "sitemap-cisco-doom.xml";
  if (imageRoutes.has(path)) return "sitemap-images.xml";
  const internetMatch = basePath.match(/^world-observer\/([^/]+)\.html$/);
  if (internetMatch && internetObserverSlugs.has(internetMatch[1])) return "sitemap-internet-observers.xml";
  if (technologyRoutes.has(basePath)) return "sitemap-technology-observers.xml";
  return path.startsWith("de/") ? "sitemap-de.xml" : "sitemap.xml";
}

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function videoXml() {
  return [
    "    <video:video>",
    `      <video:thumbnail_loc>${origin}/assets/home-computing-lab/field-notes/cisco-9951-cat-card.webp</video:thumbnail_loc>`,
    "      <video:title>Can a Cisco CP-9951 Run DOOM? Yes — and the Phone Controls It</video:title>",
    "      <video:description>Native, persistent and offline DOOM on a Cisco CP-9951, with local framebuffer rendering, real keypad control and phone audio.</video:description>",
    `      <video:content_loc>${origin}/assets/home-computing-lab/field-notes/cisco-cp-9951-doom-controller-web.mp4</video:content_loc>`,
    "      <video:duration>106</video:duration>",
    "      <video:publication_date>2026-09-13T09:49:08+00:00</video:publication_date>",
    "      <video:family_friendly>yes</video:family_friendly>",
    `      <video:uploader info="${origin}/about/">Dennis Hilk</video:uploader>`,
    "      <video:tag>Cisco CP-9951</video:tag>",
    "      <video:tag>DOOM</video:tag>",
    "      <video:tag>Linux</video:tag>",
    "    </video:video>",
  ].join("\n");
}

function sitemapEntry(file, indexablePaths) {
  const path = rel(file);
  const url = publicUrl(file);
  const lines = ["  <url>", `    <loc>${xmlEscape(url)}</loc>`];
  const counterpartPath = path.startsWith("de/") ? path.slice("de/".length) : `de/${path}`;
  if (indexablePaths.has(counterpartPath)) {
    const englishPath = path.startsWith("de/") ? counterpartPath : path;
    const germanPath = path.startsWith("de/") ? path : counterpartPath;
    const englishUrl = publicUrl(englishPath);
    const germanUrl = publicUrl(germanPath);
    lines.push(`    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(englishUrl)}" />`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="de" href="${xmlEscape(germanUrl)}" />`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(englishUrl)}" />`);
  }
  for (const image of imagesFor(file)) {
    lines.push(`    <image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>`);
  }
  if (ciscoRoutes.has(path)) lines.push(videoXml());
  lines.push("  </url>");
  return lines.join("\n");
}

function synchronizeSitemaps() {
  const files = htmlFiles().filter(file => isIndexable(file));
  const indexablePaths = new Set(files.map(rel));
  const groups = new Map([
    ["sitemap.xml", []],
    ["sitemap-de.xml", []],
    ["sitemap-internet-observers.xml", []],
    ["sitemap-technology-observers.xml", []],
    ["sitemap-images.xml", []],
    ["sitemap-cisco-doom.xml", []],
  ]);

  for (const file of files) groups.get(sitemapOwner(rel(file))).push(file);

  for (const [name, entries] of groups) {
    entries.sort((a, b) => publicUrl(a).localeCompare(publicUrl(b), "en"));
    const videoNamespace = name === "sitemap-cisco-doom.xml" ? ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"' : "";
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"${videoNamespace}>`,
      ...entries.map(file => sitemapEntry(file, indexablePaths)),
      "</urlset>",
      "",
    ].join("\n");
    writeFileSync(join(root, name), xml);
  }
}

synchronizeMetadata();
synchronizeSitemaps();
