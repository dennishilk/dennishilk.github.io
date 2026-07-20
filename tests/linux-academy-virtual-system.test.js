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

test('Lab 02 profile explores the shared filesystem without expanding Lab 01 commands', () => {
  const system = new VirtualSystem();
  const lab02 = new Shell(system, { allowedCommands: ['pwd', 'whoami', 'uname', 'date', 'ls', 'cd', 'clear', 'help', 'man', 'cat'] });
  assert.equal(system.cwd, '/home/museum');
  assert.deepEqual(system.fileSystem.list('/', system.cwd, system.homeDirectory).entries, ['bin', 'etc', 'home', 'tmp', 'var']);
  assert.equal(lab02.execute('cd /').success, true);
  assert.equal(lab02.execute('cd home').success, true);
  assert.equal(lab02.execute('cd museum').success, true);
  assert.equal(lab02.execute('cd Documents').success, true);
  assert.equal(system.cwd, '/home/museum/Documents');
  assert.equal(lab02.execute('cd /var/log').success, true);
  assert.deepEqual(lab02.execute('pwd').output, ['/var/log']);
  assert.deepEqual(lab02.execute('ls').output, ['system.log']);
  assert.equal(lab02.execute('cd ~').success, true);
  assert.equal(system.cwd, '/home/museum');
  assert.equal(lab02.execute('cd /home/museum/../museum').success, true);
  assert.equal(lab02.execute('cd nowhere').success, false);
  assert.equal(system.cwd, '/home/museum');
  lab02.execute('cd /'); lab02.execute('cd ..'); assert.equal(system.cwd, '/');
  assert.match(lab02.execute('cat /etc/hostname').output[0], /^linux/);
  lab02.execute('cd ~');
  assert.match(lab02.execute('cat README.txt').output[0], /Welcome, museum/);
  assert.match(lab02.execute('cat Documents').output[0], /Is a directory/);
  assert.match(lab02.execute('cat nowhere.txt').output[0], /No such file/);
  assert.match(lab02.execute('help').output.join('\n'), /cat/);
  assert.equal(lab02.execute('man cat').success, true);
  const lab01 = new Shell(new VirtualSystem());
  assert.equal(lab01.execute('cat README.txt').success, false);
  assert.doesNotMatch(lab01.execute('help').output.join('\n'), /cat/);
});

test('Lab 02 tree UI derives nodes from the shared filesystem and routes helpers through run', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '../museum/linux-terminal-academy/filesystem-explorer/lab.js'), 'utf8');
  assert.match(source, /system\.fileSystem\.root/);
  assert.match(source, /run\(`cd \$\{button\.dataset\.path\}`\)/);
  assert.match(source, /button\.dataset\.command/);
  assert.match(source, /system\.cwd === '\/var\/log'/);
  assert.match(source, /system = new VirtualSystem\(\)/);
});
