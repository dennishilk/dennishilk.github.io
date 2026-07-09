const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'world-observer', 'wiesmoor-weather.html'), 'utf8');
const script = html.match(/<script>\s*\(\(\) => \{([\s\S]*?)\}\)\(\);\s*<\/script>/)[0].replace(/^<script>/, '').replace(/<\/script>$/, '');

function element() {
  return {
    textContent: '',
    innerHTML: '',
    hidden: false,
    className: '',
    classList: { remove() {}, add() {} },
  };
}

async function render({ raw, env }) {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
  };
  const fetch = async (url) => {
    if (String(url).includes('environment.json')) return { ok: true, status: 200, json: async () => env };
    if (String(url).includes('wiesmoor-weather.json')) return { ok: true, status: 200, json: async () => raw };
    return { ok: false, status: 404, json: async () => null };
  };
  const context = vm.createContext({ document, fetch, console, Intl, Date, Number, String, Math, Array, Boolean, Set, RegExp });
  vm.runInContext(script, context);
  await new Promise((resolve) => setImmediate(resolve));
  return (id) => String(elements.get(id)?.textContent);
}

const populatedRaw = {
  status: 'ok',
  data_status: 'ok',
  current: { time: '2026-07-09T12:00', temperature_2m: 19.7, wind_speed_10m: 8, wind_gusts_10m: 18 },
  hourly: { time: ['2026-07-09T12:00', '2026-07-09T13:00'], temperature_2m: [19.7, 20.1], wind_gusts_10m: [18, 20] },
  daily: { time: ['2026-07-09'], temperature_2m_min: [12], temperature_2m_max: [22] },
  diagnostics: { http_status: 200 },
};

function envWith(dataStatus, status = dataStatus) {
  return { observers: [{ observer: 'wiesmoor-weather', data_status: dataStatus, status, last_seen_date: '2026-07-09' }] };
}

test('raw populated Wiesmoor payload controls diagnostics data status over unavailable dashboard summary', async () => {
  const $ = await render({ raw: populatedRaw, env: envWith('unavailable') });
  assert.equal($('weather-status'), 'STATUS: OK');
  assert.equal($('data-status'), 'ok');
  assert.equal($('http-status'), '200');
});

test('raw stale/degraded Wiesmoor payload controls diagnostics data status over dashboard summary', async (t) => {
  for (const state of ['stale', 'degraded']) {
    await t.test(state, async () => {
      const $ = await render({ raw: { ...populatedRaw, status: state, data_status: state }, env: envWith(state === 'stale' ? 'ok' : 'unavailable') });
      assert.equal($('weather-status'), `STATUS: ${state.toUpperCase()}`);
      assert.equal($('data-status'), state);
      assert.equal($('http-status'), '200');
    });
  }
});
