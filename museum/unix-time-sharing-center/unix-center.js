import { UnixSimulation, formatClock, formatDate, whoRows } from './unix-simulation.mjs';

const CLOCK_INTERVAL_MS = 1000;
const STATUS_INTERVAL_MS = 7000;
const SESSION_INTERVAL_MS = 30000;
const LIFECYCLE_KEY = Symbol.for('museum.unixTimeSharingCenter');

export function initializeUnixCenter(doc = document, view = window) {
  view[LIFECYCLE_KEY]?.destroy();
  const screen = doc.querySelector('.screen');
  const transcript = screen?.querySelector('pre');
  const usersTable = doc.querySelector('#online-users');
  if (!screen || !transcript || !usersTable) return null;

  const simulation = new UnixSimulation();
  const startedAt = view.performance?.now?.() ?? Date.now();
  let lastStatus = 0;
  let lastSessionCheck = 0;
  let transcriptCleared = false;

  const renderSessions = () => {
    const rows = whoRows(simulation);
    usersTable.replaceChildren(...rows.map(row => {
      const line = doc.createElement('div');
      line.className = 'tr';
      for (const value of [row.username, row.tty, row.login, row.idle]) {
        const cell = doc.createElement('span');
        cell.textContent = value;
        line.append(cell);
      }
      return line;
    }));
    doc.querySelector('#session-count').textContent = `${rows.length} active login sessions`;
    doc.querySelector('#current-users').textContent = String(rows.length);
  };

  const renderTranscript = () => {
    const lines = whoRows(simulation).map(row =>
      `${row.username.padEnd(12)} ${row.tty.padEnd(7)} ${row.login.padEnd(8)} ${row.idle}`
    );
    transcript.textContent = `Chesapeake Signal Tech UNIX/32V (cs-vax1)\n\nlogin: visitor\nPassword:\nLast login: Fri May 18 10:15:07 on tty6\nUNIX System VAX-11/780\n\nYou have 2 unread messages.\nType "help" for the exhibit roadmap.\n\n$ who\nUSER         TTY     LOGIN    IDLE\n${lines.join('\n')}\n\n$ mail\nMail version 6.2. Type ? for help.\n  1  m.weber    Printer maintenance complete\n  2  operator   Friday tape rotation\n& q\n\n$ `;
    const cursor = doc.createElement('span');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.textContent = '█';
    transcript.append(cursor);
  };

  const renderStatus = () => {
    doc.querySelector('#load-average').textContent = simulation.load.map(value => value.toFixed(2)).join('\u00a0  ');
    for (const name of ['cpu', 'memory', 'swap']) {
      const node = doc.querySelector(`#status-${name}`);
      node.firstChild.textContent = `${String(simulation.status[name]).padStart(2, '0')}% `;
      node.querySelector('i').style.setProperty('--fill', `${simulation.status[name]}%`);
    }
    doc.querySelector('#status-processes').textContent = simulation.status.processes;
    doc.querySelector('#status-run-queue').textContent = simulation.status.runQueue;
    const uptimeSeconds = 2 * 86400 + 6 * 3600 + 12 * 60 + Math.floor((simulation.now - simulation.startTime) / 1000);
    doc.querySelector('#uptime').textContent = `UP ${Math.floor(uptimeSeconds / 86400)} DAYS, ${String(Math.floor(uptimeSeconds % 86400 / 3600)).padStart(2, '0')}:${String(Math.floor(uptimeSeconds % 3600 / 60)).padStart(2, '0')}`;
  };

  const renderClock = () => {
    doc.querySelector('#clock').textContent = formatClock(simulation.now);
    doc.querySelector('#system-date').textContent = formatDate(simulation.now);
  };

  const tick = () => {
    const elapsed = (view.performance?.now?.() ?? Date.now()) - startedAt;
    simulation.advanceTo(simulation.startTime + elapsed);
    if (elapsed - lastStatus >= STATUS_INTERVAL_MS) {
      simulation.drift();
      lastStatus = elapsed;
      renderStatus();
    }
    if (elapsed - lastSessionCheck >= SESSION_INTERVAL_MS) {
      simulation.considerSessionChange();
      lastSessionCheck = elapsed;
    }
    if (!doc.hidden) {
      renderClock();
      renderSessions();
      if (!transcriptCleared) renderTranscript();
    }
  };

  const brightness = doc.querySelector('#brightness');
  const contrast = doc.querySelector('#contrast');
  const applyDisplay = () => { screen.style.filter = `brightness(${brightness.value}%) contrast(${contrast.value}%)`; };
  const clear = () => { transcriptCleared = true; transcript.textContent = ''; };
  const reset = () => { transcriptCleared = false; brightness.value = 100; contrast.value = 100; applyDisplay(); renderTranscript(); };
  const fullscreen = () => doc.fullscreenElement ? doc.exitFullscreen() : doc.querySelector('.terminal-station').requestFullscreen?.();
  brightness.addEventListener('input', applyDisplay);
  contrast.addEventListener('input', applyDisplay);
  doc.querySelector('#clear').addEventListener('click', clear);
  doc.querySelector('#reset').addEventListener('click', reset);
  doc.querySelector('#fullscreen').addEventListener('click', fullscreen);

  renderClock(); renderSessions(); renderStatus(); renderTranscript();
  const timer = view.setInterval(tick, CLOCK_INTERVAL_MS);
  const destroy = () => {
    view.clearInterval(timer);
    brightness.removeEventListener('input', applyDisplay);
    contrast.removeEventListener('input', applyDisplay);
    doc.querySelector('#clear').removeEventListener('click', clear);
    doc.querySelector('#reset').removeEventListener('click', reset);
    doc.querySelector('#fullscreen').removeEventListener('click', fullscreen);
    view.removeEventListener('pagehide', destroy);
    if (view[LIFECYCLE_KEY]?.destroy === destroy) delete view[LIFECYCLE_KEY];
  };
  view.addEventListener('pagehide', destroy, { once: true });
  return (view[LIFECYCLE_KEY] = { simulation, tick, destroy });
}

if (typeof document !== 'undefined') initializeUnixCenter();
