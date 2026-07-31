import test from 'node:test';
import assert from 'node:assert/strict';
import { UnixSimulation } from '../museum/unix-time-sharing-center/unix-simulation.js';
import { COMMANDS, SHELL_LIMITS, UnixShell, commandNames, normalizePath, tokenize } from '../museum/unix-time-sharing-center/unix-shell.js';

const makeShell = () => { const simulation = new UnixSimulation(); return { simulation, shell: new UnixShell(() => simulation) }; };
const output = (shell, command) => shell.execute(command).lines.join('\n');

test('tokenizer supports quotes and escaped spaces but rejects executable syntax and limits', () => {
  assert.deepEqual(tokenize(`echo one 'two three' "four five" six\\ seven`).words, ['echo','one','two three','four five','six seven']);
  for (const input of ['cat x | more','echo x > y','echo $(date)','echo `date`','date; uname','date && uname']) assert.match(tokenize(input).error, /not available/);
  assert.match(tokenize('x'.repeat(SHELL_LIMITS.command + 1)).error, /exceeds/);
});

test('registry drives help, aliases, manuals, and completion', () => {
  const { shell } = makeShell();
  assert(COMMANDS.size >= 23); assert(commandNames().includes('exit'));
  assert.match(output(shell, 'help'), /SYSTEM[\s\S]*PEOPLE[\s\S]*FILES/);
  assert.match(output(shell, 'help who'), /Usage: who[\s\S]*live simulation/);
  assert.equal(shell.complete('hostn').value, 'hostname ');
  assert.match(output(shell, 'man who'), /NAME[\s\S]*MUSEUM NOTE/); assert.equal(shell.mode, 'pager');
  shell.handleMode('q'); assert.equal(shell.mode, 'shell');
});

test('live commands share the authoritative simulation', () => {
  const { shell, simulation } = makeShell(); simulation.addSession('p.hughes');
  for (const command of ['who','users','w','finger p.hughes','ps -e']) assert.match(output(shell, command), /p\.hughes/);
  simulation.removeSession('p.hughes'); assert.doesNotMatch(output(shell, 'who'), /p\.hughes/);
  assert.equal(output(shell, 'hostname').split('\n')[0], 'cs-vax1'); assert.match(output(shell, 'uname -a'), /32V CST-6\.2/);
  assert.match(output(shell, 'date'), /Fri Jul 31 12:49:13 UTC 2026/); assert.match(output(shell, 'uptime'), /147 days, 6:12, 6 users, load average: 0\.24, 0\.27, 0\.23/);
});

test('read-only virtual filesystem normalizes paths and enforces permissions', () => {
  const { shell } = makeShell(); assert.equal(output(shell, 'pwd').split('\n')[0], '/usr/visitor');
  assert.equal(normalizePath('/usr/visitor','../../../../..'), '/');
  assert.match(output(shell, 'ls'), /README.*welcome\.txt/); assert.match(output(shell, 'ls -a'), /\.profile/); assert.match(output(shell, 'ls -l'), /-r--r--r--/);
  assert.match(output(shell, 'cat README'), /Welcome to cs-vax1/); assert.match(output(shell, 'cat /usr/m.weber/private.txt'), /Permission denied/);
  assert.match(output(shell, 'cat missing'), /No such file/); assert.match(output(shell, 'grep -n UNIX welcome.txt'), /UNIX/);
  assert.match(output(shell, 'find /cst -name time-sharing.txt'), /\/cst\/docs\/time-sharing\.txt/); assert.match(output(shell, 'find / -exec echo'), /unsupported option '-exec'/);
});

test('pager, mail, logout, history, clear, reset, and ambient queues use explicit modes', () => {
  const { shell } = makeShell();
  output(shell, 'more /cst/docs/time-sharing.txt'); assert.equal(shell.mode, 'pager'); shell.queueAmbient('queued notice');
  assert.match(shell.handleMode(' ').lines.join('\n'), /More|END/); assert.match(shell.handleMode('q').lines.join('\n'), /queued notice/); assert.equal(shell.mode, 'shell');
  assert.match(output(shell, 'mail'), /Friday tape rotation/); assert.equal(shell.mode, 'mail-index'); assert.match(shell.handleMode('1').lines.join('\n'), /From: operator/); assert(shell.mailbox[0].read); shell.handleMode('quit'); assert.equal(shell.mode, 'shell');
  output(shell, 'echo hello'); const historyBefore=shell.history.length; assert(output(shell, 'history').includes('echo hello')); assert(output(shell, 'clear') === ''); assert(shell.history.length > historyBefore);
  output(shell, 'exit'); assert.equal(shell.mode, 'logged-out'); shell.handleMode('Enter'); assert.equal(shell.mode, 'shell');
  shell.reset(); assert.equal(shell.history.length, 0); assert.equal(shell.cwd, '/usr/visitor'); assert(shell.mailbox.every(message => !message.read));
});

test('literal hostile-looking input is inert text and unknown commands stay allowlisted', () => {
  const { shell } = makeShell();
  assert.match(output(shell, 'echo "<script>alert(1)</script>"'), /not available/);
  assert.match(output(shell, 'echo javascript:alert(1)'), /javascript:alert\(1\)/);
  assert.match(output(shell, 'javascript:alert'), /command not found/);
  for (let index = 0; index < SHELL_LIMITS.history + 10; index += 1) output(shell, `echo ${index}`);
  assert.equal(shell.history.length, SHELL_LIMITS.history);
});
