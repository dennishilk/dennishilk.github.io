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
