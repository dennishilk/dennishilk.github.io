const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'world-observer', 'wiesmoor-peatland.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const script = html.match(/<script>\s*\(\(\) => \{([\s\S]*?)\}\)\(\);\s*<\/script>/)[0].replace(/^<script>/, '').replace(/<\/script>$/, '');

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, '');
}

function element() {
  let htmlValue = '';
  let textValue = '';
  return {
    hidden: false,
    className: '',
    classList: { remove() {}, add() {} },
    get innerHTML() { return htmlValue; },
    set innerHTML(value) { htmlValue = String(value); textValue = stripTags(value); },
    get textContent() { return textValue; },
    set textContent(value) { textValue = String(value); htmlValue = String(value); },
  };
}

async function render(payload) {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
  };
  const fetch = async (url) => String(url).includes('wiesmoor-peatland.json')
    ? { ok: true, json: async () => payload }
    : { ok: false, json: async () => null };
  const context = vm.createContext({ document, fetch, console, Intl, Date, Number, String, Math, Array, Boolean, Set, RegExp });
  vm.runInContext(script, context);
  await new Promise((resolve) => setImmediate(resolve));
  return {
    text: (id) => String(elements.get(id)?.textContent || ''),
    html: (id) => String(elements.get(id)?.innerHTML || ''),
    element: (id) => elements.get(id),
    allText: () => Array.from(elements.values()).map((el) => `${el.textContent} ${el.innerHTML}`).join('\n'),
  };
}

const richPeatContext = {
  area_name: 'Wiesmoor-Nord / Wiesmoor peatland landscape',
  context_status: 'static_source_backed_context_not_live',
  data_status: 'static_context_only',
  moor_type_context: 'MoorIS/NLWKN place Wiesmoor-Nord in the East Frisian central raised-bog (Hochmoor) landscape.',
  land_use_history: 'MoorIS describes Wiesmoor as shaped by peat-fired power generation, horticulture, settlement roads along canals, agriculture and tourism.',
  drainage_context: 'MoorIS notes canals cross the moor and serve moor drainage.',
  restoration_or_management_context: 'NLWKN describes the nearby state-owned Wiesmoor-Klinge protected area northwest of Wiesmoor as rewetted; this is supporting local context, not a numeric Wiesmoor-Nord measurement.',
  reproducibility_note: 'The observer embeds concise summaries from official MoorIS/NLWKN pages. Re-running the observer does not fetch MoorIS.',
  source_name: 'MoorIS Niedersachsen / NLWKN Moorschutzprogramm entry 377 Wiesmoor-Nord',
  source_url: 'https://mooris-niedersachsen.de/?pgId=585',
  peat_thickness_context: {
    status: 'numeric_value_unavailable',
    value: null,
    unit: null,
  },
  wiesmoor_nord: {
    page_or_dataset_identifier: 'MoorIS page pgId=585; Moorschutzprogramm area 377 Wiesmoor-Nord',
    unavailable_numeric_fields: ['peat_thickness', 'mapped_area'],
  },
};

function payload(peat_context = richPeatContext) {
  return {
    status: 'ok',
    data_status: 'partial',
    collected_at_utc: '2026-07-10T06:07:46Z',
    location: { municipality: 'Wiesmoor', state: 'Lower Saxony', country: 'Germany' },
    peat_context,
    peatland_hydrological_pressure: { value: 'normal', confidence: 'medium', limitations: ['Regional proxy observation — not an in-situ peat water-table sensor.'] },
    weather_pressure: { latest_precipitation_mm: 0, rainfall_7d_mm: 13.7, rainfall_30d_mm: 70.1, dry_days_7d: 3, dry_days_30d: 15, consecutive_dry_days: 1, temperature_c: 16.5, temperature_mean_7d_c: 16.6, temperature_mean_30d_c: 17.5, data_status: 'ok', source: { name: 'Deutscher Wetterdienst (DWD) Climate Data Center', dataset: 'Recent daily climate observations Germany' } },
    regional_soil_water: { latest_value: 89.5, unit: '‰ nFK', latest_date: '2026-07-08', trend: 'unavailable', data_status: 'ok', spatial_resolution_km: 1, source: { name: 'Deutscher Wetterdienst (DWD) Climate Data Center', dataset: 'Daily grids of mean soil moisture under grass' } },
    groundwater_proxy: { data_status: 'ok', interpretation_note: 'Nearby groundwater stations can indicate regional groundwater behaviour but are not an in-situ peat water-table sensor for Wiesmoor-Nord.', stations: [{ station_name: 'Remels', latest_value: 3.96, latest_value_unit: 'm', latest_date: '10.07.2026', status_category: 'normal' }] },
  };
}



function normalizeCss(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function classForHeading(headingText) {
  const escaped = headingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<article class="([^"]+)">\\s*<h2(?: id="[^"]+")?>${escaped}</h2>`));
  return match?.[1] || '';
}

function cardHeadingOrder() {
  return Array.from(html.matchAll(/<article class="[^"]+">\s*<h2(?: id="[^"]+")?>([^<]+)<\/h2>/g)).map((match) => match[1]);
}

const expectedObservationLimits = [
  'Regional proxy observation — not an in-situ peat water-table sensor.',
  'No peat-water-table depth is measured or inferred.',
  'NLWKN groundwater stations are regional groundwater proxies; station distance and local hydrogeological representativeness are uncertain.',
  'DWD gridded soil moisture under grass is a regional model product for the 0-60 cm layer and is not converted to peat water-table depth.',
  'DWD weather pressure comes from the selected nearby daily climate station; station distance and weather gradients limit site representativeness.',
  'Copernicus SWI metadata-only and MoorIS static context are not used as live pressure signals.',
];

function cardHtml(headingText) {
  const escaped = headingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<article class="[^"]+">\\s*<h2(?: id="[^"]+")?>${escaped}<\\/h2>([\\s\\S]*?)<\\/article>`));
  return match?.[0] || '';
}

function cardLabels(headingText) {
  return Array.from(cardHtml(headingText).matchAll(/<span>([^<]+)<\/span>/g)).map((match) => match[1]);
}

test('desktop peatland main grid is deterministic two-column row layout', () => {
  const compactCss = normalizeCss(css);
  assert.match(compactCss, /\.peatland-grid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(compactCss, /grid-template-areas: "pressure context" "weather right-stack" "limits limits"/);
  assert.match(css, /\.peatland-main-card \{[\s\S]*grid-area: pressure/);
  assert.match(css, /\.peatland-context-card \{ grid-area: context; \}/);
  assert.match(css, /\.peatland-weather-card \{ grid-area: weather; \}/);
  assert.match(css, /\.peatland-right-stack \{[\s\S]*grid-area: right-stack/);
  assert.match(css, /\.peatland-soil-card,\n\.peatland-groundwater-card \{ min-width: 0; \}/);
  assert.match(css, /\.peatland-limits-card \{ grid-area: limits; \}/);
});

test('desktop row placement classes match the approved card order', () => {
  assert.match(classForHeading('HYDROLOGICAL PRESSURE'), /peatland-main-card/);
  assert.match(classForHeading('PEAT CONTEXT \/ WIESMOOR-NORD'), /peatland-context-card/);
  assert.match(classForHeading('WEATHER PRESSURE \/ DWD DAILY CLIMATE'), /peatland-weather-card/);
  assert.match(classForHeading('REGIONAL SOIL WATER \/ DWD SOIL MOISTURE \/ 0–60 CM'), /peatland-soil-card/);
  assert.match(classForHeading('GROUNDWATER PROXY \/ NLWKN'), /peatland-groundwater-card/);
  assert.match(classForHeading('OBSERVATION LIMITS'), /peatland-limits-card/);
});

test('desktop row two places weather left and soil plus groundwater stacked right', () => {
  const compactCss = normalizeCss(css);
  assert.match(compactCss, /grid-template-areas: "pressure context" "weather right-stack" "limits limits"/);
  assert.doesNotMatch(compactCss, /"groundwater groundwater"|"weather soil"/);
  assert.match(compactCss, /\.peatland-right-stack \{ grid-area: right-stack; display: grid; gap: var\(--space-md, 1rem\); align-content: start; \}/);
  assert.match(html, /<div class="peatland-right-stack">[\s\S]*REGIONAL SOIL WATER \/ DWD SOIL MOISTURE \/ 0–60 CM[\s\S]*GROUNDWATER PROXY \/ NLWKN[\s\S]*<\/div>\s*<article class="traffic-card peatland-limits-card">/);
  assert.match(compactCss, /\.peatland-detail-page \.peatland-groundwater-metrics \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(html, /class="weather-metric-list two peatland-groundwater-metrics"/);
});

test('mobile peatland grid stacks in the approved card order', () => {
  const compactCss = normalizeCss(css);
  assert.match(compactCss, /@media \(max-width: 720px\)/);
  assert.match(compactCss, /grid-template-columns: 1fr; grid-template-areas: "pressure" "context" "weather" "right-stack" "limits"/);
  assert.deepEqual(cardHeadingOrder(), [
    'HYDROLOGICAL PRESSURE',
    'PEAT CONTEXT / WIESMOOR-NORD',
    'WEATHER PRESSURE / DWD DAILY CLIMATE',
    'REGIONAL SOIL WATER / DWD SOIL MOISTURE / 0–60 CM',
    'GROUNDWATER PROXY / NLWKN',
    'OBSERVATION LIMITS',
  ]);
});

test('layout cleanup preserves approved visible labels and initial values', () => {
  const visible = stripTags(html.match(/<section class="weather-grid peatland-grid">([\s\S]*?)<\/section>/)[1]).replace(/\s+/g, ' ').trim();
  for (const expected of [
    'HYDROLOGICAL PRESSURE', 'Confidence', 'Data status', 'Regional proxy observation — not an in-situ peat water-table sensor.',
    'PEAT CONTEXT / WIESMOOR-NORD', 'WEATHER PRESSURE / DWD DAILY CLIMATE', 'Latest rain', '7-day rainfall', '30-day rainfall',
    'Dry days 7 / 30', 'Dry streak', 'Temperature latest / 7d / 30d',
    'REGIONAL SOIL WATER / DWD SOIL MOISTURE / 0–60 CM', 'Latest value', 'Latest date', 'Resolution', 'Status',
    'GROUNDWATER PROXY / NLWKN', 'Station', 'candidate source pending', 'OBSERVATION LIMITS',
  ]) assert.match(visible, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(visible, /placeholder|sample value/i);
});



test('observation limits card is unique full-width after the Weather Soil Groundwater section', () => {
  assert.equal((html.match(/<h2>OBSERVATION LIMITS<\/h2>/g) || []).length, 1);
  assert.ok(html.indexOf('WEATHER PRESSURE / DWD DAILY CLIMATE') < html.indexOf('OBSERVATION LIMITS'));
  assert.ok(html.indexOf('REGIONAL SOIL WATER / DWD SOIL MOISTURE / 0–60 CM') < html.indexOf('OBSERVATION LIMITS'));
  assert.ok(html.indexOf('GROUNDWATER PROXY / NLWKN') < html.indexOf('OBSERVATION LIMITS'));
  assert.match(html, /<\/div>\s*<article class="traffic-card peatland-limits-card">\s*<h2>OBSERVATION LIMITS<\/h2>/);
  const compactCss = normalizeCss(css);
  assert.match(compactCss, /grid-template-areas: "pressure context" "weather right-stack" "limits limits"/);
  assert.match(css, /\.peatland-limits-card \{ grid-area: limits; \}/);
});

test('observation limits bullets remain unchanged and in the same order', () => {
  const limitsCard = cardHtml('OBSERVATION LIMITS');
  const bullets = Array.from(limitsCard.matchAll(/<li>([^<]+)<\/li>/g)).map((match) => match[1]);
  assert.deepEqual(bullets, expectedObservationLimits);
});

test('soil water renders exactly four tiles in the approved 2x2 order without Trend', async () => {
  assert.deepEqual(cardLabels('REGIONAL SOIL WATER / DWD SOIL MOISTURE / 0–60 CM'), ['Latest value', 'Latest date', 'Resolution', 'Status']);
  assert.doesNotMatch(cardHtml('REGIONAL SOIL WATER / DWD SOIL MOISTURE / 0–60 CM'), /Trend/);
  const page = await render(payload());
  assert.equal(page.text('soil-status'), 'ok');
  assert.doesNotMatch(page.allText(), /Trend/);
});

test('soil status uses regional soil water data_status and falls back defensively unless ok', async () => {
  const notOk = await render({ ...payload(), regional_soil_water: { ...payload().regional_soil_water, data_status: 'partial' } });
  assert.equal(notOk.text('soil-status'), 'not yet live-ingested');
  const missing = await render({ ...payload(), regional_soil_water: { ...payload().regional_soil_water, data_status: undefined } });
  assert.equal(missing.text('soil-status'), 'not yet live-ingested');
});

test('weather status ok tile is not visibly rendered while remaining weather metrics stay visible', async () => {
  const visible = stripTags(html.match(/<article class="traffic-card peatland-weather-card">([\s\S]*?)<\/article>/)[1]).replace(/\s+/g, ' ').trim();
  assert.doesNotMatch(visible, /Status\s*not yet live-ingested|Status\s*ok/);
  assert.doesNotMatch(html, /id="weather-pressure-status"/);
  for (const expected of ['Latest rain', '7-day rainfall', '30-day rainfall', 'Dry days 7 / 30', 'Dry streak', 'Temperature latest / 7d / 30d']) {
    assert.match(visible, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const page = await render(payload());
  assert.equal(page.text('latest-precipitation'), '0 mm');
  assert.equal(page.text('rainfall-7d'), '13,7 mm');
  assert.equal(page.text('rainfall-30d'), '70,1 mm');
  assert.equal(page.text('dry-days-summary'), '3 / 15');
  assert.equal(page.text('consecutive-dry-days'), '1 day');
  assert.equal(page.text('temperature'), '16,5 °C / 16,6 °C / 17,5 °C');
});

test('healthy observer status badge uses green ok class while partial data status remains separate', async () => {
  const page = await render(payload());
  assert.equal(page.text('peatland-status'), 'ACTIVE · OK');
  assert.match(page.element('peatland-status').className, /status-badge ok/);
  assert.equal(page.text('pressure-data-status'), 'partial');
});

test('soil trend pending is not visibly rendered when no real trend exists', async () => {
  const page = await render(payload());
  assert.doesNotMatch(page.allText(), /Trendpending|Trend: pending|pending.*Trend/i);
  assert.equal(page.text('soil-value'), '89,5 ‰ nFK');
  assert.equal(page.text('soil-date'), '2026-07-08');
  assert.equal(page.text('soil-resolution'), '1 km');
  assert.equal(page.text('soil-status'), 'ok');
});

test('peat context layout stays compact without stretching the pressure card', () => {
  assert.match(css, /\.peatland-detail-page \.peat-context-facts \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.peatland-detail-page \.peat-context-tile \{[\s\S]*border: 1px solid rgba\(0, 180, 255,/);
  assert.match(css, /\.peatland-primary-status \{[\s\S]*min-height: 150px/);
  assert.doesNotMatch(css, /\.peatland-primary-status \{[\s\S]*min-height: (?:2\d\d|[3-9]\d\d)px/);
});

test('rich peat_context renders compact sourced context instead of generic pending copy', async () => {
  const page = await render(payload());
  assert.equal(page.text('peat-context-note'), '');
  assert.equal(page.element('peat-context-note').hidden, true);
  assert.doesNotMatch(page.allText(), /Peat context pending\.|Peat thickness pending/);
  assert.match(page.text('peat-context-facts'), /AreaWiesmoor-Nord/);
  assert.match(page.html('peat-context-facts'), /href="https:\/\/mooris-niedersachsen\.de\/\?pgId=585"/);
  assert.match(page.text('peat-context-facts'), /SourceMoorIS \/ NLWKN/);
  assert.doesNotMatch(page.text('peat-context-facts'), /MoorIS Niedersachsen \/ NLWKN Moorschutzprogramm entry 377 Wiesmoor-Nord/);
  assert.equal((page.html('peat-context-facts').match(/peat-context-tile/g) || []).length, 6);
  assert.equal(page.text('peat-dataset-line'), 'MoorIS pgId 585 · Moorschutzprogramm area 377');
  assert.equal(page.text('peat-source-status-line'), '');
  assert.equal(page.element('peat-source-status-line').hidden, true);
  assert.doesNotMatch(page.text('peat-context-facts'), /Dataset \/ entry|Context status/);
});

test('peat context renders exact six-tile hierarchy without unavailable thickness placeholder', async () => {
  const page = await render(payload());
  const facts = page.text('peat-context-facts');
  const labels = Array.from(page.html('peat-context-facts').matchAll(/<span>([^<]+)<\/span>/g)).map((match) => match[1]);
  assert.deepEqual(labels, ['Area', 'Moor type', 'Historical use', 'Drainage', 'Source', 'Context']);
  assert.match(facts, /AreaWiesmoor-Nord/);
  assert.match(facts, /Moor typeRaised bog/);
  assert.doesNotMatch(facts, /Raised bog context/);
  assert.match(facts, /DrainageCanal \/ road network/);
  assert.match(facts, /Historical usePeat \/ horticulture/);
  assert.match(facts, /ContextStatic · not live/);
  assert.doesNotMatch(facts, /East Frisian central raised-bog|canals cross the moor and serve moor drainage|peat-fired power generation/);
  assert.doesNotMatch(facts, /Peat thickness|numeric value unavailable/);
  assert.doesNotMatch(facts, /\b\d+(?:\.\d+)?\s*(?:m|cm)\b.*Peat thickness/i);
});

test('nearby restoration context is kept as nearby supporting context', async () => {
  const page = await render(payload());
  assert.equal(page.text('peat-management-note'), 'Nearby restoration context only; not a Wiesmoor-Nord measurement.');
  assert.doesNotMatch(page.text('peat-management-note'), /all Wiesmoor-Nord/i);
});


test('verbose source-backed context is not dumped into the visible peat card', async () => {
  const page = await render(payload());
  const visiblePeatText = [
    page.text('peat-context-note'),
    page.text('peat-context-facts'),
    page.text('peat-management-note'),
    page.text('peat-dataset-line'),
    page.text('peat-source-status-line'),
  ].join(' ');
  assert.equal(page.text('peat-source-status-line'), '');
  assert.doesNotMatch(visiblePeatText, /MoorIS\/NLWKN place Wiesmoor-Nord in the East Frisian central raised-bog/);
  assert.doesNotMatch(visiblePeatText, /MoorIS describes Wiesmoor as shaped by peat-fired power generation/);
  assert.doesNotMatch(visiblePeatText, /MoorIS notes canals cross the moor and serve moor drainage/);
  assert.doesNotMatch(visiblePeatText, /https?:\/\//);
});

test('raw null undefined and object strings never render', async () => {
  const page = await render(payload({
    ...richPeatContext,
    area_name: null,
    context_note: undefined,
    source_name: { bad: true },
    land_use_history: { bad: true },
  }));
  assert.doesNotMatch(page.allText(), /\bnull\b|undefined|\[object Object\]/);
});

test('graceful fallback remains when peat_context is absent', async () => {
  const page = await render(payload(null));
  assert.equal(page.text('peat-context-note'), 'Peat context unavailable in the current JSON.');
  assert.doesNotMatch(page.text('peat-context-facts'), /Peat thickness|numeric value unavailable/);
});

test('existing pressure weather soil and groundwater rendering stays intact', async () => {
  const page = await render(payload());
  assert.equal(page.text('pressure-value'), 'normal');
  assert.equal(page.text('pressure-confidence'), 'medium');
  assert.equal(page.text('latest-precipitation'), '0 mm');
  assert.equal(page.text('rainfall-7d'), '13,7 mm');
  assert.equal(page.text('soil-value'), '89,5 ‰ nFK');
  assert.equal(page.text('soil-status'), 'ok');
  assert.equal(page.text('groundwater-station'), 'Remels');
  assert.equal(page.text('groundwater-value'), '4 m');
});
