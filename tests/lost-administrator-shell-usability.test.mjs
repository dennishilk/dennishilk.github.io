import test from 'node:test';
import assert from 'node:assert/strict';
import { ShellEngine } from '../assets/js/debian-server/shell-engine.js';
import { completeTerminalInput } from '../assets/js/debian-server/tab-completion.js';
import { commands } from '../assets/js/debian-server/command-registry.js';
import { defaultWorkstationState } from '../assets/js/lost-administrator/workstation-state.js';

const setup=()=>{const state=defaultWorkstationState();return {state,engine:new ShellEngine(state)};};

test('cd preserves exact casing and provides only an unambiguous directory fallback',()=>{
  const {state,engine}=setup();
  assert.equal(engine.execute('cd Notes').exitCode,0);assert.equal(state.currentDirectory,'/home/m.weber/Notes');
  assert.equal(engine.execute('cd').exitCode,0);assert.equal(state.currentDirectory,'/home/m.weber');
  assert.equal(engine.execute('cd projects/major-tom').exitCode,0);assert.equal(state.currentDirectory,'/home/m.weber/Projects/major-tom');
  assert.equal(engine.execute('cd -').stdout[0],'/home/m.weber');assert.equal(engine.execute('cd ~').exitCode,0);
  assert.equal(engine.execute('cd ..').exitCode,0);assert.equal(state.currentDirectory,'/home');
  assert.match(engine.execute('cd one two').stderr[0],/too many arguments/);
  state.filesystem.children.home.children['m.weber'].children.nOtEs={...structuredClone(state.filesystem.children.home.children['m.weber'].children.Notes),name:'nOtEs'};
  state.currentDirectory='/home/m.weber';assert.match(engine.execute('cd notes').stderr[0],/ambiguous directory match/);
});

test('direct reads and completion support relative, absolute, home and canonical case',()=>{
  const {state,engine}=setup();
  assert.match(engine.execute('cat Notes/home.todo').stdout.join('\n'),/printer cartridge/);
  assert.match(engine.execute('cat ~/Projects/major-tom/README').stdout.join('\n'),/Printable pages/);
  assert.match(engine.execute('cat /home/m.weber/Notes/home.todo').stdout.join('\n'),/printer cartridge/);
  assert.match(engine.execute('cat notes/home.todo').stderr[0],/No such file/);
  const input={value:'cd pro',selectionStart:6,selectionEnd:6};completeTerminalInput(input,state,engine.fs,Object.keys(commands));assert.equal(input.value,'cd Projects/');
  input.value='cd ~/pro';input.selectionStart=input.selectionEnd=input.value.length;completeTerminalInput(input,state,engine.fs,Object.keys(commands));assert.equal(input.value,'cd ~/Projects/');
  input.value='cd /home/m.weber/pro';input.selectionStart=input.selectionEnd=input.value.length;completeTerminalInput(input,state,engine.fs,Object.keys(commands));assert.equal(input.value,'cd /home/m.weber/Projects/');
});

test('grep performs safe substring searches with supported combined flags',()=>{
  const {engine}=setup();
  assert.deepEqual(engine.execute('grep printer Notes/home.todo').stdout,['- Check for spare printer cartridge at home']);
  assert.deepEqual(engine.execute('grep -i PRINTER Notes/home.todo').stdout,['- Check for spare printer cartridge at home']);
  assert.deepEqual(engine.execute('grep -n printer Notes/home.todo').stdout,['3:- Check for spare printer cartridge at home']);
  const recursive=engine.execute('grep -R printer Notes');assert.equal(recursive.exitCode,0);assert.ok(recursive.stdout.every(x=>x.startsWith('home.todo:')||x.includes(':')));
  assert.match(engine.execute('grep -Rin EMMA ~').stdout.join('\n'),/Mail\/Inbox\/.*:\d+:From: Emma/);
  assert.equal(engine.execute('grep absent-string Notes/home.todo').exitCode,1);
  assert.match(engine.execute('grep printer missing').stderr[0],/No such file or directory/);
  assert.match(engine.execute('grep -z printer Notes/home.todo').stderr[0],/invalid option/);
});

test('find validates its subset and traverses deterministically',()=>{
  const {engine}=setup();
  for(const command of ['find','find .','find Notes','find ~'])assert.equal(engine.execute(command).exitCode,0);
  const markdown=engine.execute('find . -name "*.md"').stdout;assert.deepEqual(markdown,[...markdown].sort((a,b)=>a.localeCompare(b)));
  assert.ok(engine.execute('find ~/Archive -type f').stdout.every(x=>!x.endsWith('/Archive')));
  assert.ok(engine.execute('find Notes -type d').stdout.every(x=>!x.match(/\.[a-z]+$/)));
  assert.match(engine.execute('find missing').stderr[0],/No such file or directory/);
  assert.match(engine.execute('find . -wat').stderr[0],/unknown predicate/);
  assert.match(engine.execute('find . -type x').stderr[0],/Unknown argument to -type/);
  assert.match(engine.execute('find . -name').stderr[0],/missing argument/);
});

test('ls expands simple nonrecursive globs deterministically and reports no matches',()=>{
  const {engine}=setup();engine.execute('cd Notes');
  const md=engine.execute('ls *.md');assert.equal(md.exitCode,0);assert.deepEqual(md.stdout,[...md.stdout].sort((a,b)=>a.localeCompare(b)));
  engine.execute('cd ~');assert.match(engine.execute('ls Notes/*.txt').stdout.join('\n'),/shopping\.txt/);
  assert.match(engine.execute('ls Archive/2024/*').stdout.join('\n'),/kernel-upgrade-checklist\.md/);
  assert.match(engine.execute('ls *.does-not-exist').stderr[0],/No such file or directory/);
});
