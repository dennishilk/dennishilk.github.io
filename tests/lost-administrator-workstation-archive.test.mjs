import test from 'node:test';
import assert from 'node:assert/strict';
import { ShellEngine } from '../assets/js/debian-server/shell-engine.js';
import { MAIL_MESSAGES } from '../assets/js/lost-administrator/mail-data.js';
import { defaultWorkstationState } from '../assets/js/lost-administrator/workstation-state.js';

const execute = (engine, command) => engine.execute(command);
const output = result => result.stdout.join('\n');
const canonicalBody = "Hey Robodad,\n\nChloe and I were just about to print the new Major Tom pages, but the printer cartridge is empty. Do you know if there's a new one somewhere at home?\n\nI didn't want to just go to your desk and start looking through your things. :)\n\nEmma";

test('printer task and restrained project reference are canonical', () => {
  const state=defaultWorkstationState(), shell=new ShellEngine(state);
  assert.equal(MAIL_MESSAGES.length,1);
  assert.equal(MAIL_MESSAGES[0].body,canonicalBody);
  assert.match(output(execute(shell,'cat Notes/home.todo')),/^- Check for spare printer cartridge at home$/m);
  const readme=output(execute(shell,'cat Projects/major-tom/README'));
  assert.equal(readme,"Printable pages for Emma and Chloe's Major Tom project.\n\nThe project files themselves are not stored on this company workstation.");
  for(const detail of ['school','teacher','deadline','artwork','purchase','replacement is','completed']) assert.doesNotMatch(readme,new RegExp(detail,'i'));
});

test('mail and personal archives remain separate with one filesystem message', () => {
  const state=defaultWorkstationState(), shell=new ShellEngine(state);
  assert.deepEqual(execute(shell,'find Mail -type f').stdout,[
    '/home/m.weber/Mail/Archive/README',
    '/home/m.weber/Mail/Inbox/2026-07-29-new-printer-cartridge.eml'
  ]);
  assert.deepEqual(execute(shell,'find Mail -name *.eml').stdout,['/home/m.weber/Mail/Inbox/2026-07-29-new-printer-cartridge.eml']);
  execute(shell,'cd ~/Mail/Archive');
  assert.deepEqual(execute(shell,'ls').stdout,['README']);
  execute(shell,'cd ~/Archive');
  assert.ok(execute(shell,'find . -type f').stdout.length>10);
  assert.equal(execute(shell,'find . -name *.eml').stdout.length,0);
});

test('new archive, references, and scripts are browsable through shell commands', () => {
  const state=defaultWorkstationState(), shell=new ShellEngine(state);
  assert.match(output(execute(shell,'cat Documents/systemd-journal.md')),/Check the timer before blaming the service/);
  execute(shell,'cd Archive/Projects/monitoring-v1');
  assert.equal(output(execute(shell,'pwd')),'/home/m.weber/Archive/Projects/monitoring-v1');
  assert.match(output(execute(shell,'cat design-notes.md')),/Current implementation: ~\/Projects\/monitoring/);
  assert.ok(execute(shell,'find ~/Archive -name kernel-upgrade-checklist.md').stdout.includes('/home/m.weber/Archive/2024/kernel-upgrade-checklist.md'));
  assert.match(output(execute(shell,'head -n 2 ~/Scripts/disk-summary.sh')),/^#!\/bin\/sh\nset -eu$/);
  assert.match(output(execute(shell,'tail -n 1 ~/Notes/backup-verification.md')),/older copy/);
});

test('a fresh state restores additions without test artifacts', () => {
  const first=defaultWorkstationState(), shell=new ShellEngine(first);
  execute(shell,'touch Notes/test-fixture.txt');
  const reset=defaultWorkstationState(), restored=new ShellEngine(reset);
  assert.match(output(execute(restored,'cat Notes/home.todo')),/spare printer cartridge/);
  assert.equal(execute(restored,'find ~ -name test-fixture.txt').stdout.length,0);
});

test('canonical names are mundane and added prose remains English', () => {
  const state=defaultWorkstationState(), shell=new ShellEngine(state);
  const paths=execute(shell,'find ~ -type f').stdout;
  for(const path of paths) assert.doesNotMatch(path,/(secret|mystery|disappearance|important-clue|read-this|final-warning|hidden-truth)/i);
  const representative=[
    'Archive/2020/remote-maintenance.md','Archive/Documents/filesystem-locations.md',
    'Documents/network-debugging.md','Notes/ssh-checklist.md','Research/automation-boundaries.md'
  ];
  for(const path of representative){
    const prose=output(execute(shell,`cat ${path}`));
    assert.doesNotMatch(prose,/\b(und|oder|nicht|achtung|geheimnis|druckerpatrone)\b/i);
  }
});
