/* Browser-memory-only foundation shared by Linux Terminal Academy labs. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LinuxAcademy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  // Metadata lives on every node so later labs can extend this same in-memory model.
  const directory = (children = {}, metadata = {}) => ({ type: 'directory', children, owner: metadata.owner || 'museum', group: metadata.group || 'museum', mode: metadata.mode || 'rwxr-xr-x' });
  const file = (content = '', metadata = {}) => ({ type: 'file', content, owner: metadata.owner || 'museum', group: metadata.group || 'museum', mode: metadata.mode || 'rw-r--r--' });
  // Academy labs share one progressively expanding virtual system. Keep each lab's
  // profile composed from the prior profile so earlier concepts cannot be dropped.
  const commandProfiles = {
    lab01: ['pwd', 'whoami', 'uname', 'date', 'ls', 'cd', 'clear', 'help', 'man'],
    lab02: null,
    lab03: null, lab04: null, lab05: null
  };
  commandProfiles.lab02 = [...commandProfiles.lab01, 'cat'];
  commandProfiles.lab03 = [...commandProfiles.lab02, 'mkdir', 'touch', 'cp', 'mv', 'rm'];
  commandProfiles.lab04 = [...commandProfiles.lab03, 'chmod', 'chown', 'id', 'sudo'];
  commandProfiles.lab05 = [...commandProfiles.lab04, 'ps', 'top', 'kill'];
  Object.values(commandProfiles).forEach(Object.freeze);
  Object.freeze(commandProfiles);
  const defaultCommands = commandProfiles.lab01;
  const descriptions = { mkdir: 'create a virtual directory', touch: 'create a virtual file', cp: 'copy a virtual file', mv: 'rename or move a virtual node', rm: 'remove a virtual file', pwd: 'show current directory', whoami: 'show current user', uname: 'show virtual system information', date: 'show date and time', ls: 'list directory contents (-l shows permissions)', cd: 'change directory', cat: 'display a virtual file', chmod: 'change fictional permission bits', chown: 'explain fictional ownership changes', id: 'show fictional user and group', sudo: 'explain why sudo is unavailable', ps: 'inspect fictional processes (ps aux for details)', top: 'show a fictional process snapshot', kill: 'send TERM or KILL to a fictional process', clear: 'clear terminal', help: 'show available commands', man: 'read command help' };

  class VirtualFileSystem {
    constructor() {
      this.root = directory({
        bin: directory(),
        etc: directory({ hostname: file('linux\n'), 'os-release': file('NAME="Museum Linux"\nPRETTY_NAME="Museum Linux (Browser Virtual Machine)"\n') }),
        home: directory({ museum: directory({
          'README.txt': file('Welcome, museum.\n\nThis is your fictional Academy home directory.\nTry cd Documents, or return home with cd ~.\n'),
          Documents: directory(),
          Projects: directory()
        }) }),
        tmp: directory(),
        var: directory({ log: directory({ 'system.log': file('Academy virtual system started.\n') }) })
      });
      const lab = this.resolve('/home/museum/Projects', '/', '/home/museum').node;
      lab.children['permissions-lab'] = directory({
        'public.txt': file('This public note can be read by everyone in the Academy lab.\n'),
        'private.txt': file('This root-owned note is intentionally private.\n', { owner: 'root', group: 'root', mode: 'rw-------' }),
        'script.sh': file('#!/bin/sh\necho "A fictional script would run here."\n'),
        'notes.txt': file('Small permission changes solve small access problems.\n', { mode: '-w-------' })
      });
    }
    normalize(path) { const parts = []; path.split('/').forEach(part => { if (!part || part === '.') return; if (part === '..') parts.pop(); else parts.push(part); }); return '/' + parts.join('/'); }
    resolve(path, cwd, home) {
      const requested = path === '~' || path.startsWith('~/') ? home + path.slice(1) : path;
      const absolute = requested.startsWith('/') ? requested : `${cwd}/${requested}`;
      const normalized = this.normalize(absolute); let node = this.root;
      for (const part of normalized.split('/').filter(Boolean)) { if (node.type !== 'directory' || !node.children[part]) return null; node = node.children[part]; }
      return { path: normalized, node };
    }
    list(path, cwd, home) { const resolved = this.resolve(path || '.', cwd, home); if (!resolved) return { error: 'No such file or directory' }; if (resolved.node.type !== 'directory') return { error: 'Not a directory' }; return { entries: Object.keys(resolved.node.children).sort((a, b) => a.localeCompare(b)) }; }
    readFile(path, cwd, home, user, enforcePermissions = false) { const resolved = this.resolve(path, cwd, home); if (!resolved) return { error: 'No such file' }; if (resolved.node.type === 'directory') return { error: 'Is a directory' }; const bits = user === resolved.node.owner ? resolved.node.mode.slice(0, 3) : user === resolved.node.group ? resolved.node.mode.slice(3, 6) : resolved.node.mode.slice(6, 9); if (enforcePermissions && !bits.includes('r')) return { error: 'Permission denied', permissionDenied: true }; return { content: resolved.node.content, node: resolved.node }; }
    longList(path, cwd, home) { const resolved = this.resolve(path || '.', cwd, home); if (!resolved) return { error: 'No such file or directory' }; const entries = resolved.node.type === 'directory' ? Object.keys(resolved.node.children).sort((a, b) => a.localeCompare(b)).map(name => [name, resolved.node.children[name]]) : [[resolved.path.split('/').pop(), resolved.node]]; return { entries: entries.map(([name, node]) => `${node.type === 'directory' ? 'd' : '-'}${node.mode} ${node.owner.padEnd(7)} ${node.group.padEnd(7)} ${name}`) }; }
    chmod(path, mode, cwd = '/', home = '/home/museum') { const resolved = this.resolve(path, cwd, home); if (!resolved) return { error: 'No such file or directory' }; resolved.node.mode = mode; return { node: resolved.node }; }
    parentFor(path, cwd, home) {
      if (typeof path !== 'string' || !path.trim() || path === '/' || path.endsWith('/')) return { error: 'Invalid path' };
      const requested = path === '~' || path.startsWith('~/') ? home + path.slice(1) : path;
      const absolute = requested.startsWith('/') ? requested : `${cwd}/${requested}`;
      const normalized = this.normalize(absolute); const name = normalized.split('/').pop();
      if (!name || name === '.' || name === '..') return { error: 'Invalid path' };
      const parentPath = normalized.slice(0, normalized.lastIndexOf('/')) || '/'; const parent = this.resolve(parentPath, cwd, home);
      if (!parent) return { error: 'Parent directory does not exist' };
      if (parent.node.type !== 'directory') return { error: 'Parent is not a directory' };
      return { path: normalized, parentPath, parent: parent.node, name };
    }
    createDirectory(path, cwd, home) { const target = this.parentFor(path, cwd, home); if (target.error) return target; if (target.parent.children[target.name]) return { error: 'Already exists' }; target.parent.children[target.name] = directory(); return { path: target.path, node: target.parent.children[target.name], created: true }; }
    createFile(path, cwd, home) { const target = this.parentFor(path, cwd, home); if (target.error) return target; if (target.parent.children[target.name]) { if (target.parent.children[target.name].type === 'file') return { path: target.path, node: target.parent.children[target.name], created: false }; return { error: 'Already exists and is a directory' }; } target.parent.children[target.name] = file(); return { path: target.path, node: target.parent.children[target.name], created: true }; }
    copy(sourcePath, destinationPath, cwd, home) { const source = this.resolve(sourcePath, cwd, home); if (!source) return { error: 'Source file does not exist' }; if (source.node.type === 'directory') return { error: 'Copying directories requires recursive options, which this lab does not teach' }; const destination = this.resolve(destinationPath, cwd, home); let target; if (destination) { if (destination.node.type !== 'directory') return { error: 'Destination already exists' }; target = this.parentFor(`${destination.path}/${source.path.split('/').pop()}`, cwd, home); } else target = this.parentFor(destinationPath, cwd, home); if (target.error) return target; if (target.parent.children[target.name]) return { error: 'Destination already exists' }; target.parent.children[target.name] = file(source.node.content); return { path: target.path, created: true }; }
    move(sourcePath, destinationPath, cwd, home) { const source = this.resolve(sourcePath, cwd, home); if (!source) return { error: 'Source does not exist' }; if (source.path === '/') return { error: 'Cannot move the root directory' }; const sourceParent = this.resolve(source.path.slice(0, source.path.lastIndexOf('/')) || '/', cwd, home); const sourceName = source.path.split('/').pop(); const destination = this.resolve(destinationPath, cwd, home); let target; if (destination) { if (destination.node.type !== 'directory') return { error: 'Destination already exists' }; target = this.parentFor(`${destination.path}/${sourceName}`, cwd, home); } else target = this.parentFor(destinationPath, cwd, home); if (target.error) return target; if (target.path === source.path) return { path: source.path, moved: false }; if (source.node.type === 'directory' && (target.parentPath === source.path || target.parentPath.startsWith(`${source.path}/`))) return { error: 'Cannot move a directory into itself or one of its descendants' }; if (target.parent.children[target.name]) return { error: 'Destination already exists' }; target.parent.children[target.name] = source.node; delete sourceParent.node.children[sourceName]; return { path: target.path, moved: true }; }
    remove(path, cwd, home) { const target = this.resolve(path, cwd, home); if (!target) return { error: 'No such file or directory' }; if (target.path === '/') return { error: 'Cannot remove the root directory' }; if (target.node.type === 'directory') return { error: 'Is a directory; directory removal is intentionally outside this beginner lab' }; const parent = this.resolve(target.path.slice(0, target.path.lastIndexOf('/')) || '/', cwd, home); delete parent.node.children[target.path.split('/').pop()]; return { path: target.path, removed: true }; }
    walk(callback, node = this.root, path = '/') { callback(node, path); if (node.type === 'directory') Object.keys(node.children).sort((a, b) => a.localeCompare(b)).forEach(name => this.walk(callback, node.children[name], path === '/' ? `/${name}` : `${path}/${name}`)); }
  }
  class VirtualSystem {
    constructor() { this.reset(); }
    reset() {
      this.fileSystem = new VirtualFileSystem(); this.currentUser = 'museum'; this.homeDirectory = '/home/museum'; this.cwd = this.homeDirectory;
      // Deliberately small, deterministic browser-memory-only process table.
      this.processes = [
        { pid: 1, user: 'root', command: 'init (academy system)', state: 'S', cpu: 0.1, memory: 0.2, critical: true, terminated: false },
        { pid: 120, user: 'root', command: 'museum-service', state: 'S', cpu: 0.4, memory: 1.1, critical: true, terminated: false },
        { pid: 241, user: 'museum', command: 'museum-shell', state: 'R', cpu: 0.8, memory: 1.8, critical: false, terminated: false },
        { pid: 314, user: 'museum', command: 'gallery-backup', state: 'S', cpu: 1.5, memory: 2.4, critical: false, terminated: false },
        { pid: 427, user: 'museum', command: 'runaway-indexer', state: 'R', cpu: 96.7, memory: 8.6, critical: false, terminated: false }
      ];
    }
    runningProcesses() { return this.processes.filter(process => !process.terminated); }
    processByPid(pid) { return this.processes.find(process => process.pid === Number(pid)); }
    terminateProcess(pid, signal = 'TERM') {
      const process = this.processByPid(pid);
      if (!process) return { error: `kill: (${pid}) - No such fictional process` };
      if (process.terminated) return { error: `kill: (${pid}) - Process already terminated in this Academy` };
      if (process.critical) return { error: `kill: (${pid}) - Academy safety protection: PID ${pid} is essential and cannot be stopped here.` };
      process.terminated = true; process.state = 'X'; process.cpu = 0; process.signal = signal;
      return { process, signal };
    }
  }
  class CommandParser { parse(raw) { const text = String(raw || '').trim(); if (!text) return null; const [command, ...args] = text.split(/\s+/); return { raw: text, command, args }; } }
  const manuals = {
    pwd: ['PWD(1) — ACADEMY MANUAL', 'NAME', '    pwd — print the current working directory', 'DESCRIPTION', '    Shows where you are in the virtual filesystem.'],
    whoami: ['WHOAMI(1) — ACADEMY MANUAL', 'NAME', '    whoami — show the current virtual user'], uname: ['UNAME(1) — ACADEMY MANUAL', 'NAME', '    uname — show virtual system information'], date: ['DATE(1) — ACADEMY MANUAL', 'NAME', '    date — show browser-side virtual terminal time'],
    ls: ['LS(1) — ACADEMY MANUAL', 'NAME', '    ls — list directory contents', 'TRY', '    ls /'], cd: ['CD(1) — ACADEMY MANUAL', 'NAME', '    cd — change directory', 'DESCRIPTION', '    Use .. for parent, . for current directory, and ~ for home.'],
    mkdir: ['MKDIR(1) — ACADEMY MANUAL', 'NAME', '    mkdir — create a virtual directory', 'TRY', '    mkdir playground'], touch: ['TOUCH(1) — ACADEMY MANUAL', 'NAME', '    touch — create an empty virtual file', 'TRY', '    touch notes.txt'], cp: ['CP(1) — ACADEMY MANUAL', 'NAME', '    cp — copy a virtual file', 'TRY', '    cp notes.txt backup.txt'], mv: ['MV(1) — ACADEMY MANUAL', 'NAME', '    mv — rename or move a virtual node', 'TRY', '    mv notes.txt ideas.txt'], rm: ['RM(1) — ACADEMY MANUAL', 'NAME', '    rm — remove a virtual file', 'DESCRIPTION', '    Directory removal is intentionally outside this beginner lab.'], cat: ['CAT(1) — ACADEMY MANUAL', 'NAME', '    cat — display a virtual file', 'DESCRIPTION', '    Reads a small Academy file only; it never reads your computer.', 'TRY', '    cat README.txt'], chmod: ['CHMOD(1) — ACADEMY MANUAL', 'NAME', '    chmod — change fictional permission bits', 'TRY', '    chmod u+r notes.txt', '    chmod u+x script.sh', 'DESCRIPTION', '    u, g, and o mean owner, group, and others. Use the smallest useful change.'], chown: ['CHOWN(1) — ACADEMY MANUAL', 'NAME', '    chown — explain fictional ownership changes', 'DESCRIPTION', '    In this Academy, only the maintenance example may change ownership. Real Linux normally requires appropriate privilege.'], id: ['ID(1) — ACADEMY MANUAL', 'NAME', '    id — show the fictional user and group'], ps: ['PS(1) — ACADEMY MANUAL', 'NAME', '    ps — inspect the Academy process table', 'TRY', '    ps aux', '    Process rows are fictional browser-memory data only.'], top: ['TOP(1) — ACADEMY MANUAL', 'NAME', '    top — show one educational snapshot of active fictional processes', 'DESCRIPTION', '    This Academy version does not stay open or refresh forever.'], kill: ['KILL(1) — ACADEMY MANUAL', 'NAME', '    kill — send a safe fictional signal to one PID', 'TRY', '    kill 427', '    kill -TERM 427', '    TERM is a polite request; KILL is forceful and should not be the first reflex.'], sudo: ['SUDO(1) — ACADEMY MANUAL', 'NAME', '    sudo — unavailable in this browser-only Academy lab'], clear: ['CLEAR(1) — ACADEMY MANUAL', 'NAME', '    clear — clear visible terminal output'], help: ['HELP(1) — ACADEMY MANUAL', 'NAME', '    help — list commands available in this lab'], man: ['MAN(1) — ACADEMY MANUAL', 'NAME', '    man — read an Academy manual entry']
  };
  class Shell {
    constructor(system, options = {}) { this.system = system; this.parser = new CommandParser(); this.allowedCommands = new Set(options.allowedCommands || defaultCommands); }
    execute(raw) {
      const input = this.parser.parse(raw); if (!input) return { ignored: true, output: [], success: false };
      const { command, args } = input, system = this.system, fs = system.fileSystem;
      const success = output => ({ input, output: Array.isArray(output) ? output : [output], success: true, command }); const failure = output => ({ input, output: Array.isArray(output) ? output : [output], success: false, command });
      if (!this.allowedCommands.has(command)) return failure([`${command}: command not found`, 'Type help to see available commands.']);
      if (command === 'pwd') return args.length ? failure('pwd: this Lab 01 command does not use options yet') : success(system.cwd);
      if (command === 'whoami') return args.length ? failure('whoami: this Lab 01 command does not use options yet') : success(system.currentUser);
      if (command === 'uname') return args.length && !(args.length === 1 && args[0] === '-a') ? failure('uname: only -a is available in Lab 01') : success(args[0] === '-a' ? 'Linux museum-linux 1.0.0-museum #1 Browser Virtual Machine educational' : 'Linux');
      if (command === 'date') return args.length ? failure('date: this Lab 01 command does not use options yet') : success(new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC (browser-side time)'));
      if (command === 'ls') { const long = args[0] === '-l'; if (args.some(arg => arg.startsWith('-') && arg !== '-l') || (long && !this.allowedCommands.has('chmod'))) return failure('ls: options are not part of this lab yet'); const path = long ? args[1] : args[0]; if (args.length > (long ? 2 : 1)) return failure('ls: use one directory at a time'); const listing = long ? fs.longList(path || '.', system.cwd, system.homeDirectory) : fs.list(path || '.', system.cwd, system.homeDirectory); return listing.error ? failure(`ls: ${path || '.'}: ${listing.error}`) : success(long ? listing.entries : listing.entries.join('  ')); }
      if (command === 'cd') { if (args.length > 1) return failure('cd: too many arguments'); const target = args[0] || system.homeDirectory, resolved = fs.resolve(target, system.cwd, system.homeDirectory); if (!resolved) return failure(`cd: ${target}: No such directory`); if (resolved.node.type !== 'directory') return failure(`cd: ${target}: Not a directory`); system.cwd = resolved.path; return success([]); }
      if (command === 'cat') { if (args.length !== 1) return failure('cat: try one virtual file at a time'); const reading = fs.readFile(args[0], system.cwd, system.homeDirectory, system.currentUser, this.allowedCommands.has('chmod')); return reading.error ? failure(`cat: ${args[0]}: ${reading.error}`) : success(reading.content.replace(/\n$/, '')); }
      if (command === 'mkdir') { if (args.length !== 1) return failure('mkdir: try one directory path'); const result = fs.createDirectory(args[0], system.cwd, system.homeDirectory); return result.error ? failure(`mkdir: ${args[0]}: ${result.error}`) : success([]); }
      if (command === 'touch') { if (args.length !== 1) return failure('touch: try one file path'); const result = fs.createFile(args[0], system.cwd, system.homeDirectory); return result.error ? failure(`touch: ${args[0]}: ${result.error}`) : success([]); }
      if (command === 'cp') { if (args.length !== 2) return failure('cp: try cp SOURCE DESTINATION'); const result = fs.copy(args[0], args[1], system.cwd, system.homeDirectory); return result.error ? failure(`cp: ${result.error}`) : success([]); }
      if (command === 'mv') { if (args.length !== 2) return failure('mv: try mv SOURCE DESTINATION'); const result = fs.move(args[0], args[1], system.cwd, system.homeDirectory); return result.error ? failure(`mv: ${result.error}`) : success([]); }
      if (command === 'rm') { if (args.length !== 1 || args[0].startsWith('-')) return failure('rm: this beginner lab removes one file at a time; recursive options are not available'); const result = fs.remove(args[0], system.cwd, system.homeDirectory); return result.error ? failure(`rm: ${args[0]}: ${result.error}`) : success([]); }
      if (command === 'id') return args.length ? failure('id: no options in this Academy lab') : success('uid=1000(museum) gid=1000(museum) groups=1000(museum)');
      if (command === 'sudo') return failure(['sudo: unavailable in this browser-only Academy lab.', 'This fictional system teaches permissions without granting real privileges.']);
      if (command === 'ps') {
        if (!args.length) return success(['PID   STAT COMMAND', ...system.runningProcesses().filter(process => process.user === system.currentUser).map(process => `${String(process.pid).padEnd(5)} ${process.state.padEnd(4)} ${process.command}`)]);
        if (args.length === 1 && args[0] === 'aux') return success(['USER     PID  %CPU %MEM STAT COMMAND', ...system.runningProcesses().map(process => `${process.user.padEnd(8)} ${String(process.pid).padEnd(4)} ${String(process.cpu.toFixed(1)).padStart(4)} ${String(process.memory.toFixed(1)).padStart(4)} ${process.state.padEnd(4)} ${process.command}`)]);
        return failure('ps: supported forms are ps and ps aux in this Academy lab');
      }
      if (command === 'top') {
        if (args.length) return failure('top: this Academy snapshot takes no options');
        return success(['ACADEMY TOP SNAPSHOT — fictional browser-memory processes', 'PID   USER     %CPU STAT COMMAND', ...system.runningProcesses().slice().sort((a, b) => b.cpu - a.cpu).map(process => `${String(process.pid).padEnd(5)} ${process.user.padEnd(8)} ${String(process.cpu.toFixed(1)).padStart(4)} ${process.state.padEnd(4)} ${process.command}`), '', 'R = running · S = sleeping. This is one snapshot, not a live host-system tool.']);
      }
      if (command === 'kill') {
        let signal = 'TERM', pid;
        if (args.length === 1) pid = args[0];
        else if (args.length === 2 && /^-(TERM|KILL)$/.test(args[0])) { signal = args[0].slice(1); pid = args[1]; }
        else if (args.length && args[0].startsWith('-')) return failure(`kill: unsupported signal ${args[0]}; use -TERM or -KILL`);
        else return failure('kill: try kill PID, kill -TERM PID, or kill -KILL PID');
        if (!/^\d+$/.test(pid)) return failure(`kill: invalid PID: ${pid}`);
        const result = system.terminateProcess(pid, signal);
        if (result.error) return failure(result.error);
        return success(signal === 'KILL' ? [`kill: sent SIGKILL to fictional PID ${pid}. It stopped, but TERM is normally the safer first request.`] : [`kill: sent SIGTERM to fictional PID ${pid}. The process ended normally in this Academy.`]);
      }
      if (command === 'chmod') { if (args.length !== 2) return failure('chmod: try chmod u+r FILE'); const target = fs.resolve(args[1], system.cwd, system.homeDirectory); if (!target) return failure(`chmod: ${args[1]}: No such file or directory`); if (target.node.owner !== system.currentUser) return failure(`chmod: ${args[1]}: Operation not permitted`); let mode = target.node.mode; if (/^[0-7]{3}$/.test(args[0])) { const symbols = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx']; mode = args[0].split('').map(n => symbols[Number(n)]).join(''); } else { const match = args[0].match(/^([ugo])([+-])([rwx])$/); if (!match) return failure(`chmod: invalid mode: ${args[0]}`); const offsets = { u: 0, g: 3, o: 6 }; const index = offsets[match[1]] + 'rwx'.indexOf(match[3]); mode = mode.slice(0, index) + (match[2] === '+' ? match[3] : '-') + mode.slice(index + 1); } fs.chmod(args[1], mode, system.cwd, system.homeDirectory); const warning = args[0] === '777' ? ['chmod: warning: 777 grants more access than this repair needs.'] : []; return success(warning); }
      if (command === 'chown') { const maintenance = args[0] === '--academy-maintenance'; const owner = maintenance ? args[1] : args[0], path = maintenance ? args[2] : args[1]; if ((!maintenance && args.length !== 2) || (maintenance && args.length !== 3)) return failure('chown: try chown OWNER FILE (or Academy maintenance demo)'); const target = fs.resolve(path, system.cwd, system.homeDirectory); if (!target) return failure(`chown: ${path}: No such file or directory`); if (!maintenance) return failure(['chown: Operation not permitted for museum.', 'Real Linux ownership changes normally require appropriate privilege; this Academy does not grant it.']); target.node.owner = owner; target.node.group = owner; return success(['Academy maintenance changed fictional ownership only.', 'Real Linux requires appropriate privilege for chown.']); }
      if (command === 'clear') return args.length ? failure('clear: this Lab 01 command does not use options yet') : { input, output: [], success: true, command, clear: true };
      if (command === 'help') return success(['AVAILABLE COMMANDS', '', ...[...this.allowedCommands].map(name => `${name.padEnd(9)}${descriptions[name] || ''}`)]);
      if (command === 'man') { if (args.length !== 1) return failure('man: try man followed by one available command'); return this.allowedCommands.has(args[0]) && manuals[args[0]] ? success(manuals[args[0]]) : failure(`man: no Academy manual entry for ${args[0]}`); }
      return failure([`${command}: command not found`, 'Type help to see available commands.']);
    }
  }
  return { VirtualFileSystem, VirtualSystem, CommandParser, Shell, manuals, commandProfiles, defaultCommands };
});
