const metadata = (value = '2026') => {
  if (/^\d{4}$/.test(value) || /^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  return `${value}T12:00:00.000Z`;
};
const dir = (name, children = {}, date = '2026', owner = 'm.weber', mode = 'drwxr-xr-x') => ({
  name, type:'directory', owner, group:owner, mode, children,
  created:metadata(date), modified:metadata(date), protected:true
});
const file = (name, content = '', date = '2026', mode = '-rw-r--r--', owner = 'm.weber') => ({
  name, type:'file', owner, group:owner, mode, content,
  created:metadata(date), modified:metadata(date), protected:true
});

const EMMA_THREAD = `Date: 2026-07-31 10:42 EDT
From: Emma Weber <emma@michamailgate.com>
To: Michael Weber <robodad@michamailgate.com>
Subject: New printer cartridge?

Hey Robodad,

Chloe and I were just about to print the new Major Tom pages, but the cartridge in her parents’ printer is empty.

Do you still have one of the same kind in the cabinet in your office at home?

I didn’t want to ride over and start looking through your things without asking. :)

Emma

--- Reply: Michael Weber ---

Yes.

Office cabinet, top shelf. Gray box marked PRINTER. Take the unopened cartridge on the left.

Helmet. Lock the door behind you.

I’ll pick you up at 3:05.

Dad

--- Reply: Emma Weber ---

Thanks, Dad.

Chloe says thank you too.

Major Tom reports that the printing systems may still be recoverable.
`;

const HISTORY = [
  'pwd','ls -la','cd Documents','ls','cat filesystem-layout.md','cd','clear',
  'df -h','df -i','systemctl --failed','journalctl -p warning -b','clear',
  'cd Scripts','ls -l','head -n 20 disk-summary.sh','cd','find Downloads -type f',
  'du -sh Downloads','cd Projects/text-summary','git status','git diff','git log --oneline -5',
  'find . -maxdepth 2 -type f','cat README.md','cd','clear','date','uptime','who','w',
  'id','groups','uname -a','cat /etc/os-release','clear','cd Archive/2021','ls -la',
  'cat rsync-notes.txt','cd ../2022','cat systemd-unit-notes.md','cd','clear',
  'grep -Ri systemd Documents Archive','find Notes -type f -maxdepth 2','cat Notes/restore-checklist.md',
  'cd Scripts','sh -n service-summary.sh','sh -n checksum-list.sh','cd','clear',
  'apt list --installed','dpkg -l','systemctl list-timers','journalctl -n 20',
  'cd Projects/checksum-list','git status','cat README.md','find . -type f','cd','clear',
  'ls -la','history | tail -20','du -sh Archive Documents Projects','find Downloads -type f',
  'cat Notes/package-repair.txt','cat Documents/permissions.md','systemctl --failed','df -h','clear'
].join('\n') + '\n';

const archive = {
  '2019': dir('2019', {
    'apt-sources.txt': file('apt-sources.txt', 'APT sources\n\nKeep distribution entries separate. Run apt update before comparing candidates. Remove obsolete entries only after the replacement is verified.\n', '2019'),
    'shell-portability.md': file('shell-portability.md', '# Shell portability\n\nUse POSIX syntax for small recovery helpers. Check with `sh -n`; avoid relying on interactive shell aliases.\n', '2019')
  }, '2019'),
  '2020': dir('2020', {
    'remote-maintenance.md': file('remote-maintenance.md', '# Remote maintenance\n\nConfirm the target, keep a second session open, validate configuration before reload, and write down the rollback command.\n', '2020'),
    'logrotate-notes.txt': file('logrotate-notes.txt', 'Use `logrotate -d` to inspect a plan. Check ownership, create mode, and service reopen behavior before forcing rotation.\n', '2020')
  }, '2020'),
  '2021': dir('2021', {
    'rsync-notes.txt': file('rsync-notes.txt', 'Start with --dry-run and --itemize-changes. A trailing slash copies contents. Never combine --delete with an unverified source. Restore a sample first.\n', '2021'),
    'checksums.md': file('checksums.md', '# Checksums\n\nKeep the manifest beside the retained files. Verify both after copying and again from the restore location.\n', '2021')
  }, '2021'),
  '2022': dir('2022', {
    'systemd-unit-notes.md': file('systemd-unit-notes.md', '# systemd unit notes\n\nKeep environment values outside the unit, use `systemd-analyze verify`, and document restart policy and timeouts.\n', '2022'),
    'permissions-reference.txt': file('permissions-reference.txt', 'Directories need execute permission for traversal. Inspect every path component with `namei -l`. Avoid recursive chmod without reviewing the tree.\n', '2022')
  }, '2022'),
  '2023': dir('2023', {
    'storage-layout.md': file('storage-layout.md', '# Storage layout\n\nKeep data and logs separate. Put mount options in system configuration, then check ownership with numeric IDs. Retained as a migration reference.\n', '2023'),
    'tar-reminders.txt': file('tar-reminders.txt', 'List an archive before extracting. Extract into an empty directory. Check paths and ownership before restoring over existing files.\n', '2023')
  }, '2023'),
  '2024': dir('2024', {
    'kernel-upgrade.md': file('kernel-upgrade.md', '# Kernel upgrade\n\nConfirm space in /boot. Keep the previous kernel until storage, network, and failed units have been checked after reboot.\n', '2024'),
    'journald-retention.txt': file('journald-retention.txt', 'Inspect disk usage and effective limits. Vacuuming is not a substitute for a suitable retention configuration.\n', '2024')
  }, '2024'),
  '2025': dir('2025', {
    'restore-practice.md': file('restore-practice.md', '# Restore practice\n\nOpen restored data read-only first. Sample contents, ownership, permissions, and timestamps before recording a result.\n', '2025'),
    'ssh-checklist.md': file('ssh-checklist.md', '# SSH checklist\n\nConfirm name, address, route, and resolved client configuration. Keep one working session while validating a server change.\n', '2025')
  }, '2025')
};

const project = (name, description, script) => dir(name, {
  'README.md': file('README.md', `# ${name}\n\n${description}\n\nInput samples are deliberately generic. Run checks before changing output.\n`, '2025'),
  src: dir('src', { 'run.sh': file('run.sh', script, '2025', '-rwxr-xr-x') }, '2025'),
  tests: dir('tests', { 'sample.txt': file('sample.txt', 'alpha\nbeta\nbeta\ngamma\n', '2025') }, '2025'),
  docs: dir('docs', { 'operations.md': file('operations.md', 'Run from the project root. Review generated output before replacing an earlier copy.\n', '2025') }, '2025'),
  '.git': dir('.git', {
    HEAD: file('HEAD', 'ref: refs/heads/main\n', '2025'),
    COMMIT_LOG: file('COMMIT_LOG', '8f21c0a Initial version\n2d73a10 Handle empty input\n41bc2d7 Clarify usage\n', '2025')
  }, '2025')
}, '2025');

export function createWorkstationFilesystem() {
  const home = dir('m.weber', {
    Desktop: dir('Desktop', {
      'sort-later.txt': file('sort-later.txt', 'Move retained references into the yearly archive after review.\n', '2026')
    }, '2026'),
    Documents: dir('Documents', {
      'filesystem-layout.md': file('filesystem-layout.md', '# Debian filesystem locations\n\n- `/etc`: system configuration\n- `/var/log`: persistent logs when configured\n- `/run`: volatile runtime state\n- `/srv`: locally served data\n- `/usr/local`: locally managed software\n', '2023'),
      'systemd-journal.md': file('systemd-journal.md', '# systemd and journal\n\nCheck the timer before blaming the service. Use `systemctl --failed`, then inspect the relevant unit and journal. Prefer reload when supported.\n', '2025'),
      'permissions.md': file('permissions.md', '# Permissions\n\nUse `stat` and `namei -l` before changing ownership. Files commonly begin at 0644 and executable helpers at 0755.\n', '2024'),
      'apt-troubleshooting.md': file('apt-troubleshooting.md', '# APT troubleshooting\n\nRead the first error. Check time, name resolution, configured sources, package locks, and `dpkg --audit` before attempting repair.\n', '2026'),
      'network-order.md': file('network-order.md', '# Network checks\n\nCheck local interface state, routes, resolver configuration, listeners, and only then the service journal. Record the failing layer before changing configuration.\n', '2026')
    }, '2019'),
    Downloads: dir('Downloads', {
      README: file('README', 'Temporary downloads. Filenames alone do not establish a trusted source; review before reuse.\n', '2026'),
      'tar-examples.txt': file('tar-examples.txt', 'List first: tar -tf archive.tar\nExtract into an empty directory: tar -xf archive.tar -C TARGET\n', '2023'),
      'checksum-notes.txt': file('checksum-notes.txt', 'Keep downloaded files and their checksum manifest together until the retained copy has been verified.\n', '2022'),
      'debian-upgrade-notes.txt': file('debian-upgrade-notes.txt', 'Review release notes, package removals, locally modified configuration, and available boot space before an upgrade.\n', '2026')
    }, '2019'),
    Mail: dir('Mail', {
      Inbox: dir('Inbox', {}, '2026'),
      EMMA: dir('EMMA', {
        '2026-07-31-new-printer-cartridge.eml': file('2026-07-31-new-printer-cartridge.eml', EMMA_THREAD, '2026-07-31'),
        README: file('README', 'Permanent archive of Emma’s messages.\n\nHundreds of messages · approximately 4.8 GB\n\nOnly the current printer-cartridge thread is available in this preserved view.\n', '2026-07-31')
      }, '2026-07-31'),
      Sent: dir('Sent', {}, '2026'), Drafts: dir('Drafts', {}, '2026'), Archive: dir('Archive', {}, '2026')
    }, '2026'),
    Calendar: dir('Calendar', {
      '2026-07-31-pick-up-emma.ics': file('2026-07-31-pick-up-emma.ics', 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:20260731T150500\nSUMMARY:Pick up Emma\nEND:VEVENT\nEND:VCALENDAR\n', '2026-07-31')
    }, '2026-07-31'),
    Notes: dir('Notes', {
      'home.todo': file('home.todo', 'Home\n\n- Pick up Emma — 3:05\n- Sort downloads\n- Verify personal document backup\n', '2026-07-31'),
      'restore-checklist.md': file('restore-checklist.md', '# Restore checklist\n\n- Mount or extract read-only first.\n- Restore a small sample to a temporary directory.\n- Check contents, ownership, permissions, and timestamps.\n- Record the result before expiring an older copy.\n', '2025'),
      'package-repair.txt': file('package-repair.txt', 'Package repair\n\nCheck the active package process, read the first error, run `dpkg --audit`, and preview any removals.\n', '2024'),
      'disk-space.txt': file('disk-space.txt', 'Use df -hT for capacity, df -i for inodes, and du -xhd1 for a first pass. Check deleted open files before removing anything.\n', '2024'),
      work: dir('work', {
        '2026-07-31.txt': file('2026-07-31.txt', 'Backup verification completed.\nParser correction completed.\nDefective customer drive received.\nLegacy archive notice closed.\n', '2026-07-31')
      }, '2026-07-31')
    }, '2019'),
    Projects: dir('Projects', {
      'major-tom': dir('major-tom', {
        README: file('README', "Printable pages for Emma and Chloe's Major Tom project.\n\nThe project files themselves are not stored on this company workstation.\n", '2026-07-31')
      }, '2026-07-31'),
      'text-summary': project('text-summary', 'Produce a short line-count summary for ordinary text files.', '#!/bin/sh\nset -eu\nfor item in "$@"; do\n  test -f "$item" || continue\n  printf "%s " "$item"\n  wc -l < "$item"\ndone\n'),
      'checksum-list': project('checksum-list', 'Create a reviewable list of checksums for files supplied on the command line.', '#!/bin/sh\nset -eu\nfor item in "$@"; do\n  test -f "$item" && sha256sum "$item"\ndone\n')
    }, '2025'),
    Scripts: dir('Scripts', {
      'disk-summary.sh': file('disk-summary.sh', '#!/bin/sh\nset -eu\ndf -hT\ndu -xhd1 "${1:-$HOME}" 2>/dev/null | sort -h\n', '2023', '-rwxr-xr-x'),
      'service-summary.sh': file('service-summary.sh', '#!/bin/sh\nset -eu\nsystemctl --failed --no-pager\nsystemctl list-timers --no-pager\n', '2024', '-rwxr-xr-x'),
      'checksum-list.sh': file('checksum-list.sh', '#!/bin/sh\nset -eu\nmanifest=${1:-checksums.sha256}\ntest -f "$manifest" || exit 1\nsha256sum --check "$manifest"\n', '2021', '-rwxr-xr-x'),
      'stale-files.sh': file('stale-files.sh', '#!/bin/sh\nset -eu\nfind "${1:-$HOME/Downloads}" -type f -mtime "+${2:-90}" -print | sort\n', '2022', '-rwxr-xr-x'),
      'package-preview.sh': file('package-preview.sh', '#!/bin/sh\nset -eu\napt-get --simulate upgrade\n', '2025', '-rwxr-xr-x')
    }, '2021'),
    Archive: dir('Archive', { README: file('README', 'Older technical references grouped by year. Active notes remain in Documents and Notes. Mail is kept separately.\n', '2026'), ...archive }, '2019'),
    Research: dir('Research', {
      'automation-boundaries.md': file('automation-boundaries.md', '# Automation boundaries\n\nAutomate observation before remediation. Default to dry-run for rename, removal, or overwrite. Keep recovery usable without the helper.\n', '2026'),
      'filesystem-checks.md': file('filesystem-checks.md', '# Filesystem checks\n\nConfirm the device from `findmnt` and `lsblk`. Inspect kernel messages first. Unmount before an offline repair.\n', '2025'),
      'journald-retention.txt': file('journald-retention.txt', 'Inspect effective limits and whether persistent storage is enabled before expecting older boots.\n', '2025')
    }, '2025'),
    '.bash_history': file('.bash_history', HISTORY, '2026'),
    '.profile': file('.profile', '# ~/.profile\nPATH="$HOME/Scripts:$HOME/.local/bin:$PATH"\nexport EDITOR=vim\nexport PAGER=less\n', '2019'),
    '.bash_aliases': file('.bash_aliases', "alias ll='ls -alF'\nalias la='ls -A'\nalias l='ls -CF'\n", '2019')
  }, '2019');

  const kernelLog = `Jul 31 13:41 EDT workstation kernel: usb: new high-speed USB device
Jul 31 13:41 EDT workstation kernel: usb-storage: USB Mass Storage device detected
Jul 31 13:41 EDT workstation kernel: usbserial: vendor-specific serial interface detected
Jul 31 13:41 EDT workstation kernel: usbserial: device attached to ttyUSB0
`;
  return dir('', {
    dev: dir('dev', { null:file('null', '', '2026', 'crw-rw-rw-', 'root'), tty1:file('tty1', '', '2026', 'crw--w----', 'root') }, '2026', 'root'),
    etc: dir('etc', {
      hostname: file('hostname', 'workstation\n', '2026', '-rw-r--r--', 'root'), timezone: file('timezone', 'America/New_York\n', '2026', '-rw-r--r--', 'root'),
      issue: file('issue', 'Debian GNU/Linux 13 \\n \\l\n', '2026', '-rw-r--r--', 'root'),
      'os-release': file('os-release', 'PRETTY_NAME="Debian GNU/Linux 13 (trixie)"\nNAME="Debian GNU/Linux"\nVERSION_ID="13"\nVERSION="13 (trixie)"\nVERSION_CODENAME=trixie\nID=debian\n', '2026', '-rw-r--r--', 'root'),
      hosts: file('hosts', '127.0.0.1 localhost\n127.0.1.1 workstation\n', '2026', '-rw-r--r--', 'root'),
      passwd: file('passwd', 'root:x:0:0:root:/root:/bin/bash\nm.weber:x:1000:1000:Michael Weber:/home/m.weber:/bin/bash\n', '2026', '-rw-r--r--', 'root'),
      group: file('group', 'root:x:0:\nm.weber:x:1000:\n', '2026', '-rw-r--r--', 'root'), shells: file('shells', '/bin/sh\n/bin/bash\n', '2026', '-rw-r--r--', 'root')
    }, '2026', 'root'),
    home: dir('home', { 'm.weber':home }, '2026', 'root'),
    proc: dir('proc', { version:file('version', 'Linux version 6.12.38+deb13-amd64 (Debian 6.12.38-1)\n', '2026', '-r--r--r--', 'root') }, '2026', 'root'),
    root: dir('root', {}, '2026', 'root', 'drwx------'), run:dir('run', {}, '2026', 'root'), srv:dir('srv', {}, '2026', 'root'), tmp:dir('tmp', {}, '2026', 'root', 'drwxrwxrwt'),
    usr: dir('usr', { bin:dir('bin', {}, '2026', 'root') }, '2026', 'root'),
    var: dir('var', { log:dir('log', {
      chesapeake: dir('chesapeake', { 'backup-verification.log':file('backup-verification.log', 'Jul 31 13:26 EDT  scheduled backup verification completed\nJul 31 13:26 EDT  result: OK\n', '2026-07-31', '-rw-r--r--', 'root') }, '2026', 'root'),
      'auth.log': file('auth.log', 'Jul 31 13:41:26 workstation login: session opened for user m.weber on tty1\n', '2026-07-31T13:41:26-04:00', '-rw-r--r--', 'root'),
      'kern.log': file('kern.log', kernelLog, '2026-07-31', '-rw-r--r--', 'root')
    }, '2026', 'root') }, '2026', 'root')
  }, '2026', 'root');
}
