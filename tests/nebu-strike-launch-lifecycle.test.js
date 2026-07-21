'use strict';
const assert = require('assert');
const Core = require('../museum/linux-game-install/games/nebu-strike/game.js');
const { createGameView, Lifecycle } = require('../museum/linux-game-install/games/nebu-strike/view.js');

function listeners() { const map = new Map(); return { addEventListener(type, fn) { map.set(type, [...(map.get(type) || []), fn]); }, removeEventListener(type, fn) { map.set(type, (map.get(type) || []).filter(item => item !== fn)); }, count(type) { return (map.get(type) || []).length; } }; }
const canvasEvents = listeners(), restartEvents = listeners(), fullscreenEvents = listeners(), windowEvents = listeners();
const gradient = { addColorStop() {} };
const context = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => gradient : () => {} });
const canvas = { ...canvasEvents, style: {}, width: 0, height: 0, getContext: () => context };
const screen = { getBoundingClientRect: () => ({ width: 800, height: 500 }), requestFullscreen() {} };
const restart = { ...restartEvents }, fullscreen = { ...fullscreenEvents };
const elements = { '#gameCanvas': canvas, '#gameScreen': screen, '#gameRestart': restart, '#gameFullscreen': fullscreen };
let nextId = 1; const frames = new Map();
const win = { ...windowEvents, devicePixelRatio: 1, localStorage: {}, requestAnimationFrame(fn) { const id = nextId++; frames.set(id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); } };
const view = createGameView({ window: win, document: { querySelector: selector => elements[selector] }, Core });
function runFrame(time) { assert.equal(frames.size, 1, 'one RAF callback is pending'); const [id, callback] = frames.entries().next().value; frames.delete(id); callback(time); }

assert.equal(view.launch(), true); assert.equal(view.launch(), false, 'a running launch cannot re-enter');
assert.equal(view.getLifecycle(), Lifecycle.RUNNING); assert.deepEqual(view.getCounts(), { launchCount: 1, gameInitCount: 1, rafStartCount: 1, resizeCount: 1, renderCount: 0 });
runFrame(16); runFrame(32); runFrame(48); assert.equal(view.getCounts().renderCount, 3); assert.equal(windowEvents.count('resize'), 1); assert.equal(windowEvents.count('keydown'), 1); assert.equal(canvasEvents.count('click'), 1);
view.stop(); assert.equal(view.getLifecycle(), Lifecycle.STOPPED); assert.equal(frames.size, 0); assert.equal(windowEvents.count('resize'), 0); assert.equal(canvasEvents.count('click'), 0); assert.equal(restartEvents.count('click'), 0);
assert.equal(view.launch(), true, 'returning to the terminal permits one clean relaunch'); assert.equal(view.getCounts().launchCount, 2); assert.equal(view.getCounts().gameInitCount, 2); assert.equal(view.getCounts().rafStartCount, 2); assert.equal(windowEvents.count('resize'), 1); assert.equal(canvasEvents.count('click'), 1); runFrame(64);

const expectedSceneLayers = ['clear', 'background', 'ground', 'baseStructures', 'turretPlatform', 'gameplayEntities', 'turret', 'effects', 'hud', 'stateOverlay'];
function assertPersistentBattlefield(state, time) {
  view.getGame().state = state;
  runFrame(time);
  assert.deepEqual(view.getLastRenderLayers(), expectedSceneLayers, `${state} uses the common battlefield render order`);
  const layers = view.getLastRenderLayers();
  assert.ok(layers.includes('ground'), `${state} renders ground`);
  assert.ok(layers.includes('turret'), `${state} renders turret`);
  assert.ok(layers.indexOf('clear') < layers.indexOf('ground'), `${state} clears only before world rendering`);
}
assertPersistentBattlefield('TITLE', 80);
assertPersistentBattlefield('COUNTDOWN', 96);
assertPersistentBattlefield('PLAYING', 112); // First playing frame.
assertPersistentBattlefield('PLAYING', 128); // Later playing frame.
assertPersistentBattlefield('GAMEOVER', 144);
view.stop();
console.log('Nebu Strike launch lifecycle regression tests passed');
