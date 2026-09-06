import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultWorkstationState } from '../assets/js/lost-administrator/workstation-state.js';
import { ShellEngine } from '../assets/js/debian-server/shell-engine.js';

const forbidden=/lab-node|visitor@|gateway\.lab|mirror\.lab|status\.lab|backup\.lab|192\.0\.2\.|Browser Session|placeholder|Lorem|example\.com/i;
const text=r=>[...r.stdout,...r.stderr].join('\n');

test('developer manifest records every story-bearing workstation addition',async()=>{
  const manifest=await readFile(new URL('../.github/workstation-story-artifacts.md',import.meta.url),'utf8');
  for(const path of ['EMMA0731','EMMA0731R1','EMMA0731R2','Mail/EMMA/README','Calendar/2026-07-31-pick-up-emma.ics','Notes/home.todo','Notes/work/2026-07-31.txt','backup-verification.log','auth.log','kern.log'])assert.match(manifest,new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(manifest,/C\.M\.T\.A\. archive ghost/);assert.match(manifest,/T43 material/);assert.match(manifest,/Emma's T480/);
});

test('Michael initial state and all high-risk command surfaces contain no generic lab residue',()=>{
  const state=defaultWorkstationState(),shell=new ShellEngine(state),serialized=JSON.stringify(state);
  assert.doesNotMatch(serialized,forbidden);
  for(const command of ['fastfetch','env','printenv','ps aux','top','systemctl','journalctl','ip addr','ip route','ss','netstat','ping gateway.lab','traceroute status.lab','dig mirror.lab','curl https://example.com','lscpu','lspci','lsusb','lsblk','blkid','free -h','mount','findmnt','cat /etc/hosts'])assert.doesNotMatch(text(shell.execute(command)),forbidden,command);
});

test('frozen timestamps remain stable while allowed session files are bounded',()=>{
  const state=defaultWorkstationState(),shell=new ShellEngine(state);
  assert.equal(text(shell.execute('date')),'Fri Jul 31 15:18:43 EDT 2026');
  assert.equal(text(shell.execute('stat Notes/home.todo')).includes('2026-07-31'),true);
  for(let i=0;i<12;i++){const result=shell.execute(`printf '${'x'.repeat(1900)}' >> ~/Notes/growth.txt`);assert.equal(result.exitCode,0,result.stderr.join('\n'));}
  assert.ok(shell.execute('printf "x" >> ~/Notes/growth.txt').exitCode===0);
  assert.equal(state.filesystem.children.home.children['m.weber'].children.Notes.children['growth.txt'].owner,'m.weber');
  assert.equal(shell.execute('printf "x" >> ~/Notes/home.todo').exitCode,1);
});

test('source and UI contain no analytics or unsafe rendering hooks',async()=>{
  const files=['assets/js/lost-administrator/workstation-controller.js','assets/js/debian-server/terminal-renderer.js','lost-administrator/workstation/index.html'];
  for(const file of files){const source=await readFile(new URL(`../${file}`,import.meta.url),'utf8');assert.doesNotMatch(source,/innerHTML|outerHTML|eval\s*\(|navigator\.sendBeacon|gtag\s*\(|fetch\s*\(/,file);}
});
