import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ShellEngine } from '../assets/js/debian-server/shell-engine.js';
import { defaultWorkstationState, loadWorkstationState, WORKSTATION_SCHEMA_VERSION, WORKSTATION_STORAGE_KEY } from '../assets/js/lost-administrator/workstation-state.js';

const shell = () => { const state=defaultWorkstationState(); return { state, engine:new ShellEngine(state) }; };
const out = r => r.stdout.join('\n');

const forbidden = /GMC Yukon|XQH 742|police report|forensic report|Daniels|Sarah|Henry's later|Steve's workstation|roboping|field photograph|remote recorder|SEQ 00417|CM-047|ACCEPTED|linkdiag|ttyUSB0|vendor-specific serial interface|TAG_SERVICE|raw NFC|badge evidence|visitor records|Elias Calver|AC-21|WFO\/AC21|LoRa|paper-recorder/i;

test('chapter 10 sync preserves exact startup and frozen workstation time', async () => {
  const controller = await readFile(new URL('../assets/js/lost-administrator/workstation-controller.js', import.meta.url), 'utf8');
  assert.match(controller, /renderer\.line\('Debian GNU\/Linux 13 \(trixie\)'/);
  assert.match(controller, /renderer\.line\('Last login: Fri Jul 31 17:41:26 UTC 2026 on tty1'/);
  const { engine } = shell();
  assert.equal(out(engine.execute('date')), 'Fri Jul 31 15:18:43 EDT 2026');
  assert.equal(out(engine.execute('pwd')), '/home/m.weber');
});

test('approved day-zero work traces exist with restrained content only', () => {
  const { engine } = shell();
  assert.equal(out(engine.execute('cat /var/log/chesapeake/backup-verification.log')), 'Jul 31 13:26 EDT  scheduled backup verification completed\nJul 31 13:26 EDT  result: OK');
  assert.deepEqual(engine.execute('grep -R scheduled /var/log/chesapeake').stdout, ['backup-verification.log:Jul 31 13:26 EDT  scheduled backup verification completed']);
  const note = out(engine.execute('cat ~/Notes/work/2026-07-31.txt'));
  assert.equal(note, 'Parser correction completed.\nCustomer drive received for diagnostics.\nStatus: pending examination.\nLegacy archive notice closed.');
  assert.doesNotMatch(note, /python|repository|serial|capacity|ticket|disappearance|C\.M\.T\.A\.|model/i);
});

test('kernel log exposes only mass-storage USB after login and through filesystem-backed commands', () => {
  const { engine } = shell();
  const kern = out(engine.execute('cat /var/log/kern.log'));
  assert.match(kern, /^Jul 31 13:41 EDT workstation kernel: usb 2-1: new high-speed USB device$/m);
  assert.match(kern, /USB Mass Storage device detected/);
  assert.match(kern, /scsi host6: usb-storage 2-1:1\.0/);
  assert.doesNotMatch(kern, /13:40|13:41:0|13:41:1|13:41:2[0-6]/);
  assert.doesNotMatch(kern, /serial interface|ttyUSB0|CM-047|linkdiag|manufacturer|product|volume|filesystem|mount|removal/i);
  assert.deepEqual(engine.execute('grep -i usb /var/log/kern.log').stdout, kern.split('\n'));
  assert.deepEqual(engine.execute('dmesg').stdout, kern.split('\n'));
  assert.match(out(engine.execute('journalctl --since "2026-07-31 13:40" --until "2026-07-31 13:45"')), /USB Mass Storage device detected/);
});

test('drawer USB remains digitally absent and no chapter 11-13 clue terms are exposed', () => {
  const { engine } = shell();
  for (const command of ['grep -Ri ttyUSB0 /','grep -Ri linkdiag /','grep -Ri CM-047 /','grep -Ri ACCEPTED /']) {
    assert.equal(engine.execute(command).stdout.length, 0, command);
  }
  const drawerUsb = engine.execute('grep -Ri drawer ~ /var /srv').stdout.filter(line=>/usb/i.test(line));
  assert.ok(drawerUsb.every(line=>/old USB serial adapter driver|grey adapter/.test(line)), drawerUsb.join('\n'));
  const newUsbSurfaces = engine.execute('grep -Ri usb /var /srv').stdout.join('\n');
  assert.doesNotMatch(newUsbSurfaces, /drawer|mount|volume label|file list/i);
  assert.doesNotMatch(newUsbSurfaces, forbidden);
});

test('legacy archive index is a boring authoritative filesystem entry', () => {
  const { engine } = shell();
  const entry = 'CMTA-SF-12 | PHYSICAL / PARTIAL DIGITAL | PERMANENT | WFR-04 | FOLDER 12';
  assert.equal(out(engine.execute('cat /srv/archive-index/legacy-sites.tsv')), entry);
  assert.deepEqual(engine.execute('find /srv/archive-index -type f').stdout, ['/srv/archive-index/legacy-sites.tsv']);
  assert.deepEqual(engine.execute('grep -R CMTA /srv/archive-index').stdout, [`legacy-sites.tsv:${entry}`]);
  assert.equal(engine.execute('grep -Ri \"C.M.T.A.\" /').stdout.length, 0);
  assert.equal(engine.execute('grep -Ri \"Authorized Contacts\" /').stdout.length, 0);
  assert.equal(engine.execute('grep -Ri \"P-17\" /').stdout.length, 0);
});

test('reset and schema migration restore the chapter 10 canonical filesystem', () => {
  const fresh = defaultWorkstationState();
  assert.equal(fresh.schemaVersion, WORKSTATION_SCHEMA_VERSION);
  assert.equal(fresh.filesystem.children.var.children.log.children.chesapeake.children['backup-verification.log'].content, 'Jul 31 13:26 EDT  scheduled backup verification completed\nJul 31 13:26 EDT  result: OK\n');
  const stale = defaultWorkstationState();
  stale.schemaVersion = WORKSTATION_SCHEMA_VERSION - 1;
  delete stale.filesystem.children.var.children.log.children['kern.log'];
  const data = new Map([[WORKSTATION_STORAGE_KEY, JSON.stringify(stale)]]);
  const storage = { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,v), removeItem:k=>data.delete(k) };
  const loaded = loadWorkstationState(storage);
  assert.equal(loaded.schemaVersion, WORKSTATION_SCHEMA_VERSION);
  const engine = new ShellEngine(loaded);
  assert.match(out(engine.execute('cat /var/log/kern.log')), /USB Mass Storage device detected/);
  assert.equal(out(engine.execute('cat /srv/archive-index/legacy-sites.tsv')), 'CMTA-SF-12 | PHYSICAL / PARTIAL DIGITAL | PERMANENT | WFR-04 | FOLDER 12');
});

test('existing mail, calendar, search, listings and English workstation behavior remain functional', () => {
  const { engine } = shell();
  assert.match(out(engine.execute('ls /var/log')), /chesapeake/);
  assert.match(out(engine.execute('ls ~/Notes')), /work/);
  assert.match(out(engine.execute('cat Mail/EMMA/2026-07-31-new-printer-cartridge.eml')), /Major Tom reports/);
  assert.match(out(engine.execute('cat Calendar/2026-07-31-pick-up-emma.ics')), /PICK UP EMMA/);
  assert.equal(engine.execute('mail').enterMail, true);
  for (const path of ['/var/log/chesapeake/backup-verification.log','/home/m.weber/Notes/work/2026-07-31.txt','/var/log/kern.log','/srv/archive-index/legacy-sites.tsv']) {
    assert.doesNotMatch(out(engine.execute(`cat ${path}`)), /\b(und|oder|nicht|achtung|geheimnis|druckerpatrone)\b/i);
  }
});
