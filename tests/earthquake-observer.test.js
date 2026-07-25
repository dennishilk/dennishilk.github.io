const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'world-observer/earthquake-observer.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'world-observer/earthquake-observer.js'), 'utf8')
  .replace(/^import .*;$/m, '')
  .replace(/\bexport\s+/g, '')
  .replace(/\ninitialize\(\);\s*$/, '\n');
const currentExport = JSON.parse(fs.readFileSync(path.join(root, 'world-observer/dashboard/latest/earthquake-observer.json'), 'utf8'));

function fakeElement(id = '') {
  const listeners = {};
  const attributes = {};
  return {
    id, listeners, attributes, children: [], style: {}, className: '', textContent: '',
    classList: { values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); }, toggle(value, force) { if (force) this.values.add(value); else this.values.delete(value); } },
    addEventListener(name, callback) { listeners[name] = callback; },
    click() { listeners.click?.({ preventDefault() {} }); },
    setAttribute(name, value) { attributes[name] = String(value); },
    replaceChildren(...children) { this.children = children; this.textContent = children.map((child) => child.textContent).join(' '); },
    getBoundingClientRect() { return { left: 100, top: 80, width: id === 'earthquake-tooltip' ? 220 : 14, height: id === 'earthquake-tooltip' ? 140 : 14 }; },
  };
}

function load() {
  const opened = [];
  const document = { createElement: () => fakeElement() };
  const context = vm.createContext({ document, window: { open: (...args) => opened.push(args), addEventListener() {} }, console, Date, Number, Math, Array, String, Error, Set, setTimeout, clearTimeout });
  vm.runInContext(source, context);
  return { context, opened };
}

function completePayload(overrides = {}) {
  return {
    status: 'partial', data_status: 'partial', collected_at: '2026-07-25T14:54:08Z',
    diagnostics: { http_status: 200 }, source: { name: 'USGS Earthquake Hazards Program' },
    window: { label: 'Past 24 hours', start: '2026-07-24T14:53:19Z', end: '2026-07-25T14:53:19Z' },
    events: [{ magnitude: 6, latitude: -13.8, longitude: 167.5, depth_km: 18, place: '82 km W of Sola, Vanuatu', time: '2026-07-25T14:54:00Z', event_url: 'https://earthquake.usgs.gov/earthquakes/eventpage/test-event' }],
    ...overrides,
  };
}

test('complete seismic payload derives LIVE despite optional contextual baseline being unavailable', () => {
  const { context } = load();
  const result = context.deriveStatus(completePayload(), Date.parse('2026-07-25T15:00:00Z'));
  assert.equal(result.label, 'LIVE');
  assert.match(result.message, /1 recorded event/);
});

test('current local export keeps all 215 valid event observations and event-specific links', () => {
  const { context } = load();
  assert.equal(context.validateExport(currentExport).events.length, 215);
  assert.equal(context.deriveStatus(currentExport, Date.parse('2026-07-25T15:00:00Z')).label, 'LIVE');
  assert.ok(currentExport.events.every((event) => event.event_url.includes(`/earthquakes/eventpage/${event.id}`)));
});

test('successful render keeps LIVE status, legend, and every marker after map initialization', async () => {
  const elements = new Map([
    ['earthquake-data-status', fakeElement('earthquake-data-status')],
    ['earthquake-loading-status', fakeElement('earthquake-loading-status')],
    ['earthquake-window', fakeElement('earthquake-window')],
    ['earthquake-latest', fakeElement('earthquake-latest')],
    ['earthquake-largest', fakeElement('earthquake-largest')],
    ['earthquake-count', fakeElement('earthquake-count')],
    ['earthquake-collected', fakeElement('earthquake-collected')],
    ['earthquake-card-latest', fakeElement('earthquake-card-latest')],
    ['earthquake-card-activity', fakeElement('earthquake-card-activity')],
    ['earthquake-card-magnitude', fakeElement('earthquake-card-magnitude')],
    ['earthquake-card-depth', fakeElement('earthquake-card-depth')],
    ['earthquake-card-context', fakeElement('earthquake-card-context')],
    ['earthquake-tooltip', fakeElement('earthquake-tooltip')],
    ['earthquake-map', fakeElement('earthquake-map')],
    ['earthquake-map-caption', fakeElement('earthquake-map-caption')],
  ]);
  elements.get('earthquake-map').getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  const statuses = [];
  const document = {
    createElement: () => fakeElement(),
    getElementById(id) {
      assert.notEqual(id, 'earthquake-map-canvas', 'render must not replace the map canvas or its overlay siblings');
      return elements.get(id);
    },
  };
  const context = vm.createContext({ document, window: { open() {} }, console, Date, Number, Math, Array, String, Error, Set, setTimeout, clearTimeout });
  vm.runInContext(source.replace('status.textContent = label.toUpperCase();', 'status.textContent = label.toUpperCase(); statuses.push(status.textContent);'), context);
  context.statuses = statuses;
  const markers = [];
  const map = {
    layers: { markers: fakeElement('marker-layer') },
    async addMarker() { const marker = fakeElement('marker'); markers.push(marker); return marker; },
  };
  await context.renderExport(currentExport, map);
  assert.deepEqual(statuses, ['LIVE'], 'a successful render must not transition from LIVE to ERROR');
  assert.equal(elements.get('earthquake-data-status').className, 'status-badge live');
  assert.equal(markers.length, 215);
  assert.ok(markers.every((marker) => marker.classList.values.has('earthquake-marker')));
  assert.match(html, /class="earthquake-legend"[\s\S]*id="earthquake-map"/, 'legend is placed before and outside the map');
  assert.doesNotMatch(html, /id="earthquake-map"[^>]*>[\s\S]*class="earthquake-legend"/, 'legend never overlays the map');
});

test('status derivation retains honest partial and error states', () => {
  const { context } = load();
  assert.equal(context.deriveStatus(completePayload({ window: null })).label, 'PARTIAL');
  assert.match(context.deriveStatus(completePayload({ window: null })).message, /observation window/);
  assert.equal(context.deriveStatus(completePayload({ status: 'error' })).label, 'ERROR');
  assert.equal(context.deriveStatus(completePayload({ events: [] })).label, 'ERROR');
});

test('activity classification uses the broader distribution and has no VERY HIGH label', () => {
  const { context } = load();
  const currentShape = [6, ...Array(8).fill(5), ...Array(10).fill(4), ...Array(196).fill(1)].map((magnitude) => ({ magnitude }));
  assert.equal(context.classifyActivity(currentShape).label, 'ELEVATED');
  assert.equal(context.classifyActivity([{ magnitude: 6 }, ...Array(20).fill({ magnitude: 1 })]).label, 'ELEVATED');
  assert.equal(context.classifyActivity(Array(20).fill({ magnitude: 1 })).label, 'LOW');
});

test('marker and tooltip form one interactive hover and focus region', async () => {
  const { context, opened } = load();
  const marker = fakeElement('marker');
  const tooltip = fakeElement('earthquake-tooltip');
  const map = fakeElement('map'); map.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 400 });
  const event = completePayload().events[0];
  context.makeMarkerInteractive(marker, event, tooltip, map);
  assert.equal(typeof marker.listeners.pointerenter, 'function');
  assert.equal(typeof marker.listeners.focus, 'function');
  marker.listeners.pointerenter({ clientX: 590, clientY: 390 });
  assert.match(tooltip.textContent, /M 6\.0/);
  assert.match(tooltip.textContent, /82 km W of Sola, Vanuatu/);
  assert.match(tooltip.textContent, /Depth: 18 km/);
  assert.match(tooltip.textContent, /2026-07-25 14:54 UTC/);
  assert.match(tooltip.textContent, /Open on USGS/);
  const link = tooltip.children.at(-1);
  assert.equal(link.href, event.event_url);
  assert.equal(link.target, '_blank');
  assert.equal(link.rel, 'noopener noreferrer');
  assert.equal(link.className, 'earthquake-tooltip-action');
  assert.equal(opened.length, 0);
  assert.ok(parseFloat(tooltip.style.left) <= 372, 'tooltip is clamped to map width');
  assert.ok(parseFloat(tooltip.style.top) <= 252, 'tooltip is clamped to map height');
  marker.listeners.pointerleave();
  tooltip.listeners.pointerenter();
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(tooltip.attributes['aria-hidden'], 'false', 'entering tooltip keeps it open');
  tooltip.listeners.pointerleave();
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(tooltip.attributes['aria-hidden'], 'true');
  marker.listeners.focus();
  assert.equal(tooltip.attributes['aria-hidden'], 'false');
  marker.listeners.blur();
  tooltip.listeners.focusin();
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(tooltip.attributes['aria-hidden'], 'false', 'tabbing to the tooltip link keeps it open');
  tooltip.listeners.focusout();
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(tooltip.attributes['aria-hidden'], 'true');
  assert.match(marker.attributes['aria-label'], /82 km W of Sola, Vanuatu.*18 kilometres.*UTC/);
});

test('tooltip action delivers a normal left click before any delayed close', async () => {
  const { context } = load();
  const marker = fakeElement('marker'); const tooltip = fakeElement('earthquake-tooltip'); const map = fakeElement('map');
  const event = completePayload().events[0];
  context.makeMarkerInteractive(marker, event, tooltip, map);
  marker.listeners.pointerenter({ clientX: 100, clientY: 100 });
  const action = tooltip.children.at(-1);
  let prevented = false;
  marker.listeners.pointerleave();
  action.listeners.pointerdown();
  action.listeners.click({ preventDefault() { prevented = true; }, button: 0 });
  assert.equal(prevented, false, 'left click must retain native link navigation');
  assert.equal(action.href, event.event_url, 'the action keeps the exact event URL');
  assert.equal(tooltip.attributes['aria-hidden'], 'false', 'the tooltip remains alive while the click is delivered');
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(tooltip.attributes['aria-hidden'], 'false', 'action activation cancels the pending close');
  let spacePrevented = false;
  action.listeners.keydown({ key: ' ', preventDefault() { spacePrevented = true; } });
  assert.equal(spacePrevented, true, 'Space activates the native link');
});

test('visible tooltip wins hit testing and map navigation does not capture its left click', () => {
  const { context } = load();
  const mapContainer = fakeElement('earthquake-map'); const mapCanvas = fakeElement('earthquake-map-canvas'); const svg = fakeElement('map-svg');
  const tooltip = fakeElement('earthquake-tooltip'); const action = fakeElement('tooltip-action');
  action.className = 'earthquake-tooltip-action'; action.href = completePayload().events[0].event_url;
  action.closest = (selector) => selector === '.earthquake-tooltip' ? tooltip : null;
  let captures = 0; mapContainer.setPointerCapture = () => { captures += 1; };
  svg.offsetWidth = 800; svg.offsetHeight = 500;
  mapCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  context.requestAnimationFrame = (callback) => { callback(); return 1; };
  context.createMapNavigation(mapContainer, mapCanvas, svg);

  const document = { elementFromPoint: () => action };
  const hit = document.elementFromPoint(240, 180);
  assert.equal(hit, action, 'browser hit testing must resolve the action above the SVG marker layer');
  mapContainer.listeners.pointerdown({ target: hit, pointerId: 7, button: 0, clientX: 240, clientY: 180 });
  assert.equal(captures, 0, 'the map must not capture a pointer that starts inside the tooltip');
  assert.equal(hit.href, 'https://earthquake.usgs.gov/earthquakes/eventpage/test-event', 'normal left-click navigation keeps the exact event-specific URL');
});

test('marker activation opens exact event-specific USGS URL safely', () => {
  const { context, opened } = load();
  const marker = fakeElement('marker'); const tooltip = fakeElement('earthquake-tooltip'); const map = fakeElement('map');
  context.makeMarkerInteractive(marker, completePayload().events[0], tooltip, map);
  marker.listeners.click({ preventDefault() {} });
  assert.deepEqual(opened[0], ['https://earthquake.usgs.gov/earthquakes/eventpage/test-event', '_blank', 'noopener,noreferrer']);
  marker.listeners.keydown({ key: 'Enter', preventDefault() {} });
  assert.deepEqual(opened[1], ['https://earthquake.usgs.gov/earthquakes/eventpage/test-event', '_blank', 'noopener,noreferrer']);
});

test('zoom, pan, double-click, and pinch navigation remain available without Reset View', () => {
  const { context } = load();
  const mapContainer = fakeElement('earthquake-map'); const mapCanvas = fakeElement('earthquake-map-canvas'); const svg = fakeElement('map-svg');
  mapCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  svg.offsetWidth = 800; svg.offsetHeight = 500;
  const frames = []; context.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  const flushFrame = () => { const callback = frames.shift(); if (callback) callback(); };
  context.createMapNavigation(mapContainer, mapCanvas, svg);
  const initialTransform = svg.style.transform;
  mapContainer.listeners.wheel({ preventDefault() {}, deltaY: -500, clientX: 650, clientY: 150 }); flushFrame();
  mapContainer.listeners.pointerdown({ pointerId: 1, button: 0, clientX: 400, clientY: 250 });
  mapContainer.listeners.pointermove({ pointerId: 1, clientX: 300, clientY: 325 }); mapContainer.listeners.pointerup({ pointerId: 1 }); flushFrame();
  assert.notEqual(svg.style.transform, initialTransform);
  assert.equal(typeof mapContainer.listeners.dblclick, 'function');
  mapContainer.listeners.pointerdown({ pointerId: 1, button: 0, clientX: 300, clientY: 200 });
  mapContainer.listeners.pointerdown({ pointerId: 2, button: 0, clientX: 500, clientY: 300 });
  mapContainer.listeners.pointermove({ pointerId: 2, clientX: 600, clientY: 350 }); flushFrame();
  assert.match(svg.style.transform, /scale\(/);
  assert.doesNotMatch(html, /earthquake-reset-view|>🌍 Reset</);
  assert.doesNotMatch(source, /earthquake-reset-view|resetButton/);
  assert.doesNotMatch(css, /earthquake-reset-view/);
  assert.match(css, /\.earthquake-tooltip\.visible \{[^}]*pointer-events: auto/);
});

test('all six statistic cards use local inline line icons and the complete legend', () => {
  assert.equal((html.match(/class="earthquake-card-icon(?: latest)?"/g) || []).length, 6);
  for (const heading of ['Latest Earthquakes', 'Seismic Activity', 'Magnitude Distribution', 'Depth Distribution', "Today's Context", 'Data Source']) assert.match(html, new RegExp(`<h3>${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h3>`));
  assert.match(html, /USGS Earthquake API/);
  for (const label of ['M ≥ 6.0', 'M 5.0–5.9', 'M 4.0–4.9', 'M 3.0–3.9', 'M 2.0–2.9', 'M &lt; 2.0']) assert.ok(html.includes(label));
  assert.doesNotMatch(html, /font-awesome|cdnjs|unpkg|jsdelivr/i);
});
