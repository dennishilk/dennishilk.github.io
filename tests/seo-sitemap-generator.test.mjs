import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);
const base = "https://www.dennishilk.com";
const en = `${base}/blog/future-note/`;
const de = `${base}/de/blog/zukuenftige-notiz/`;
const locs = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

test("SEO synchronization discovers new translated blog slugs, preserves dates and rejects missing counterparts", async t => {
  const fixture = await mkdtemp(join(tmpdir(), "blog-sitemap-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  await mkdir(join(fixture, "scripts"));
  await cp(new URL("scripts/sync-seo.mjs", root), join(fixture, "scripts/sync-seo.mjs"));
  await cp(new URL("scripts/hardware-integration.mjs", root), join(fixture, "scripts/hardware-integration.mjs"));
  for (const name of await readdir(root)) {
    if (/^site-i18n-de.*\.js$/.test(name)) await cp(new URL(name, root), join(fixture, name));
  }
  await mkdir(join(fixture, "de"));
  await cp(new URL("blog", root), join(fixture, "blog"), { recursive: true });
  await cp(new URL("de/blog", root), join(fixture, "de/blog"), { recursive: true });
  const originalSitemap = await readFile(new URL("sitemap-blog.xml", root), "utf8");
  await writeFile(join(fixture, "sitemap-blog.xml"), originalSitemap);

  // Existing metadata synchronization also maintains these two non-indexable routes.
  for (const file of ["museum/malware-history/defense-lab-experience/index.html", "world-observer/east-frisia-water-observer.html"]) {
    await mkdir(join(fixture, file, ".."), { recursive: true });
    await writeFile(join(fixture, file), '<html lang="en"><head><meta name="robots" content="noindex"><title>Fixture</title></head><body></body></html>');
  }
  const alternates = `<link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="de" href="${de}"><link rel="alternate" hreflang="x-default" href="${en}">`;
  for (const [language, route] of [["en", "blog/future-note"], ["de", "de/blog/zukuenftige-notiz"]]) {
    await mkdir(join(fixture, route), { recursive: true });
    await writeFile(join(fixture, route, "index.html"), `<html lang="${language}"><head><title>Future guide fixture</title>${alternates}</head><body><h1>Future guide fixture</h1></body></html>`);
  }

  const run = () => spawnSync(process.execPath, ["scripts/sync-seo.mjs"], { cwd: fixture, encoding: "utf8" });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const xml = await readFile(join(fixture, "sitemap-blog.xml"), "utf8");
  assert.deepEqual(locs(xml).sort(), [...locs(originalSitemap), en, de].sort());
  for (const url of [en, de]) {
    const entry = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].find(([entry]) => entry.includes(`<loc>${url}</loc>`))?.[0];
    for (const [code, target] of [["en", en], ["de", de], ["x-default", en]]) {
      assert.ok(entry.includes(`hreflang="${code}" href="${target}"`), `${url} missing ${code} alternate`);
    }
  }
  const dates = sitemap => new Map([...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)].map(([entry]) => [locs(entry)[0], entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]]));
  const actualDates = dates(xml);
  for (const [url, date] of dates(originalSitemap)) assert.equal(actualDates.get(url), date);
  assert.ok(locs(await readFile(join(fixture, "sitemap-index.xml"), "utf8")).includes(`${base}/sitemap-blog.xml`));
  const again = run();
  assert.equal(again.status, 0, again.stderr);
  assert.equal(await readFile(join(fixture, "sitemap-blog.xml"), "utf8"), xml);

  await rm(join(fixture, "blog/future-note/index.html"));
  const missing = run();
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Indexable German page lacks an indexable English counterpart/);
});
