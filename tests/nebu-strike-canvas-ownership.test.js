'use strict';
const assert = require('assert');
const Core = require('../museum/linux-game-install/games/nebu-strike/game.js');
const { createGameView } = require('../museum/linux-game-install/games/nebu-strike/view.js');

function events() { const handlers = new Map(); return { addEventListener(type, fn) { handlers.set(type, fn); }, removeEventListener(type) { handlers.delete(type); }, emit(type) { handlers.get(type)?.(); } }; }
function context(canvas) { const gradient = { addColorStop() {} }; return new Proxy({ canvas, globalAlpha: 1, globalCompositeOperation: 'source-over' }, { get(target, key) { if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => gradient; return key in target ? target[key] : () => {}; } }); }
const canvasEvents = events(), windowEvents = events();
let backingWrites = 0, width = 0, height = 0, screenSize = { width: 800, height: 500 };
const canvas = { ...canvasEvents, isConnected: true, style: {}, get clientWidth() { return screenSize.width; }, get clientHeight() { return screenSize.height; }, get width() { return width; }, set width(value) { backingWrites++; width = value; }, get height() { return height; }, set height(value) { backingWrites++; height = value; }, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
const main = context(canvas); canvas.getContext = () => main;
const screen = { getBoundingClientRect: () => screenSize, requestFullscreen() {} };
const control = { ...events() }, elements = { '#gameCanvas': canvas, '#gameScreen': screen, '#gameRestart': control, '#gameFullscreen': control };
const frames = new Map(); let next = 1;
const win = { ...windowEvents, devicePixelRatio: 1, requestAnimationFrame(fn) { const id = next++; frames.set(id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); } };
const doc = { querySelector: selector => elements[selector], createElement: () => { const cache = { width: 0, height: 0 }; cache.getContext = () => context(cache); return cache; } };
const view = createGameView({ window: win, document: doc, Core });
function frame(time) { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(time); }

assert.equal(view.launch(), true);
const authoritativeCanvas = canvas;
frame(16); // TITLE
view.getGame().state = 'COUNTDOWN'; frame(32);
view.getGame().state = 'PLAYING'; frame(48);
let metrics = view.getCounts();
assert.equal(doc.querySelector('#gameCanvas'), authoritativeCanvas);
assert.equal(authoritativeCanvas.isConnected, true);
assert.equal(main.canvas, authoritativeCanvas);
assert.equal(metrics.canvasMatchesDOM, true); assert.equal(metrics.contextMatchesCanvas, true); assert.equal(metrics.canvasConnected, true);
assert.equal(metrics.canvasWidth, 800); assert.equal(metrics.canvasHeight, 500);
assert.ok(metrics.turretDrawCalls >= 3); assert.ok(metrics.hudDrawCalls >= 3);
const writesBeforeNoopResize = backingWrites;
windowEvents.emit('resize');
assert.equal(backingWrites, writesBeforeNoopResize, 'same-size resize must not reset the backing store after PLAYING renders');
screenSize = { width: 960, height: 540 }; windowEvents.emit('resize');
assert.equal(backingWrites, writesBeforeNoopResize + 2, 'a real resize resets width and height exactly once');
const rendersBeforeResizeFrame = view.getCounts().renderFrameCount;
frame(64);
metrics = view.getCounts();
assert.equal(metrics.renderFrameCount, rendersBeforeResizeFrame + 1, 'the frame after a real resize redraws the complete scene');
assert.equal(metrics.canvasWidth, 960); assert.equal(metrics.canvasHeight, 540);
assert.equal(metrics.canvasMatchesDOM, true); assert.equal(metrics.contextMatchesCanvas, true); assert.equal(metrics.canvasConnected, true);
console.log('Nebu Strike canvas ownership and resize regression tests passed');
