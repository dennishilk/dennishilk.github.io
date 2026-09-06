import test from 'node:test';
import assert from 'node:assert/strict';
import { ShellEngine } from '../assets/js/debian-server/shell-engine.js';
import { MAIL_MESSAGES } from '../assets/js/lost-administrator/mail-data.js';
import { defaultWorkstationState, loadWorkstationState, WORKSTATION_SCHEMA_VERSION, WORKSTATION_STORAGE_KEY } from '../assets/js/lost-administrator/workstation-state.js';

const setup=()=>{const state=defaultWorkstationState();return {state,shell:new ShellEngine(state)};};
const text=result=>[...result.stdout,...result.stderr].join('\n');

test('home has mundane depth without unsupported departments, tickets, photos, or devices',()=>{
  const {shell}=setup(),listing=text(shell.execute('ls'));
  for(const name of ['Desktop','Documents','Downloads','Mail','Calendar','Notes','Projects','Scripts','Archive','Research'])assert.match(listing,new RegExp(name));
  for(const name of ['Tickets','Photos','Books'])assert.doesNotMatch(listing,new RegExp(`\\b${name}\\b`));
  assert.ok(shell.execute('find ~ -type f').stdout.length>=40);
  assert.ok(shell.execute('find ~/Archive -type f').stdout.length>=12);
  assert.ok(shell.execute('cat .bash_history').stdout.length>=60);
});

test('technical archive and projects are coherent and inspectable',()=>{
  const {shell}=setup();
  assert.match(text(shell.execute('cat Documents/systemd-journal.md')),/Check the timer before blaming the service/);
  assert.match(text(shell.execute('cat Archive/2021/rsync-notes.txt')),/--dry-run/);
  assert.match(text(shell.execute('tree Projects/text-summary -L 2')),/README\.md[\s\S]*src[\s\S]*tests/);
  shell.execute('cd Projects/text-summary');
  assert.match(text(shell.execute('git status')),/working tree clean/);
  assert.match(text(shell.execute('git log --oneline')),/Initial version/);
});

test('only the exact three-message Emma thread is browsable',()=>{
  const {shell}=setup();
  assert.equal(MAIL_MESSAGES.length,3);
  assert.deepEqual(shell.execute('find Mail -name *.eml').stdout,['/home/m.weber/Mail/EMMA/2026-07-31-new-printer-cartridge.eml']);
  const thread=text(shell.execute('cat Mail/EMMA/2026-07-31-new-printer-cartridge.eml'));
  for(const line of ['Hey Robodad','Office cabinet, top shelf','I’ll pick you up at 3:05','Major Tom reports'])assert.match(thread,new RegExp(line.replace(/[?]/g,'\\?')));
  assert.match(text(shell.execute('cat Mail/EMMA/README')),/Hundreds of messages · approximately 4\.8 GB/);
  assert.doesNotMatch(JSON.stringify(defaultWorkstationState().filesystem),/Steve|preview deck|\.pptx/i);
});

test('calendar has only the established 3:05 pickup obligation',()=>{
  const {shell}=setup(),files=shell.execute('find Calendar -type f').stdout;
  assert.equal(files.length,1);
  assert.equal(text(shell.execute('cat Calendar/2026-07-31-pick-up-emma.ics')),'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:20260731T150500\nSUMMARY:Pick up Emma\nEND:VEVENT\nEND:VCALENDAR');
});

test('canonical seed is protected while new Michael-session files can persist',()=>{
  const {state,shell}=setup();
  for(const command of ['rm Notes/home.todo','echo changed > Notes/home.todo','touch Notes/home.todo','chmod 600 Notes/home.todo'])assert.equal(shell.execute(command).exitCode,1,command);
  assert.equal(shell.execute('echo review > ~/Notes/review.txt').exitCode,0);
  const created=state.filesystem.children.home.children['m.weber'].children.Notes.children['review.txt'];
  assert.equal(created.owner,'m.weber');assert.equal(created.protected,false);assert.equal(created.modified,'2026-07-31T19:18:43.000Z');
  assert.equal(shell.execute('rm ~/Notes/review.txt').exitCode,0);
});

test('old schemas reset and cannot resurrect removed content',()=>{
  const stale=defaultWorkstationState();stale.schemaVersion=WORKSTATION_SCHEMA_VERSION-1;
  stale.filesystem.children.srv.children['archive-index']={name:'archive-index',type:'directory',owner:'root',group:'root',mode:'drwxr-xr-x',children:{},created:'2026',modified:'2026',protected:true};
  const data=new Map([[WORKSTATION_STORAGE_KEY,JSON.stringify(stale)]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const loaded=loadWorkstationState(storage),shell=new ShellEngine(loaded);
  assert.equal(loaded.schemaVersion,WORKSTATION_SCHEMA_VERSION);
  assert.deepEqual(shell.execute('find /srv').stdout,['/srv']);
});
