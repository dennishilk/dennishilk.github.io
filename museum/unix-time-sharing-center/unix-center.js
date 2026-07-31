import { UnixSimulation, formatClock, formatDate, formatUptime, whoRows } from './unix-simulation.js';
import { SHELL_LIMITS, UnixShell } from './unix-shell.js';

const CLOCK_INTERVAL_MS = 1000;
export const STATUS_INTERVAL = Object.freeze({ minimum: 7000, spread: 5000 });
export const SESSION_INTERVAL = Object.freeze({ minimum: 45000, spread: 30000 });
export const AMBIENT_INTERVAL = Object.freeze({ minimum: 45000, spread: 30000, firstDelay: 120000 });
const LIFECYCLE_KEY = Symbol.for('museum.unixTimeSharingCenter');

export function initializeUnixCenter(doc = document, view = window, options = {}) {
  if (view[LIFECYCLE_KEY]) return view[LIFECYCLE_KEY];
  const screen = doc.querySelector('.screen');
  const transcript = screen?.querySelector('pre');
  const terminalInput = doc.querySelector('#terminal-input');
  const terminalAnnouncer = doc.querySelector('#terminal-announcer');
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
  let terminalLines = [];
  let inputValue = '';
  let inputCursor = 0;
  let shell;

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

  const canonicalTranscript = () => {
    const lines = whoRows(simulation).map(row =>
      `${row.username.padEnd(12)} ${row.tty.padEnd(7)} ${row.login.padEnd(8)} ${row.idle}`
    );
    const canonical = `Chesapeake Signal Tech UNIX/32V (cs-vax1)\n\nlogin: visitor\nPassword:\nLast login: Fri Jul 31 12:41:07 on tty6\nUNIX System VAX-11/780\n\nYou have 2 unread messages.\nType "help" for the exhibit roadmap.\n\n$ who\nUSER         TTY     LOGIN    IDLE\n${lines.join('\n')}\n\n$ mail\nMail version 6.2. Type ? for help.\n  1  m.weber    Printer maintenance complete\n  2  operator   Friday tape rotation\n& q\n`;
    return canonical.trimEnd().split('\n');
  };

  const renderTranscript = ({ announce = false } = {}) => {
    if (!transcript || !shell) return;
    const wasNearBottom = !screen || screen.scrollHeight - screen.scrollTop - screen.clientHeight < 48;
    transcript.replaceChildren();
    const body = doc.createTextNode(`${terminalLines.join('\n')}${terminalLines.length ? '\n' : ''}`);
    transcript.append(body);
    if (shell.mode === 'shell' || shell.mode.startsWith('mail')) {
      transcript.append(doc.createTextNode((shell.mode === 'shell' ? shell.prompt() : '& ') + inputValue.slice(0, inputCursor)));
      const cursor = doc.createElement('span'); cursor.className = 'cursor'; cursor.setAttribute('aria-hidden', 'true'); cursor.textContent = inputValue[inputCursor] || '█'; transcript.append(cursor);
      transcript.append(doc.createTextNode(inputValue.slice(inputCursor + (inputValue[inputCursor] ? 1 : 0))));
    }
    if (announce && terminalAnnouncer) terminalAnnouncer.textContent = `Command output. ${terminalLines.slice(-8).join(' ')}`.slice(0, 800);
    if (wasNearBottom) screen?.scrollTo?.(0, screen.scrollHeight);
  };
  const appendLines = lines => { terminalLines.push(...lines); if (terminalLines.length > SHELL_LIMITS.scrollback) terminalLines.splice(0, terminalLines.length - SHELL_LIMITS.scrollback); };
  const applyShellResult = result => {
    if (!result) return;
    if (result.reset) { reset(); return; }
    if (result.clear) terminalLines = [];
    else appendLines(result.lines);
    inputValue = ''; inputCursor = 0; if (terminalInput) terminalInput.value = '';
    renderTranscript({ announce: true });
  };
  const runInput = () => {
    if (shell.mode !== 'shell') { applyShellResult(shell.handleMode(inputValue)); return; }
    appendLines([`${shell.prompt()}${inputValue}`]);
    applyShellResult(shell.execute(inputValue));
  };
  const syncInput = (value, cursor = String(value).length, updateControl = true) => {
    inputValue = String(value).slice(0, SHELL_LIMITS.command);
    inputCursor = Math.max(0, Math.min(Number(cursor), inputValue.length));
    if (terminalInput && updateControl) {
      terminalInput.value = inputValue;
      terminalInput.setSelectionRange?.(inputCursor, inputCursor);
    }
    renderTranscript();
  };
  const handleTerminalKey = event => {
    if (!shell || doc.activeElement !== terminalInput) return;
    if (shell.mode === 'pager' || shell.mode === 'logged-out') { if ([' ','Enter','q','Q'].includes(event.key)) { event.preventDefault(); applyShellResult(shell.handleMode(event.key)); } return; }
    if (event.key === 'Enter') { event.preventDefault(); runInput(); return; }
    if (event.ctrlKey && event.key.toLowerCase() === 'c') { event.preventDefault(); appendLines([`${shell.prompt()}${inputValue}^C`]); syncInput(''); return; }
    if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); applyShellResult({ lines: [], clear: true }); return; }
    if (event.key === 'ArrowUp' && shell.mode === 'shell') { event.preventDefault(); shell.historyIndex = Math.max(0, shell.historyIndex - 1); syncInput(shell.history[shell.historyIndex] || ''); return; }
    if (event.key === 'ArrowDown' && shell.mode === 'shell') { event.preventDefault(); shell.historyIndex = Math.min(shell.history.length, shell.historyIndex + 1); syncInput(shell.history[shell.historyIndex] || ''); return; }
    if (event.key === 'Tab' && shell.mode === 'shell') { event.preventDefault(); const completed=shell.complete(inputValue); if(completed.matches.length>1){appendLines([completed.matches.join('  ')]);renderTranscript();}else syncInput(completed.value); return; }
  };
  const focusTerminal = () => terminalInput?.focus({ preventScroll: true });
  const syncCursor = () => { inputCursor = terminalInput?.selectionStart ?? inputValue.length; renderTranscript(); };
  const initializeTerminal = () => {
    shell = new UnixShell(() => simulation);
    terminalLines = canonicalTranscript();
    screen?.addEventListener('click', focusTerminal);
    terminalInput?.addEventListener('input', event => syncInput(event.target.value, event.target.selectionStart, false));
    terminalInput?.addEventListener('keydown', handleTerminalKey);
    terminalInput?.addEventListener('keyup', syncCursor);
    terminalInput?.addEventListener('click', syncCursor);
    terminalInput?.addEventListener('focus', () => screen?.classList?.add('terminal-focused'));
    terminalInput?.addEventListener('blur', () => screen?.classList?.remove('terminal-focused'));
    renderTranscript();
  };

  const appendAmbient = event => {
    const line = `[${formatClock(event.timestamp)}] ${event.text}`;
    if (shell.queueAmbient(line)) return;
    appendLines(['', line]);
    renderTranscript();
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
  };

  const renderClock = () => {
    clock.textContent = formatClock(simulation.now);
    if (elements.systemDate) elements.systemDate.textContent = formatDate(simulation.now);
    if (elements.uptime) elements.uptime.textContent = formatUptime(simulation.now, simulation.startTime);
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
      const ambient = simulation.considerAmbientMessage();
      transcriptChanged = Boolean(ambient);
      if (ambient && !doc.hidden) appendAmbient(ambient);
      nextAmbientCheck = elapsed + AMBIENT_INTERVAL.minimum + simulation.random() * AMBIENT_INTERVAL.spread;
    }
    if (!doc.hidden) {
      renderClock();
      renderSessions();
      if (sessionsChanged && !transcriptChanged) renderTranscript();
    }
  };
  const handleVisibility = () => { if (!doc.hidden) { tick(); renderStatus(); renderTranscript(); } };

  const { brightness, contrast } = elements;
  const applyDisplay = () => {
    if (screen && brightness && contrast) screen.style.filter = `brightness(${brightness.value}%) contrast(${contrast.value}%)`;
  };
  const clear = () => { showCanonicalTranscript = false; terminalLines = []; renderTranscript(); focusTerminal(); };
  const reset = () => {
    simulation = createSimulation();
    simulation.ambientHistory.length = 0;
    startedAt = monotonicNow();
    nextStatus = STATUS_INTERVAL.minimum + simulation.random() * STATUS_INTERVAL.spread;
    nextSessionCheck = SESSION_INTERVAL.minimum + simulation.random() * SESSION_INTERVAL.spread;
    nextAmbientCheck = AMBIENT_INTERVAL.firstDelay + simulation.random() * AMBIENT_INTERVAL.spread;
    showCanonicalTranscript = true;
    shell?.reset(); terminalLines = canonicalTranscript(); inputValue = ''; inputCursor = 0;
    if (terminalInput) terminalInput.value = '';
    if (brightness) brightness.value = 100;
    if (contrast) contrast.value = 100;
    applyDisplay();
    renderClock(); renderSessions(); renderStatus(); renderTranscript(); focusTerminal();
  };
  const fullscreen = () => doc.fullscreenElement ? doc.exitFullscreen() : elements.terminalStation?.requestFullscreen?.();
  brightness?.addEventListener('input', applyDisplay);
  contrast?.addEventListener('input', applyDisplay);
  elements.clear?.addEventListener('click', clear);
  elements.reset?.addEventListener('click', reset);
  elements.fullscreen?.addEventListener('click', fullscreen);

  initializeTerminal(); renderClock(); renderSessions(); renderStatus();
  doc.documentElement.dataset.unixSimulation = 'active';
  const timer = view.setInterval(tick, CLOCK_INTERVAL_MS);
  const destroy = () => {
    view.clearInterval(timer);
    brightness?.removeEventListener('input', applyDisplay);
    contrast?.removeEventListener('input', applyDisplay);
    elements.clear?.removeEventListener('click', clear);
    elements.reset?.removeEventListener('click', reset);
    elements.fullscreen?.removeEventListener('click', fullscreen);
    screen?.removeEventListener('click', focusTerminal);
    terminalInput?.removeEventListener('keydown', handleTerminalKey);
    terminalInput?.removeEventListener('keyup', syncCursor);
    terminalInput?.removeEventListener('click', syncCursor);
    doc.removeEventListener('visibilitychange', handleVisibility);
    view.removeEventListener('pagehide', destroy);
    if (view[LIFECYCLE_KEY]?.destroy === destroy) delete view[LIFECYCLE_KEY];
    delete doc.documentElement.dataset.unixSimulation;
  };
  view.addEventListener('pagehide', destroy, { once: true });
  doc.addEventListener('visibilitychange', handleVisibility);
  const lifecycle = { get simulation() { return simulation; }, get shell() { return shell; }, tick, destroy, reset, clear };
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
