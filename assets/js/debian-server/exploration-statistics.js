export const THEMES = [
  { id: 'system', title: 'Operating System Identification', description: 'wanted to identify the operating system', commands: ['fastfetch', 'uname -a', 'hostnamectl', 'cat /etc/os-release'] },
  { id: 'filesystem', title: 'Filesystem Exploration', description: 'explored the filesystem', commands: ['ls', 'pwd', 'cd', 'tree', 'find', 'mkdir'] },
  { id: 'administration', title: 'Administrative Curiosity', description: 'attempted administrative commands', commands: ['sudo -l', 'sudo shutdown now', 'sudo su', 'su'] },
  { id: 'network', title: 'Network Exploration', description: 'checked network connectivity', commands: ['ping 1.1.1.1', 'ping google.com', 'curl example.com', 'wget example.com', 'ip addr', 'ss'] },
  { id: 'dangerous', title: 'Dangerous Commands', description: 'attempted to remove the root directory', commands: ['rm -rf /', 'rm -rf --no-preserve-root /'] },
  { id: 'shutdown', title: 'Shutdown Attempts', description: 'attempted to shut the system down', commands: ['shutdown now', 'sudo shutdown now', 'poweroff', 'reboot', 'halt', 'systemctl poweroff'] }
];

const SAFE_EXACT = new Set(THEMES.flatMap(theme => theme.commands).concat(['exit', 'logout', 'journalctl']));
const SAFE_BASE = new Set(['ls', 'pwd', 'cd', 'tree', 'find', 'mkdir', 'rmdir', 'touch', 'rm', 'cat', 'less', 'head', 'tail', 'fastfetch', 'uname', 'hostnamectl', 'ping', 'curl', 'wget', 'ip', 'ss', 'sudo', 'su', 'shutdown', 'poweroff', 'reboot', 'halt', 'systemctl', 'journalctl', 'exit', 'logout']);

// Deliberately discard arguments that could contain names, paths, URLs, or entered text.
export function anonymizeCommand(source) {
  const normalized = String(source || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!normalized) return null;
  if (SAFE_EXACT.has(normalized)) return normalized;
  const base = normalized.split(' ')[0];
  return SAFE_BASE.has(base) ? base : 'other';
}

export function createAnonymousSession(session) {
  if (session?.status !== 'completed') return null;
  return {
    schemaVersion: 1,
    durationMs: Math.max(0, Number(session.durationMs) || 0),
    commands: (session.commands || []).filter(entry => !entry.empty).map(entry => ({
      command: anonymizeCommand(entry.text),
      elapsedMs: Math.max(0, Number(entry.elapsedMs) || 0)
    })).filter(entry => entry.command)
  };
}

export function submitAnonymousCompletedSession(session, fetcher = globalThis.fetch, storage = globalThis.sessionStorage) {
  const record = createAnonymousSession(session);
  if (!record || storage?.getItem('debian-exploration-submitted') === '1' || typeof fetcher !== 'function') return Promise.resolve(false);
  return fetcher('/api/debian-exploration-sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(record), credentials: 'omit', referrerPolicy: 'no-referrer' })
    .then(response => { if (!response.ok) return false; storage?.setItem('debian-exploration-submitted', '1'); return true; })
    .catch(() => false);
}

const percent = (count, total) => total ? Math.round(count * 100 / total) : 0;
const ranked = counts => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([command, count]) => ({ command, count }));
export function aggregateSessions(sessions = []) {
  const valid = sessions.filter(session => session?.schemaVersion === 1 && Array.isArray(session.commands) && Number.isFinite(session.durationMs));
  const total = valid.length;
  const commandCounts = new Map();
  let commandTotal = 0;
  for (const session of valid) for (const entry of session.commands) {
    if (typeof entry.command !== 'string') continue;
    commandCounts.set(entry.command, (commandCounts.get(entry.command) || 0) + 1); commandTotal++;
  }
  const themes = THEMES.map(theme => {
    const visitors = valid.filter(session => session.commands.some(entry => theme.commands.includes(entry.command))).length;
    return { ...theme, visitors, percentage: percent(visitors, total), common: ranked(theme.commands.map(command => [command, commandCounts.get(command) || 0]).filter(([, count]) => count)) };
  });
  const first = new Map(), last = new Map(), sequences = new Map();
  valid.forEach(session => {
    const commands = session.commands.map(entry => entry.command).filter(Boolean);
    if (commands[0]) first.set(commands[0], (first.get(commands[0]) || 0) + 1);
    if (commands.at(-1)) last.set(commands.at(-1), (last.get(commands.at(-1)) || 0) + 1);
    const compact = commands.filter((command, index) => command !== commands[index - 1]);
    for (let i = 0; i <= compact.length - 3; i++) { const key = compact.slice(i, i + Math.min(5, compact.length - i)).join('\u001f'); sequences.set(key, (sequences.get(key) || 0) + 1); }
  });
  const observations = [];
  const topFirst = ranked(first)[0], topLast = ranked(last)[0];
  if (topFirst) observations.push({ text: 'The most common first command was', command: topFirst.command, support: topFirst.count });
  if (topLast) observations.push({ text: 'The most common final command before exiting was', command: topLast.command, support: topLast.count });
  const danger = valid.filter(s => s.commands.some(e => e.command === 'rm -rf /'));
  const early = danger.filter(s => s.commands.find(e => e.command === 'rm -rf /')?.elapsedMs <= 120000).length;
  if (danger.length && early > danger.length / 2) observations.push({ text: 'Most visitors who attempted “rm -rf /” did so within the first two minutes.', support: early });
  return {
    completedSessions: total,
    averageDurationMs: total ? Math.round(valid.reduce((sum, s) => sum + s.durationMs, 0) / total) : 0,
    averageCommands: total ? Math.round(commandTotal / total) : 0,
    longestDurationMs: total ? Math.max(...valid.map(s => s.durationMs)) : 0,
    themes, observations,
    patterns: ranked(sequences).filter(item => item.count >= 2).slice(0, 4).map(item => ({ commands: item.command.split('\u001f'), count: item.count }))
  };
}
