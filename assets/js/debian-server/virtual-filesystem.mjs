import { baseName, normalizePath, parentPath } from './path-utils.mjs';

export const LIMITS = { objects: 500, depth: 16, fileSize: 65536, outputLines: 500 };
const STAMP = '2026-07-28T09:00:00.000Z';
const dir = (name, children = {}, options = {}) => ({ name, type: 'directory', owner: options.owner || 'root', group: options.group || 'root', mode: options.mode || 'drwxr-xr-x', children, created: STAMP, modified: STAMP, protected: Boolean(options.protected) });
const file = (name, content, options = {}) => ({ name, type: 'file', owner: options.owner || 'root', group: options.group || 'root', mode: options.mode || '-rw-r--r--', content, created: STAMP, modified: STAMP, protected: Boolean(options.protected) });
const userDir = (name, children = {}) => dir(name, children, { owner: 'visitor', group: 'visitor', mode: 'drwxr-xr-x' });
const userFile = (name, content = '', mode) => file(name, content, { owner: 'visitor', group: 'visitor', mode: mode || '-rw-r--r--' });

export function createFilesystem() {
  const protectedDir = name => dir(name, {}, { protected: true });
  const etcFiles = {
    debian_version: file('debian_version', '13.0\n', { protected: true }), hostname: file('hostname', 'lab-node\n', { protected: true }),
    hosts: file('hosts', '127.0.0.1 localhost\n127.0.1.1 lab-node\n192.0.2.20 status.lab-node\n', { protected: true }),
    issue: file('issue', 'Debian GNU/Linux 13 \\n \\l\n', { protected: true }),
    'os-release': file('os-release', 'PRETTY_NAME="Debian GNU/Linux 13 (trixie)"\nNAME="Debian GNU/Linux"\nVERSION_ID="13"\nVERSION="13 (trixie)"\nVERSION_CODENAME=trixie\nID=debian\nHOME_URL="https://www.debian.org/"\n', { protected: true }),
    passwd: file('passwd', 'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nvisitor:x:1000:1000:visitor:/home/visitor:/bin/bash\n', { protected: true }),
    group: file('group', 'root:x:0:\ndaemon:x:1:\nwww-data:x:33:\nvisitor:x:1000:\n', { protected: true }),
    fstab: file('fstab', '# <file system> <mount point> <type> <options> <dump> <pass>\nUUID=LAB-ROOT / ext4 defaults 0 1\n', { protected: true }),
    motd: file('motd', 'Welcome to lab-node. Scheduled maintenance: Sundays at 03:00 UTC.\n', { protected: true })
  };
  const home = userDir('visitor', {
    README: userFile('README', 'Welcome, visitor.\n\nProject notes are under ~/notes and ~/projects.\n'),
    '.profile': userFile('.profile', '# ~/.profile\nPATH="$HOME/bin:$PATH"\n'),
    '.session-note': userFile('.session-note', 'Remember to review the status page logs before the next maintenance window.\n'),
    documents: userDir('documents'),
    notes: userDir('notes', { 'commands.txt': userFile('commands.txt', 'Check service files in /srv/status-page.\nReview logs after maintenance.\n'), 'todo.txt': userFile('todo.txt', '- Review status page\n- Verify backup report\n') }),
    projects: userDir('projects', {
      'status-page': userDir('status-page', { 'README.md': userFile('README.md', '# Status page\nStatic service status prototype.\n'), 'index.html': userFile('index.html', '<!doctype html>\n<title>Lab status</title>\n<h1>All systems nominal</h1>\n') }),
      'backup-check': userDir('backup-check', { 'README.md': userFile('README.md', '# Backup check\nDocuments the nightly verification.\n'), 'check.sh': userFile('check.sh', '#!/bin/sh\necho "backup verification complete"\n', '-rwxr-xr-x') })
    })
  });
  const logs = dir('log', {
    'auth.log': file('auth.log', 'Jul 28 08:12:01 lab-node sshd[412]: Server listening on 0.0.0.0 port 22.\nJul 28 08:20:14 lab-node login[530]: session opened for user visitor\n', { protected: true }),
    syslog: file('syslog', 'Jul 28 08:00:01 lab-node systemd[1]: Started Daily apt download activities.\nJul 28 08:15:01 lab-node CRON[501]: routine status check completed\nJul 28 09:00:01 lab-node systemd[1]: Finished system activity accounting.\n', { protected: true }),
    apt: dir('apt', { 'history.log': file('history.log', 'Start-Date: 2026-07-27  06:40:00\nCommandline: apt upgrade\nUpgrade: base-files:amd64 (13.7, 13.8)\nEnd-Date: 2026-07-27  06:40:08\n', { protected: true }) }, { protected: true })
  }, { protected: true });
  return dir('', { bin: protectedDir('bin'), boot: protectedDir('boot'), dev: protectedDir('dev'), etc: dir('etc', etcFiles, { protected: true }), home: dir('home', { visitor: home }), opt: dir('opt', { monitor: dir('monitor', { README: file('README', 'Local monitoring configuration.\n'), 'status.conf': file('status.conf', 'interval=60\nendpoint=/status\n') }, { protected: true }) }, { protected: true }), proc: protectedDir('proc'), root: dir('root', {}, { protected: true, mode: 'drwx------' }), run: protectedDir('run'), srv: dir('srv', { 'status-page': dir('status-page', { README: file('README', 'Static status page service files.\n'), 'index.html': file('index.html', '<!doctype html>\n<title>Service status</title>\n<h1>Operational</h1>\n') }) }, { protected: true }), tmp: dir('tmp', {}, { owner: 'root', group: 'root', mode: 'drwxrwxrwt' }), usr: protectedDir('usr'), var: dir('var', { log: logs }, { protected: true }) }, { protected: true });
}

export class VirtualFilesystem {
  constructor(root) { this.root = root; }
  get(path, cwd = '/') { let node = this.root; const absolute = normalizePath(path, cwd); for (const part of absolute.split('/').filter(Boolean)) { if (node.type !== 'directory' || !node.children[part]) return null; node = node.children[part]; } return node; }
  denied(path, write = false) { const p = normalizePath(path); if (p === '/root' || p.startsWith('/root/')) return true; if (!write) return false; return !(p === '/tmp' || p.startsWith('/tmp/') || p === '/home/visitor' || p.startsWith('/home/visitor/'));
  }
  count() { let count = 0, stack = [this.root]; while (stack.length) { const n = stack.pop(); count++; if (n.type === 'directory') stack.push(...Object.values(n.children)); } return count; }
  add(path, node) { const absolute = normalizePath(path); if (absolute.split('/').filter(Boolean).length > LIMITS.depth) return 'File name too long'; if (this.count() >= LIMITS.objects) return 'No space left on device'; const parent = this.get(parentPath(absolute)); if (!parent) return 'No such file or directory'; if (parent.type !== 'directory') return 'Not a directory'; const name = baseName(absolute); if (parent.children[name]) return 'File exists'; node.name = name; parent.children[name] = node; parent.modified = new Date().toISOString(); return null; }
  remove(path) { const absolute = normalizePath(path); const parent = this.get(parentPath(absolute)); if (!parent || parent.type !== 'directory') return false; delete parent.children[baseName(absolute)]; parent.modified = new Date().toISOString(); return true; }
}

export function newDirectory(name = '') { return userDir(name); }
export function newFile(name = '') { return userFile(name); }
export function cloneNode(node, name = node.name) { const copy = structuredClone(node); copy.name = name; copy.created = copy.modified = new Date().toISOString(); return copy; }
