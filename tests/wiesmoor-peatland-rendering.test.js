const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'world-observer', 'wiesmoor-peatland.html'), 'utf8');
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
    regional_soil_water: { latest_value: 89.5, unit: '‰ nFK', latest_date: '2026-07-08', trend: 'unavailable', spatial_resolution_km: 1, source: { name: 'Deutscher Wetterdienst (DWD) Climate Data Center', dataset: 'Daily grids of mean soil moisture under grass' } },
    groundwater_proxy: { data_status: 'ok', interpretation_note: 'Nearby groundwater stations can indicate regional groundwater behaviour but are not an in-situ peat water-table sensor for Wiesmoor-Nord.', stations: [{ station_name: 'Remels', latest_value: 3.96, latest_value_unit: 'm', latest_date: '10.07.2026', status_category: 'normal' }] },
  };
}

test('rich peat_context renders compact sourced context instead of generic pending copy', async () => {
  const page = await render(payload());
  assert.equal(page.text('peat-context-note'), 'Compact source-backed static context for Wiesmoor-Nord.');
  assert.doesNotMatch(page.allText(), /Peat context pending\.|Peat thickness pending/);
  assert.match(page.text('peat-context-facts'), /AreaWiesmoor-Nord/);
  assert.match(page.html('peat-context-facts'), /href="https:\/\/mooris-niedersachsen\.de\/\?pgId=585"/);
  assert.match(page.text('peat-context-facts'), /SourceMoorIS \/ NLWKN/);
  assert.doesNotMatch(page.text('peat-context-facts'), /MoorIS Niedersachsen \/ NLWKN Moorschutzprogramm entry 377 Wiesmoor-Nord/);
  assert.match(page.text('peat-context-facts'), /MoorIS page pgId=585; Moorschutzprogramm area 377 Wiesmoor-Nord/);
});

test('moor type, drainage, historical use, and unavailable thickness render as compact labels without fabricated numbers', async () => {
  const page = await render(payload());
  const facts = page.text('peat-context-facts');
  assert.match(facts, /Moor typeRaised bog context/);
  assert.match(facts, /DrainageCanal \/ road network/);
  assert.match(facts, /Historical usePeat \/ horticulture/);
  assert.doesNotMatch(facts, /East Frisian central raised-bog|canals cross the moor and serve moor drainage|peat-fired power generation/);
  assert.match(facts, /numeric value unavailable/);
  assert.doesNotMatch(facts, /\b\d+(?:\.\d+)?\s*(?:m|cm)\b.*Peat thickness/i);
});

test('nearby restoration context is kept as nearby supporting context', async () => {
  const page = await render(payload());
  assert.equal(page.text('peat-management-note'), 'Nearby restoration context only; not a numeric Wiesmoor-Nord measurement.');
  assert.doesNotMatch(page.text('peat-management-note'), /all Wiesmoor-Nord/i);
});


test('verbose source-backed context is not dumped into the visible peat card', async () => {
  const page = await render(payload());
  const visiblePeatText = [
    page.text('peat-context-note'),
    page.text('peat-context-facts'),
    page.text('peat-management-note'),
    page.text('peat-methodology-note'),
  ].join(' ');
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
  assert.match(page.text('peat-context-facts'), /Peat thicknessnumeric value unavailable/);
});

test('existing pressure weather soil and groundwater rendering stays intact', async () => {
  const page = await render(payload());
  assert.equal(page.text('pressure-value'), 'normal');
  assert.equal(page.text('pressure-confidence'), 'medium');
  assert.equal(page.text('latest-precipitation'), '0 mm');
  assert.equal(page.text('rainfall-7d'), '13.7 mm');
  assert.equal(page.text('soil-value'), '89.5 ‰ nFK');
  assert.equal(page.text('groundwater-station'), 'Remels');
  assert.equal(page.text('groundwater-value'), '4 m');
});
