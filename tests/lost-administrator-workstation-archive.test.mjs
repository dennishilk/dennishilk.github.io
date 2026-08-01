import test from 'node:test';
import assert from 'node:assert/strict';
import { ShellEngine } from '../assets/js/debian-server/shell-engine.js';
import { MAIL_MESSAGES } from '../assets/js/lost-administrator/mail-data.js';
import { defaultWorkstationState, loadWorkstationState, WORKSTATION_SCHEMA_VERSION, WORKSTATION_STORAGE_KEY } from '../assets/js/lost-administrator/workstation-state.js';

const execute = (engine, command) => engine.execute(command);
const output = result => result.stdout.join('\n');
const canonicalBody = "Hey Robodad,\n\nChloe and I were just about to print the new Major Tom pages, but the printer cartridge is empty. Do you know if there's a new one somewhere at home?\n\nI didn't want to just go to your desk and start looking through your things. :)\n\nEmma";

test('printer task and restrained project reference are canonical', () => {
  const state=defaultWorkstationState(), shell=new ShellEngine(state);
  assert.equal(MAIL_MESSAGES.length,1);
  assert.equal(MAIL_MESSAGES[0].body,canonicalBody);
  assert.match(output(execute(shell,'cat Notes/home.todo')),/^- Check with Emma for the spare printer cartridge at home$/m);
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

test('live workstation contains only approved personal canon', () => {
  const state=defaultWorkstationState(), shell=new ShellEngine(state);
  const files=execute(shell,'find ~ -type f').stdout;
  const removedFiles=[
    'Documents/family/north-sea-2023-booking.pdf','Documents/family/emma-school-placement.pdf',
    'Downloads/meeting.png','Downloads/holiday-list-2026.pdf','Downloads/mp3_car/01-Sultans-of-Swing.mp3',
    'Downloads/mp3_car/02-Solsbury-Hill.mp3','Downloads/mp3_car/03-Weather-With-You.mp3',
    'Downloads/mp3_car/04-Fields-of-Gold.mp3','Downloads/mp3_car/playlist.m3u','Desktop/temp-nina.txt',
    'Notes/henry-handover.md',
    'Notes/today.txt','Notes/shopping.txt','Notes/holiday-ideas.md','Photos/Family/2020-12-24_kitchen_emma-arthur.jpg',
    'Photos/Family/2022-06-09_office-barbecue.jpg','Photos/Emma/2021-09-18_leaf-album.jpg',
    'Photos/Emma/2024-06-12_school-placement.jpg','Photos/Vacation/2023-North-Sea/IMG_20230729_164211.jpg',
    'Photos/Vacation/2023-North-Sea/IMG_20230731_111805.jpg','Photos/Vacation/2023-North-Sea/IMG_20230803_190412.jpg'
  ];
  for(const path of removedFiles) assert.equal(execute(shell,`find ~ -path */${path}`).stdout.length,0,path);
  for(const directory of ['Documents/family','Downloads/mp3_car','Photos/Family','Photos/Emma','Photos/Vacation'])
    assert.equal(execute(shell,`find ~ -path */${directory}`).stdout.length,0,directory);
  const forbidden=/\b(Arthur|Lena|Mia|Henry|Greetsiel|Pilsum|birthday|Claudia|Nina|Nora)\b|school placement|booking confirmation|consent form|holiday ideas/i;
  for(const path of files){
    assert.doesNotMatch(path,forbidden,path);
    assert.doesNotMatch(output(execute(shell,`cat '${path}'`)),forbidden,path);
  }
  const emma=execute(shell,'grep -Ri emma ~').stdout;
  assert.ok(emma.length>0);
  assert.ok(emma.every(line=>/Mail\/Inbox\/2026-07-29-new-printer-cartridge\.eml|Notes\/home\.todo|Projects\/major-tom\/README/.test(line)),emma.join('\n'));
  assert.equal(execute(shell,'find ~/Photos -type f').stdout.length,4);
});


test('all recursive search and traversal commands use only the live filesystem tree', () => {
  const state=defaultWorkstationState(), shell=new ShellEngine(state);
  const approved=/Mail\/Inbox\/2026-07-29-new-printer-cartridge\.eml|Notes\/home\.todo|Projects\/major-tom\/README/;
  for(const command of ['grep -r Emma ~','grep -R Emma ~','grep -Ri emma ~','grep -Ri emma /home/m.weber']){
    const result=execute(shell,command);
    assert.equal(result.exitCode,0,command);
    assert.ok(result.stdout.every(line=>approved.test(line)),`${command}\n${result.stdout.join('\n')}`);
  }
  execute(shell,'echo Emma > Notes/remove-me.txt');
  assert.match(output(execute(shell,'grep -R Emma ~')),/remove-me\.txt/);
  execute(shell,'rm Notes/remove-me.txt');
  for(const command of ['grep -R Emma ~','find ~','find ~ -type f','tree ~'])
    assert.doesNotMatch(output(execute(shell,command)),/remove-me\.txt/,command);
});

test('a pre-cleanup persisted filesystem is invalidated instead of becoming a search index', () => {
  const stale=defaultWorkstationState();
  stale.schemaVersion=WORKSTATION_SCHEMA_VERSION-1;
  stale.filesystem.children.home.children['m.weber'].children.Notes.children['shopping.txt']={
    name:'shopping.txt',type:'file',owner:'m.weber',group:'m.weber',mode:'-rw-r--r--',
    content:'Emma Arthur Lena Mia Greetsiel',created:'',modified:'',protected:false
  };
  const data=new Map([[WORKSTATION_STORAGE_KEY,JSON.stringify(stale)]]);
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const loaded=loadWorkstationState(storage), shell=new ShellEngine(loaded);
  assert.equal(loaded.schemaVersion,WORKSTATION_SCHEMA_VERSION);
  for(const command of ['grep -Ri arthur ~','grep -Ri greetsiel ~','find ~ -name shopping.txt','tree ~'])
    assert.doesNotMatch(output(execute(shell,command)),/Arthur|Greetsiel|shopping\.txt/i,command);
  assert.equal(JSON.parse(data.get(WORKSTATION_STORAGE_KEY)).schemaVersion,WORKSTATION_SCHEMA_VERSION);
});
