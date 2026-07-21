(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.NebuStrike = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';
  const MAX_ACTIVE_ENEMIES = 24, MAX_PROJECTILES = 48, MAX_PARTICLES = 360, MAX_IMPACT_DECALS = 12;
  const SHOT_LIFE = 2.4, BASE_HEALTH = 10;
  // Turret geometry is derived from groundY; visual placement is never mutable game state.
  const TURRET_VISIBLE_OFFSET = 16, TURRET_BARREL_LENGTH = 60, TURRET_MUZZLE_OFFSET = 73;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function rng(seed) { let s = seed || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function shape(size, random) { return Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI * 2 / 10; const r = size * (.74 + random() * .28); return [Math.cos(a) * r, Math.sin(a) * r]; }); }
  function visual(size, tier, random) { const facets = tier === 'large' ? 6 : tier === 'medium' ? 4 : 2, craters = tier === 'large' ? 4 : tier === 'medium' ? 2 : 1; return { seed: Math.floor(random() * 0x7fffffff), facets: Array.from({length: facets}, () => [random() * 6.28, .25 + random() * .5, .16 + random() * .18]), craters: Array.from({length: craters}, () => [random() * 6.28, .2 + random() * .42, .1 + random() * .11]), ridge: random() > .43 }; }
  function enemy(g, tier, generation) {
    const r = g.random, side = r(); let x = side < .68 ? r() * g.width : (side < .84 ? -35 : g.width + 35), y = side < .68 ? -35 : r() * g.height * .32;
    const size = tier === 'large' ? 34 : tier === 'medium' ? 23 : 14;
    const speed = (tier === 'large' ? 32 : tier === 'medium' ? 48 : 72) + g.wave * 3;
    const angle = Math.atan2(g.groundY - y, g.width / 2 - x) + (r() - .5) * .38;
    return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size, tier, generation, hp: tier === 'large' ? 3 : tier === 'medium' ? 2 : 1, angle: r() * 6.28, spin: (r() - .5) * 1.2, shape: shape(size, r), visual: visual(size, tier, r), hit: 0 };
  }
  function createGame(width = 1280, height = 720, seed = 9) {
    const groundY = height - Math.round(height * .18);
    const g = { width, height, state: 'TITLE', time: 0, countdown: 0, wave: 0, waveStarted: 0, pending: 0, spawnClock: 0, score: 0, best: 0, base: BASE_HEALTH, groundY, ground: { visible: true, height: Math.round(height * .18) }, enemies: [], asteroids: [], shots: [], particles: [], decals: [], shake: 0, flash: 0, combo: 1, comboTime: 0, random: rng(seed), turret: { angle: -Math.PI / 2, fire: 0, recoil: 0, heat: 0 } };
    g.ship = g.turret; return g;
  }
  function reset(g) { g.state = 'COUNTDOWN'; g.countdown = 2.95; g.wave = 0; g.waveStarted = 0; g.pending = 0; g.spawnClock = 0; g.score = 0; g.base = BASE_HEALTH; g.enemies = g.asteroids = []; g.shots = []; g.particles = []; g.decals = []; g.combo = 1; g.comboTime = 0; Object.assign(g.turret, { angle: -Math.PI / 2, fire: 0, recoil: 0, heat: 0 }); return g; }
  const start = reset;
  function beginWave(g) { if (g.pending || g.enemies.length || g.state !== 'PLAYING') return false; g.wave++; g.waveStarted++; g.pending = Math.min(30, 5 + g.wave * 2); g.spawnClock = .12; return true; }
  function wave(g) { return beginWave(g); }
  function burst(g, x, y, color, count) { const room = MAX_PARTICLES - g.particles.length; for (let i = 0; i < Math.min(count || 12, room); i++) { const a = g.random() * 6.28, speed = 35 + g.random() * 150; g.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .25 + g.random() * .55, color }); } }
  function fire(g) { const t = g.turret, anchor = turretGeometry(g); if (t.fire > 0 || g.shots.length >= MAX_PROJECTILES || g.state !== 'PLAYING') return false; const x = anchor.anchorX + Math.cos(t.angle) * 34, y = anchor.anchorY + Math.sin(t.angle) * 34; g.shots.push({ x, y, px: x, py: y, vx: Math.cos(t.angle) * 760, vy: Math.sin(t.angle) * 760, life: SHOT_LIFE }); t.fire = .105; t.recoil = 1; t.heat = clamp(t.heat + .16, 0, 1); burst(g, x, y, '#fff0a1', 5); return true; }
  function decal(g, x, y, size) { if (g.decals.length >= MAX_IMPACT_DECALS) g.decals.shift(); g.decals.push({x, y, size, life: 1.35}); }
  function damage(g, a) { decal(g, a.x, g.groundY + 5, a.size); g.base = Math.max(0, g.base - (a.tier === 'large' ? 3 : a.tier === 'medium' ? 2 : 1)); g.shake = .7; g.flash = .55; burst(g, a.x, g.groundY, '#ff7c66', 28); if (!g.base) { g.state = 'GAMEOVER'; g.best = Math.max(g.best, g.score); } }
  function destroy(g, index) { const a = g.enemies[index]; g.enemies.splice(index, 1); g.asteroids = g.enemies; const points = a.tier === 'large' ? 500 : a.tier === 'medium' ? 250 : 100; g.score += points * g.combo; g.combo = Math.min(4, g.combo + 1); g.comboTime = 2.5; burst(g, a.x, a.y, '#ffd078', a.tier === 'large' ? 28 : 16); g.shake = Math.max(g.shake, a.tier === 'large' ? .32 : .14); decal(g, a.x, a.y, a.size * .72);
    // One finite split generation: large -> two medium, medium -> two small. Small never splits.
    const childTier = a.tier === 'large' ? 'medium' : a.tier === 'medium' ? 'small' : null;
    if (childTier && a.generation < 1) for (let i = 0; i < 2 && g.enemies.length < MAX_ACTIVE_ENEMIES; i++) { const c = enemy(g, childTier, a.generation + 1); c.x = a.x; c.y = a.y; c.vx = a.vx + (g.random() - .5) * 110; c.vy = Math.abs(a.vy) + 25 + g.random() * 55; g.enemies.push(c); }
  }
  function update(g, keys = {}, dt = .016) { dt = Math.min(.05, Math.max(0, dt)); g.time += dt; g.ground.height = Math.round(g.height * .18); g.ground.visible = true; g.groundY = g.height - g.ground.height; g.shake = Math.max(0, g.shake - dt * 2); g.flash = Math.max(0, g.flash - dt * 2); if (g.state === 'TITLE' || g.state === 'GAMEOVER') return g;
    if (g.state === 'COUNTDOWN') { if ((g.countdown -= dt) <= 0) { g.state = 'PLAYING'; beginWave(g); } return g; }
    const t = g.turret, anchor = turretGeometry(g); if (Number.isFinite(keys.aimX) && Number.isFinite(keys.aimY)) t.angle = clamp(Math.atan2(keys.aimY - anchor.anchorY, keys.aimX - anchor.anchorX), -Math.PI + .08, -.08); if (keys.left) t.angle = clamp(t.angle - 3.4 * dt, -Math.PI + .08, -.08); if (keys.right) t.angle = clamp(t.angle + 3.4 * dt, -Math.PI + .08, -.08); t.fire -= dt; t.recoil = Math.max(0, t.recoil - dt * 8); t.heat = Math.max(0, t.heat - dt * .38); if (keys.fire) fire(g);
    g.spawnClock -= dt; if (g.pending && g.spawnClock <= 0 && g.enemies.length < MAX_ACTIVE_ENEMIES) { const tier = g.wave >= 3 && g.random() < .18 ? 'large' : g.wave >= 2 && g.random() < .4 ? 'medium' : 'small'; g.enemies.push(enemy(g, tier, 0)); g.asteroids = g.enemies; g.pending--; g.spawnClock = .26; }
    for (const a of g.enemies) { a.x += a.vx * dt; a.y += a.vy * dt; a.angle += a.spin * dt; }
    for (const p of g.shots) { p.px = p.x; p.py = p.y; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } g.shots = g.shots.filter(p => p.life > 0 && p.x > -30 && p.x < g.width + 30 && p.y > -30 && p.y < g.height + 30);
    for (let pi = g.shots.length - 1; pi >= 0; pi--) for (let ai = g.enemies.length - 1; ai >= 0; ai--) { const p = g.shots[pi], a = g.enemies[ai]; if (Math.hypot(p.x - a.x, p.y - a.y) < a.size) { g.shots.splice(pi, 1); if (--a.hp <= 0) destroy(g, ai); else { a.hit = .14; burst(g, a.x, a.y, '#a8eaff', 8); } break; } }
    for (let i = g.enemies.length - 1; i >= 0; i--) if (g.enemies[i].y + g.enemies[i].size >= g.groundY) { const a = g.enemies[i]; g.enemies.splice(i, 1); damage(g, a); } g.asteroids = g.enemies;
    if (g.comboTime > 0) g.comboTime -= dt; else g.combo = 1; for (const a of g.enemies) a.hit = Math.max(0, (a.hit || 0) - dt); for (const d of g.decals) d.life -= dt; g.decals = g.decals.filter(d => d.life > 0); for (const p of g.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } g.particles = g.particles.filter(p => p.life > 0); if (!g.pending && !g.enemies.length && g.state === 'PLAYING') beginWave(g); return g;
  }
  function turretGeometry(g) { const t = g.turret, anchorX = g.width / 2, anchorY = g.groundY - TURRET_VISIBLE_OFFSET, muzzleOffset = TURRET_MUZZLE_OFFSET - t.recoil * 8; return { anchorX, anchorY, x: anchorX, y: anchorY, angle: t.angle, recoil: t.recoil, heat: t.heat, barrelLength: TURRET_BARREL_LENGTH, baseWidth: 78, baseHeight: 42, muzzleX: anchorX + Math.cos(t.angle) * muzzleOffset, muzzleY: anchorY + Math.sin(t.angle) * muzzleOffset }; }
  return { MAX_ACTIVE_ENEMIES, MAX_PROJECTILES, MAX_PARTICLES, MAX_IMPACT_DECALS, SHOT_LIFE, BASE_HEALTH, createGame, start, update, wave, fire, burst, destroy, turretGeometry, asteroid: (x, y, size, random = Math.random) => ({ x, y, size, shape: shape(size, random), visual: visual(size, size > 30 ? 'large' : size > 18 ? 'medium' : 'small', random), hit: 0, vx: 0, vy: 0, tier: size > 30 ? 'large' : size > 18 ? 'medium' : 'small', generation: 0, hp: 1, angle: 0, spin: 0 }) };
});
