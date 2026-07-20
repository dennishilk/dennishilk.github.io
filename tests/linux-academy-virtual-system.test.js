const test = require('node:test');
const assert = require('node:assert/strict');
const { VirtualSystem, Shell } = require('../museum/linux-terminal-academy/assets/virtual-system.js');

function lab() { const system = new VirtualSystem(); return { system, shell: new Shell(system) }; }

test('Lab 01 virtual filesystem resolves real shell state', () => {
  const { system, shell } = lab();
  assert.deepEqual(shell.execute('pwd').output, ['/home/museum']);
  assert.deepEqual(shell.execute('ls').output, ['Documents  Projects  README.txt']);
  assert.equal(shell.execute('cd Documents').success, true);
  assert.equal(system.cwd, '/home/museum/Documents');
  shell.execute('cd ..'); assert.equal(system.cwd, '/home/museum');
  shell.execute('cd /'); shell.execute('cd home'); shell.execute('cd museum');
  assert.equal(system.cwd, '/home/museum');
  shell.execute('cd ~'); assert.equal(system.cwd, '/home/museum');
});

test('Lab 01 commands report unsupported and invalid input safely', () => {
  const { system, shell } = lab();
  assert.deepEqual(shell.execute('whoami').output, ['museum']);
  assert.match(shell.execute('uname -a').output[0], /Browser Virtual Machine/);
  assert.match(shell.execute('man pwd').output.join('\n'), /ACADEMY MANUAL/);
  assert.equal(shell.execute('cd nowhere').success, false);
  assert.equal(system.cwd, '/home/museum');
  assert.deepEqual(shell.execute('foobar').output, ['foobar: command not found', 'Type help to see available commands.']);
});
