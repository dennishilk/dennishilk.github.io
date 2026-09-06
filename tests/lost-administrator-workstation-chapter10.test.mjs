import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ShellEngine } from '../assets/js/debian-server/shell-engine.js';
import { defaultWorkstationState } from '../assets/js/lost-administrator/workstation-state.js';

const setup=()=>{const state=defaultWorkstationState();return {state,shell:new ShellEngine(state)};};
const out=result=>result.stdout.join('\n');
const future=/GMC Yukon|XQH 742|police|forensic|Daniels|Elias Calver|Hargrad|Davids|roboping|TagStudio|T480|ThinkPad T43|FIELD CONTINUITY|ALPHA profile|C\.M\.T\.A\.|CMTA|TAG_SERVICE|linkdiag|plate|boat/i;

test('startup, login, prompt identity, and frozen clocks are exact',async()=>{
  const controller=await readFile(new URL('../assets/js/lost-administrator/workstation-controller.js',import.meta.url),'utf8'),{shell}=setup();
  assert.match(controller,/Debian GNU\/Linux 13 \(trixie\)/);
  assert.match(controller,/Last login: Fri Jul 31 17:41:26 UTC 2026 on tty1/);
  assert.equal(out(shell.execute('date')),'Fri Jul 31 15:18:43 EDT 2026');
  assert.equal(out(shell.execute('date -u')),'Fri Jul 31 19:18:43 UTC 2026');
  assert.equal(out(shell.execute('pwd')),'/home/m.weber');
});

test('day-zero work note and backup log stay minimal',()=>{
  const {shell}=setup(),note=out(shell.execute('cat Notes/work/2026-07-31.txt')),backup=out(shell.execute('cat /var/log/chesapeake/backup-verification.log'));
  assert.equal(note,'Backup verification completed.\nParser correction completed.\nDefective customer drive received.\nLegacy archive notice closed.');
  assert.equal(backup,'Jul 31 13:26 EDT  scheduled backup verification completed\nJul 31 13:26 EDT  result: OK');
  assert.doesNotMatch(note,/hostname|ticket|capacity|repository|language|commit|customer name/i);
});

test('automatic USB log exposes only the supported dual interface state',()=>{
  const {shell}=setup(),kern=out(shell.execute('cat /var/log/kern.log'));
  assert.match(kern,/USB Mass Storage device detected/);
  assert.match(kern,/vendor-specific serial interface detected/);
  assert.match(kern,/device attached to ttyUSB0/);
  assert.equal(kern.split('\n').length,4);
  assert.doesNotMatch(kern,/manufacturer|product|capacity|volume|filesystem|mount|serial number|removed|Bus \d|Device \d|13:41:\d\d/i);
  assert.equal(out(shell.execute('dmesg')),kern);
  assert.match(out(shell.execute('journalctl -n 20')),/USB Mass Storage[\s\S]*ttyUSB0/);
});

test('drawer USB, volatile reconstruction, and separate evidence surfaces remain absent',()=>{
  const {shell}=setup();
  const serialized=JSON.stringify(defaultWorkstationState());
  assert.doesNotMatch(serialized,future);
  assert.deepEqual(shell.execute('find /srv').stdout,['/srv']);
  assert.deepEqual(shell.execute('find /run').stdout,['/run']);
  assert.equal(shell.execute('grep -Ri drawer /').stdout.length,0);
  assert.equal(shell.execute('grep -Ri linkdiag /').stdout.length,0);
  assert.equal(shell.execute('grep -Ri TAG_SERVICE /').stdout.length,0);
  assert.doesNotMatch(out(shell.execute('mount')),/usb|removable|ttyUSB|drawer/i);
});
