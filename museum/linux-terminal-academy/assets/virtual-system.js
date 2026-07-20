/* Browser-memory-only foundation shared by Linux Terminal Academy labs. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LinuxAcademy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const directory = (children = {}) => ({ type: 'directory', children });
  const file = (content = '') => ({ type: 'file', content });
  const defaultCommands = ['pwd', 'whoami', 'uname', 'date', 'ls', 'cd', 'clear', 'help', 'man'];
  const descriptions = { pwd: 'show current directory', whoami: 'show current user', uname: 'show virtual system information', date: 'show date and time', ls: 'list directory contents', cd: 'change directory', cat: 'display a virtual file', clear: 'clear terminal', help: 'show available commands', man: 'read command help' };

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
    readFile(path, cwd, home) { const resolved = this.resolve(path, cwd, home); if (!resolved) return { error: 'No such file' }; if (resolved.node.type === 'directory') return { error: 'Is a directory' }; return { content: resolved.node.content }; }
    walk(callback, node = this.root, path = '/') { callback(node, path); if (node.type === 'directory') Object.keys(node.children).sort((a, b) => a.localeCompare(b)).forEach(name => this.walk(callback, node.children[name], path === '/' ? `/${name}` : `${path}/${name}`)); }
  }
  class VirtualSystem { constructor() { this.reset(); } reset() { this.fileSystem = new VirtualFileSystem(); this.currentUser = 'museum'; this.homeDirectory = '/home/museum'; this.cwd = this.homeDirectory; } }
  class CommandParser { parse(raw) { const text = String(raw || '').trim(); if (!text) return null; const [command, ...args] = text.split(/\s+/); return { raw: text, command, args }; } }
  const manuals = {
    pwd: ['PWD(1) — ACADEMY MANUAL', 'NAME', '    pwd — print the current working directory', 'DESCRIPTION', '    Shows where you are in the virtual filesystem.'],
    whoami: ['WHOAMI(1) — ACADEMY MANUAL', 'NAME', '    whoami — show the current virtual user'], uname: ['UNAME(1) — ACADEMY MANUAL', 'NAME', '    uname — show virtual system information'], date: ['DATE(1) — ACADEMY MANUAL', 'NAME', '    date — show browser-side virtual terminal time'],
    ls: ['LS(1) — ACADEMY MANUAL', 'NAME', '    ls — list directory contents', 'TRY', '    ls /'], cd: ['CD(1) — ACADEMY MANUAL', 'NAME', '    cd — change directory', 'DESCRIPTION', '    Use .. for parent, . for current directory, and ~ for home.'],
    cat: ['CAT(1) — ACADEMY MANUAL', 'NAME', '    cat — display a virtual file', 'DESCRIPTION', '    Reads a small Academy file only; it never reads your computer.', 'TRY', '    cat README.txt'], clear: ['CLEAR(1) — ACADEMY MANUAL', 'NAME', '    clear — clear visible terminal output'], help: ['HELP(1) — ACADEMY MANUAL', 'NAME', '    help — list commands available in this lab'], man: ['MAN(1) — ACADEMY MANUAL', 'NAME', '    man — read an Academy manual entry']
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
      if (command === 'ls') { if (args.some(arg => arg.startsWith('-'))) return failure('ls: options are not part of Lab 01 yet'); if (args.length > 1) return failure('ls: use one directory at a time in Lab 01'); const listing = fs.list(args[0] || '.', system.cwd, system.homeDirectory); return listing.error ? failure(`ls: ${args[0] || '.'}: ${listing.error}`) : success(listing.entries.join('  ')); }
      if (command === 'cd') { if (args.length > 1) return failure('cd: too many arguments'); const target = args[0] || system.homeDirectory, resolved = fs.resolve(target, system.cwd, system.homeDirectory); if (!resolved) return failure(`cd: ${target}: No such directory`); if (resolved.node.type !== 'directory') return failure(`cd: ${target}: Not a directory`); system.cwd = resolved.path; return success([]); }
      if (command === 'cat') { if (args.length !== 1) return failure('cat: try one virtual file at a time'); const reading = fs.readFile(args[0], system.cwd, system.homeDirectory); return reading.error ? failure(`cat: ${args[0]}: ${reading.error}`) : success(reading.content.replace(/\n$/, '')); }
      if (command === 'clear') return args.length ? failure('clear: this Lab 01 command does not use options yet') : { input, output: [], success: true, command, clear: true };
      if (command === 'help') return success(['AVAILABLE COMMANDS', '', ...[...this.allowedCommands].map(name => `${name.padEnd(9)}${descriptions[name] || ''}`)]);
      if (command === 'man') { if (args.length !== 1) return failure('man: try man followed by one available command'); return this.allowedCommands.has(args[0]) && manuals[args[0]] ? success(manuals[args[0]]) : failure(`man: no Academy manual entry for ${args[0]}`); }
      return failure([`${command}: command not found`, 'Type help to see available commands.']);
    }
  }
  return { VirtualFileSystem, VirtualSystem, CommandParser, Shell, manuals, defaultCommands };
});
