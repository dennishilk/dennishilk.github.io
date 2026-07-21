'use strict';
const assert = require('assert');
const G = require('../museum/linux-game-install/games/nebu-strike/game.js');

function play(g, seconds, keys = {}) { for (let i = 0; i < seconds * 20; i++) G.update(g, keys, .05); }
const g = G.createGame(800, 500, 44);
assert.equal(g.state, 'TITLE'); G.start(g); play(g, 3); assert.equal(g.state, 'PLAYING');
assert.equal(g.turret.x, 400, 'turret is fixed at the base center');
G.update(g, { aimX: 400, aimY: 0, fire: true }, .05);
assert.ok(g.shots.length, 'turret can fire toward the top edge');
const shot = g.shots[0]; play(g, .65); assert.ok(shot.y < 30 || !g.shots.includes(shot), 'shots traverse the full viewport height');
for (let i = 0; i < 100; i++) G.update(g, { fire: true, aimX: 400, aimY: 0 }, .05);
assert.ok(g.shots.length <= G.MAX_PROJECTILES, 'projectiles have a hard cap');
for (let i = 0; i < 100; i++) G.burst(g, 0, 0, '#fff', 20);
assert.ok(g.particles.length <= G.MAX_PARTICLES, 'particles have a hard cap');

// A deterministic long session: every wave starts once, capacity holds, and finite children cannot run away.
for (let wave = 0; wave < 25; wave++) {
  g.enemies.length = 0; g.asteroids = g.enemies; g.pending = 0; G.update(g, {}, .01);
  assert.equal(g.waveStarted, g.wave, 'a wave is initialized exactly once');
  for (let i = 0; i < 120; i++) { G.update(g, { aimX: 400, aimY: 0, fire: true }, .05); assert.ok(g.enemies.length <= G.MAX_ACTIVE_ENEMIES); }
}
const split = G.createGame(800, 500, 2); G.start(split); play(split, 3);
split.enemies = split.asteroids = [{ x: 300, y: 160, size: 34, tier: 'large', generation: 0, hp: 1, vx: 0, vy: 0, angle: 0, spin: 0, shape: [] }];
G.destroy(split, 0); assert.equal(split.enemies.length, 2, 'large asteroid has exactly two children');
for (let i = split.enemies.length - 1; i >= 0; i--) G.destroy(split, i);
assert.ok(split.enemies.every(a => a.tier === 'small'), 'only one child generation is permitted');
const base = G.createGame(800, 500); G.start(base); play(base, 3); base.base = 1; base.enemies = base.asteroids = [{ x: 400, y: base.groundY, size: 14, tier: 'small', vx: 0, vy: 0, angle: 0, spin: 0, shape: [] }]; G.update(base, {}, .01); assert.equal(base.state, 'GAMEOVER', 'base damage ends the game at zero integrity');
console.log('Nebu Strike bounded ground-defense regression tests passed');

// Ground is a persistent gameplay layer and the first incoming is never delayed after countdown.
const visible = G.createGame(900, 600, 17);
assert.equal(visible.ground.visible, true, 'ground is present on the title screen');
G.start(visible);
assert.equal(visible.ground.visible, true, 'ground survives countdown start');
play(visible, 3);
assert.equal(visible.state, 'PLAYING');
assert.equal(visible.ground.visible, true, 'ground remains present during play');
play(visible, .5);
assert.ok(visible.pending > 0 || visible.enemies.length > 0, 'first wave has active or queued incoming asteroids promptly');
assert.ok(visible.enemies.length > 0, 'first enemy enters the upper battlefield without a stall');
visible.state = 'GAMEOVER'; G.update(visible, {}, .01);
assert.equal(visible.ground.visible, true, 'ground remains present after game over');
