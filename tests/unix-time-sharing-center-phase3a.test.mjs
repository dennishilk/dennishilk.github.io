import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPLOYEES, FILES, LOGIN_HISTORY, MAILBOX, MOTD, PRINTER, STORAGE } from '../museum/unix-time-sharing-center/unix-content.js';
import { UnixSimulation } from '../museum/unix-time-sharing-center/unix-simulation.js';
import { COMMANDS, UnixShell, commandNames, normalizePath } from '../museum/unix-time-sharing-center/unix-shell.js';

const required = ['/usr/visitor/README','/usr/visitor/welcome.txt','/usr/visitor/notes/commands.txt','/usr/visitor/notes/exhibit-path.txt','/etc/motd','/etc/passwd','/etc/group','/etc/hosts','/etc/system-id','/cst/docs/time-sharing.txt','/cst/docs/shared-computing.txt','/cst/docs/unix-tools.txt','/cst/docs/why-cs-vax1-remains.txt','/cst/operations/backup-rotation.txt','/cst/operations/printer-maintenance.txt','/cst/operations/serial-lines.txt','/cst/operations/storage-status.txt','/cst/operations/terminal-schedule.txt','/cst/public/staff-directory.txt','/cst/public/system-notices.txt','/cst/public/terminal-etiquette.txt','/var/adm/messages','/var/adm/shutdown.log','/var/adm/uptime.log','/var/spool/lp/status','/var/spool/lp/queue'];
const make = () => { const simulation = new UnixSimulation(); const shell = new UnixShell(() => simulation); return { simulation, shell, out: command => shell.execute(command).lines.join('\n') }; };

test('curated company content is complete, deterministic, ordinary, and timeline-safe', () => {
  assert.deepEqual(EMPLOYEES, {'s.harper':'Steve Harper','m.weber':'Michael Weber','h.sullivan':'Henry Sullivan','f.kessler':'Frank Kessler'});
  required.forEach(path => assert.ok(FILES[path], path));
  Object.values(FILES).forEach(item => { for (const key of ['permissions','owner','group','size','timestamp','readable']) assert.ok(key in item); });
  assert.ok(MAILBOX.length >= 8 && MAILBOX.length <= 12);
  MAILBOX.forEach(message => { assert.ok(Date.parse(message[2]) <= Date.UTC(2026,6,31,12,49,13)); for (const ref of message[3].match(/\/[\w./-]+\.txt/g) || []) assert.ok(FILES[ref], ref); });
  assert.doesNotMatch(JSON.stringify({FILES,MAILBOX}), /disappearance|Day Zero|Lost Administrator|investigation|mystery|evidence|clues|novel|supernatural/i);
});

test('new commands use shared models and remain registry documented', () => {
  const { shell, out } = make();
  for (const name of ['lpq','df','last','tty','cal','motd']) { assert.ok(COMMANDS.has(name)); assert.ok(commandNames().includes(name)); assert.match(out(`help ${name}`), new RegExp(`Usage: ${name}`)); }
  assert.match(out('lpq'), new RegExp(`${PRINTER.name}[\\s\\S]*${PRINTER.queue[0].job}`));
  assert.match(out('df'), new RegExp(`${STORAGE[0].filesystem}[\\s\\S]*${STORAGE[1].filesystem}`));
  assert.match(out('last'), new RegExp(LOGIN_HISTORY[0].username)); assert.equal(out('tty').split('\n')[0], '/dev/tty6');
  assert.match(out('cal 7 2026'), /July 2026[\s\S]*31/); assert.equal(out('motd').split('\n').slice(0,3).join('\n'), MOTD);
  assert.equal(out('cat /etc/motd').split('\n').slice(0,3).join('\n'), MOTD);
  shell.handleMode('q');
});

test('private homes, traversal, reset, mail state, and shared printer events stay coherent', () => {
  const { simulation, shell, out } = make();
  assert.equal(normalizePath('/usr/visitor','../../../../'), '/'); assert.match(out('ls /usr/m.weber'), /Permission denied/); assert.match(out('cat /usr/m.weber/file'), /Permission denied/);
  out('mail 1'); assert.equal(shell.mailbox[0].read, true); out('clear'); assert.equal(shell.mailbox[0].read, true); shell.reset(); assert.ok(shell.mailbox.every(message => !message.read));
  const before = simulation.printer.queue.length; const rolls=[0,0.54]; simulation.random = () => rolls.shift() ?? 0; const event = simulation.considerAmbientMessage(); assert.equal(event.type, 'print-event'); assert.equal(simulation.printer.queue.length, before - 1); assert.match(out('cat /var/spool/lp/status'), new RegExp(`Spool count: ${before - 1}`)); assert.match(out('cat /var/adm/messages'), /lpd: completed/);
});
