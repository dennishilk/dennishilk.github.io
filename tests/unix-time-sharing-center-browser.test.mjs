import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeUnixCenter, startUnixCenter } from '../museum/unix-time-sharing-center/unix-center.js';

const page = await readFile(new URL('../museum/unix-time-sharing-center/index.html', import.meta.url), 'utf8');
const controller = await readFile(new URL('../museum/unix-time-sharing-center/unix-center.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../museum/unix-time-sharing-center/unix-center.css', import.meta.url), 'utf8');

class Events {
  listeners = new Map();
  addEventListener(type, listener, options = {}) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push({ listener, once: Boolean(options.once) });
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter(item => item.listener !== listener));
  }
  dispatch(type, event = {}) {
    for (const item of [...(this.listeners.get(type) ?? [])]) {
      item.listener(event);
      if (item.once) this.removeEventListener(type, item.listener);
    }
  }
}

class Element extends Events {
  constructor(doc) { super(); this.doc = doc; this.ownerDocument = doc; this.value = ''; this.textContent = ''; this.children = []; this.selectionStart = 0; this.selectionEnd = 0; this.scrollHeight = 0; this.scrollTop = 0; this.clientHeight = 100; this.style = { setProperty() {} }; this.classList = { add() {}, remove() {} }; }
  focus(options) { this.focusOptions = options; this.doc.activeElement = this; this.dispatch('focus', { target: this }); }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  replaceChildren(...children) { this.children = children; this.textContent = children.map(child => child.textContent ?? '').join(''); }
  append(...children) { this.children.push(...children); this.textContent += children.map(child => child.textContent ?? '').join(''); }
  prepend() {}
  setAttribute() {}
  querySelector() { return null; }
  scrollTo() {}
}

function interactiveHarness() {
  const doc = Object.assign(new Events(), { readyState: 'complete', hidden: false, documentElement: { dataset: {} }, activeElement: null });
  const elements = Object.fromEntries(['screen','transcript','terminal-input','terminal-announcer','clock','system-date','load-average','uptime','current-users','session-count','status-cpu','status-memory','status-swap','status-processes','status-run-queue','brightness','contrast','clear','reset','fullscreen','terminal-station','dial-out','dial-line-state','online-users'].map(id => [id, new Element(doc)]));
  elements.screen.querySelector = selector => selector === 'pre' ? elements.transcript : null;
  const selectors = { '.screen':'screen', '#terminal-input':'terminal-input', '#terminal-announcer':'terminal-announcer', '#online-users':'online-users', '#clock':'clock', '#system-date':'system-date', '#load-average':'load-average', '#uptime':'uptime', '#current-users':'current-users', '#session-count':'session-count', '#status-cpu':'status-cpu', '#status-memory':'status-memory', '#status-swap':'status-swap', '#status-processes':'status-processes', '#status-run-queue':'status-run-queue', '#brightness':'brightness', '#contrast':'contrast', '#clear':'clear', '#reset':'reset', '#fullscreen':'fullscreen', '.terminal-station':'terminal-station', '#dial-out':'dial-out', '#dial-line-state':'dial-line-state' };
  doc.querySelector = selector => elements[selectors[selector]] ?? null;
  doc.createElement = () => new Element(doc); doc.createDocumentFragment = () => new Element(doc); doc.createTextNode = textContent => ({ textContent, nodeType: 3 });
  const timeouts = [];
  const view = Object.assign(new Events(), { performance: { now: () => 0 }, setInterval: () => 1, clearInterval() {}, setTimeout(callback) { timeouts.push(callback); return timeouts.length; }, clearTimeout() {}, Audio: class { play() { return Promise.resolve(); } pause() {} removeAttribute() {} } });
  const key = (key, extra = {}) => { let prevented = false; elements['terminal-input'].dispatch('keydown', { key, target: elements['terminal-input'], preventDefault() { prevented = true; }, ...extra }); return prevented; };
  const type = value => { const input = elements['terminal-input']; input.value = value; input.selectionStart = value.length; input.dispatch('input', { target: input }); };
  return { doc, view, elements, timeouts, key, type };
}

function harness({ readyState = 'complete', hidden = false } = {}) {
  const clock = { textContent: '12:49:13' };
  const uptime = { textContent: 'UP 147 DAYS, 06:12' };
  const doc = Object.assign(new Events(), {
    readyState, hidden, documentElement: { dataset: {} },
    querySelector(selector) { return selector === '#clock' ? clock : selector === '#uptime' ? uptime : null; },
    createElement() { return {}; }, createTextNode(textContent) { return { textContent, nodeType: 3 }; }
  });
  let now = 0;
  const intervals = [];
  const view = Object.assign(new Events(), {
    performance: { now: () => now },
    setInterval(callback, delay) { intervals.push({ callback, delay }); return intervals.length; },
    clearInterval() {}
  });
  return { clock, uptime, doc, view, intervals, advance(milliseconds) { now += milliseconds; } };
}

test('page loads the browser controller as a relative module with a browser-relative model import', () => {
  assert.match(page, /<script type="module" src="\.\/unix-center\.js"><\/script>/);
  assert.match(controller, /from ['"]\.\/unix-simulation\.js['"]/);
  assert.match(controller, /if \(typeof document !== 'undefined'\) startUnixCenter\(\)/);
});

test('the real mobile-compatible terminal input is labeled and outside the visible CRT screen', () => {
  assert.match(page, /<textarea id="terminal-input"[^>]+aria-label="UNIX terminal command input"[^>]+autocapitalize="none"[^>]+enterkeyhint="send"/);
  const screenEnd = page.indexOf('</div></div></div>', page.indexOf('class="screen"'));
  const inputPosition = page.indexOf('<textarea id="terminal-input"');
  assert.ok(screenEnd > 0 && inputPosition > screenEnd, 'input follows the visible CRT instead of occupying transcript space');
  assert.equal((page.match(/id="terminal-input"/g) || []).length, 1);
});

test('terminal input uses a fully clipped, non-disruptive visual hiding treatment', () => {
  const rule = styles.match(/\.terminal-input\{([^}]+)\}/)?.[1] ?? '';
  for (const declaration of ['position:fixed', 'width:1px', 'height:1px', 'clip-path:inset(50%)', 'opacity:0', 'appearance:none', 'background:transparent', 'border:0', 'box-shadow:none', 'caret-color:transparent', 'resize:none', 'pointer-events:none']) {
    assert.ok(rule.includes(declaration), `missing hidden-input declaration: ${declaration}`);
  }
  assert.doesNotMatch(rule, /display:none|visibility:hidden/);
});

test('CRT focus and rendered command-line plumbing retain a single visible input buffer', () => {
  assert.match(controller, /screen\?\.addEventListener\('click', focusTerminal\)/);
  assert.match(controller, /focus\(\{ preventScroll: true \}\)/);
  assert.match(controller, /event\.target\.selectionStart, false/);
  assert.match(controller, /inputValue\.slice\(0, inputCursor\)/);
  assert.match(controller, /inputValue\.slice\(inputCursor/);
  assert.equal((page.match(/<textarea/g) || []).length, 1);
});

test('Phase 3B keeps shell input ownership until dialing and restores it afterward', () => {
  const app = interactiveHarness();
  const lifecycle = initializeUnixCenter(app.doc, app.view);
  const input = app.elements['terminal-input'];
  assert.equal(lifecycle.shell.mode, 'shell');
  app.elements.screen.dispatch('click');
  assert.strictEqual(app.doc.activeElement, input);
  assert.deepEqual(input.focusOptions, { preventScroll: true });

  app.type('tip midnight-relay');
  assert.match(app.elements.transcript.textContent, /visitor@cs-vax1:\/usr\/visitor\$ tip midnight-relay/);
  assert.equal(app.key('x'), false, 'ordinary shell keys are not prevented by remote routing');
  assert.equal(app.key('Enter'), true);
  assert.equal(lifecycle.shell.mode, 'dialing');

  assert.equal(app.key('c', { ctrlKey: true }), true);
  assert.equal(lifecycle.shell.mode, 'shell');
  app.type('echo after-cancel'); assert.match(app.elements.transcript.textContent, /echo after-cancel/);

  app.type('tip midnight-relay'); app.key('Enter'); app.timeouts.at(-1)();
  assert.equal(lifecycle.shell.mode, 'remote-bbs');
  app.elements['dial-out'].dispatch('click');
  assert.equal(lifecycle.shell.mode, 'shell');
  assert.strictEqual(app.doc.activeElement, input);
  app.type('echo after-disconnect'); assert.match(app.elements.transcript.textContent, /echo after-disconnect/);

  app.elements.reset.dispatch('click');
  assert.equal(lifecycle.shell.mode, 'shell');
  assert.strictEqual(app.doc.activeElement, input);
  app.type('history'); assert.match(app.elements.transcript.textContent, /history/);
});

test('Clear and Reset restore focus to the terminal input', () => {
  assert.match(controller, /const clear = \(\) => \{[^}]+renderTranscript\(\); focusTerminal\(\); \}/);
  assert.match(controller, /renderClock\(\); renderSessions\(\); renderStatus\(\); renderTranscript\(\); focusTerminal\(\);/);
});

test('already-loaded startup initializes once, tolerates optional omissions, and ticks the clock', () => {
  const app = harness();
  const first = startUnixCenter(app.doc, app.view);
  const second = startUnixCenter(app.doc, app.view);
  assert.strictEqual(second, first);
  assert.equal(app.intervals.length, 1);
  assert.equal(app.doc.documentElement.dataset.unixSimulation, 'active');
  app.advance(1000); app.intervals[0].callback();
  assert.equal(app.clock.textContent, '12:49:14');
});

test('DOMContentLoaded startup invokes initialization exactly once', () => {
  const app = harness({ readyState: 'loading' });
  assert.equal(startUnixCenter(app.doc, app.view), null);
  assert.equal(app.intervals.length, 0);
  app.doc.dispatch('DOMContentLoaded'); app.doc.dispatch('DOMContentLoaded');
  assert.equal(app.intervals.length, 1);
});

test('visibility restoration resynchronizes the visible clock', () => {
  const app = harness({ hidden: true });
  initializeUnixCenter(app.doc, app.view);
  app.advance(2000); app.intervals[0].callback();
  assert.equal(app.clock.textContent, '12:49:13');
  app.doc.hidden = false; app.doc.dispatch('visibilitychange');
  assert.equal(app.clock.textContent, '12:49:15');
});

test('uptime follows elapsed clock time, resynchronizes after visibility, and reset restores its canonical value', () => {
  const app = harness({ hidden: true });
  const lifecycle = initializeUnixCenter(app.doc, app.view);
  app.advance((17 * 60 + 48) * 60_000);
  app.intervals[0].callback();
  assert.equal(app.uptime.textContent, 'UP 147 DAYS, 06:12');
  app.doc.hidden = false; app.doc.dispatch('visibilitychange');
  assert.equal(app.uptime.textContent, 'UP 148 DAYS, 00:00');
  lifecycle.reset();
  assert.equal(app.uptime.textContent, 'UP 147 DAYS, 06:12');
});

test('startup logs initialization errors and preserves the fallback', () => {
  const app = harness();
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args);
  try {
    const result = startUnixCenter(app.doc, app.view, { createSimulation() { throw new Error('broken'); } });
    assert.equal(result, null);
  } finally { console.error = original; }
  assert.equal(app.clock.textContent, '12:49:13');
  assert.equal(errors.length, 1);
  assert.equal(errors[0][0], 'UNIX Time Sharing Center failed to initialize');
});
