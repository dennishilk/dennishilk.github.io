const test = require('node:test');
const assert = require('node:assert/strict');
const { VirtualSystem, Shell } = require('../museum/linux-terminal-academy/assets/virtual-system.js');

function lab() { const system = new VirtualSystem(); return { system, shell: new Shell(system) }; }

test('Lab 01 virtual filesystem resolves relative, absolute, and normalized paths', () => {
  const { system, shell } = lab();
  assert.deepEqual(shell.execute('pwd').output, ['/home/museum']);
  assert.deepEqual(shell.execute('ls').output, ['Documents  Projects  README.txt']);

  assert.equal(shell.execute('cd Documents').success, true);
  assert.equal(system.cwd, '/home/museum/Documents');
  assert.deepEqual(shell.execute('pwd').output, ['/home/museum/Documents']);
  assert.deepEqual(shell.execute('ls').output, ['']);

  shell.execute('cd ..');
  assert.equal(system.cwd, '/home/museum');
  shell.execute('cd /home/museum/../museum');
  assert.equal(system.cwd, '/home/museum');
  shell.execute('cd ./Documents');
  assert.equal(system.cwd, '/home/museum/Documents');
  shell.execute('cd ..');
  assert.equal(system.cwd, '/home/museum');
  shell.execute('cd ..');
  assert.equal(system.cwd, '/home');
  shell.execute('cd museum');
  assert.equal(system.cwd, '/home/museum');

  shell.execute('cd /');
  assert.deepEqual(shell.execute('pwd').output, ['/']);
  assert.deepEqual(shell.execute('ls').output, ['bin  etc  home  tmp  var']);
  shell.execute('cd home');
  shell.execute('cd museum');
  assert.equal(system.cwd, '/home/museum');
  shell.execute('cd ~');
  assert.equal(system.cwd, '/home/museum');
  shell.execute('cd .');
  assert.equal(system.cwd, '/home/museum');
  shell.execute('cd /');
  shell.execute('cd ..');
  assert.equal(system.cwd, '/');
});

test('Lab 01 commands safely reject invalid input without changing virtual state', () => {
  const { system, shell } = lab();
  assert.deepEqual(shell.execute('whoami').output, ['museum']);
  assert.match(shell.execute('uname -a').output[0], /Browser Virtual Machine/);
  assert.equal(shell.execute('uname --something-invalid').success, false);

  const nowhere = shell.execute('cd nowhere');
  assert.equal(nowhere.success, false);
  assert.equal(system.cwd, '/home/museum');
  assert.equal(shell.execute('cd /home/museum/does-not-exist').success, false);
  assert.equal(system.cwd, '/home/museum');

  assert.equal(shell.execute('ls --unsupported').success, false);
  assert.equal(system.cwd, '/home/museum');
  assert.deepEqual(shell.execute('foobar').output, ['foobar: command not found', 'Type help to see available commands.']);
  assert.equal(system.cwd, '/home/museum');
});

test('Lab 01 parsing, manuals, and clear preserve the expected shell behavior', () => {
  const { system, shell } = lab();

  assert.deepEqual(shell.execute('    pwd').output, ['/home/museum']);
  assert.deepEqual(shell.execute('pwd    ').output, ['/home/museum']);
  assert.equal(shell.execute('   ').ignored, true);
  assert.match(shell.execute('date').output[0], /UTC \(browser-side time\)$/);

  for (const command of ['pwd', 'ls', 'cd', 'whoami', 'uname', 'date', 'clear', 'help', 'man']) {
    const result = shell.execute(`man ${command}`);
    assert.equal(result.success, true, `man ${command} should be available`);
    assert.match(result.output.join('\n'), /ACADEMY MANUAL/);
  }
  assert.equal(shell.execute('man unknown').success, false);

  shell.execute('cd /');
  const clear = shell.execute('clear');
  assert.equal(clear.clear, true);
  assert.equal(system.cwd, '/');
  assert.deepEqual(shell.execute('pwd').output, ['/']);
});
