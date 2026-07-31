export const COMPANY = 'Chesapeake Signal Tech';
export const HOST = 'cs-vax1';
export const CANONICAL_TIMESTAMP = Date.UTC(2026, 6, 31, 12, 49, 13);

export const EMPLOYEES = Object.freeze({
  's.harper': 'Steve Harper', 'm.weber': 'Michael Weber',
  'h.sullivan': 'Henry Sullivan', 'f.kessler': 'Frank Kessler'
});

const file = (content, owner = 'operator', group = 'staff', timestamp = 'Jul 31  2026', readable = true) =>
  Object.freeze({ content, owner, group, timestamp, readable, permissions: readable ? '-r--r--r--' : '-r--------', size: content.length });

export const MOTD = 'Chesapeake Signal Tech — cs-vax1\nFriday tape rotation begins at 18:00 UTC.\nSystem notices: /cst/public/system-notices.txt';
export const FILES = Object.freeze({
  '/usr/visitor/.profile': file('PATH=/bin:/usr/bin\n# Read-only museum account', 'visitor'),
  '/usr/visitor/README': file('Welcome to cs-vax1, Chesapeake Signal Tech\'s shared UNIX host.\n\nRecommended: help, who, w, date, uptime, ls /cst, cat /cst/docs/time-sharing.txt, mail, ps, and man who.', 'visitor'),
  '/usr/visitor/welcome.txt': file('One central host serves many terminals. UNIX accounts and permissions separate work while people share computing resources.', 'visitor'),
  '/usr/visitor/notes/commands.txt': file('Start with help. Explore with ls, cat, who, w, mail, ps, lpq, df, last, and man.', 'visitor'),
  '/usr/visitor/notes/exhibit-path.txt': file('Try: ls /cst/docs; cat /cst/docs/time-sharing.txt; cat /cst/docs/why-cs-vax1-remains.txt; df.', 'visitor'),
  '/etc/motd': file(MOTD),
  '/etc/passwd': file('root:*:0:0:System Administrator:/:/bin/sh\noperator:*:10:10:System Operator:/usr/operator:/bin/sh\ns.harper:*:1001:100:Steve Harper:/usr/s.harper:/bin/sh\nm.weber:*:1002:100:Michael Weber:/usr/m.weber:/bin/sh\nh.sullivan:*:1003:100:Henry Sullivan:/usr/h.sullivan:/bin/sh\nf.kessler:*:1004:100:Frank Kessler:/usr/f.kessler:/bin/sh\nvisitor:*:1042:105:Museum Visitor:/usr/visitor:/bin/sh'),
  '/etc/group': file('staff:*:100:s.harper,m.weber,h.sullivan,f.kessler,operator\nguests:*:105:visitor'),
  '/etc/hosts': file('127.0.0.1 localhost\n192.0.2.10 cs-vax1 cst-host'),
  '/etc/system-id': file('Organization: Chesapeake Signal Tech\nHost: cs-vax1\nSystem: UNIX/32V on VAX-11/780'),
  '/cst/docs/time-sharing.txt': file('TIME SHARING\n\nOne central host served many terminals by coordinating concurrent sessions. Users shared CPU time, disks, printers, files, and communication while accounts and permissions separated their work.'),
  '/cst/docs/shared-computing.txt': file('SHARED COMPUTING\n\nUNIX coordinated people, sessions, processes, and devices. Common services made finite company resources useful to everyone.'),
  '/cst/docs/unix-tools.txt': file('UNIX TOOLS\n\nSmall text tools inspect files and system state without changing them. Online manuals keep procedures close at hand.'),
  '/cst/docs/why-cs-vax1-remains.txt': file('WHY CS-VAX1 REMAINS\n\nIts specialized workflows are stable, dependable, and well documented. Continued maintenance preserves a useful company service.'),
  '/cst/operations/backup-rotation.txt': file('Friday tape rotation: incremental archive at 18:00 UTC; verification follows. Weekend archive is scheduled for Saturday.'),
  '/cst/operations/printer-maintenance.txt': file('CST-PRINT1 MAINTENANCE\n\nMaintenance completed Fri Jul 31 at 11:40 UTC. Printer is online. Next inspection: Mon Aug 3 at 09:00 UTC.'),
  '/cst/operations/serial-lines.txt': file('Serial lines tty0 through tty7 checked. tty6 is reserved for the visitor terminal. All lines are ready.'),
  '/cst/operations/storage-status.txt': file('STORAGE STATUS\n\n/dev/rp0: 24000 blocks, 15360 used, 8640 available, mounted on /.\n/dev/rp1: 48000 blocks, 31680 used, 16320 available, mounted on /usr.'),
  '/cst/operations/terminal-schedule.txt': file('Shared terminals remain available throughout Friday. Please log out after use so terminal lines can serve the next session.'),
  '/cst/public/staff-directory.txt': file(Object.entries(EMPLOYEES).map(([login, name]) => `${name.padEnd(18)} ${login}`).join('\n')),
  '/cst/public/system-notices.txt': file('SYSTEM NOTICES\n\nFriday tape rotation is scheduled for 18:00 UTC. cst-print1 is online. Use last to review recent sessions.'),
  '/cst/public/terminal-etiquette.txt': file('Keep output concise, share printer capacity, and log out when finished. Company files remain subject to account permissions.'),
  '/var/adm/messages': file('Jul 31 11:40:02 cs-vax1 lpd: cst-print1 maintenance complete\nJul 31 12:15:00 cs-vax1 cron: accounting summary complete'),
  '/var/adm/shutdown.log': file('Mar 06 06:37:13 orderly restart; routine power inspection complete'),
  '/var/adm/uptime.log': file('Jul 31 12:49:13 cs-vax1 up 147 days, 06:12'),
  '/var/spool/lp/status': file('dynamic printer status'), '/var/spool/lp/queue': file('dynamic printer queue')
});

export const MAILBOX = Object.freeze([
  ['operator','Friday tape rotation','Fri Jul 31 09:10:00 2026','The tape rotation begins at 18:00 UTC. See /cst/operations/backup-rotation.txt'],
  ['m.weber','Printer maintenance complete','Fri Jul 31 11:43:00 2026','cst-print1 is back online. See /cst/operations/printer-maintenance.txt'],
  ['h.sullivan','Documentation set updated','Thu Jul 30 16:22:00 2026','The shared computing guides under /cst/docs are current.'],
  ['s.harper','Shared terminal schedule','Thu Jul 30 14:05:00 2026','The current schedule is /cst/operations/terminal-schedule.txt'],
  ['f.kessler','Serial line test complete','Wed Jul 29 15:31:00 2026','All scheduled lines passed. See /cst/operations/serial-lines.txt'],
  ['operator','Weekend archive window','Wed Jul 29 08:00:00 2026','The weekend archive is scheduled for Saturday at 20:00 UTC.'],
  ['m.weber','Print spool cleanup complete','Tue Jul 28 17:45:00 2026','Expired spool controls were removed; queued documents were not changed.'],
  ['operator','Visitor account notice','Tue Jul 28 09:30:00 2026','This read-only visitor account provides access to selected company documentation.'],
  ['h.sullivan','System notices revised','Mon Jul 27 13:12:00 2026','Current notices are in /cst/public/system-notices.txt']
]);

export const PRINTER = Object.freeze({ name:'cst-print1', online:true, maintenance:'complete', activeJob:'weekly-status', lastCompleted:'maintenance-sheet', nextInspection:'Mon Aug 3 09:00 UTC', spoolCount:2, queue:Object.freeze([
  { owner:'s.harper', job:'weekly-status', size:'18K' }, { owner:'h.sullivan', job:'documentation-index', size:'9K' }
]) });
export const STORAGE = Object.freeze([
  { filesystem:'/dev/rp0', blocks:24000, used:15360, available:8640, mounted:'/' },
  { filesystem:'/dev/rp1', blocks:48000, used:31680, available:16320, mounted:'/usr' }
]);
export const LOGIN_HISTORY = Object.freeze([
  { username:'operator', tty:'tty0', login:'Fri Jul 31 10:20', end:'still logged in' },
  { username:'m.weber', tty:'tty2', login:'Fri Jul 31 12:14', end:'still logged in' },
  { username:'s.harper', tty:'tty1', login:'Fri Jul 31 12:38', end:'still logged in' },
  { username:'h.sullivan', tty:'tty3', login:'Fri Jul 31 12:45', end:'still logged in' },
  { username:'f.kessler', tty:'tty4', login:'Fri Jul 31 11:22', end:'still logged in' },
  { username:'visitor', tty:'tty6', login:'Fri Jul 31 12:48', end:'still logged in' },
  { username:'j.miller', tty:'tty5', login:'Thu Jul 30 15:08', end:'16:42' }
]);
