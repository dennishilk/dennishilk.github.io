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
    lab03: null, lab04: null, lab05: null, lab06: null, lab07: null, lab08: null
  };
  commandProfiles.lab02 = [...commandProfiles.lab01, 'cat'];
  commandProfiles.lab03 = [...commandProfiles.lab02, 'mkdir', 'touch', 'cp', 'mv', 'rm'];
  commandProfiles.lab04 = [...commandProfiles.lab03, 'chmod', 'chown', 'id', 'sudo'];
  commandProfiles.lab05 = [...commandProfiles.lab04, 'ps', 'top', 'kill'];
  commandProfiles.lab06 = [...commandProfiles.lab05, 'grep', 'wc', 'head', 'tail', 'echo'];
  commandProfiles.lab07 = [...commandProfiles.lab06, 'systemctl', 'journalctl', 'config-set'];
  commandProfiles.lab08 = [...commandProfiles.lab07];
  Object.values(commandProfiles).forEach(Object.freeze);
  Object.freeze(commandProfiles);
  const defaultCommands = commandProfiles.lab01;
  const descriptions = { mkdir: 'create a virtual directory', touch: 'create a virtual file', cp: 'copy a virtual file', mv: 'rename or move a virtual node', rm: 'remove a virtual file', pwd: 'show current directory', whoami: 'show current user', uname: 'show virtual system information', date: 'show date and time', ls: 'list directory contents (-l shows permissions)', cd: 'change directory', cat: 'display a virtual file', chmod: 'change fictional permission bits', chown: 'explain fictional ownership changes', id: 'show fictional user and group', sudo: 'explain why sudo is unavailable', ps: 'inspect fictional processes (ps aux for details)', top: 'show a fictional process snapshot', kill: 'send TERM or KILL to a fictional process', grep: 'find literal matching text lines', wc: 'count textual input lines (-l)', head: 'show the first textual lines', tail: 'show the last textual lines', echo: 'write literal text for a pipeline', systemctl: 'inspect or control fictional Academy services', journalctl: 'read deterministic fictional Academy service journal entries', 'config-set': 'Academy-only helper to repair the gallery configuration', clear: 'clear terminal', help: 'show available commands', man: 'read command help' };

  class VirtualFileSystem {
    constructor() {
      this.root = directory({
        bin: directory(),
        etc: directory({ hostname: file('linux\n'), 'os-release': file('NAME="Museum Linux"\nPRETTY_NAME="Museum Linux (Browser Virtual Machine)"\n'), museum: directory({ 'gallery.conf': file('PORT=8080\nCONTENT_PATH=/srv/musuem\n') }) }),
        home: directory({ museum: directory({
          'README.txt': file('Welcome, museum.\n\nThis is your fictional Academy home directory.\nTry cd Documents, or return home with cd ~.\n'),
          Documents: directory(),
          Projects: directory()
        }) }),
        tmp: directory(),
        srv: directory({ museum: directory() }),
        var: directory({ log: directory({ 'system.log': file('Academy virtual system started.\n'), 'academy.log': file(['2026-07-20T06:00:01Z INFO academy-service started', '2026-07-20T06:00:03Z INFO gallery cache ready', '2026-07-20T06:01:14Z WARN storage usage 72 percent', '2026-07-20T06:02:07Z ERROR image-indexer timeout', '2026-07-20T06:02:10Z INFO retry scheduled', '2026-07-20T06:03:42Z ERROR gallery database unavailable', '2026-07-20T06:03:45Z INFO fallback enabled', '2026-07-20T06:04:08Z WARN thumbnail queue delayed', '2026-07-20T06:04:19Z INFO archive sweep started', '2026-07-20T06:05:03Z INFO archive sweep complete', '2026-07-20T06:05:44Z WARN exhibit metadata incomplete', '2026-07-20T06:06:12Z INFO curator notice queued', '2026-07-20T06:07:18Z ERROR display-controller unavailable', '2026-07-20T06:07:21Z INFO display fallback enabled', '2026-07-20T06:08:05Z INFO visitor counter sampled', '2026-07-20T06:09:27Z WARN storage cleanup deferred', '2026-07-20T06:10:14Z INFO cache reconciliation started', '2026-07-20T06:10:45Z INFO cache reconciliation complete', '2026-07-20T06:11:36Z ERROR audio-catalog timeout', '2026-07-20T06:11:40Z INFO audio retry scheduled', '2026-07-20T06:12:16Z WARN gallery sync delayed', '2026-07-20T06:13:02Z INFO diagnostics snapshot saved', '2026-07-20T06:13:44Z INFO academy-service steady'].join('\n') + '\n') }) })
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
      this.fileSystem = new VirtualFileSystem(); this.services = {
        'museum-gallery.service': { state: 'failed', reason: 'configuration validation failed' },
        'museum-indexer.service': { state: 'active', reason: 'running normally' },
        'museum-backup.service': { state: 'inactive', reason: 'not scheduled' }
      };
      this.journal = {
        'museum-gallery.service': [
          '2042-04-07 09:00:01 museum-gallery.service: service start requested',
          '2042-04-07 09:00:02 museum-gallery.service: configuration loaded',
          '2042-04-07 09:00:03 museum-gallery.service: content path validation failed: /srv/musuem does not exist',
          '2042-04-07 09:00:04 museum-gallery.service: service entered failed state'
        ],
        'museum-indexer.service': ['2042-04-07 08:55:00 museum-indexer.service: service started successfully'],
        'museum-backup.service': ['2042-04-07 08:50:00 museum-backup.service: inactive (dead)']
      }; this.journalSequence = 5; this.currentUser = 'museum'; this.homeDirectory = '/home/museum'; this.cwd = this.homeDirectory;
      // Deliberately small, deterministic browser-memory-only process table.
      this.processes = [
        { pid: 1, user: 'root', command: 'init (academy system)', state: 'S', cpu: 0.1, memory: 0.2, critical: true, terminated: false },
        { pid: 120, user: 'root', command: 'museum-service', state: 'S', cpu: 0.4, memory: 1.1, critical: true, terminated: false },
        { pid: 241, user: 'museum', command: 'museum-shell', state: 'R', cpu: 0.8, memory: 1.8, critical: false, terminated: false },
        { pid: 314, user: 'museum', command: 'gallery-backup', state: 'S', cpu: 1.5, memory: 2.4, critical: false, terminated: false },
        { pid: 427, user: 'museum', command: 'runaway-indexer', state: 'R', cpu: 96.7, memory: 8.6, critical: false, terminated: false }
      ];
      this.recovery = null;
    }
    setupRecoveryScenario() {
      this.reset();
      const exhibit = this.fileSystem.resolve('/srv/museum', this.cwd, this.homeDirectory).node;
      exhibit.children['exhibit-index.txt'] = file('EXHIBIT INDEX\n01 — Computing Before Screens\n02 — The Terminal Gallery\n', { owner: 'museum', group: 'museum', mode: '-w-------' });
      this.services['museum-exhibit.service'] = { state: 'failed', reason: 'required exhibit index cannot be read' };
      this.journal['museum-exhibit.service'] = ['2042-04-07 09:10:01 museum-exhibit.service: service start requested', '2042-04-07 09:10:02 museum-exhibit.service: loading /srv/museum/exhibit-index.txt', '2042-04-07 09:10:03 museum-exhibit.service: Permission denied: cannot read /srv/museum/exhibit-index.txt', '2042-04-07 09:10:04 museum-exhibit.service: service entered failed state'];
      this.processes = this.processes.filter(process => process.pid !== 427);
      this.processes.push({ pid: 733, user: 'museum', command: 'museum-render-worker', state: 'R', cpu: 96.4, memory: 8.6, critical: false, terminated: false });
      this.recovery = { active: true, evidence: { processInspected: false, processIdentified: false, serviceInspected: false, journalRead: false, permissionInspected: false, permissionIdentified: false, safeProcessStopped: false, minimumPermissionRepaired: false, serviceRestarted: false, serviceVerified: false } };
      return this;
    }
    recoveryFile() { return this.fileSystem.resolve('/srv/museum/exhibit-index.txt', this.cwd, this.homeDirectory); }
    recoveryPermissionState() {
      const exhibit = this.recoveryFile();
      if (!exhibit) return 'missing';
      const readable = this.fileSystem.readFile('/srv/museum/exhibit-index.txt', this.cwd, this.homeDirectory, this.currentUser, true);
      if (readable.error) return 'unreadable';
      return exhibit.node.mode === 'rw-------' ? 'minimum' : 'overpermissive';
    }
    recoveryHealthy() { const runaway = this.processByPid(733), exhibit = this.recoveryFile(), service = this.serviceByName('museum-exhibit.service'); return !!(this.recovery && runaway && runaway.terminated && exhibit && exhibit.node.mode === 'rw-------' && service && service.state === 'active' && this.processes.filter(process => process.critical).every(process => !process.terminated)); }
    serviceByName(name) { return this.services[name] || null; }
    galleryConfig() { const reading = this.fileSystem.readFile('/etc/museum/gallery.conf', this.cwd, this.homeDirectory, this.currentUser); return reading.error ? '' : reading.content; }
    appendJournal(name, message) { const stamp = `2042-04-07 09:01:${String(this.journalSequence++).padStart(2, '0')}`; this.journal[name].push(`${stamp} ${name}: ${message}`); }
    controlService(action, name) { const service = this.serviceByName(name); if (!service) return { error: `systemctl: unknown fictional service: ${name}` }; if (!['start', 'restart', 'stop'].includes(action)) return { error: 'systemctl: supported actions are status, start, restart, and stop' }; if (action === 'stop') { service.state = 'inactive'; service.reason = 'stopped in Academy'; this.appendJournal(name, 'service stopped'); return { service }; } if (name === 'museum-exhibit.service') { this.appendJournal(name, 'service start requested'); const permissionState = this.recoveryPermissionState(); if (permissionState === 'missing') { service.state = 'failed'; service.reason = 'required exhibit index is missing'; this.appendJournal(name, 'required exhibit index is missing: /srv/museum/exhibit-index.txt'); this.appendJournal(name, 'service entered failed state'); return { service, error: 'required exhibit index is missing' }; } if (permissionState === 'unreadable') { service.state = 'failed'; service.reason = 'required exhibit index cannot be read'; this.appendJournal(name, 'Permission denied: cannot read /srv/museum/exhibit-index.txt'); this.appendJournal(name, 'service entered failed state'); return { service, error: 'required exhibit index cannot be read' }; } if (permissionState === 'overpermissive') { service.state = 'failed'; service.reason = 'required exhibit index permissions are not at the minimum recovery mode'; this.appendJournal(name, 'exhibit index is readable, but permissions are not the minimum recovery mode (rw------- / 600)'); this.appendJournal(name, 'service entered failed state'); return { service, error: 'required exhibit index permissions are not at the minimum recovery mode' }; } service.state = 'active'; service.reason = 'running normally'; this.appendJournal(name, 'exhibit index read successfully'); this.appendJournal(name, 'service started successfully'); if (this.recovery) this.recovery.evidence.serviceRestarted = true; return { service }; } if (name === 'museum-gallery.service') { this.appendJournal(name, 'service start requested'); const match = this.galleryConfig().match(/^CONTENT_PATH=(.+)$/m); const path = match && match[1]; const target = path && this.fileSystem.resolve(path, this.cwd, this.homeDirectory); if (!target || target.node.type !== 'directory') { service.state = 'failed'; service.reason = 'configuration validation failed'; this.appendJournal(name, `content path validation failed: ${path || '(missing CONTENT_PATH)'} does not exist`); this.appendJournal(name, 'service entered failed state'); return { service, error: 'configuration validation failed' }; } service.state = 'active'; service.reason = 'running normally'; this.appendJournal(name, 'configuration validation passed'); this.appendJournal(name, 'service started successfully'); return { service }; } service.state = 'active'; service.reason = 'running normally'; this.appendJournal(name, 'service started successfully'); return { service }; }
    runningProcesses() { return this.processes.filter(process => !process.terminated); }
    processByPid(pid) { return this.processes.find(process => process.pid === Number(pid)); }
    terminateProcess(pid, signal = 'TERM') {
      const process = this.processByPid(pid);
      if (!process) return { error: `kill: (${pid}) - No such fictional process` };
      if (process.terminated) return { error: `kill: (${pid}) - Process already terminated in this Academy` };
      if (process.critical) return { error: `kill: (${pid}) - Academy safety protection: PID ${pid} is essential and cannot be stopped here.` };
      process.terminated = true; process.state = 'X'; process.cpu = 0; process.signal = signal;
      if (this.recovery && process.pid === 733 && signal === 'TERM' && this.recovery.evidence.processIdentified) this.recovery.evidence.safeProcessStopped = true;
      return { process, signal };
    }
  }
  class CommandParser { parse(raw) { const text = String(raw || '').trim(); if (!text) return null; const [command, ...args] = text.split(/\s+/); return { raw: text, command, args }; } }
  const manuals = {
    pwd: ['PWD(1) — ACADEMY MANUAL', 'NAME', '    pwd — print the current working directory', 'DESCRIPTION', '    Shows where you are in the virtual filesystem.'],
    whoami: ['WHOAMI(1) — ACADEMY MANUAL', 'NAME', '    whoami — show the current virtual user'], uname: ['UNAME(1) — ACADEMY MANUAL', 'NAME', '    uname — show virtual system information'], date: ['DATE(1) — ACADEMY MANUAL', 'NAME', '    date — show browser-side virtual terminal time'],
    ls: ['LS(1) — ACADEMY MANUAL', 'NAME', '    ls — list directory contents', 'TRY', '    ls /'], cd: ['CD(1) — ACADEMY MANUAL', 'NAME', '    cd — change directory', 'DESCRIPTION', '    Use .. for parent, . for current directory, and ~ for home.'],
    mkdir: ['MKDIR(1) — ACADEMY MANUAL', 'NAME', '    mkdir — create a virtual directory', 'TRY', '    mkdir playground'], touch: ['TOUCH(1) — ACADEMY MANUAL', 'NAME', '    touch — create an empty virtual file', 'TRY', '    touch notes.txt'], cp: ['CP(1) — ACADEMY MANUAL', 'NAME', '    cp — copy a virtual file', 'TRY', '    cp notes.txt backup.txt'], mv: ['MV(1) — ACADEMY MANUAL', 'NAME', '    mv — rename or move a virtual node', 'TRY', '    mv notes.txt ideas.txt'], rm: ['RM(1) — ACADEMY MANUAL', 'NAME', '    rm — remove a virtual file', 'DESCRIPTION', '    Directory removal is intentionally outside this beginner lab.'], cat: ['CAT(1) — ACADEMY MANUAL', 'NAME', '    cat — display a virtual file', 'DESCRIPTION', '    Reads a small Academy file only; it never reads your computer.', 'TRY', '    cat README.txt'], chmod: ['CHMOD(1) — ACADEMY MANUAL', 'NAME', '    chmod — change fictional permission bits', 'TRY', '    chmod u+r notes.txt', '    chmod u+x script.sh', 'DESCRIPTION', '    u, g, and o mean owner, group, and others. Use the smallest useful change.'], chown: ['CHOWN(1) — ACADEMY MANUAL', 'NAME', '    chown — explain fictional ownership changes', 'DESCRIPTION', '    In this Academy, only the maintenance example may change ownership. Real Linux normally requires appropriate privilege.'], id: ['ID(1) — ACADEMY MANUAL', 'NAME', '    id — show the fictional user and group'], ps: ['PS(1) — ACADEMY MANUAL', 'NAME', '    ps — inspect the Academy process table', 'TRY', '    ps aux', '    Process rows are fictional browser-memory data only.'], top: ['TOP(1) — ACADEMY MANUAL', 'NAME', '    top — show one educational snapshot of active fictional processes', 'DESCRIPTION', '    This Academy version does not stay open or refresh forever.'], kill: ['KILL(1) — ACADEMY MANUAL', 'NAME', '    kill — send a safe fictional signal to one PID', 'TRY', '    kill 427', '    kill -TERM 427', '    TERM is a polite request; KILL is forceful and should not be the first reflex.'], sudo: ['SUDO(1) — ACADEMY MANUAL', 'NAME', '    sudo — unavailable in this browser-only Academy lab'], grep: ['GREP(1) — ACADEMY MANUAL', 'NAME', '    grep — select literal matching text lines', 'USAGE', '    grep [-i] PATTERN [FILE]', '    producer | grep [-i] PATTERN', 'DESCRIPTION', '    Matches plain text, not regular expressions.'], wc: ['WC(1) — ACADEMY MANUAL', 'NAME', '    wc — count Academy text', 'USAGE', '    wc -l [FILE]', '    producer | wc -l'], head: ['HEAD(1) — ACADEMY MANUAL', 'NAME', '    head — show first lines', 'USAGE', '    head [-n N] [FILE]', '    producer | head [-n N]'], tail: ['TAIL(1) — ACADEMY MANUAL', 'NAME', '    tail — show last lines', 'USAGE', '    tail [-n N] [FILE]', '    producer | tail [-n N]'], systemctl: ['SYSTEMCTL(1) — ACADEMY MANUAL', 'NAME', '    systemctl — inspect or control fictional Academy services', 'USAGE', '    systemctl status SERVICE', '    systemctl start|restart|stop SERVICE', 'DESCRIPTION', '    Supports only the listed fictional services. It never contacts real systemd.'], journalctl: ['JOURNALCTL(1) — ACADEMY MANUAL', 'NAME', '    journalctl — read deterministic fictional Academy service journal entries', 'USAGE', '    journalctl -u SERVICE', 'DESCRIPTION', '    This reads only browser-memory Academy entries, never real journals or logs.'], 'config-set': ['CONFIG-SET(1) — ACADEMY MANUAL', 'NAME', '    config-set — Academy-only gallery configuration helper', 'USAGE', '    config-set museum-gallery CONTENT_PATH /srv/museum', 'DESCRIPTION', '    This is not a standard Linux command. It safely changes only the fictional gallery CONTENT_PATH.'], echo: ['ECHO(1) — ACADEMY MANUAL', 'NAME', '    echo — write literal text', 'TRY', '    echo ERROR | grep ERROR'], pipe: ['PIPE(1) — ACADEMY MANUAL', 'NAME', '    | — pass textual output to the next Academy command', 'EXAMPLE', '    cat academy.log | grep ERROR | wc -l'], clear: ['CLEAR(1) — ACADEMY MANUAL', 'NAME', '    clear — clear visible terminal output'], help: ['HELP(1) — ACADEMY MANUAL', 'NAME', '    help — list commands available in this lab'], man: ['MAN(1) — ACADEMY MANUAL', 'NAME', '    man — read an Academy manual entry']
  };
  class Shell {
    constructor(system, options = {}) { this.system = system; this.parser = new CommandParser(); this.allowedCommands = new Set(options.allowedCommands || defaultCommands); }
    execute(raw) {
      const text = String(raw || '').trim();
      if (!text) return { ignored: true, output: [], success: false };
      const unsupported = /\|\||&&|[;><`]|\$\(|\s&/.test(text);
      if (unsupported) return { input: { raw: text }, output: ['Academy shell: that shell syntax is intentionally unsupported. Use simple commands and explicit | pipelines only.'], success: false };
      const stages = text.split('|').map(stage => stage.trim());
      if (stages.some(stage => !stage)) return { input: { raw: text }, output: ['Academy shell: a pipeline needs one supported command on each side of |.'], success: false };
      if (stages.length === 1) {
        const result = this._executeSingle(this.parser.parse(text));
        const stdout = result.output.join('\n');
        return result.success ? { ...result, pipeline: [{ command: text, inputLines: 0, outputLines: stdout === '' ? 0 : stdout.split('\n').length, output: stdout }] } : result;
      }
      const parsedStages = stages.map(stage => this.parser.parse(stage));
      const pipelineCommands = new Set(['cat', 'grep', 'wc', 'head', 'tail', 'echo']);
      if (parsedStages.some(stage => !this.allowedCommands.has(stage.command) || !pipelineCommands.has(stage.command))) return { input: { raw: text }, output: ['Academy shell: only cat, grep, wc, head, tail, and echo participate in pipelines in Lab 06.'], success: false };
      let stdin = null, result;
      const pipeline = [];
      for (const stage of parsedStages) {
        result = this._executeSingle(stage, stdin);
        if (!result.success) return { ...result, pipeline };
        const stdout = result.output.join('\n');
        pipeline.push({ command: stage.raw, inputLines: stdin === null ? 0 : (stdin === '' ? 0 : stdin.split('\n').length), outputLines: stdout === '' ? 0 : stdout.split('\n').length, output: stdout });
        stdin = stdout;
      }
      return { ...result, input: { raw: text, command: parsedStages[0].command, args: [] }, pipeline };
    }
    _executeSingle(input, stdin = null) {
      const { command, args } = input, system = this.system, fs = system.fileSystem;
      const success = output => ({ input, output: Array.isArray(output) ? output : [output], success: true, command }); const failure = output => ({ input, output: Array.isArray(output) ? output : [output], success: false, command });
      const evidence = system.recovery && system.recovery.evidence;
      if (evidence && ((command === 'ps' && (!args.length || args[0] === 'aux')) || command === 'top')) { evidence.processInspected = true; evidence.processIdentified = true; }
      if (evidence && command === 'systemctl' && args[0] === 'status' && args[1] === 'museum-exhibit.service') { evidence.serviceInspected = true; if (system.serviceByName('museum-exhibit.service').state === 'active') evidence.serviceVerified = true; }
      if (evidence && command === 'journalctl' && args[0] === '-u' && args[1] === 'museum-exhibit.service') evidence.journalRead = true;
      if (evidence && command === 'ls' && args[0] === '-l' && (args[1] === '/srv/museum/exhibit-index.txt' || args[1] === '/srv/museum')) { evidence.permissionInspected = true; evidence.permissionIdentified = true; }
      if (!this.allowedCommands.has(command)) return failure([`${command}: command not found`, 'Type help to see available commands.']);
      if (command === 'pwd') return args.length ? failure('pwd: this Lab 01 command does not use options yet') : success(system.cwd);
      if (command === 'whoami') return args.length ? failure('whoami: this Lab 01 command does not use options yet') : success(system.currentUser);
      if (command === 'uname') return args.length && !(args.length === 1 && args[0] === '-a') ? failure('uname: only -a is available in Lab 01') : success(args[0] === '-a' ? 'Linux museum-linux 1.0.0-museum #1 Browser Virtual Machine educational' : 'Linux');
      if (command === 'date') return args.length ? failure('date: this Lab 01 command does not use options yet') : success(new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC (browser-side time)'));
      if (command === 'ls') { const long = args[0] === '-l'; if (args.some(arg => arg.startsWith('-') && arg !== '-l') || (long && !this.allowedCommands.has('chmod'))) return failure('ls: options are not part of this lab yet'); const path = long ? args[1] : args[0]; if (args.length > (long ? 2 : 1)) return failure('ls: use one directory at a time'); const listing = long ? fs.longList(path || '.', system.cwd, system.homeDirectory) : fs.list(path || '.', system.cwd, system.homeDirectory); return listing.error ? failure(`ls: ${path || '.'}: ${listing.error}`) : success(long ? listing.entries : listing.entries.join('  ')); }
      if (command === 'cd') { if (args.length > 1) return failure('cd: too many arguments'); const target = args[0] || system.homeDirectory, resolved = fs.resolve(target, system.cwd, system.homeDirectory); if (!resolved) return failure(`cd: ${target}: No such directory`); if (resolved.node.type !== 'directory') return failure(`cd: ${target}: Not a directory`); system.cwd = resolved.path; return success([]); }
      if (command === 'cat') { if (stdin !== null) return failure('cat: this Academy pipeline source reads one virtual file; use grep, wc, head, or tail after |'); if (args.length !== 1) return failure('cat: try one virtual file at a time'); const reading = fs.readFile(args[0], system.cwd, system.homeDirectory, system.currentUser, this.allowedCommands.has('chmod')); return reading.error ? failure(`cat: ${args[0]}: ${reading.error}`) : success(reading.content.replace(/\n$/, '')); }
      if (command === 'echo') { if (stdin !== null) return failure('echo: use echo as the first stage of an Academy pipeline'); return success(args.join(' ')); }
      if (command === 'grep') { const insensitive = args[0] === '-i'; const values = insensitive ? args.slice(1) : args; if (values.length < 1 || values.length > 2) return failure('grep: try grep [-i] PATTERN [FILE], or producer | grep PATTERN'); const pattern = values[0], source = stdin !== null ? (values.length === 1 ? stdin : null) : null; if (stdin !== null && source === null) return failure('grep: a pipeline already provides text; omit the file name'); let text = source; if (text === null) { if (values.length !== 2) return failure('grep: provide a virtual file or pipeline input'); const reading = fs.readFile(values[1], system.cwd, system.homeDirectory, system.currentUser, this.allowedCommands.has('chmod')); if (reading.error) return failure(`grep: ${values[1]}: ${reading.error}`); text = reading.content.replace(/\n$/, ''); } const needle = insensitive ? pattern.toLowerCase() : pattern; return success((text === '' ? [] : text.split('\n')).filter(line => (insensitive ? line.toLowerCase() : line).includes(needle)).join('\n')); }
      if (command === 'wc') { if (args[0] !== '-l' || args.length > 2) return failure('wc: try wc -l [FILE], or producer | wc -l'); let text = stdin; if (text === null) { if (args.length !== 2) return failure('wc: provide a virtual file or pipeline input'); const reading = fs.readFile(args[1], system.cwd, system.homeDirectory, system.currentUser, this.allowedCommands.has('chmod')); if (reading.error) return failure(`wc: ${args[1]}: ${reading.error}`); text = reading.content.replace(/\n$/, ''); } else if (args.length !== 1) return failure('wc: a pipeline already provides text; omit the file name'); return success(String(text === '' ? 0 : text.split('\n').length)); }
      if (command === 'head' || command === 'tail') { let count = 10, values = args.slice(); if (values[0] === '-n') { if (!/^\d+$/.test(values[1] || '')) return failure(`${command}: -n needs a non-negative whole number`); count = Number(values[1]); values = values.slice(2); } if (values.length > 1) return failure(`${command}: try ${command} [-n N] [FILE]`); let text = stdin; if (text === null) { if (values.length !== 1) return failure(`${command}: provide a virtual file or pipeline input`); const reading = fs.readFile(values[0], system.cwd, system.homeDirectory, system.currentUser, this.allowedCommands.has('chmod')); if (reading.error) return failure(`${command}: ${values[0]}: ${reading.error}`); text = reading.content.replace(/\n$/, ''); } else if (values.length) return failure(`${command}: a pipeline already provides text; omit the file name`); const lines = text === '' ? [] : text.split('\n'); return success((command === 'head' ? lines.slice(0, count) : lines.slice(Math.max(0, lines.length - count))).join('\n')); }
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
      if (command === 'chmod') { if (args.length !== 2) return failure('chmod: try chmod u+r FILE'); const target = fs.resolve(args[1], system.cwd, system.homeDirectory); if (!target) return failure(`chmod: ${args[1]}: No such file or directory`); if (target.node.owner !== system.currentUser) return failure(`chmod: ${args[1]}: Operation not permitted`); let mode = target.node.mode; if (/^[0-7]{3}$/.test(args[0])) { const symbols = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx']; mode = args[0].split('').map(n => symbols[Number(n)]).join(''); } else { const match = args[0].match(/^([ugo])([+-])([rwx])$/); if (!match) return failure(`chmod: invalid mode: ${args[0]}`); const offsets = { u: 0, g: 3, o: 6 }; const index = offsets[match[1]] + 'rwx'.indexOf(match[3]); mode = mode.slice(0, index) + (match[2] === '+' ? match[3] : '-') + mode.slice(index + 1); } fs.chmod(args[1], mode, system.cwd, system.homeDirectory); if (evidence && fs.resolve(args[1], system.cwd, system.homeDirectory).path === '/srv/museum/exhibit-index.txt' && mode === 'rw-------') evidence.minimumPermissionRepaired = true; const warning = args[0] === '777' ? ['chmod: warning: 777 grants more access than this repair needs.'] : []; return success(warning); }
      if (command === 'chown') { const maintenance = args[0] === '--academy-maintenance'; const owner = maintenance ? args[1] : args[0], path = maintenance ? args[2] : args[1]; if ((!maintenance && args.length !== 2) || (maintenance && args.length !== 3)) return failure('chown: try chown OWNER FILE (or Academy maintenance demo)'); const target = fs.resolve(path, system.cwd, system.homeDirectory); if (!target) return failure(`chown: ${path}: No such file or directory`); if (!maintenance) return failure(['chown: Operation not permitted for museum.', 'Real Linux ownership changes normally require appropriate privilege; this Academy does not grant it.']); target.node.owner = owner; target.node.group = owner; return success(['Academy maintenance changed fictional ownership only.', 'Real Linux requires appropriate privilege for chown.']); }
      if (command === 'systemctl') {
        if (args.length !== 2) return failure('systemctl: try systemctl status SERVICE, or systemctl start|restart|stop SERVICE');
        const [action, name] = args; const service = system.serviceByName(name);
        if (!service) return failure(`systemctl: unknown fictional service: ${name}`);
        if (action === 'status') { const active = service.state === 'active' ? 'active (running)' : service.state === 'inactive' ? 'inactive (dead)' : 'failed'; return success([name, 'Loaded: loaded (fictional Academy unit)', `Active: ${active}`, `Reason: ${service.reason}`, 'This is a browser-memory educational service, not real systemd.']); }
        if (!['start', 'restart', 'stop'].includes(action)) return failure('systemctl: supported actions are status, start, restart, and stop');
        const result = system.controlService(action, name);
        if (result.error) return failure([`systemctl: ${action} failed for ${name}: ${result.error}.`, 'Inspect the fictional journal with: journalctl -u ' + name]);
        return success(`systemctl: ${action} completed for ${name}; state is ${result.service.state}.`);
      }
      if (command === 'journalctl') {
        if (args.length !== 2 || args[0] !== '-u') return failure('journalctl: supported form is journalctl -u SERVICE; other options are intentionally unavailable');
        if (!system.serviceByName(args[1])) return failure(`journalctl: unknown fictional service: ${args[1]}`);
        return success(system.journal[args[1]]);
      }
      if (command === 'config-set') {
        if (args.length !== 3 || args[0] !== 'museum-gallery' || args[1] !== 'CONTENT_PATH') return failure('config-set: Academy-only form is config-set museum-gallery CONTENT_PATH /srv/museum');
        if (args[2] !== '/srv/museum') return failure('config-set: only /srv/museum is a valid fictional gallery content path');
        const config = fs.resolve('/etc/museum/gallery.conf', system.cwd, system.homeDirectory); config.node.content = `PORT=8080\nCONTENT_PATH=${args[2]}\n`; return success('Academy configuration updated: /etc/museum/gallery.conf');
      }
      if (command === 'clear') return args.length ? failure('clear: this Lab 01 command does not use options yet') : { input, output: [], success: true, command, clear: true };
      if (command === 'help') return success(['AVAILABLE COMMANDS', '', ...[...this.allowedCommands].map(name => `${name.padEnd(9)}${descriptions[name] || ''}`)]);
      if (command === 'man') { if (args.length !== 1) return failure('man: try man followed by one available command'); return (this.allowedCommands.has(args[0]) || (args[0] === 'pipe' && this.allowedCommands.has('grep'))) && manuals[args[0]] ? success(manuals[args[0]]) : failure(`man: no Academy manual entry for ${args[0]}`); }
      return failure([`${command}: command not found`, 'Type help to see available commands.']);
    }
  }
  return { VirtualFileSystem, VirtualSystem, CommandParser, Shell, manuals, commandProfiles, defaultCommands };
});
