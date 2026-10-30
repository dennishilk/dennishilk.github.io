import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { words, wordAt } from '../assets/snakkie/words.mjs';
import { previewAdapter, InferenceUnavailableError } from '../assets/snakkie/inference.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const routes = ['snakkie/index.html', 'de/snakkie/index.html'];

test('both direct routes are noindex, have reciprocal language links and resolve local assets', () => {
  routes.forEach((route, i) => {
    const html = read(route);
    assert.match(html, new RegExp(`<html lang="${i ? 'de' : 'en'}">`));
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.ok(html.includes(`rel="canonical" href="https://www.dennishilk.com/${i ? 'de/' : ''}snakkie/"`));
    for (const lang of ['en','de']) assert.ok(html.includes(`hreflang="${lang}" href="https://www.dennishilk.com/${lang === 'de' ? 'de/' : ''}snakkie/"`));
    for (const [, attr, target] of html.matchAll(/\b(src|href)="(\/[^"#?]*)(?:\?[^"#]*)?(?:#[^"]*)?"/g)) {
      const file = target.endsWith('/') ? target.slice(1) + 'index.html' : target.slice(1);
      assert.ok(existsSync(new URL(file, root)), `${attr} missing: ${target}`);
    }
    assert.doesNotMatch(html, /<(?:script|img)[^>]*src="https?:|<link[^>]*rel="stylesheet"[^>]*href="https?:/);
    assert.match(html, /<textarea[^>]*maxlength="500"[^>]*disabled>/);
    assert.match(html, /<noscript>/);
  });
});

test('preview fails closed instead of generating an answer', async () => {
  assert.equal(previewAdapter.capabilities.inference, false);
  await assert.rejects(async () => {
    for await (const event of previewAdapter.generate({ messages: [{role:'user',content:'Moin'}], language:'de' })) {
      assert.fail(`unexpected answer: ${JSON.stringify(event)}`);
    }
  }, InferenceUnavailableError);
  for (const file of ['ui.mjs','inference.mjs','words.mjs']) {
    assert.doesNotMatch(read(`assets/snakkie/${file}`), /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|innerHTML/);
  }
});

test('curated examples wrap manually and retain evidence and regional limits', () => {
  assert.equal(wordAt(-1), words.at(-1));
  assert.equal(wordAt(words.length), words[0]);
  for (const word of words) {
    for (const key of ['word','de','en','example','exampleDe','exampleEn','noteDe','noteEn','source','checked','region']) assert.ok(word[key]);
    assert.equal(new URL(word.source).hostname, 'www.platt-wb.de');
    assert.equal(word.audio, null);
  }
  assert.match(words[1].noteDe, /Wiesmoor.*noch nicht.*geprüft/);
  assert.doesNotMatch(read('assets/snakkie/words.mjs'), /new Date|Date\.now|Math\.random/);
});

test('no existing public page, RSS feed or sitemap advertises Snakkie', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], {cwd:root, encoding:'utf8'}).split('\0');
  for (const path of tracked.filter(path => /\.(?:html|xml|json|js)$/.test(path) && !/^(?:de\/)?snakkie\//.test(path) && !path.startsWith('assets/snakkie/'))) {
    assert.doesNotMatch(read(path), /(?:href|url|loc)[^\n]{0,12}["'>]?(?:https:\/\/www\.dennishilk\.com)?\/(?:de\/)?snakkie\//i, path);
  }
});

test('the existing sitemap generator excludes both noindex routes after regeneration', t => {
  const fixture = mkdtempSync(join(tmpdir(), 'snakkie-sitemap-'));
  t.after(() => rmSync(fixture, {recursive:true,force:true}));
  const copy = path => {
    mkdirSync(join(fixture, path, '..'), {recursive:true});
    copyFileSync(new URL(path, root), join(fixture, path));
  };
  for (const path of [...routes, 'scripts/sync-seo.mjs','scripts/hardware-integration.mjs','scripts/gaming-integration.mjs']) copy(path);
  execFileSync(process.execPath, ['scripts/sync-seo.mjs', '--sitemaps-only'], {cwd:fixture});
  for (const file of readdirSync(fixture).filter(name => /^sitemap.*\.xml$/.test(name))) {
    assert.doesNotMatch(readFileSync(join(fixture,file),'utf8'), /\/(?:de\/)?snakkie\//);
  }
});
