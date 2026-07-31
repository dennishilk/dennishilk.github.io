import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CANONICAL_ACCOUNTS, CANONICAL_START, MAX_SESSIONS, MIN_SESSIONS, UnixSimulation, formatClock, formatDate, formatIdle, seededRandom, whoRows } from '../museum/unix-time-sharing-center/unix-simulation.mjs';

const page = await readFile(new URL('../museum/unix-time-sharing-center/index.html', import.meta.url), 'utf8');
const controller = await readFile(new URL('../museum/unix-time-sharing-center/unix-center.js', import.meta.url), 'utf8');
const museum = await readFile(new URL('../museum/index.html', import.meta.url), 'utf8');

test('company identity and planned route remain production framed', () => {
  assert.match(page, /Chesapeake Signal Tech/); assert.match(museum, /Chesapeake Signal Tech's computing room/);
  assert.doesNotMatch(page, /university/i); assert.doesNotMatch(page, /novel|The Lost Administrator|fictional character|Easter egg/i);
  assert.match(page, /PLANNED EXHIBIT/); assert.match(museum, /href="\/museum\/unix-time-sharing-center\/"/);
});

test('static fallback and canonical session pool use company account names', () => {
  for (const account of CANONICAL_ACCOUNTS) assert.match(page, new RegExp(account.replace('.', '\\.')));
  for (const obsolete of ['steve', 'michael', 'henry', 'frank', 'mweber', 'michael.weber']) assert.doesNotMatch(page, new RegExp(`\\b${obsolete.replace('.', '\\.')}\\b`, 'i'));
});

test('one session model supplies online users and who output', () => {
  assert.equal((controller.match(/whoRows\(simulation\)/g) || []).length, 2);
  const model = new UnixSimulation(); assert.equal(model.addSession('j.miller'), true); assert.equal(model.addSession('j.miller'), false);
  assert.ok(whoRows(model).some(row => row.username === 'j.miller')); assert.equal(model.removeSession('j.miller'), true);
  assert.ok(!whoRows(model).some(row => row.username === 'j.miller')); assert.equal(new Set(model.sessions.map(item => item.tty)).size, model.sessions.length);
});

test('canonical clock starts on Day Zero and advances through UTC rollovers', () => {
  const model = new UnixSimulation(); assert.equal(model.startTime, Date.UTC(2026, 6, 31, 12, 49, 13)); assert.equal(formatClock(model.now), '12:49:13'); assert.equal(formatDate(model.now), 'FRI JUL 31, 2026');
  model.advanceTo(model.startTime + 2000); assert.equal(formatClock(model.now), '12:49:15');
  const rollover = new UnixSimulation({ startTime: Date.UTC(2026, 6, 31, 23, 59, 58) }); rollover.advanceTo(rollover.startTime + 2000); assert.equal(formatClock(rollover.now), '00:00:00'); assert.equal(formatDate(rollover.now), 'SAT AUG 1, 2026');
  assert.equal(CANONICAL_START, Date.UTC(2026, 6, 31, 12, 49, 13));
});

test('production exhibit contains no residual 1979 dates', () => {
  assert.doesNotMatch(page, /1979|May 18/i); assert.doesNotMatch(controller, /1979|May 18/i); assert.doesNotMatch(museum, /UNIX Time Sharing Center[\s\S]{0,300}1979/i);
});

test('idle values advance and deterministic activity can reset them', () => {
  const values = [0.5, 0.5, 0.5, 0.5, 0.5, 0, 0]; const model = new UnixSimulation({ random: () => values.shift() ?? 0.5 });
  const before = model.sessions[1].idleSeconds; model.advanceTo(model.startTime + 61000); assert.equal(model.sessions[1].idleSeconds, before + 61); assert.equal(formatIdle(61), '0:01');
  model.drift(); assert.ok(model.sessions.some(active => active.idleSeconds === 0));
});

test('smoothed loads and status remain finite, bounded, and deterministic', () => {
  const first = new UnixSimulation({ random: seededRandom(7) }); const second = new UnixSimulation({ random: seededRandom(7) }); const previous = [...first.load];
  for (let index = 0; index < 30; index += 1) { first.drift(); second.drift(); }
  assert.deepEqual(first.load, second.load); assert.ok(first.load.every((value, index) => Number.isFinite(value) && value >= 0 && Math.abs(value - previous[index]) < 0.5));
  assert.ok(first.status.cpu >= 0 && first.status.cpu <= 100); assert.ok(first.status.memory >= 0 && first.status.memory <= 100); assert.ok(first.status.swap >= 0 && first.status.swap <= 100);
  assert.ok(first.status.processes >= 0 && first.status.runQueue >= 0);
});

test('ambient session limits, canonical preservation, and unique TTYs hold', () => {
  const model = new UnixSimulation({ random: () => 0 }); while (model.sessions.length < MAX_SESSIONS) model.addSession(`a.user${model.sessions.length}`); assert.equal(model.addSession('p.hughes'), false);
  for (const account of CANONICAL_ACCOUNTS) model.removeSession(account); assert.ok(model.sessions.filter(item => item.canonical).length >= 3);
  while (model.sessions.length > MIN_SESSIONS) { const removable = model.sessions.find(item => !item.canonical && !['operator', 'visitor'].includes(item.username)); if (!removable) break; model.removeSession(removable.username); }
  assert.ok(model.sessions.length >= MIN_SESSIONS && model.sessions.length <= MAX_SESSIONS); assert.equal(new Set(model.sessions.map(item => item.tty)).size, model.sessions.length);
});

test('CRT controls, fullscreen, static fallback, and unrelated BBS remain intact', async () => {
  for (const id of ['brightness', 'contrast', 'reset', 'clear', 'fullscreen']) assert.match(page, new RegExp(`id="${id}"`));
  assert.match(controller, /requestFullscreen/); assert.match(controller, /Symbol\.for\('museum\.unixTimeSharingCenter'\)/); assert.match(page, /<div id="online-users">[\s\S]+s\.harper/);
  const bbs = await readFile(new URL('../museum/bbs-system/index.html', import.meta.url), 'utf8'); assert.match(bbs, /BBS System/);
});
