'use strict';
const assert = require('assert');
const Core = require('../museum/linux-game-install/games/nebu-strike/game.js');
const { createGameView } = require('../museum/linux-game-install/games/nebu-strike/view.js');

const scene = ['clear', 'background', 'ground', 'baseStructures', 'gameplayEntities', 'turret', 'effects', 'hud', 'stateOverlay'];
function events() { return { addEventListener() {}, removeEventListener() {} }; }
function context() {
  const state = { globalCompositeOperation: 'source-over', globalAlpha: 1 }, stack = [];
  return new Proxy(state, { get(target, key) {
    if (key === 'save') return () => stack.push({ globalCompositeOperation: target.globalCompositeOperation, globalAlpha: target.globalAlpha });
    if (key === 'restore') return () => Object.assign(target, stack.pop());
    if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop() {} });
    return key in target ? target[key] : () => {};
  } });
}
function fixture(dimensions = () => ({ width: 800, height: 500 })) {
  const main = context();
  const canvas = { ...events(), style: {}, getContext: () => main, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  const screen = { getBoundingClientRect: dimensions, requestFullscreen() {} };
  const controls = { ...events() }, elements = { '#gameCanvas': canvas, '#gameScreen': screen, '#gameRestart': controls, '#gameFullscreen': controls };
  let next = 1; const frames = new Map();
  const win = { ...events(), devicePixelRatio: 1, requestAnimationFrame(fn) { const id = next++; frames.set(id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); } };
  const doc = { querySelector: selector => elements[selector] };
  const view = createGameView({ window: win, document: doc, Core });
  const frame = time => { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(time); };
  return { view, frame, main };
}
const f = fixture();
assert.equal(f.view.launch(), true);
assert.equal(f.view.getBackgroundMetrics().buildCount, 0, 'launch creates no offscreen background cache');
f.frame(16);
assert.deepEqual(f.view.getLastRenderLayers(), scene, 'the first visible frame renders the complete title battlefield');
assert.equal(f.view.getGame().state, 'TITLE');
assert.equal(f.main.globalCompositeOperation, 'source-over');
assert.equal(f.main.globalAlpha, 1);
assert.equal(f.view.getCounts().renderCount, 1, 'launch creates exactly one normal RAF render');
assert.equal(f.view.getTurretRenderMetrics().drawCalls, 1, 'drawTurret is called exactly once in the first frame');

let visible = false;
const hidden = fixture(() => visible ? ({ width: 960, height: 540 }) : ({ width: 0, height: 0 }));
visible = true;
assert.equal(hidden.view.launch(), true);
assert.ok(hidden.view.getCounts().canvasWidth > 0);
assert.ok(hidden.view.getCounts().canvasHeight > 0);
assert.equal(hidden.view.getCounts().rafScheduledCount, 1);
hidden.frame(16);
assert.deepEqual(hidden.view.getLastRenderLayers(), scene);

assert.equal(f.view.getBackgroundMetrics().cacheWidth, 0, 'procedural space has no secondary canvas');
console.log('Nebu Strike first-frame procedural background regression tests passed');
