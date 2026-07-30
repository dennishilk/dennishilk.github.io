const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const root = __dirname + '/..';

test('starfield uses the rendered viewport, a DPR backing store, and centered coordinates', () => {
  const source = fs.readFileSync(root + '/stars.js', 'utf8');
  const listeners = {};
  const arcs = [];
  const context = {
    setTransform(...args) { this.transform = args; },
    fillRect(...args) { this.rect = args; },
    beginPath() {},
    arc(...args) { arcs.push(args); },
    fill() {},
  };
  const canvas = {
    width: 0,
    height: 0,
    bounds: { width: 800, height: 600 },
    getContext: () => context,
    getBoundingClientRect() { return this.bounds; },
  };
  let randomIndex = 0;
  const randomValues = [0, 0, 0.5, 1, 1, 0.5];
  const sandbox = {
    document: { getElementById: () => canvas, documentElement: { clientWidth: 800, clientHeight: 600 } },
    window: {
      devicePixelRatio: 2,
      addEventListener(type, listener) { listeners[type] = listener; },
      visualViewport: { addEventListener(type, listener) { listeners['visual-' + type] = listener; } },
    },
    Math: Object.create(Math),
    requestAnimationFrame() {},
  };
  sandbox.Math.random = () => randomValues[randomIndex++ % randomValues.length];
  vm.runInNewContext(source, sandbox);

  assert.deepEqual([canvas.width, canvas.height], [1600, 1200]);
  assert.deepEqual(context.transform, [2, 0, 0, 2, 0, 0]);
  assert.deepEqual(context.rect, [0, 0, 800, 600]);
  assert.ok(arcs.some(([x, y]) => x < 400 && y < 300), 'stars are projected above and left of center');
  assert.ok(arcs.some(([x, y]) => x > 400 && y > 300), 'stars are projected below and right of center');

  canvas.bounds = { width: 500, height: 300 };
  sandbox.window.devicePixelRatio = 1.5;
  listeners.resize();
  assert.deepEqual([canvas.width, canvas.height], [750, 450]);
  assert.deepEqual(context.transform, [1.5, 0, 0, 1.5, 0, 0]);
  assert.equal(listeners['visual-resize'], listeners.resize);
});

test('power-on transfers focus from the toggle to the terminal interaction surface', () => {
  const source = fs.readFileSync(root + '/museum/crt-remote-terminal/terminal.js', 'utf8');
  assert.match(source, /\$\('powerLamp'\)\.textContent='ON';buffer\.focus\(\{preventScroll:true\}\)/);
  assert.match(source, /if\(!powered\|\|\['SELECT','INPUT','BUTTON'\]\.includes\(document\.activeElement\.tagName\)\)return/);
  assert.match(source, /if\(e\.key==='Enter'\)\{e\.preventDefault\(\);keySound\('return'\);submit\(\)\}/);
  assert.match(source, /\$\('power'\)\.onclick=\(\)=>powered\?powerOff\(\):startup\(\)/);
});

test('BIOS choice dialogs navigate in their visible order and keep highlight and draft together', () => {
  const html = fs.readFileSync(root + '/museum/bios-setup/setup.html', 'utf8');
  assert.match(html, /ed\.choices\.map\(\(c,i\)=>`<button[^`]+data-dialog-choice="\$\{i\}"[^`]+>\$\{c\[0\]\}<\/button>`\)\.join\(''\)/);
  assert.match(html, /appState\.dialogSelection=\(appState\.dialogSelection\+delta\+ed\.choices\.length\)%ed\.choices\.length; appState\.draftValue=ed\.choices\[appState\.dialogSelection\]\[1\]/);
  assert.match(html, /action==='left'\|\|action==='up'\|\|action==='pgup'\)return adjustEditor\(-1\)/);
  assert.match(html, /action==='right'\|\|action==='down'\|\|action==='pgdn'\)return adjustEditor\(1\)/);
  assert.match(html, /if\(action==='esc'\)return cancelDialog\(\); if\(action==='enter'\)return dialogAccept\(\)/);
});
