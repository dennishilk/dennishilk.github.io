'use strict';
const assert = require('assert');
const Core = require('../museum/linux-game-install/games/nebu-strike/game.js');
const { createGameView } = require('../museum/linux-game-install/games/nebu-strike/view.js');

const scene = ['clear', 'background', 'ground', 'baseStructures', 'turretPlatform', 'gameplayEntities', 'turret', 'effects', 'hud', 'stateOverlay'];
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
function fixture(loadBeforeFirstFrame) {
  const main = context(), offscreen = [];
  const canvas = { ...events(), style: {}, getContext: () => main, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  const screen = { getBoundingClientRect: () => ({ width: 800, height: 500 }), requestFullscreen() {} };
  const controls = { ...events() }, elements = { '#gameCanvas': canvas, '#gameScreen': screen, '#gameRestart': controls, '#gameFullscreen': controls };
  let image, next = 1; const frames = new Map();
  function Image() { this.width = 1200; this.height = 600; image = this; }
  Object.defineProperty(Image.prototype, 'src', { set() { if (loadBeforeFirstFrame) this.onload(); } });
  const win = { ...events(), Image, devicePixelRatio: 1, requestAnimationFrame(fn) { const id = next++; frames.set(id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); } };
  const doc = { querySelector: selector => elements[selector], createElement: () => { const c = context(); offscreen.push(c); return { width: 0, height: 0, getContext: () => c }; } };
  const view = createGameView({ window: win, document: doc, Core });
  const frame = time => { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(time); };
  return { view, frame, get image() { return image; }, main, offscreen };
}
function assertFirstFrame(loadBeforeFirstFrame) {
  const f = fixture(loadBeforeFirstFrame);
  assert.equal(f.view.launch(), true);
  f.frame(16);
  assert.deepEqual(f.view.getLastRenderLayers(), scene, 'the first visible frame always renders the complete title battlefield');
  assert.equal(f.view.getGame().state, 'TITLE');
  assert.equal(f.main.globalCompositeOperation, 'source-over', 'background compositing cannot leak into gameplay drawing');
  assert.equal(f.main.globalAlpha, 1, 'background compositing restores the main canvas alpha');
  assert.equal(f.view.getCounts().renderCount, 1, 'launch creates exactly one normal RAF render');
  return f;
}

assertFirstFrame(false);
const loaded = assertFirstFrame(true);
assert.ok(loaded.view.getBackgroundMetrics().buildCount >= 1, 'an already decoded image participates in the first normal cache build');

const delayed = fixture(false);
delayed.view.launch(); delayed.frame(16);
const beforeLoad = delayed.view.getBackgroundMetrics().buildCount;
delayed.image.onload();
assert.equal(delayed.view.getCounts().renderCount, 1, 'image load does not schedule or paint a background-only frame');
delayed.frame(32);
assert.ok(delayed.view.getBackgroundMetrics().buildCount > beforeLoad, 'the next normal RAF frame rebuilds the dirty Milky Way cache');
assert.deepEqual(delayed.view.getLastRenderLayers(), scene, 'the post-load frame still draws every world and title layer after the background');
assert.equal(delayed.main.globalCompositeOperation, 'source-over');
assert.equal(delayed.main.globalAlpha, 1);
console.log('Nebu Strike first-frame background regression tests passed');
