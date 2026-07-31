export const HISTORICAL_START = Date.UTC(1979, 4, 18, 10, 23, 21);
export const MIN_SESSIONS = 5;
export const MAX_SESSIONS = 8;

export const CANONICAL_ACCOUNTS = Object.freeze([
  's.harper', 'm.weber', 'h.sullivan', 'f.kessler'
]);

const AMBIENT_ACCOUNTS = Object.freeze([
  'j.miller', 'r.evans', 'a.carter', 'd.brooks', 'l.turner', 'p.hughes'
]);
const STABLE_ACCOUNTS = new Set(['operator', 'visitor']);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function seededRandom(seed = 19790518) {
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
  constructor({ random = seededRandom(), startTime = HISTORICAL_START } = {}) {
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
    return true;
  }

  removeSession(username) {
    const candidate = this.sessions.find(item => item.username === username);
    const canonicalCount = this.sessions.filter(item => item.canonical).length;
    if (!candidate || STABLE_ACCOUNTS.has(username) || this.sessions.length <= MIN_SESSIONS || (candidate.canonical && canonicalCount <= 3)) return false;
    this.sessions = this.sessions.filter(item => item !== candidate);
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
    this.status.processes = Math.round(clamp(29 + this.sessions.length * 2 + (this.random() - 0.5) * 3, 35, 50));
    this.status.runQueue = this.status.cpu > 32 && this.random() > 0.65 ? 2 : (this.random() > 0.78 ? 1 : 0);
    if (this.random() < 0.18) {
      const employees = this.sessions.filter(item => !STABLE_ACCOUNTS.has(item.username));
      if (employees.length) employees[Math.floor(this.random() * employees.length)].idleSeconds = 0;
    }
  }

  considerSessionChange() {
    const decision = this.random();
    if (decision < 0.12 && this.sessions.length < MAX_SESSIONS) {
      const available = AMBIENT_ACCOUNTS.filter(name => !this.sessions.some(item => item.username === name));
      return available.length ? this.addSession(available[Math.floor(this.random() * available.length)]) : false;
    }
    if (decision > 0.92 && this.sessions.length > MIN_SESSIONS) {
      const removable = this.sessions.filter(item => !item.canonical && !STABLE_ACCOUNTS.has(item.username));
      return removable.length ? this.removeSession(removable[Math.floor(this.random() * removable.length)].username) : false;
    }
    return false;
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
