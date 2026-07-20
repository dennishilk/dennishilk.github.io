const test = require('node:test');
const assert = require('node:assert/strict');
const { VirtualSystem, Shell, commandProfiles } = require('../museum/linux-terminal-academy/assets/virtual-system.js');

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
  assert.deepEqual(shell.execute('pwd').output, ['/home/museum']);
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
  const lab02 = new Shell(system, { allowedCommands: commandProfiles.lab02 });
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

test('Lab 03 mutations change only the shared virtual filesystem', () => {
  const system = new VirtualSystem(); const shell = new Shell(system, { allowedCommands: commandProfiles.lab03 }); const fs = system.fileSystem;
  assert.equal(shell.execute('mkdir Projects/playground').success, true);
  assert.match(shell.execute('mkdir Projects/playground').output[0], /Already exists/);
  assert.equal(shell.execute('mkdir missing/child').success, false);
  assert.equal(shell.execute('cd Projects/playground').success, true);
  assert.equal(shell.execute('touch notes.txt').success, true);
  const notes = fs.resolve('notes.txt', system.cwd, system.homeDirectory).node; notes.content = 'original';
  assert.equal(shell.execute('touch notes.txt').success, true); assert.equal(notes.content, 'original');
  assert.equal(shell.execute('cp notes.txt backup.txt').success, true);
  const backup = fs.resolve('backup.txt', system.cwd, system.homeDirectory).node; backup.content = 'copy'; assert.equal(notes.content, 'original');
  assert.equal(shell.execute('mv notes.txt ideas.txt').success, true); assert.equal(fs.resolve('notes.txt', system.cwd, system.homeDirectory), null);
  assert.equal(shell.execute('mv ideas.txt /home/museum/Documents/').success, true); assert.ok(fs.resolve('/home/museum/Documents/ideas.txt', system.cwd, system.homeDirectory));
  assert.equal(shell.execute('touch ./ideas.txt').success, true); assert.equal(shell.execute('rm ./ideas.txt').success, true);
  assert.match(shell.execute('rm nowhere.txt').output[0], /No such file/); assert.match(shell.execute('rm ..').output[0], /Is a directory/);
  assert.equal(shell.execute('touch /home/museum/Projects/playground/notes.txt').success, true); assert.equal(shell.execute('mv ./notes.txt ../playground/ideas.txt').success, true);
  assert.match(shell.execute('cat Readme.txt').output[0], /No such file/);
  assert.equal(shell.execute('mkdir ../other').success, true); assert.equal(shell.execute('mkdir ../other/child').success, true); assert.match(shell.execute('mv ../other ../other/child').output[0], /descendants/);
  const fresh = new VirtualSystem(); assert.equal(fresh.fileSystem.resolve('/home/museum/Projects/playground', fresh.cwd, fresh.homeDirectory), null);
});

test('Academy command profiles are cumulative and preserve each lab boundary', () => {
  const lab01Commands = ['pwd', 'whoami', 'uname', 'date', 'ls', 'cd', 'clear', 'help', 'man'];
  const lab02Additions = ['cat'];
  const lab03Additions = ['mkdir', 'touch', 'cp', 'mv', 'rm'];
  assert.deepEqual(commandProfiles.lab01, lab01Commands);
  assert.deepEqual(commandProfiles.lab02, [...lab01Commands, ...lab02Additions]);
  assert.deepEqual(commandProfiles.lab03, [...lab01Commands, ...lab02Additions, ...lab03Additions]);
  assert.ok(commandProfiles.lab01.every(command => commandProfiles.lab02.includes(command)));
  assert.ok(commandProfiles.lab02.every(command => commandProfiles.lab03.includes(command)));

  const lab01 = new Shell(new VirtualSystem(), { allowedCommands: commandProfiles.lab01 });
  for (const command of lab01Commands) assert.ok(lab01.allowedCommands.has(command), `Lab 01 exposes ${command}`);
  for (const command of [...lab02Additions, ...lab03Additions]) assert.equal(lab01.execute(command).success, false, `Lab 01 excludes ${command}`);

  const lab02 = new Shell(new VirtualSystem(), { allowedCommands: commandProfiles.lab02 });
  for (const command of [...lab01Commands, ...lab02Additions]) assert.ok(lab02.allowedCommands.has(command), `Lab 02 exposes ${command}`);
  for (const command of lab03Additions) assert.equal(lab02.execute(command).success, false, `Lab 02 excludes ${command}`);

  const root = require('node:path').join(__dirname, '../museum/linux-terminal-academy');
  assert.match(require('node:fs').readFileSync(`${root}/terminal-first-steps/lab.js`, 'utf8'), /commandProfiles\.lab01/);
  assert.match(require('node:fs').readFileSync(`${root}/filesystem-explorer/lab.js`, 'utf8'), /commandProfiles\.lab02/);
  assert.match(require('node:fs').readFileSync(`${root}/files-directories/lab.js`, 'utf8'), /commandProfiles\.lab03/);
});

test('Lab 03 cumulative profile exposes earlier commands, manuals, and mutations', () => {
  const system = new VirtualSystem();
  const shell = new Shell(system, { allowedCommands: commandProfiles.lab03 });
  const expectedCommands = commandProfiles.lab03;
  for (const command of expectedCommands) assert.equal(shell.execute(`man ${command}`).success, true, `man ${command}`);
  assert.deepEqual(shell.execute('help').output.slice(2).map(line => line.trim().split(/\s+/)[0]), expectedCommands);

  assert.deepEqual(shell.execute('pwd').output, ['/home/museum']);
  assert.deepEqual(shell.execute('whoami').output, ['museum']);
  assert.deepEqual(shell.execute('uname').output, ['Linux']);
  assert.match(shell.execute('date').output[0], /UTC \(browser-side time\)$/);
  assert.match(shell.execute('cat README.txt').output[0], /Welcome, museum/);
  ['mkdir test', 'touch test/file.txt', 'cp test/file.txt test/copy.txt', 'mv test/copy.txt test/moved.txt', 'rm test/moved.txt'].forEach(command => assert.equal(shell.execute(command).success, true, command));
  assert.ok(system.fileSystem.resolve('/home/museum/test/file.txt', system.cwd, system.homeDirectory));
  assert.equal(system.fileSystem.resolve('/home/museum/test/copy.txt', system.cwd, system.homeDirectory), null);
  assert.equal(system.fileSystem.resolve('/home/museum/test/moved.txt', system.cwd, system.homeDirectory), null);
  assert.equal(shell.execute('chmod foo').success, false);

  ['cd Projects', 'mkdir playground', 'cd playground', 'touch notes.txt', 'cp notes.txt backup.txt', 'mv notes.txt ideas.txt', 'rm backup.txt'].forEach(command => assert.equal(shell.execute(command).success, true, command));
  assert.ok(system.fileSystem.resolve('/home/museum/Projects/playground/ideas.txt', system.cwd, system.homeDirectory));
  assert.equal(system.fileSystem.resolve('/home/museum/Projects/playground/backup.txt', system.cwd, system.homeDirectory), null);
});
