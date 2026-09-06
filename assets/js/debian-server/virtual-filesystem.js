import { baseName, normalizePath, parentPath } from './path-utils.js';

export const LIMITS = { objects: 500, depth: 16, fileSize: 65536, totalBytes:2097152, outputLines:500, outputBytes:131072, pipelineStages:8, processes:32, archiveEntries:100, traversal:600 };
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
  const root=dir('', { bin: protectedDir('bin'), boot: protectedDir('boot'), dev:dir('dev',{zero:file('zero','', {mode:'crw-rw-rw-'}),random:file('random','',{mode:'crw-rw-rw-'})}), etc: dir('etc', etcFiles, { protected: true }), home: dir('home', { visitor: home }), opt: dir('opt', { monitor: dir('monitor', { README: file('README', 'Local monitoring configuration.\n'), 'status.conf': file('status.conf', 'interval=60\nendpoint=/status\n') }, { protected: true }) }, { protected: true }), proc: dir('proc',{}), root: dir('root', {}, { protected: true, mode: 'drwx------' }), run: protectedDir('run'), srv: dir('srv', { 'status-page': dir('status-page', { README: file('README', 'Static status page service files.\n'), 'index.html': file('index.html', '<!doctype html>\n<title>Service status</title>\n<h1>Operational</h1>\n') }) }, { protected: true }), tmp: dir('tmp', {}, { owner: 'root', group: 'root', mode: 'drwxrwxrwt' }), usr:dir('usr',{bin:protectedDir('bin'),sbin:protectedDir('sbin')}), var: dir('var', { log: logs,lib:dir('lib',{dpkg:dir('dpkg',{})}),www:dir('www',{html:dir('html',{'index.html':file('index.html','<!doctype html>\n<title>Lab Node</title>\n<h1>Service operational</h1>\n')})}) }, { protected: true }) }, { protected: true });
  Object.assign(etcFiles,{shadow:file('shadow','root:*:20500:0:99999:7:::\nvisitor:!:20500:0:99999:7:::\n',{mode:'-rw-r-----',protected:true}),shells:file('shells','/bin/sh\n/bin/bash\n/bin/dash\n'), 'resolv.conf':file('resolv.conf','nameserver 192.0.2.53\nsearch lab\n'), 'network':dir('network',{interfaces:file('interfaces','auto lo\niface lo inet loopback\n\nauto ens18\niface ens18 inet static\n address 192.0.2.25/24\n gateway 192.0.2.1\n')}),apt:dir('apt',{'sources.list':file('sources.list','deb http://mirror.lab/debian trixie main\ndeb http://mirror.lab/debian-security trixie-security main\n')}),nginx:dir('nginx',{'nginx.conf':file('nginx.conf','user www-data;\nworker_processes auto;\nhttp { include /etc/nginx/sites-enabled/*; }\n'), 'sites-available':dir('sites-available',{default:file('default','server { listen 80 default_server; root /var/www/html; }\n')})}),ssh:dir('ssh',{'sshd_config':file('sshd_config','Port 22\nPermitRootLogin no\nPasswordAuthentication no\n')}),systemd:dir('systemd',{system:dir('system',{'monitor.service':file('monitor.service','[Unit]\nDescription=Lab status monitor\n[Service]\nExecStart=/opt/monitor/monitor\n[Install]\nWantedBy=multi-user.target\n'),'multi-user.target.wants':dir('multi-user.target.wants',{})})})});
  root.children.proc.children={cpuinfo:file('cpuinfo',Array.from({length:8},(_,i)=>`processor\t: ${i}\nvendor_id\t: GenuineIntel\nmodel name\t: Intel(R) Xeon(R) CPU E3-1270 v6 @ 3.80GHz\ncpu cores\t: 4\n`).join('\n')),meminfo:file('meminfo','MemTotal:        2097152 kB\nMemFree:         1247232 kB\nMemAvailable:    1638400 kB\nBuffers:           65536 kB\nCached:           327680 kB\n'),version:file('version','Linux version 6.12.38+deb13-amd64 (debian-kernel@lists.debian.org) (gcc 14.2.0) #1 SMP PREEMPT_DYNAMIC Debian 6.12.38-1 (2026-07-20)\n'),uptime:file('uptime','7420.00 23120.00\n'),mounts:file('mounts','/dev/vda1 / ext4 rw,relatime 0 0\nproc /proc proc rw,nosuid,nodev,noexec,relatime 0 0\n'),1:dir('1',{cgroup:file('cgroup','0::/init.scope\n')}),net:dir('net',{tcp:file('tcp','  sl  local_address rem_address   st\n   0: 00000000:0016 00000000:0000 0A\n   1: 00000000:0050 00000000:0000 0A\n')})};
  root.children.var.children.log.children.nginx=dir('nginx',{'access.log':file('access.log','192.0.2.20 - - [28/Jul/2026:08:45:01 +0000] "GET / HTTP/1.1" 200 82\n'),'error.log':file('error.log','2026/07/28 08:00:02 [notice] 420#420: start worker processes\n')});
  return root;
}

export class VirtualFilesystem {
  constructor(root, options = {}) { this.root = root; this.home = options.home || '/home/visitor'; this.user=options.user||(this.home==='/home/m.weber'?'m.weber':'visitor');this.clock=options.clock||(()=>new Date().toISOString()); }
  get(path, cwd = '/') { let node = this.root; const absolute = normalizePath(path, cwd); for (const part of absolute.split('/').filter(Boolean)) { if (node.type !== 'directory' || !node.children[part]) return null; node = node.children[part]; } return node; }
  denied(path, write = false) { const p = normalizePath(path); if (p === '/root' || p.startsWith('/root/') || (!write && p === '/etc/shadow')) return true; if (!write) return false; return !(p === '/tmp' || p.startsWith('/tmp/') || p === this.home || p.startsWith(`${this.home}/`));
  }
  count() { let count = 0, stack = [this.root]; while (stack.length) { const n = stack.pop(); count++; if (n.type === 'directory') stack.push(...Object.values(n.children)); } return count; }
  bytes() { let total=0,stack=[this.root];while(stack.length){const n=stack.pop();if(n.type==='file')total+=new TextEncoder().encode(n.content).length;else stack.push(...Object.values(n.children));}return total; }
  add(path, node) { const absolute = normalizePath(path); if (absolute.split('/').filter(Boolean).length > LIMITS.depth) return 'File name too long'; if (this.count()+measureNode(node).objects > LIMITS.objects || this.bytes()+measureNode(node).bytes > LIMITS.totalBytes) return 'No space left on device'; const parent = this.get(parentPath(absolute)); if (!parent) return 'No such file or directory'; if (parent.type !== 'directory') return 'Not a directory'; const name = baseName(absolute); if (parent.children[name]) return 'File exists'; node.name = name; parent.children[name] = node; parent.modified = this.clock(); return null; }
  remove(path) { const absolute = normalizePath(path); const parent = this.get(parentPath(absolute)), node=parent?.children?.[baseName(absolute)]; if (!parent || parent.type !== 'directory' || !node || node.protected) return false; delete parent.children[baseName(absolute)]; parent.modified = this.clock(); return true; }
}

export function measureNode(node){let objects=0,bytes=0,stack=[node];while(stack.length){const item=stack.pop();objects++;if(item.type==='file')bytes+=new TextEncoder().encode(item.content||'').length;else stack.push(...Object.values(item.children||{}));}return {objects,bytes};}
export function newDirectory(name = '', owner='visitor', stamp=STAMP) { const node=dir(name, {}, { owner, group:owner });node.created=node.modified=stamp;return node; }
export function newFile(name = '', owner='visitor', stamp=STAMP) { const node=file(name, '', { owner, group:owner });node.created=node.modified=stamp;return node; }
export function cloneNode(node, name = node.name, owner=node.owner, stamp=new Date().toISOString()) { const copy = structuredClone(node), stack=[copy]; while(stack.length){const item=stack.pop();item.owner=item.group=owner;item.protected=false;item.created=item.modified=stamp;if(item.type==='directory')stack.push(...Object.values(item.children));}copy.name = name;return copy; }
