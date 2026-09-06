import test from 'node:test';
import assert from 'node:assert/strict';
import { ShellEngine } from '../assets/js/debian-server/shell-engine.js';
import { defaultWorkstationState } from '../assets/js/lost-administrator/workstation-state.js';

const setup=()=>{const state=defaultWorkstationState();return {state,shell:new ShellEngine(state)};};
const text=result=>[...result.stdout,...result.stderr].join('\n');
const leaks=/lab-node|visitor@|gateway\.lab|mirror\.lab|status\.lab|backup\.lab|192\.0\.2\.|Browser Session|Lab status/i;

test('identity commands agree on Michael, workstation, and tty1',()=>{
  const {shell}=setup();
  const expected={whoami:/^m\.weber$/,id:/uid=1000\(m\.weber\).*groups=1000\(m\.weber\)/,groups:/^m\.weber$/,users:/^m\.weber$/,who:/m\.weber\s+tty1/,w:/m\.weber\s+tty1/,last:/m\.weber\s+tty1/,lastlog:/m\.weber\s+tty1/,hostname:/^workstation$/,hostnamectl:/Static hostname: workstation/,fastfetch:/m\.weber@workstation/};
  for(const [command,pattern] of Object.entries(expected)){const output=text(shell.execute(command));assert.match(output,pattern,command);assert.doesNotMatch(output,leaks,command);}
  assert.match(text(shell.execute('sudo true')),/m\.weber is not in the sudoers/);
});

test('immutable identity variables cannot be overwritten or removed',()=>{
  const {state,shell}=setup();
  for(const command of ['export USER=visitor','export HOSTNAME=lab-node','unset HOME','unset LOGNAME'])assert.equal(shell.execute(command).exitCode,1,command);
  assert.deepEqual(Object.fromEntries(['USER','LOGNAME','HOME','HOSTNAME','SHELL'].map(key=>[key,state.environment[key]])),{USER:'m.weber',LOGNAME:'m.weber',HOME:'/home/m.weber',HOSTNAME:'workstation',SHELL:'/bin/bash'});
});

test('time commands are frozen without an invented boot timestamp',()=>{
  const {shell}=setup();
  assert.equal(text(shell.execute('date')),'Fri Jul 31 15:18:43 EDT 2026');
  assert.equal(text(shell.execute('date -u')),'Fri Jul 31 19:18:43 UTC 2026');
  assert.match(text(shell.execute('timedatectl')),/15:18:43 EDT[\s\S]*19:18:43 UTC/);
  for(const command of ['uptime','w','top','last','fastfetch'])assert.doesNotMatch(text(shell.execute(command)),/system boot|boot time|Thu Jul|1 day, 1 hour|2026-07-28/,command);
});

test('Michael mode suppresses generic network and hardware profiles',()=>{
  const {shell}=setup();
  const commands=['ip addr','ip route','ss','netstat','ping gateway.lab','traceroute status.lab','dig mirror.lab','curl https://status.lab','lscpu','lspci','lsusb','lsblk','blkid','free -h','lsmem','mount','findmnt'];
  for(const command of commands)assert.doesNotMatch(text(shell.execute(command)),leaks,command);
  assert.match(text(shell.execute('ip addr')),/127\.0\.0\.1/);
  assert.doesNotMatch(text(shell.execute('mount')),/vda|virtio|removable|usb/i);
});

test('processes, services, and packages contain only a restrained local profile',()=>{
  const {state,shell}=setup(),processes=text(shell.execute('ps aux')),services=text(shell.execute('systemctl')),packages=text(shell.execute('apt list --installed'));
  assert.match(processes,/m\.weber.*tty1.*-bash/);
  assert.doesNotMatch(processes,/nginx|monitor|sshd|visitor/);
  assert.doesNotMatch(services,/nginx|monitor|ssh\.service|Lab/);
  assert.match(packages,/coreutils/);
  assert.doesNotMatch(packages,/debian-trixie-installed|openssh-server|smartmontools/);
  assert.ok(Object.values(state.packages).every(pkg=>!pkg.virtual));
});

test('common inspection and composition commands remain useful',()=>{
  const {state,shell}=setup();
  assert.equal(shell.execute('echo alpha > ~/Notes/session.txt').exitCode,0);
  assert.equal(shell.execute('echo beta >> ~/Notes/session.txt').exitCode,0);
  assert.deepEqual(shell.execute('cat ~/Notes/session.txt | grep beta').stdout,['beta']);
  assert.match(text(shell.execute('stat ~/Notes/session.txt')),/m\.weber[\s\S]*2026-07-31T19:18:43\.000Z/);
  assert.equal(shell.execute('cp ~/Notes/session.txt ~/Notes/copy.txt').exitCode,0);
  assert.equal(state.filesystem.children.home.children['m.weber'].children.Notes.children['copy.txt'].owner,'m.weber');
});
