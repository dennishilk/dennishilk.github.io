const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const slugs = [
  'wiesmoor-population',
  'wiesmoor-energy',
  'wiesmoor-groundwater',
  'wiesmoor-development',
  'wiesmoor-finance',
];
const allHometownPaths = [
  '/world-observer/wiesmoor-weather.html',
  '/world-observer/wiesmoor-peatland.html',
  '/world-observer/wiesmoor-sky.html',
  '/world-observer/east-frisia-water.html',
  '/world-observer/horizon-observer.html',
  ...slugs.map(slug => `/world-observer/${slug}.html`),
];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function hometownRows(html) {
  return Array.from(html.matchAll(/<div class="[^"]*hometown-observer-row[^"]*"[^>]*>([\s\S]*?)<\/div>/g), match => match[1]);
}

test('English and German Hometown pages contain two matching rows of five cards', () => {
  for (const relative of ['world-observer/hometown.html', 'de/world-observer/hometown.html']) {
    const html = read(relative);
    const rows = hometownRows(html);
    assert.equal(rows.length, 2, `${relative} row count`);
    assert.deepEqual(rows.map(row => (row.match(/hometown-observer-card/g) || []).length), [5, 5]);
    const links = Array.from(html.matchAll(/class="[^"]*hometown-observer-card[^"]*" href="([^"]+)"/g), match => match[1]);
    assert.equal(links.length, 10);
    assert.deepEqual(new Set(links), new Set(allHometownPaths));
    for (const href of links) {
      assert.equal(fs.existsSync(path.join(root, href.replace(/^\//, ''))), true, `${href} exists`);
    }
  }
});

test('all five detail pages have unique SEO, accessible status, and exact data binding', () => {
  for (const slug of slugs) {
    const html = read(`world-observer/${slug}.html`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://dennishilk\\.com/world-observer/${slug}\\.html">`));
    assert.match(html, /<meta name="description" content="[^"]+">/);
    assert.match(html, /<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"Dataset"/);
    assert.match(html, new RegExp(`data-public-observer="${slug}"`));
    assert.match(html, /id="observer-status"[^>]*aria-live="polite"/);
    assert.match(html, /id="key-metrics"[^>]*aria-live="polite"/);
    assert.match(html, /wiesmoor-public-observers\.css/);
    assert.match(html, /wiesmoor-public-observers\.js/);
    assert.match(html, new RegExp(`dashboard/latest/${slug}\\.json`));
    assert.match(html, /METHODOLOGY &amp; LIMITS/);
    assert.match(html, /<h2>SOURCES<\/h2>/);
  }
});

test('shared renderer supports every observer and honest unavailable states', () => {
  const script = read('world-observer/wiesmoor-public-observers.js');
  for (const slug of slugs) assert.match(script, new RegExp(`"${slug}"`));
  assert.match(script, /No substitute value is fabricated/);
  assert.match(script, /Update cadence/);
  assert.match(script, /MutationObserver/);
  assert.match(script, /aria-label/);
  assert.doesNotMatch(script, /EinheitMastrNummer|NameStromerzeugungseinheit|Anlagenbetreiber|Strasse/);
  assert.match(script, /Installed capacity is not production/);
  assert.match(script, /project stages are not inferred|stage not inferred/i);
  assert.match(script, /ACTUAL, PLAN, and FORECAST are kept strictly separate/);
});

test('German translation bundle covers every new detail route', () => {
  const translations = read('site-i18n-de-wiesmoor.js');
  for (const slug of slugs) {
    assert.match(translations, new RegExp(`addPage\\("/world-observer/${slug}\\.html"`));
  }
  assert.match(translations, /IST, PLAN und PROGNOSE/);
  assert.match(translations, /Regionale Referenzmessstelle/);
  assert.match(translations, /keine Live-Bevölkerung geschätzt/);
});

test('responsive stylesheet covers desktop, tablet, and narrow mobile layouts', () => {
  const css = read('world-observer/wiesmoor-public-observers.css');
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  const globalCss = read('style.css');
  assert.match(globalCss, /\.hometown-observer-row \{ grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
});

test('sitemap exposes all five new observer detail pages', () => {
  const sitemap = read('sitemap.xml');
  for (const slug of slugs) {
    assert.match(sitemap, new RegExp(`https://dennishilk\\.com/world-observer/${slug}\\.html`));
  }
});

test('published energy JSON contains aggregates only when snapshot is present', () => {
  const snapshotPath = path.join(root, 'world-observer', 'dashboard', 'latest', 'wiesmoor-energy.json');
  if (!fs.existsSync(snapshotPath)) return;
  const payload = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const encoded = JSON.stringify(payload);
  assert.equal(payload.privacy.unit_records_published, false);
  assert.equal(payload.privacy.addresses_published, false);
  for (const forbidden of ['EinheitMastrNummer', 'NameStromerzeugungseinheit', 'Anlagenbetreiber', 'Strasse']) {
    assert.doesNotMatch(encoded, new RegExp(forbidden));
  }
});
