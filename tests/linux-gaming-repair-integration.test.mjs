import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { gamingIntegration, gamingPublication } from '../scripts/gaming-integration.mjs';
import { loadProblems, problemPath } from '../scripts/build-linux-fix-lab.mjs';
import { catalog as hardware } from '../assets/linux-hardware-explorer/catalog.js';

const root = resolve(import.meta.dirname, '..'), origin = 'https://www.dennishilk.com';
const read = path => readFileSync(join(root, path.replace(/^\//, '')), 'utf8');
const manifest = () => JSON.parse(read('content/linux-gaming-repair/generated-manifest.json'));
const locs = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

test('approved gaming launch has its own complete bilingual sitemap with preserved build dates', () => {
  assert.deepEqual(gamingPublication(root), { approved: true, sitemapActive: true, integrationActive: true });
  const built = manifest(), xml = read('sitemap-linux-gaming-repair.xml');
  assert.equal(built.articleCount, 23);
  assert.equal(Object.keys(built.pages).length, 48);
  assert.deepEqual(locs(xml).sort(), Object.keys(built.pages).map(path => origin + path).sort());
  assert.equal(new Set(locs(xml)).size, 48);
  for (const entry of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const url = locs(entry[1])[0], page = built.pages[new URL(url).pathname];
    assert.ok(entry[1].includes(`<lastmod>${page.lastmod}</lastmod>`));
    for (const lang of ['en', 'de', 'x-default']) assert.ok(entry[1].includes(`hreflang="${lang}"`));
  }
  const advertised = origin + '/sitemap-linux-gaming-repair.xml';
  assert.equal(locs(read('sitemap-index.xml')).filter(url => url === advertised).length, 1);
  assert.equal(read('robots.txt').split(/\r?\n/).filter(line => line === 'Sitemap: ' + advertised).length, 1);
  for (const other of ['sitemap.xml', 'sitemap-de.xml', 'sitemap-linux-fix-lab.xml', 'sitemap-linux-hardware-explorer.xml']) {
    assert.ok(!locs(read(other)).some(url => /\/linux-gaming-repair\//.test(url)));
  }
});

test('gaming pages have correct output hashes, safe metadata and resolvable local links/anchors', () => {
  for (const [path, page] of Object.entries(manifest().pages)) {
    const html = read(path + 'index.html'), lang = path.startsWith('/de/') ? 'de' : 'en';
    assert.equal(createHash('sha256').update(html).digest('hex'), page.hash, path);
    assert.ok(html.includes(`<html lang="${lang}">`));
    assert.ok(html.includes(`rel="canonical" href="${origin}${path}"`));
    assert.ok(html.includes("connect-src 'none'"));
    assert.ok(html.includes("form-action 'none'"));
    assert.ok(html.includes('name="referrer" content="no-referrer"'));
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || 'null');
    assert.ok(data?.['@graph']?.some(item => item['@type'] === 'BreadcrumbList'), path);
    for (const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
      const href = match[1]; if (!href.startsWith('/') && !href.startsWith('#')) continue;
      const url = new URL(href.replaceAll('&amp;', '&'), origin + path);
      const target = url.pathname + (url.pathname.endsWith('/') ? 'index.html' : '');
      assert.ok(existsSync(join(root, target.slice(1))), `${path} -> ${target}`);
      if (url.hash && target.endsWith('.html')) {
        assert.ok(read(target).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${path} -> ${href}`);
      }
    }
  }
});

test('system and hardware relationships resolve both ways without replacing existing deep links', () => {
  const map = JSON.parse(read('content/linux-gaming-repair/integration.json'));
  const problems = new Map(loadProblems().map(item => [item.id, item]));
  const profiles = new Map(hardware.profiles.map(item => [item.id, item]));
  assert.ok(Object.keys(map.articlesByProblem).length >= 8);
  assert.ok(Object.keys(map.articlesByHardware).length >= 5);
  for (const lang of ['en', 'de']) {
    const prefix = lang === 'de' ? '/de' : '';
    for (const project of ['linux-fix-lab', 'linux-hardware-explorer']) {
      const html = read(`${prefix}/${project}/index.html`);
      assert.ok(html.includes(`href="${prefix}/linux-gaming-repair/"`));
      assert.ok(html.includes('id="gaming-repair"'));
    }
    for (const [id, articles] of Object.entries(map.articlesByProblem)) {
      assert.ok(problems.has(id), id);
      const path = problemPath(problems.get(id), lang), html = read(path + 'index.html');
      assert.ok(html.includes('id="gaming-context"'), path);
      for (const article of articles) {
        const gamingPath = `${prefix}/linux-gaming-repair/${article.id}/`;
        assert.ok(html.includes(`href="${gamingPath}"`));
        assert.ok(read(gamingPath + 'index.html').includes(`href="${path}"`));
      }
    }
    for (const [id, articles] of Object.entries(map.articlesByHardware)) {
      assert.ok(profiles.has(id), id);
      const path = profiles.get(id).path[lang], html = read(path + 'index.html');
      assert.ok(html.includes('id="gaming-context"'), path);
      for (const article of articles) assert.ok(html.includes(`href="${prefix}/linux-gaming-repair/${article.id}/"`));
    }
  }
});

test('gaming publication fails closed and sitemap ownership can be added/removed in isolation', t => {
  const fixture = mkdtempSync(join(tmpdir(), 'gaming-publication-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  mkdirSync(join(fixture, 'scripts'));
  mkdirSync(join(fixture, 'content/linux-gaming-repair'), { recursive: true });
  const config = join(fixture, 'content/linux-gaming-repair/publication.json');
  assert.equal(gamingPublication(fixture).approved, false);
  assert.equal(gamingIntegration(fixture).nav('en'), '');
  writeFileSync(config, JSON.stringify({ phase: 'review', allowIndexing: true, activateSitemap: true }));
  assert.throws(() => gamingPublication(fixture), /requires approved/);
  for (const name of ['sync-seo.mjs', 'hardware-integration.mjs', 'gaming-integration.mjs']) cpSync(join(root, 'scripts', name), join(fixture, 'scripts', name));
  const pages = { '/linux-gaming-repair/': { lastmod: '2026-10-10' }, '/de/linux-gaming-repair/': { lastmod: '2026-10-10' } };
  writeFileSync(join(fixture, 'content/linux-gaming-repair/generated-manifest.json'), JSON.stringify({ pages }));
  for (const [index, path] of Object.keys(pages).entries()) {
    mkdirSync(join(fixture, path.slice(1)), { recursive: true });
    writeFileSync(join(fixture, path.slice(1), 'index.html'), `<html lang="${index ? 'de' : 'en'}"><head><title>Fixture</title><link rel="alternate" hreflang="en" href="${origin}/linux-gaming-repair/"><link rel="alternate" hreflang="de" href="${origin}/de/linux-gaming-repair/"></head><body><h1>Fixture</h1></body></html>`);
  }
  writeFileSync(join(fixture, 'robots.txt'), `User-agent: *\nSitemap: ${origin}/sitemap-index.xml\n`);
  const run = () => spawnSync(process.execPath, ['scripts/sync-seo.mjs', '--sitemaps-only'], { cwd: fixture, encoding: 'utf8' });
  writeFileSync(config, JSON.stringify({ phase: 'public-launch', allowIndexing: true, activateSitemap: true, activateIntegration: true }));
  let result = run(); assert.equal(result.status, 0, result.stderr);
  const xml = readFileSync(join(fixture, 'sitemap-linux-gaming-repair.xml'), 'utf8');
  assert.equal(locs(xml).length, 2);
  assert.match(xml, /<lastmod>2026-10-10<\/lastmod>/);
  result = run(); assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(fixture, 'sitemap-linux-gaming-repair.xml'), 'utf8'), xml);
  writeFileSync(config, JSON.stringify({ phase: 'review', allowIndexing: false, activateSitemap: false, activateIntegration: false }));
  result = run(); assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(join(fixture, 'sitemap-linux-gaming-repair.xml')), false);
  assert.ok(!readFileSync(join(fixture, 'sitemap-index.xml'), 'utf8').includes('linux-gaming-repair'));
  assert.ok(!readFileSync(join(fixture, 'robots.txt'), 'utf8').includes('linux-gaming-repair'));
});
