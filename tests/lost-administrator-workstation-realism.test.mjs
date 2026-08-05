import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ShellEngine } from '../assets/js/debian-server/shell-engine.js';
import { defaultWorkstationState, loadWorkstationState, WORKSTATION_SCHEMA_VERSION, WORKSTATION_STORAGE_KEY } from '../assets/js/lost-administrator/workstation-state.js';

const exec=(engine,state,source)=>{state.commandHistory.push(source);return engine.execute(source);};
const text=r=>r.stdout.join('\n');

test('realism pass preserves startup, schema and frozen identity',async()=>{
  assert.equal(WORKSTATION_SCHEMA_VERSION,10);
  const controller=await readFile(new URL('../assets/js/lost-administrator/workstation-controller.js',import.meta.url),'utf8');
  assert.match(controller,/Debian GNU\/Linux 13 \(trixie\)/);
  assert.match(controller,/Last login: Fri Jul 31 17:41:26 UTC 2026 on tty1/);
  const state=defaultWorkstationState(),engine=new ShellEngine(state);
  assert.equal(text(exec(engine,state,'date')),'Fri Jul 31 15:18:43 EDT 2026');
  assert.equal(text(exec(engine,state,'date -u')),'Fri Jul 31 19:18:43 UTC 2026');
  assert.equal(text(exec(engine,state,'hostname')),'workstation');
  assert.equal(text(exec(engine,state,'whoami')),'m.weber');
  assert.equal(text(exec(engine,state,'cat /etc/hostname')),'workstation');
  assert.equal(text(exec(engine,state,'cat /etc/timezone')),'America/New_York');
  assert.match(text(exec(engine,state,'cat /etc/os-release')),/Debian GNU\/Linux 13 \(trixie\)[\s\S]*VERSION_CODENAME=trixie/);
});

test('parser, redirection, status and pipelines behave like restrained bash',()=>{
  const state=defaultWorkstationState(),engine=new ShellEngine(state);
  assert.equal(text(exec(engine,state,'grep -R "CMTA" /srv/archive-index')),'legacy-sites.tsv:CMTA-SF-12 | PHYSICAL / PARTIAL DIGITAL | PERMANENT | WFR-04 | FOLDER 12');
  const redirected=exec(engine,state,'grep -R "CMTA" /srv/archive-index 2>/dev/null');
  assert.equal(text(redirected),'legacy-sites.tsv:CMTA-SF-12 | PHYSICAL / PARTIAL DIGITAL | PERMANENT | WFR-04 | FOLDER 12');
  assert.deepEqual(redirected.stderr,[]);
  const missing=exec(engine,state,'cat /does/not/exist 2>/dev/null');
  assert.notEqual(missing.exitCode,0);assert.deepEqual(missing.stderr,[]);
  assert.equal(text(exec(engine,state,'cat /var/log/kern.log | grep -i usb')).split('\n').length,3);
  assert.equal(text(exec(engine,state,'grep -R "CMTA" /srv/archive-index | wc -l')).trim(),'1');
  assert.equal(exec(engine,state,'false && echo no').stdout.length,0);
  assert.equal(text(exec(engine,state,'false || echo yes')),'yes');
  exec(engine,state,'grep NOMATCH /srv/archive-index/legacy-sites.tsv');
  assert.equal(text(exec(engine,state,'echo $?')),'1');
  assert.equal(text(exec(engine,state,"echo 'two words' | grep 'two words'")),'two words');
});

test('metadata and canonical files remain consistent and visitor history is separate',()=>{
  const state=defaultWorkstationState(),engine=new ShellEngine(state);
  const aliases=text(exec(engine,state,'cat ~/.bash_aliases'));
  assert.match(aliases,/alias ll='ls -alF'/);assert.doesNotMatch(aliases,/CMTA|ssh|sudo|monitor-01|store-02|sw-02|missing|police/i);
  assert.match(text(exec(engine,state,'head -n 1 /var/log/kern.log')),/usb 2-1: new high-speed USB device/);
  assert.equal(text(exec(engine,state,'tail -n 1 /srv/archive-index/legacy-sites.tsv')),'CMTA-SF-12 | PHYSICAL / PARTIAL DIGITAL | PERMANENT | WFR-04 | FOLDER 12');
  assert.match(text(exec(engine,state,'wc -l /var/log/kern.log')).trim(),/^3 \/var\/log\/kern\.log$/);
  const stat=text(exec(engine,state,'stat /srv/archive-index/legacy-sites.tsv'));
  assert.match(stat,/Size: 73\b/);assert.match(text(exec(engine,state,'ls -l /srv/archive-index/legacy-sites.tsv')),/\b73\b.*legacy-sites.tsv/);
  assert.match(text(exec(engine,state,'file /srv/archive-index/legacy-sites.tsv')),/ASCII text/);
  exec(engine,state,'touch /etc/nope');assert.notEqual(state.lastExitCode,0);
  exec(engine,state,'echo visitor-only');assert.doesNotMatch(text(exec(engine,state,'cat ~/.bash_history')),/visitor-only/);
});

test('old schema snapshots reset to canonical state with clean visitor history',()=>{
  const old=defaultWorkstationState();old.schemaVersion=9;old.commandHistory=['visitor command'];
  const data=new Map([[WORKSTATION_STORAGE_KEY,JSON.stringify(old)]]);const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const restored=loadWorkstationState(storage);
  assert.equal(restored.schemaVersion,10);assert.deepEqual(restored.commandHistory,[]);
});

test('frozen system summary derives packages, uptime, users and processes from one state',()=>{
  const state=defaultWorkstationState(),engine=new ShellEngine(state);
  const fastfetch=text(exec(engine,state,'fastfetch'));
  const top=text(exec(engine,state,'top'));
  const uptime=text(exec(engine,state,'uptime'));
  const who=text(exec(engine,state,'who'));
  const w=text(exec(engine,state,'w'));
  const last=text(exec(engine,state,'last'));
  const dpkgCount=Number(text(exec(engine,state,"dpkg-query -f '${binary:Package}\\n' | wc -l")).trim());
  const fastfetchCount=Number(fastfetch.match(/Packages: (\d+) \(dpkg\)/)?.[1]);
  assert.equal(state.system.frozenLocal,'Fri Jul 31 15:18:43 EDT 2026');
  assert.equal(state.system.frozenUtc,'Fri Jul 31 19:18:43 UTC 2026');
  assert.equal(state.system.bootLocal,'Thu Jul 30 13:48:43 EDT 2026');
  assert.equal(state.system.bootUtc,'Thu Jul 30 17:48:43 UTC 2026');
  assert.equal(fastfetchCount,642);
  assert.equal(dpkgCount,fastfetchCount);
  assert.notEqual(fastfetchCount,33);
  assert.match(fastfetch,/Uptime: 1 day, 1 hour, 30 minutes/);
  assert.match(top,/^top - 15:18:43 up 1 day, 1:30,/);
  assert.match(uptime,/^ 15:18:43 up 1 day, 1:30,/);
  assert.doesNotMatch([top,uptime,w].join('\n'),/09:30:00/);
  assert.equal(who,'m.weber  tty1         Jul 31 13:41');
  assert.match(w,/m\.weber\s+tty1/);
  assert.match(last,/m\.weber\s+tty1[\s\S]*reboot\s+system boot\s+6\.12\.38\+deb13-amd64 Thu Jul 30 13:48:43 EDT 2026/);
  for(const leaked of ['visitor','nginx','monitor','www-data'])assert.doesNotMatch([top,who,w,last].join('\n'),new RegExp(`\\b${leaked}\\b`));
});

test('workstation package model stays administrative without future clue tools',()=>{
  const state=defaultWorkstationState(),engine=new ShellEngine(state);
  const aptList=text(exec(engine,state,'apt list --installed'));
  for(const name of ['bash','coreutils','openssh-server','rsync','smartmontools','tmux','vim-tiny'])assert.match(aptList,new RegExp(`^${name}/trixie`,'m'));
  for(const forbidden of ['nebustrike','chapter11','chapter12','chapter13','quantum','singularity','chronicle'])assert.doesNotMatch(aptList,new RegExp(forbidden,'i'));
});
