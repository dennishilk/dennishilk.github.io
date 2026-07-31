import { UnixSimulation, formatClock, formatDate, whoRows } from './unix-simulation.mjs';

const CLOCK_INTERVAL_MS = 1000;
export const STATUS_INTERVAL = Object.freeze({ minimum: 7000, spread: 5000 });
export const SESSION_INTERVAL = Object.freeze({ minimum: 45000, spread: 30000 });
export const AMBIENT_INTERVAL = Object.freeze({ minimum: 45000, spread: 30000, firstDelay: 120000 });
const LIFECYCLE_KEY = Symbol.for('museum.unixTimeSharingCenter');

export function initializeUnixCenter(doc = document, view = window, options = {}) {
  if (view[LIFECYCLE_KEY]) return view[LIFECYCLE_KEY];
  const screen = doc.querySelector('.screen');
  const transcript = screen?.querySelector('pre');
  const usersTable = doc.querySelector('#online-users');
  const clock = doc.querySelector('#clock');
  if (!clock) return null;

  const elements = {
    systemDate: doc.querySelector('#system-date'),
    loadAverage: doc.querySelector('#load-average'),
    uptime: doc.querySelector('#uptime'),
    currentUsers: doc.querySelector('#current-users'),
    sessionCount: doc.querySelector('#session-count'),
    cpu: doc.querySelector('#status-cpu'),
    memory: doc.querySelector('#status-memory'),
    swap: doc.querySelector('#status-swap'),
    processes: doc.querySelector('#status-processes'),
    runQueue: doc.querySelector('#status-run-queue'),
    brightness: doc.querySelector('#brightness'),
    contrast: doc.querySelector('#contrast'),
    clear: doc.querySelector('#clear'),
    reset: doc.querySelector('#reset'),
    fullscreen: doc.querySelector('#fullscreen'),
    terminalStation: doc.querySelector('.terminal-station')
  };

  const createSimulation = options.createSimulation ?? (() => new UnixSimulation(options.simulationOptions));
  const monotonicNow = options.now ?? (() => view.performance?.now?.() ?? Date.now());
  let simulation = createSimulation();
  let startedAt = monotonicNow();
  let nextStatus = STATUS_INTERVAL.minimum + simulation.random() * STATUS_INTERVAL.spread;
  let nextSessionCheck = SESSION_INTERVAL.minimum + simulation.random() * SESSION_INTERVAL.spread;
  let nextAmbientCheck = AMBIENT_INTERVAL.firstDelay + simulation.random() * AMBIENT_INTERVAL.spread;
  let showCanonicalTranscript = true;

  const renderSessions = () => {
    const rows = whoRows(simulation);
    if (usersTable) usersTable.replaceChildren(...rows.map(row => {
      const line = doc.createElement('div');
      line.className = 'tr';
      for (const value of [row.username, row.tty, row.login, row.idle]) {
        const cell = doc.createElement('span');
        cell.textContent = value;
        line.append(cell);
      }
      return line;
    }));
    if (elements.sessionCount) elements.sessionCount.textContent = `${rows.length} active login sessions`;
    if (elements.currentUsers) elements.currentUsers.textContent = String(rows.length);
  };

  const renderTranscript = () => {
    const lines = whoRows(simulation).map(row =>
      `${row.username.padEnd(12)} ${row.tty.padEnd(7)} ${row.login.padEnd(8)} ${row.idle}`
    );
    const canonical = `Chesapeake Signal Tech UNIX/32V (cs-vax1)\n\nlogin: visitor\nPassword:\nLast login: Fri Jul 31 12:41:07 on tty6\nUNIX System VAX-11/780\n\nYou have 2 unread messages.\nType "help" for the exhibit roadmap.\n\n$ who\nUSER         TTY     LOGIN    IDLE\n${lines.join('\n')}\n\n$ mail\nMail version 6.2. Type ? for help.\n  1  m.weber    Printer maintenance complete\n  2  operator   Friday tape rotation\n& q\n`;
    const ambient = simulation.ambientHistory.map(event => `[${formatClock(event.timestamp)}] ${event.text}`).join('\n');
    if (!transcript) return;
    transcript.textContent = `${showCanonicalTranscript ? canonical : ''}${ambient ? `\n${ambient}\n` : ''}\n$ `;
    const cursor = doc.createElement('span');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.textContent = '█';
    transcript.append(cursor);
  };

  const renderStatus = () => {
    if (elements.loadAverage) elements.loadAverage.textContent = simulation.load.map(value => value.toFixed(2)).join('\u00a0  ');
    for (const name of ['cpu', 'memory', 'swap']) {
      const node = elements[name];
      if (!node) continue;
      if (node.firstChild?.nodeType === 3) node.firstChild.textContent = `${String(simulation.status[name]).padStart(2, '0')}% `;
      else node.prepend(doc.createTextNode(`${String(simulation.status[name]).padStart(2, '0')}% `));
      node.querySelector('i')?.style.setProperty('--fill', `${simulation.status[name]}%`);
    }
    if (elements.processes) elements.processes.textContent = simulation.status.processes;
    if (elements.runQueue) elements.runQueue.textContent = simulation.status.runQueue;
    const uptimeSeconds = 2 * 86400 + 6 * 3600 + 12 * 60 + Math.floor((simulation.now - simulation.startTime) / 1000);
    if (elements.uptime) elements.uptime.textContent = `UP ${Math.floor(uptimeSeconds / 86400)} DAYS, ${String(Math.floor(uptimeSeconds % 86400 / 3600)).padStart(2, '0')}:${String(Math.floor(uptimeSeconds % 3600 / 60)).padStart(2, '0')}`;
  };

  const renderClock = () => {
    clock.textContent = formatClock(simulation.now);
    if (elements.systemDate) elements.systemDate.textContent = formatDate(simulation.now);
  };

  const tick = () => {
    const elapsed = monotonicNow() - startedAt;
    simulation.advanceTo(simulation.startTime + elapsed);
    let sessionsChanged = false;
    let transcriptChanged = false;
    if (elapsed >= nextStatus) {
      simulation.drift();
      nextStatus = elapsed + STATUS_INTERVAL.minimum + simulation.random() * STATUS_INTERVAL.spread;
      if (!doc.hidden) renderStatus();
    }
    if (elapsed >= nextSessionCheck) {
      sessionsChanged = Boolean(simulation.considerSessionChange());
      nextSessionCheck = elapsed + SESSION_INTERVAL.minimum + simulation.random() * SESSION_INTERVAL.spread;
    }
    if (elapsed >= nextAmbientCheck) {
      transcriptChanged = Boolean(simulation.considerAmbientMessage());
      nextAmbientCheck = elapsed + AMBIENT_INTERVAL.minimum + simulation.random() * AMBIENT_INTERVAL.spread;
    }
    if (!doc.hidden) {
      renderClock();
      renderSessions();
      if (sessionsChanged || transcriptChanged) renderTranscript();
    }
  };
  const handleVisibility = () => { if (!doc.hidden) { tick(); renderStatus(); renderTranscript(); } };

  const { brightness, contrast } = elements;
  const applyDisplay = () => {
    if (screen && brightness && contrast) screen.style.filter = `brightness(${brightness.value}%) contrast(${contrast.value}%)`;
  };
  const clear = () => { showCanonicalTranscript = false; simulation.ambientHistory.length = 0; renderTranscript(); };
  const reset = () => {
    simulation = createSimulation();
    startedAt = monotonicNow();
    nextStatus = STATUS_INTERVAL.minimum + simulation.random() * STATUS_INTERVAL.spread;
    nextSessionCheck = SESSION_INTERVAL.minimum + simulation.random() * SESSION_INTERVAL.spread;
    nextAmbientCheck = AMBIENT_INTERVAL.firstDelay + simulation.random() * AMBIENT_INTERVAL.spread;
    showCanonicalTranscript = true;
    if (brightness) brightness.value = 100;
    if (contrast) contrast.value = 100;
    applyDisplay();
    renderClock(); renderSessions(); renderStatus(); renderTranscript();
  };
  const fullscreen = () => doc.fullscreenElement ? doc.exitFullscreen() : elements.terminalStation?.requestFullscreen?.();
  brightness?.addEventListener('input', applyDisplay);
  contrast?.addEventListener('input', applyDisplay);
  elements.clear?.addEventListener('click', clear);
  elements.reset?.addEventListener('click', reset);
  elements.fullscreen?.addEventListener('click', fullscreen);

  renderClock(); renderSessions(); renderStatus(); renderTranscript();
  doc.documentElement.dataset.unixSimulation = 'active';
  const timer = view.setInterval(tick, CLOCK_INTERVAL_MS);
  const destroy = () => {
    view.clearInterval(timer);
    brightness?.removeEventListener('input', applyDisplay);
    contrast?.removeEventListener('input', applyDisplay);
    elements.clear?.removeEventListener('click', clear);
    elements.reset?.removeEventListener('click', reset);
    elements.fullscreen?.removeEventListener('click', fullscreen);
    doc.removeEventListener('visibilitychange', handleVisibility);
    view.removeEventListener('pagehide', destroy);
    if (view[LIFECYCLE_KEY]?.destroy === destroy) delete view[LIFECYCLE_KEY];
    delete doc.documentElement.dataset.unixSimulation;
  };
  view.addEventListener('pagehide', destroy, { once: true });
  doc.addEventListener('visibilitychange', handleVisibility);
  const lifecycle = { get simulation() { return simulation; }, tick, destroy, reset, clear };
  return (view[LIFECYCLE_KEY] = lifecycle);
}

export function startUnixCenter(doc = document, view = window, options = {}) {
  const start = () => {
    try {
      return initializeUnixCenter(doc, view, options);
    } catch (error) {
      console.error('UNIX Time Sharing Center failed to initialize', error);
      return null;
    }
  };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', start, { once: true });
    return null;
  }
  return start();
}

if (typeof document !== 'undefined') startUnixCenter();
