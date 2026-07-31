import { FILES, LOGIN_HISTORY, PRINTER, STORAGE } from './unix-content.js';
export const CANONICAL_START = Date.UTC(2026, 6, 31, 12, 49, 13);
export const CANONICAL_UPTIME_SECONDS = 147 * 86400 + 6 * 3600 + 12 * 60;
export const MIN_SESSIONS = 5;
export const MAX_SESSIONS = 8;
export const AMBIENT_HISTORY_LIMIT = 12;

export const CANONICAL_ACCOUNTS = Object.freeze([
  's.harper', 'm.weber', 'h.sullivan', 'f.kessler'
]);

const AMBIENT_ACCOUNTS = Object.freeze([
  'j.miller', 'r.evans', 'a.carter', 'd.brooks', 'l.turner', 'p.hughes'
]);
const STABLE_ACCOUNTS = new Set(['operator', 'visitor']);
export const AMBIENT_MESSAGES = Object.freeze([
  { type: 'mail-delivered', text: 'Mail delivered to m.weber.' },
  { type: 'print-event', text: 'lpd: engineering printer online' },
  { type: 'cron-event', text: 'cron: temporary files cleanup completed' },
  { type: 'backup-event', text: 'backup: incremental archive complete' },
  { type: 'mail-delivered', text: 'New mail for s.harper.' },
  { type: 'operator-message', text: 'system: tape drive ready' },
  { type: 'print-event', text: 'lpd: printer queue updated' },
  { type: 'operator-message', text: 'operator: line printer maintenance at 18:00 UTC' },
  { type: 'mail-delivered', text: 'Mail delivered to h.sullivan.' },
  { type: 'cron-event', text: 'cron: accounting summary complete' },
  { type: 'backup-event', text: 'backup: Friday tape verified' },
  { type: 'mail-delivered', text: 'Mail delivered to f.kessler.' }
]);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function seededRandom(seed = 20260731) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function session(username, tty, loginOffsetMinutes, idleMinutes, canonical = false) {
  return { username, tty, loginOffsetMinutes, idleSeconds: idleMinutes * 60, canonical };
}

export class UnixSimulation {
  constructor({ random = seededRandom(), startTime = CANONICAL_START } = {}) {
    this.dialState = 'idle'; this.dialProgram = null; this.dialLog = ['Jul 29 22:14 visitor /dev/cu1 midnight-relay CONNECT 9600', 'Jul 29 22:31 visitor /dev/cu1 midnight-relay HANGUP'];
    this.random = random;
    this.startTime = startTime;
    this.now = startTime;
    this.sessions = [
      session('operator', 'tty0', -149, 1),
      session('s.harper', 'tty1', -11, 3, true),
      session('m.weber', 'tty2', -35, 17, true),
      session('h.sullivan', 'tty3', -4, 1, true),
      session('f.kessler', 'tty4', -87, 8, true),
      session('visitor', 'tty6', -1, 0)
    ];
    this.load = [0.24, 0.27, 0.23];
    this.status = { cpu: 18, memory: 33, swap: 4, processes: 42, runQueue: 1 };
    this.printer = structuredClone(PRINTER);
    this.storage = structuredClone(STORAGE);
    this.logs = FILES['/var/adm/messages'].content.split('\n');
    this.loginHistory = structuredClone(LOGIN_HISTORY);
    this.ambientHistory = [];
    this.lastAmbientIndex = -1;
  }

  advanceTo(timestamp) {
    if (!Number.isFinite(timestamp) || timestamp <= this.now) return;
    const seconds = Math.floor((timestamp - this.now) / 1000);
    if (seconds < 1) return;
    this.now += seconds * 1000;
    for (const active of this.sessions) active.idleSeconds += seconds;
  }

  addSession(username) {
    if (!username || this.sessions.length >= MAX_SESSIONS || this.sessions.some(item => item.username === username)) return false;
    const used = new Set(this.sessions.map(item => item.tty));
    let ttyNumber = 1;
    while (used.has(`tty${ttyNumber}`)) ttyNumber += 1;
    const loginOffsetMinutes = Math.floor((this.now - this.startTime) / 60000);
    this.sessions.push(session(username, `tty${ttyNumber}`, loginOffsetMinutes, 0, CANONICAL_ACCOUNTS.includes(username)));
    const stamp = new Date(this.now).toUTCString().replace(',','').slice(0,16); this.loginHistory.push({ username, tty:`tty${ttyNumber}`, login:stamp, end:'still logged in' }); if(this.loginHistory.length>20)this.loginHistory.shift();
    return true;
  }

  removeSession(username) {
    const candidate = this.sessions.find(item => item.username === username);
    const canonicalCount = this.sessions.filter(item => item.canonical).length;
    if (!candidate || STABLE_ACCOUNTS.has(username) || this.sessions.length <= MIN_SESSIONS || (candidate.canonical && canonicalCount <= 3)) return false;
    this.sessions = this.sessions.filter(item => item !== candidate);
    const record=[...this.loginHistory].reverse().find(r=>r.username===username&&r.end==='still logged in'); if(record)record.end=formatClock(this.now);
    return true;
  }

  drift() {
    const activity = this.sessions.length / MAX_SESSIONS;
    const target = 0.12 + activity * 0.25 + (this.random() - 0.5) * 0.10;
    this.load[0] = clamp(this.load[0] + (target - this.load[0]) * 0.22, 0, 1.5);
    this.load[1] = clamp(this.load[1] + (this.load[0] - this.load[1]) * 0.08, 0, 1.5);
    this.load[2] = clamp(this.load[2] + (this.load[1] - this.load[2]) * 0.035, 0, 1.5);
    this.status.cpu = Math.round(clamp(this.status.cpu + (target * 45 - this.status.cpu) * 0.18 + (this.random() - 0.5) * 2, 5, 48));
    this.status.memory = Math.round(clamp(this.status.memory + (this.random() - 0.48), 28, 45));
    this.status.swap = Math.round(clamp(this.status.swap + (this.random() < 0.08 ? (this.random() < 0.5 ? -1 : 1) : 0), 2, 9));
    const processStep = this.random() < 0.12 ? 2 : (this.random() < 0.68 ? 0 : (this.random() < 0.5 ? -1 : 1));
    this.status.processes = Math.round(clamp(this.status.processes + processStep, 35, 54));
    const queueRoll = this.random();
    this.status.runQueue = this.status.cpu > 34 && queueRoll > 0.92 ? 3
      : this.status.cpu > 27 && queueRoll > 0.72 ? 2
        : queueRoll > 0.38 ? 1 : 0;
    if (this.random() < 0.18) {
      const employees = this.sessions.filter(item => !STABLE_ACCOUNTS.has(item.username));
      if (employees.length) employees[Math.floor(this.random() * employees.length)].idleSeconds = 0;
    }
  }

  considerSessionChange() {
    const decision = this.random();
    if (decision < 0.22 && this.sessions.length < MAX_SESSIONS) {
      const available = AMBIENT_ACCOUNTS.filter(name => !this.sessions.some(item => item.username === name));
      if (!available.length) return null;
      const username = available[Math.floor(this.random() * available.length)];
      if (!this.addSession(username)) return null;
      this.applyActivityBoost();
      return { type: 'user-login', username };
    }
    if (decision > 0.92 && this.sessions.length > MIN_SESSIONS) {
      const removable = this.sessions.filter(item => !item.canonical && !STABLE_ACCOUNTS.has(item.username));
      if (!removable.length) return null;
      const username = removable[Math.floor(this.random() * removable.length)].username;
      return this.removeSession(username) ? { type: 'user-logout', username } : null;
    }
    return null;
  }

  applyActivityBoost() {
    this.status.cpu = Math.round(clamp(this.status.cpu + 2, 0, 48));
    this.status.processes = Math.round(clamp(this.status.processes + 1, 35, 54));
    this.load[0] = clamp(this.load[0] + 0.025, 0, 1.5);
  }

  considerAmbientMessage() {
    if (this.random() >= 0.30) return null;
    let index = Math.floor(this.random() * AMBIENT_MESSAGES.length);
    if (index === this.lastAmbientIndex) index = (index + 1) % AMBIENT_MESSAGES.length;
    this.lastAmbientIndex = index;
    const event = { ...AMBIENT_MESSAGES[index], timestamp: this.now };
    if (event.type === 'print-event' && /queue updated/.test(event.text) && this.printer.queue.length) { const done=this.printer.queue.shift(); this.printer.lastCompleted=done.job; this.printer.activeJob=this.printer.queue[0]?.job || null; this.printer.spoolCount=this.printer.queue.length; const d=new Date(this.now); this.logs.push(`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2,' ')} ${formatClock(this.now)} cs-vax1 lpd: completed ${done.job}`); if(this.logs.length>40)this.logs.shift(); event.text=`lpd: ${done.job} completed on cst-print1`; }
    this.ambientHistory.push(event);
    if (this.ambientHistory.length > AMBIENT_HISTORY_LIMIT) {
      this.ambientHistory.splice(0, this.ambientHistory.length - AMBIENT_HISTORY_LIMIT);
    }
    this.applyActivityBoost();
    return event;
  }
}

export function formatClock(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().slice(11, 19);
}

export function formatDate(timestamp) {
  const date = new Date(timestamp);
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${weekdays[date.getUTCDay()]} ${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function formatUptime(timestamp, startTime = CANONICAL_START) {
  const elapsedSeconds = Math.max(0, Math.floor((timestamp - startTime) / 1000));
  const uptimeSeconds = CANONICAL_UPTIME_SECONDS + elapsedSeconds;
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  return `UP ${days} DAYS, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatIdle(seconds) {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

export function formatLogin(simulation, active) {
  const login = new Date(simulation.startTime + active.loginOffsetMinutes * 60000);
  return `${String(login.getUTCHours()).padStart(2, '0')}:${String(login.getUTCMinutes()).padStart(2, '0')}`;
}

export function whoRows(simulation) {
  return simulation.sessions.map(active => ({
    username: active.username,
    tty: active.tty,
    login: formatLogin(simulation, active),
    idle: formatIdle(active.idleSeconds)
  }));
}
