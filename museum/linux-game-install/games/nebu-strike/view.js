(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.NebuStrikeView = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';

  // The terminal owns this lifecycle.  In particular, loading this file must not
  // start a hidden game or an animation loop before `nebustrike` is entered.
  const Lifecycle = Object.freeze({ UNINITIALIZED: 'UNINITIALIZED', INITIALIZING: 'INITIALIZING', RUNNING: 'RUNNING', STOPPED: 'STOPPED' });
  function createGameView(options) {
    const win = options.window, doc = options.document, Core = options.Core;
    let lifecycle = Lifecycle.UNINITIALIZED, game, canvas, ctx, screen, last = 0, rafId = null;
    let keys = {}, audio = null, listenersAttached = false;
    const counts = { launchCount: 0, gameInitCount: 0, rafStartCount: 0, resizeCount: 0, renderCount: 0 };
    const requestFrame = () => { if (lifecycle === Lifecycle.RUNNING && rafId === null) rafId = win.requestAnimationFrame(frame); };
    function sound(kind) {
      try {
        const Audio = win.AudioContext || win.webkitAudioContext;
        if (!Audio) return;
        audio ??= new Audio();
        // This is called only by a keyboard/click handler, never during launch.
        audio.resume().catch(() => {});
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.connect(gain).connect(audio.destination);
        const value = ({ fire: [220, .06, 'square'], hit: [80, .3, 'sawtooth'], wave: [440, .16, 'sine'], start: [660, .12, 'triangle'] })[kind] || [220, .06, 'square'];
        oscillator.type = value[2]; oscillator.frequency.setValueAtTime(value[0], audio.currentTime); oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, value[0] * .45), audio.currentTime + value[1]);
        gain.gain.setValueAtTime(.055, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + value[1]); oscillator.start(); oscillator.stop(audio.currentTime + value[1]);
      } catch (_) { /* Audio is optional. */ }
    }
    function resize() {
      if (!canvas || !screen || !game) return;
      counts.resizeCount++;
      const rect = screen.getBoundingClientRect(), width = Math.max(1, rect.width), height = Math.max(1, rect.height), dpr = Math.min(win.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); game.width = width; game.height = height;
    }
    function path(asteroid) { ctx.beginPath(); asteroid.shape.forEach(([x, y], index) => { const c = Math.cos(asteroid.angle), s = Math.sin(asteroid.angle), X = asteroid.x + x * c - y * s, Y = asteroid.y + x * s + y * c; index ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); }
    function draw() {
      counts.renderCount++;
      const w = game.width, h = game.height; ctx.fillStyle = '#02070e'; ctx.fillRect(0, 0, w, h);
      const nebula = ctx.createRadialGradient(w * .7, h * .2, 0, w * .7, h * .2, w * .7); nebula.addColorStop(0, '#152c5b66'); nebula.addColorStop(1, '#02070e00'); ctx.fillStyle = nebula; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#b9eaff'; for (let i = 0; i < 90; i++) { const x = i * 127.13 % w, y = i * 71.3 % h; ctx.globalAlpha = .25 + i % 4 * .14; ctx.fillRect(x, y, 1 + (i % 3 === 0), 1 + (i % 3 === 0)); } ctx.globalAlpha = 1;
      ctx.save(); ctx.translate((Math.random() - .5) * game.shake * 10, (Math.random() - .5) * game.shake * 10); ctx.lineWidth = 2; ctx.shadowBlur = 13; ctx.shadowColor = '#75dfff'; ctx.strokeStyle = '#91eaff'; game.asteroids.forEach(asteroid => { path(asteroid); ctx.stroke(); });
      ctx.fillStyle = '#fff3ba'; game.shots.forEach(shot => { ctx.shadowColor = '#fff4a3'; ctx.beginPath(); ctx.arc(shot.x, shot.y, 2.5, 0, 7); ctx.fill(); }); game.particles.forEach(particle => { ctx.globalAlpha = Math.max(0, particle.life); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, 2, 2); }); ctx.globalAlpha = 1;
      const ship = game.ship; ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle); if (keys.thrust && game.state === 'PLAYING') { ctx.fillStyle = '#6ee7ff'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-32, 7); ctx.lineTo(-25, 0); ctx.lineTo(-32, -7); ctx.fill(); } ctx.strokeStyle = ship.invincible > 0 ? '#ffe39b' : '#e7fbff'; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-15, 13); ctx.lineTo(-7, 0); ctx.lineTo(-15, -13); ctx.closePath(); ctx.stroke(); ctx.restore(); ctx.shadowBlur = 0; hud();
    }
    function readBest() { try { return +win.localStorage.nebuStrikeBest || 0; } catch (_) { return 0; } }
    function hud() { ctx.fillStyle = '#b9d9e4'; ctx.font = '600 12px ui-monospace,monospace'; ctx.fillText(`SCORE ${String(game.score).padStart(6, '0')}`, 28, 35); ctx.fillText(`WAVE ${game.wave}`, 28, 55); ctx.textAlign = 'right'; ctx.fillText(`HULL ${'◆ '.repeat(game.lives)}`, game.width - 28, 35); ctx.textAlign = 'left'; if (game.state === 'TITLE' || game.state === 'GAMEOVER' || game.state === 'COUNTDOWN') { const lost = game.state === 'GAMEOVER'; ctx.textAlign = 'center'; ctx.fillStyle = '#e5faff'; ctx.font = `700 ${Math.min(78, Math.max(30, game.width * .06))}px ui-monospace,monospace`; ctx.fillText(lost ? 'SECTOR LOST' : 'NEBU STRIKE', game.width / 2, game.height * .42); ctx.fillStyle = '#8ee5f5'; ctx.font = '14px ui-monospace,monospace'; ctx.fillText(lost ? 'PRESS ENTER TO DEPLOY AGAIN' : 'DEEP SPACE DEFENSE', game.width / 2, game.height * .48); if (game.state === 'COUNTDOWN') { ctx.font = '700 54px ui-monospace,monospace'; ctx.fillText(Math.ceil(game.countdown), game.width / 2, game.height * .59); } else { ctx.fillStyle = '#ffd68d'; ctx.fillText(lost ? `FINAL SCORE ${game.score} · BEST ${Math.max(game.best, readBest())}` : 'ENTER / CLICK TO START', game.width / 2, game.height * .59); } ctx.textAlign = 'left'; } }
    function frame(timestamp) { rafId = null; if (lifecycle !== Lifecycle.RUNNING) return; const dt = Math.min(.05, Math.max(0, (timestamp - last) / 1000 || 0)); last = timestamp; const score = game.score, shots = game.shots.length, oldState = game.state; Core.update(game, keys, dt); if (game.shots.length > shots) sound('fire'); if (game.score > score) sound('hit'); if (oldState === 'COUNTDOWN' && game.state === 'PLAYING') sound('wave'); if (game.state === 'GAMEOVER') try { win.localStorage.nebuStrikeBest = Math.max(readBest(), game.score); } catch (_) {} draw(); requestFrame(); }
    function begin() { if (game && (game.state === 'TITLE' || game.state === 'GAMEOVER')) { Core.start(game); sound('start'); } }
    const keydown = event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'd', 'w', 'r', 'Enter'].includes(event.key)) event.preventDefault(); if (event.key === 'Enter') begin(); if (event.key.toLowerCase() === 'r') Core.start(game); keys.left = event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a' ? true : keys.left; keys.right = event.key === 'ArrowRight' || event.key.toLowerCase() === 'd' ? true : keys.right; keys.thrust = event.key === 'ArrowUp' || event.key.toLowerCase() === 'w' ? true : keys.thrust; keys.fire = event.key === ' ' ? true : keys.fire; };
    const keyup = event => { if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false; if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false; if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') keys.thrust = false; if (event.key === ' ') keys.fire = false; };
    const restart = () => { Core.start(game); sound('start'); }, fullscreen = () => screen.requestFullscreen?.();
    function attach() { if (listenersAttached) return; win.addEventListener('resize', resize); win.addEventListener('keydown', keydown); win.addEventListener('keyup', keyup); canvas.addEventListener('click', begin); doc.querySelector('#gameRestart').addEventListener('click', restart); doc.querySelector('#gameFullscreen').addEventListener('click', fullscreen); listenersAttached = true; }
    function detach() { if (!listenersAttached) return; win.removeEventListener('resize', resize); win.removeEventListener('keydown', keydown); win.removeEventListener('keyup', keyup); canvas.removeEventListener('click', begin); doc.querySelector('#gameRestart').removeEventListener('click', restart); doc.querySelector('#gameFullscreen').removeEventListener('click', fullscreen); listenersAttached = false; }
    function launch() { if (lifecycle === Lifecycle.INITIALIZING || lifecycle === Lifecycle.RUNNING) return false; counts.launchCount++; lifecycle = Lifecycle.INITIALIZING; canvas = doc.querySelector('#gameCanvas'); screen = doc.querySelector('#gameScreen'); ctx = canvas.getContext('2d'); game = Core.createGame(); keys = {}; last = 0; attach(); resize(); lifecycle = Lifecycle.RUNNING; counts.gameInitCount++; counts.rafStartCount++; requestFrame(); return true; }
    function stop() { if (lifecycle !== Lifecycle.RUNNING && lifecycle !== Lifecycle.INITIALIZING) return; lifecycle = Lifecycle.STOPPED; if (rafId !== null) win.cancelAnimationFrame(rafId); rafId = null; detach(); }
    return { launch, stop, destroy: stop, getLifecycle: () => lifecycle, getCounts: () => ({ ...counts }), getGame: () => game, Lifecycle };
  }
  return { createGameView, Lifecycle };
});
