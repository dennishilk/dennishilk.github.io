const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const html = fs.readFileSync(__dirname + '/lab.html', 'utf8');
const css = fs.readFileSync(__dirname + '/terminal.css', 'utf8');
const js = fs.readFileSync(__dirname + '/terminal.js', 'utf8');

test('CRT viewport is fixed while the terminal buffer scrolls internally', () => {
  assert.match(html, /id="screen" class="screen off"><div id="terminalBuffer" class="terminal-buffer"/);
  assert.match(css, /\.screen\{[^}]*height:clamp\(19rem,43vw,31\.25rem\)/);
  assert.doesNotMatch(css, /\.screen\{[^}]*min-height/);
  assert.match(css, /\.terminal-buffer\{[^}]*height:100%;[^}]*overflow-y:auto;[^}]*overflow-x:hidden/);
  assert.match(js, /MAX_SCROLLBACK_LINES=160/);
  assert.match(js, /lines\.splice\(0,lines\.length-MAX_SCROLLBACK_LINES\)/);
  assert.match(js, /pinnedToBottom=.*scrollHeight.*scrollTop.*clientHeight/);
  assert.match(js, /if\(pinnedToBottom\)buffer\.scrollTop=buffer\.scrollHeight/);
});

test('audio uses one compressed master chain with controlled, audible layers', () => {
  assert.match(js, /audio=new \(window\.AudioContext\|\|window\.webkitAudioContext\)\(\)/);
  assert.match(js, /const master=audio\.createGain\(\),comp=audio\.createDynamicsCompressor\(\)/);
  assert.match(js, /master\.gain\.value=\.82/);
  assert.match(js, /comp\.threshold\.value=-14;.*comp\.ratio\.value=8/);
  assert.match(js, /tone\(54,\.82,\.2,'sine',\.08\).*tone\(96,\.58,\.14,'triangle',\.12\)/);
  assert.match(js, /noise\(\.14,\.11,\.025\)/);
  assert.match(js, /whine\.frequency\.value=15734;g\.gain\.value=\.004/);
  assert.match(js, /function bell\(\)\{tone\(880,\.48,\.11/);
  assert.match(js, /kind==='return'\?\.09:kind==='break'\?\.07:\.035/);
  assert.match(js, /keySound\('break'\)/);
  assert.doesNotMatch(js, /gain\.value=[1-9]\d/);
});

test('CRT typing focus suppresses the browser frame without removing control focus visibility', () => {
  assert.match(css, /\.terminal-buffer:focus-visible\{outline:none;box-shadow:inset 0 0 0 1px #78e9a0aa/);
  assert.match(css, /button:focus-visible,select:focus-visible,input:focus-visible\{outline:2px solid #8cffad/);
  assert.doesNotMatch(css, /\.terminal-buffer:focus-visible\{outline:3px solid #dce889/);
  assert.match(js, /\$\('powerLamp'\)\.textContent='ON';buffer\.focus\(\{preventScroll:true\}\)/);
});

test('terminal history is authoritative while input remains separate', () => {
  assert.match(js, /out\.textContent=lines\.join\('\\n'\)\+\(lines\.length\?'\\n':''\)\+current/);
  assert.match(js, /function appendText\(text\)\{for\(const character of text\)/);
  assert.match(js, /if\(character==='\\n'\)lines\.push\(''\);else if\(lines\.length\)lines\[lines\.length-1\]\+=character/);
  assert.match(js, /function stream\(text,done\).*?done\?\.\(\).*?appendText\(text\[i\+\+\]\)/);
  assert.doesNotMatch(js, /else \{current\+=c;render\(\)\}/);
  assert.match(js, /function prompt\(\)\{current='GUEST> ';render\(\)\}/);
  assert.match(js, /function trim\(\)\{if\(lines\.length>MAX_SCROLLBACK_LINES\)lines\.splice\(0,lines\.length-MAX_SCROLLBACK_LINES\)\}/);
});

test('startup is staged, paced, and invalidated when a power cycle changes generation', () => {
  assert.match(js, /STARTUP_TIMING=\{wake:320,selfTest:900,video:1300,keyboard:1650,line:2000,connect:2600,host:3700,status:4150,login:4750\}/);
  assert.match(js, /STARTUP_TIMING\.wake\*pacing.*STARTUP_TIMING\.selfTest\*pacing.*STARTUP_TIMING\.connect\*pacing.*STARTUP_TIMING\.login\*pacing/);
  assert.match(js, /const session=\+\+generation,pacing=reduced\?0:1/);
  assert.match(js, /function later\(fn,ms,session=generation\).*?if\(session===generation\)fn\(\)/);
  assert.match(js, /function powerOff\(\)\{powered=false;starting=false;generation\+\+;clearTimers\(\)/);
  assert.match(js, /screen\.classList\.remove\('off'\).*?add\('TERMINAL SELF TEST'\).*?add\('CONNECTING TO REMOTE HOST\.\.\.'\).*?add\('NEBUNIX REMOTE HOST'\).*?current='login: '/);
});

test('HELP and later commands stream into retained scrollback rather than the prompt input', () => {
  assert.match(js, /help:'COMMANDS: HELP DATE WHO USERS LS CAT WELCOME\.TXT CAT HISTORY\.TXT/);
  assert.match(js, /stream\('\\n'\+response\+'\\n\\n',\(\)=>loggedIn\?prompt\(\)/);
  assert.match(js, /function submit\(\).*?add\(current\);current='';.*?hostReply\(typed\)/);
  assert.match(js, /appendText\(text\[i\+\+\]\);flash\('rx'\);later\(step,reduced\?0:delay,session\)/);
});
