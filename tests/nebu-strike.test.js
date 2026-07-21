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

// Visual state is created once per asteroid and impact decoration remains bounded.
const visual = G.createGame(800, 500, 77); G.start(visual); play(visual, 3);
visual.enemies = visual.asteroids = [G.asteroid(300, 150, 34, (() => { let n = 0; return () => (n++ % 7) / 7; })())];
assert.ok(visual.enemies[0].visual.facets.length >= 6, 'large asteroids retain finite precomputed visual facets');
assert.ok(visual.enemies[0].visual.craters.length >= 4, 'large asteroids retain precomputed crater detail');
for (let i = 0; i < 30; i++) { visual.enemies = visual.asteroids = [{ x: 200, y: 150, size: 14, tier: 'small', generation: 1, hp: 1, vx: 0, vy: 0, angle: 0, spin: 0, shape: [], visual: { facets: [], craters: [], ridge: false } }]; G.destroy(visual, 0); }
assert.ok(visual.decals.length <= G.MAX_IMPACT_DECALS, 'impact decals are strictly bounded');
assert.equal(G.MAX_ACTIVE_ENEMIES, 24, 'visual polish does not raise enemy cap');
console.log('Nebu Strike visual-state regression tests passed');

// The weapon is a common-world object: no state transition can retract it.
const turretStates = G.createGame(800, 500, 88);
assert.equal(turretStates.turret.deployment, 1, 'title turret starts fully deployed');
G.update(turretStates, {}, .01);
assert.equal(turretStates.turret.deployment, 1, 'title updates preserve turret deployment');
G.start(turretStates);
assert.equal(turretStates.turret.deployment, 1, 'countdown reset preserves turret deployment');
G.update(turretStates, {}, .01);
assert.equal(turretStates.turret.deployment, 1, 'countdown turret remains deployed');
play(turretStates, 3);
assert.equal(turretStates.state, 'PLAYING');
assert.equal(turretStates.turret.deployment, 1, 'first playing frame keeps the turret deployed');
turretStates.turret.deployment = 0; G.update(turretStates, {}, .05);
assert.equal(turretStates.turret.deployment, 1, 'playing updates repair any collapsed deployment value');
play(turretStates, 4);
assert.equal(turretStates.turret.deployment, 1, 'later playing frames cannot collapse turret height');
turretStates.state = 'GAMEOVER'; G.update(turretStates, {}, .01);
assert.equal(turretStates.turret.deployment, 1, 'game-over keeps the turret deployed');

// Exercise the public title -> start -> countdown -> playing transition and
// verify the geometry that the canvas renderer consumes for a sustained wave.
const transition = G.createGame(800, 500, 144);
const assertTurretGeometry = (label) => {
  const t = transition.turret, geometry = G.turretGeometry(transition);
  for (const [name, value] of Object.entries({ x: t.x, y: t.y, aimAngle: t.angle, deployment: t.deployment, recoil: t.recoil, heat: t.heat, barrelLength: geometry.barrelLength, muzzleX: geometry.muzzleX, muzzleY: geometry.muzzleY, scale: geometry.scale })) assert.ok(Number.isFinite(value), `${label}: ${name} is finite`);
  assert.ok(t.deployment > 0, `${label}: deployment remains positive`);
  assert.ok(geometry.barrelLength > 0, `${label}: barrel has positive length`);
  assert.ok(t.x >= 0 && t.x <= transition.width && t.y >= 0 && t.y <= transition.height, `${label}: pivot remains in the viewport`);
  assert.ok(geometry.muzzleY < transition.groundY, `${label}: muzzle remains above ground`);
  assert.ok(t.y - geometry.baseHeight / 2 < transition.groundY, `${label}: turret body is not fully below ground`);
};
assertTurretGeometry('title');
G.start(transition); assertTurretGeometry('countdown');
while (transition.state === 'COUNTDOWN') G.update(transition, {}, .05);
assert.equal(transition.state, 'PLAYING'); assertTurretGeometry('first playing frame');
for (let frame = 1; frame <= 120; frame++) {
  const keys = { aimX: frame % 2 ? 0 : 800, aimY: 30, fire: frame === 12 || frame === 72 };
  G.update(transition, keys, .05);
  assertTurretGeometry(`playing frame ${frame}`);
}
console.log('Nebu Strike turret deployment regression tests passed');
