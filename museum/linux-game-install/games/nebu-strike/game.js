(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.NebuStrike = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';
  const MAX_ACTIVE_ENEMIES = 24, MAX_PROJECTILES = 48, MAX_PARTICLES = 360;
  const SHOT_LIFE = 2.4, BASE_HEALTH = 10;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function rng(seed) { let s = seed || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function shape(size, random) { return Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI * 2 / 10; const r = size * (.74 + random() * .28); return [Math.cos(a) * r, Math.sin(a) * r]; }); }
  function enemy(g, tier, generation) {
    const r = g.random, side = r(); let x = side < .68 ? r() * g.width : (side < .84 ? -35 : g.width + 35), y = side < .68 ? -35 : r() * g.height * .32;
    const size = tier === 'large' ? 34 : tier === 'medium' ? 23 : 14;
    const speed = (tier === 'large' ? 32 : tier === 'medium' ? 48 : 72) + g.wave * 3;
    const angle = Math.atan2(g.groundY - y, g.width / 2 - x) + (r() - .5) * .38;
    return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size, tier, generation, hp: tier === 'large' ? 3 : tier === 'medium' ? 2 : 1, angle: r() * 6.28, spin: (r() - .5) * 1.2, shape: shape(size, r) };
  }
  function createGame(width = 1280, height = 720, seed = 9) {
    const g = { width, height, state: 'TITLE', time: 0, countdown: 0, wave: 0, waveStarted: 0, pending: 0, spawnClock: 0, score: 0, best: 0, base: BASE_HEALTH, groundY: height - 80, enemies: [], asteroids: [], shots: [], particles: [], shake: 0, flash: 0, combo: 1, comboTime: 0, random: rng(seed), turret: { x: width / 2, y: height - 68, angle: -Math.PI / 2, fire: 0, recoil: 0, heat: 0 } };
    g.ship = g.turret; return g;
  }
  function reset(g) { g.state = 'COUNTDOWN'; g.countdown = 2.3; g.wave = 0; g.waveStarted = 0; g.pending = 0; g.spawnClock = 0; g.score = 0; g.base = BASE_HEALTH; g.enemies = g.asteroids = []; g.shots = []; g.particles = []; g.combo = 1; g.comboTime = 0; Object.assign(g.turret, { x: g.width / 2, y: g.height - 68, angle: -Math.PI / 2, fire: 0, recoil: 0, heat: 0 }); return g; }
  const start = reset;
  function beginWave(g) { if (g.pending || g.enemies.length || g.state !== 'PLAYING') return false; g.wave++; g.waveStarted++; g.pending = Math.min(30, 5 + g.wave * 2); g.spawnClock = .18; return true; }
  function wave(g) { return beginWave(g); }
  function burst(g, x, y, color, count) { const room = MAX_PARTICLES - g.particles.length; for (let i = 0; i < Math.min(count || 12, room); i++) { const a = g.random() * 6.28, speed = 35 + g.random() * 150; g.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .25 + g.random() * .55, color }); } }
  function fire(g) { const t = g.turret; if (t.fire > 0 || g.shots.length >= MAX_PROJECTILES || g.state !== 'PLAYING') return false; const x = t.x + Math.cos(t.angle) * 34, y = t.y + Math.sin(t.angle) * 34; g.shots.push({ x, y, px: x, py: y, vx: Math.cos(t.angle) * 760, vy: Math.sin(t.angle) * 760, life: SHOT_LIFE }); t.fire = .105; t.recoil = 1; t.heat = clamp(t.heat + .16, 0, 1); burst(g, x, y, '#fff0a1', 5); return true; }
  function damage(g, a) { g.base = Math.max(0, g.base - (a.tier === 'large' ? 3 : a.tier === 'medium' ? 2 : 1)); g.shake = .7; g.flash = .55; burst(g, a.x, g.groundY, '#ff7c66', 28); if (!g.base) { g.state = 'GAMEOVER'; g.best = Math.max(g.best, g.score); } }
  function destroy(g, index) { const a = g.enemies[index]; g.enemies.splice(index, 1); g.asteroids = g.enemies; const points = a.tier === 'large' ? 500 : a.tier === 'medium' ? 250 : 100; g.score += points * g.combo; g.combo = Math.min(4, g.combo + 1); g.comboTime = 2.5; burst(g, a.x, a.y, '#ffd078', a.tier === 'large' ? 28 : 16); g.shake = Math.max(g.shake, a.tier === 'large' ? .32 : .14);
    // One finite split generation: large -> two medium, medium -> two small. Small never splits.
    const childTier = a.tier === 'large' ? 'medium' : a.tier === 'medium' ? 'small' : null;
    if (childTier && a.generation < 1) for (let i = 0; i < 2 && g.enemies.length < MAX_ACTIVE_ENEMIES; i++) { const c = enemy(g, childTier, a.generation + 1); c.x = a.x; c.y = a.y; c.vx = a.vx + (g.random() - .5) * 110; c.vy = Math.abs(a.vy) + 25 + g.random() * 55; g.enemies.push(c); }
  }
  function update(g, keys = {}, dt = .016) { dt = Math.min(.05, Math.max(0, dt)); g.time += dt; g.groundY = g.height - 80; g.turret.x = g.width / 2; g.turret.y = g.height - 68; g.shake = Math.max(0, g.shake - dt * 2); g.flash = Math.max(0, g.flash - dt * 2); if (g.state === 'TITLE' || g.state === 'GAMEOVER') return g;
    if (g.state === 'COUNTDOWN') { if ((g.countdown -= dt) <= 0) { g.state = 'PLAYING'; beginWave(g); } return g; }
    const t = g.turret; if (Number.isFinite(keys.aimX) && Number.isFinite(keys.aimY)) t.angle = clamp(Math.atan2(keys.aimY - t.y, keys.aimX - t.x), -Math.PI + .08, -.08); if (keys.left) t.angle = clamp(t.angle - 3.4 * dt, -Math.PI + .08, -.08); if (keys.right) t.angle = clamp(t.angle + 3.4 * dt, -Math.PI + .08, -.08); t.fire -= dt; t.recoil = Math.max(0, t.recoil - dt * 8); t.heat = Math.max(0, t.heat - dt * .38); if (keys.fire) fire(g);
    g.spawnClock -= dt; if (g.pending && g.spawnClock <= 0 && g.enemies.length < MAX_ACTIVE_ENEMIES) { const tier = g.wave >= 3 && g.random() < .18 ? 'large' : g.wave >= 2 && g.random() < .4 ? 'medium' : 'small'; g.enemies.push(enemy(g, tier, 0)); g.asteroids = g.enemies; g.pending--; g.spawnClock = .32; }
    for (const a of g.enemies) { a.x += a.vx * dt; a.y += a.vy * dt; a.angle += a.spin * dt; }
    for (const p of g.shots) { p.px = p.x; p.py = p.y; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } g.shots = g.shots.filter(p => p.life > 0 && p.x > -30 && p.x < g.width + 30 && p.y > -30 && p.y < g.height + 30);
    for (let pi = g.shots.length - 1; pi >= 0; pi--) for (let ai = g.enemies.length - 1; ai >= 0; ai--) { const p = g.shots[pi], a = g.enemies[ai]; if (Math.hypot(p.x - a.x, p.y - a.y) < a.size) { g.shots.splice(pi, 1); if (--a.hp <= 0) destroy(g, ai); else burst(g, a.x, a.y, '#a8eaff', 8); break; } }
    for (let i = g.enemies.length - 1; i >= 0; i--) if (g.enemies[i].y + g.enemies[i].size >= g.groundY) { const a = g.enemies[i]; g.enemies.splice(i, 1); damage(g, a); } g.asteroids = g.enemies;
    if (g.comboTime > 0) g.comboTime -= dt; else g.combo = 1; for (const p of g.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } g.particles = g.particles.filter(p => p.life > 0); if (!g.pending && !g.enemies.length && g.state === 'PLAYING') beginWave(g); return g;
  }
  return { MAX_ACTIVE_ENEMIES, MAX_PROJECTILES, MAX_PARTICLES, SHOT_LIFE, BASE_HEALTH, createGame, start, update, wave, fire, burst, destroy, asteroid: (x, y, size, random = Math.random) => ({ x, y, size, shape: shape(size, random), vx: 0, vy: 0, tier: size > 30 ? 'large' : size > 18 ? 'medium' : 'small', generation: 0, hp: 1, angle: 0, spin: 0 }) };
});
