'use strict';
const assert = require('assert');
const terminal = require('../museum/linux-game-install/terminal.js');
const { createController } = require('../museum/linux-game-install/lab-controller.js');
const commands = ['apt update', 'apt search nebustrike', 'apt install nebustrike', 'y', 'which nebustrike', 'cd /usr', 'cd games', 'ls', 'nebustrike'];

function run(source) {
  const events = []; let maxDepth = 0;
  const controller = createController(terminal, event => {
    events.push(event); maxDepth = Math.max(maxDepth, controller.snapshot().dispatchDepth);
    // A renderer attempting to re-submit must be rejected, not recursively executed.
    const nested = controller.submit('apt search games', 'render');
    assert.equal(nested.action, 'busy');
  });
  commands.forEach(command => {
    const before = events.length, result = controller.submit(command, source);
    assert.equal(result.handled, true); assert.ok(result.output.length < 700, command);
    assert.equal(events.length, before + 1, `${command} rendered exactly once`);
    assert.equal(controller.snapshot().dispatchDepth, 0);
  });
  assert.equal(maxDepth, 1); assert.equal(events.filter(e => e.action === 'installed').length, 1);
  assert.equal(events.filter(e => e.action === 'launch').length, 1);
  assert.deepEqual(controller.snapshot().steps, { updated: true, searched: true, installed: true, launched: true });
  assert.equal(controller.snapshot().state.system.fileSystem.resolve('/usr/games/nebustrike', '/', '/home/visitor').node.type, 'file');
  const reset = controller.submit('reset', source);
  assert.equal(reset.action, 'reset'); assert.equal(controller.snapshot().state.installed, false);
  assert.deepEqual(controller.snapshot().steps, { updated: false, searched: false, installed: false, launched: false });
}
for (let i = 0; i < 4; i++) { run('keyboard'); run('helper'); }
console.log('linux game installation public flow regression tests passed');

const fs = require('fs'); const lab = fs.readFileSync(require.resolve('../museum/linux-game-install/lab.js'), 'utf8'); const page = fs.readFileSync(require.resolve('../museum/linux-game-install/lab.html'), 'utf8');
assert.match(page, /lab-controller\.js/); assert.match(lab, /run\(command, 'helper'\)/); assert.match(lab, /controller\.submit\(command, source\)/);
assert.match(page, /NEW TO THE TERMINAL\?/); assert.match(page, /Type commands <b>after<\/b> the <b>\$<\/b>/); assert.match(page, /data-command="help"/);
assert.match(lab, /cd \/usr\/games/); assert.match(lab, /gameView\.launch\(\)/); assert.match(lab, /gameView\.stop\(\)/);
