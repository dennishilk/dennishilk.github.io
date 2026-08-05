const stamp = value => `${value}T${value.length === 10 ? '12:00:00.000Z' : '00.000Z'}`;
const dir = (name, children = {}, date = '2026-07-29', owner = 'm.weber') => ({ name, type:'directory', owner, group:owner, mode:'drwxr-xr-x', children, created:stamp(date), modified:stamp(date), protected:false });
const file = (name, content = '', date = '2026-07-29', mode = '-rw-r--r--', owner = 'm.weber') => ({ name, type:'file', owner, group:owner, mode, content, created:stamp(date), modified:stamp(date), protected:false });
const message = (name, date, from, to, subject, body) => file(name, `Date: ${date}\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\n\n${body.trim()}\n`, date.slice(0,10));
const ticket = (id, date, title, body) => file(`${id}.md`, `# ${id}: ${title}\n\nOpened: ${date}\nStatus: closed\n\n${body.trim()}\n`, date);

function repo(name, created, purpose, source, operations, changes) {
  return dir(name, {
    'README.md':file('README.md',`# ${name}\n\n${purpose}\n\n## Development\n\nUse the samples under \`tests/fixtures\`; production exports contain staff and asset details.\n`,created),
    'CHANGELOG.md':file('CHANGELOG.md',`# Changelog\n\n${changes}\n`, '2026-06-18'),
    src:dir('src',source,'2026-06-18'),
    config:dir('config',{'example.ini':file('example.ini','[main]\ndry_run = true\nlog_level = INFO\n',created)},created),
    docs:dir('docs',{'operations.md':file('operations.md',operations,'2025-11-03')},'2025-11-03'),
    tests:dir('tests',{fixtures:dir('fixtures',{'sample.txt':file('sample.txt','sample-01;active;Printer-03\n',created)})},created),
    '.git':dir('.git',{HEAD:file('HEAD','ref: refs/heads/main\n',created),config:file('config',`[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = ssh://git.office.local/${name}.git\n`,created), 'COMMIT_LOG':file('COMMIT_LOG',`commit ${created.replaceAll('-','')} Initial import\ncommit 20241118 Handle empty input\ncommit 20250307 Document deployment\ncommit 20250922 Fix typo\ncommit 20260618 ${changes.split('\n')[2]?.replace(/^##? /,'') || 'Maintenance'}\n`,'2026-06-18')},created)
  },created);
}

const inbox = {
  '2026-07-30-customer-status-experience.eml':message('2026-07-30-customer-status-experience.eml','2026-07-30 evening','Steve Harper','Henry Sullivan','Customer Status Experience — Concept Preview',`Cc: Michael Weber <michael.weber@chesapeakesignaltech.com>
Attachment: customer-status-experience-concept-preview.pptx

Hi Henry,

I finished the first pass of the Customer Status Experience concept and attached the preview deck.

The idea is to make overnight warnings easier for customers to understand without removing the technical detail they may need later.

It is currently thirty-two slides, although most of them are visual. I also added a short loading animation to communicate that the system is actively retrieving the latest status.

Could you take a look tomorrow morning?

Michael, I copied you in as well in case you notice anything technically inaccurate.

I think it is in a good place.

Steve`)
};

const emmaMail = {
  '2026-07-31-new-printer-cartridge.eml':message('2026-07-31-new-printer-cartridge.eml','2026-07-31 10:42 EDT','Emma Weber <emma@michamailgate.com>','Michael Weber <robodad@michamailgate.com>','New printer cartridge?',`Hey Robodad,

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

Major Tom reports that the printing systems may still be recoverable.`),
  README:file('README',`Permanent archive of Emma’s messages.

Hundreds of messages · approximately 4.8 GB

Drawings, questions, Byte photographs, technical-help requests, and everyday messages.
`,'2026-07-31')
};

const bash = `pwd\nls -la\ncd Projects/monitoring\ngit status\nvim README.md\ngit diff\npython3 -m pytest\ngit add README.md\ngit commit -m "Document alert recovery"\ncd\nclear\nclear\nssh monitor-01\nsudo systemctl status prometheus-node-exporter\njournalctl -u prometheus-node-exporter --since today\nexit\ncd Tickets/2026\nrg UPS-02 .\ncd ~/Downloads\nsha256sum BrotherDriver-4.1.0.tar.gz\nsha256sum -c BrotherDriver-4.1.0.sha256\ncd ~/Projects/printer-audit\npython3 src/audit.py ../../Documents/office/assets.csv\nvim config/printers.ini\ngit diff\ngit commit -am "Update Printer-03 driver"\nclear\ncd ~/Projects/inventory\ngit pull --ff-only\npython3 src/inventory.py --input ~/Documents/office/assets.csv\npython3 src/inventory.py --input ~/Documents/office/assets.csv --check-duplicates\ngit status\ncd\nfind Downloads -type f -mtime +90 -print\ndu -sh Downloads/* | sort -h\ncat Notes/ups-batteries.txt\nping -c 3 sw-02\nssh sw-02\nshow interfaces status\nexit\nclear\nsudo apt update\nsudo apt list --upgradable\nsudo apt upgrade\nsystemctl --failed\njournalctl -p warning -b\ndf -h\nlsblk\nsudo smartctl -a /dev/nvme0n1\ncd ~/Projects/backup-tools\ngit log --oneline -8\npython3 src/verify.py --snapshot /mnt/backup/latest\npython3 src/verify.py --snapshot /mnt/backup/latest --manifest\necho $?\nvim docs/operations.md\ngit diff --check\ngit commit -am "Clarify restore mount"\ncd\nrg Printer-03 Mail Tickets Documents\nrg UPS-02 Mail Tickets Notes Documents\nfind Photos -type f | sort\nfind Documents -type f -mtime -30 -print\nls ~/Photos/Office\nclear\nhistory | tail -40\nhistory | rg journalctl\ncd ~/Projects/weather-parser\npython3 -m pytest\npython3 src/parser.py tests/fixtures/ws07-old.txt\nvim src/parser.py\npython3 -m pytest\ngit diff\ngit commit -am "Keep original WS-07 line"\nclear\ncd ~/Desktop\nls -lt\nvim TODO.txt\nlibreoffice network-map.odg\ncp network-map.odg network-map-2025-02-12.odg\ncd\nssh store-02\ndf -h\ndu -sh /srv/scans/* | sort -h | tail\nexit\nclear\ncd ~/Projects/monitoring\nvim config/hosts.ini\npython3 src/check.py --host store-02 --dry-run\ngit diff\ngit commit -am "Raise STORE-02 disk threshold"\ngit push\ncd\nmail\nclear\nclear\n`;

const yearlyArchive = {
  '2019':{'apt-sources-notes.txt':file('apt-sources-notes.txt','APT source notes\n\nKeep distribution entries in separate files under /etc/apt/sources.list.d.\nRun apt update before comparing available versions.\nRecord local pinning beside the relevant source entry.\nRemove obsolete entries only after the replacement has been verified.\n','2019-12-18')},
  '2020':{'remote-maintenance.md':file('remote-maintenance.md','# Remote maintenance checklist\n\n- Confirm the target host and maintenance window.\n- Keep a second session open before changing SSH settings.\n- Use `systemctl reload` when the service supports it.\n- Check failed units and recent high-priority journal entries.\n- Record commands needed to reverse the change.\n','2020-11-06')},
  '2021':{'rsync-wrapper-notes.txt':file('rsync-wrapper-notes.txt','Old rsync wrapper notes\n\nAlways start with --dry-run and --itemize-changes.\nA trailing slash copies directory contents, not the directory itself.\nDo not combine --delete with an unverified source path.\nVerify a sample restore before removing the previous copy.\n','2021-08-20')},
  '2022':{'systemd-migration.md':file('systemd-migration.md','# Service unit migration\n\nCompleted checklist retained for reference.\n\n- Unit files moved out of the application directory.\n- Environment values separated from the unit file.\n- `systemd-analyze verify` run against the final unit.\n- Restart policy and timeout documented.\n- Old init example marked obsolete.\n','2022-10-14')},
  '2023':{'storage-layout.txt':file('storage-layout.txt','Previous storage layout\n\nSeparate data and log directories were used by the old layout.\nMount options belonged in the system configuration, not helper scripts.\nOwnership was applied after mounting and checked with numeric IDs.\nRetained only as a migration reference.\n','2023-09-08')},
  '2024':{'kernel-upgrade-checklist.md':file('kernel-upgrade-checklist.md','# Kernel upgrade checklist\n\n- Read package changes before applying the upgrade.\n- Confirm free space in /boot.\n- Keep the previous kernel until the new boot is verified.\n- Check storage, network and failed units after reboot.\n- Remove old packages during a separate review.\n','2024-12-13')}
};
const activeReferences = {
 'apt-troubleshooting.md':file('apt-troubleshooting.md','# APT troubleshooting\n\n1. Read the first error, not the final summary.\n2. Check time, DNS and configured sources.\n3. Use `apt-cache policy PACKAGE` to inspect candidates.\n4. Run `dpkg --audit` before attempting repairs.\n5. Preview removals carefully; never approve an unexpected plan.\n\nPackage locks normally mean another package process is active. Check before removing anything.\n','2026-02-10'),
 'systemd-journal.md':file('systemd-journal.md','# systemd and journal quick reference\n\n```sh\nsystemctl --failed\nsystemctl status SERVICE\nsystemctl cat SERVICE\nsystemctl list-timers --all\njournalctl -u SERVICE -b\njournalctl -p warning --since today\njournalctl --disk-usage\n```\n\nCheck the timer before blaming the service. Prefer reload to restart when supported.\n','2025-10-03'),
 'permissions.txt':file('permissions.txt','Permissions reference\n\nFiles usually start at 0644; executable helpers at 0755.\nDirectories need execute permission for traversal.\nUse `namei -l PATH` to inspect every path component.\nUse `stat` before changing ownership.\nAvoid recursive chmod unless the complete tree has been reviewed.\n','2024-06-21'),
 'network-debugging.md':file('network-debugging.md','# Network debugging order\n\n- `ip address` and `ip route`\n- resolver configuration and `getent hosts NAME`\n- `ss -lntup` for local listeners\n- `ping` only when ICMP is expected\n- `tracepath` for route and MTU clues\n- service journal after basic reachability\n\nWrite down the failing layer before changing configuration.\n','2026-01-16')
};
const practicalNotes = {
 'home.todo':file('home.todo','Home\n\n- Check with Emma for the spare printer cartridge at home\n- Sort downloads\n- Verify personal document backup\n- Clean old screenshots\n','2026-07-29'),
 'backup-verification.md':file('backup-verification.md','# Backup verification\n\n- Confirm the snapshot completed without skipped paths.\n- Compare the manifest with the stored files.\n- Mount or extract read-only first.\n- Restore a small sample to a temporary directory.\n- Check contents, ownership and timestamps.\n- Record the result before expiring an older copy.\n','2025-11-07'),
 'disk-space.txt':file('disk-space.txt','Disk space checks\n\n`df -hT` for filesystem capacity.\n`df -i` when space looks available but writes fail.\n`du -xhd1 PATH | sort -h` for a first pass.\nCheck deleted open files with `lsof +L1`.\nDo not remove logs by hand; inspect rotation settings.\n','2024-08-09'),
 'ssh-checklist.md':file('ssh-checklist.md','# SSH checklist\n\n- Confirm host name, address and route.\n- Use `ssh -G HOST` to inspect the resolved client configuration.\n- Use `ssh -v` only as far as needed.\n- Check file and directory permissions on keys.\n- Keep one working session while testing server configuration.\n- Validate configuration before reload.\n','2025-04-11'),
 'project-review.txt':file('project-review.txt','Project review\n\n- Run tests from a clean checkout.\n- Check examples still match current options.\n- Remove generated files from status output.\n- Review dependency and runtime notes.\n- Archive superseded instructions after the final backup.\n','2026-05-22')
};
const safeScripts = {
 'disk-summary.sh':file('disk-summary.sh','#!/bin/sh\nset -eu\n# Read-only summary; no files are changed.\ndf -hT\nprintf "\\nLargest entries under: %s\\n" "${1:-$HOME}"\ndu -xhd1 "${1:-$HOME}" 2>/dev/null | sort -h\n','2023-03-17','-rwxr-xr-x'),
 'service-summary.sh':file('service-summary.sh','#!/bin/sh\nset -eu\nsystemctl --failed --no-pager\nprintf "\\nActive timers:\\n"\nsystemctl list-timers --no-pager\n','2024-05-10','-rwxr-xr-x'),
 'package-preview.sh':file('package-preview.sh','#!/bin/sh\nset -eu\n# Simulation only: display the package plan without applying it.\napt-get --simulate upgrade\n','2025-01-24','-rwxr-xr-x'),
 'stale-files.sh':file('stale-files.sh','#!/bin/sh\nset -eu\nroot=${1:-$HOME/Downloads}\ndays=${2:-90}\nprintf "Files older than %s days under %s:\\n" "$days" "$root"\nfind "$root" -type f -mtime "+$days" -print | sort\n','2022-07-15','-rwxr-xr-x'),
 'verify-checksums.sh':file('verify-checksums.sh','#!/bin/sh\nset -eu\nmanifest=${1:-checksums.sha256}\ntest -f "$manifest" || { printf "Missing manifest: %s\\n" "$manifest" >&2; exit 1; }\nsha256sum --check "$manifest"\n','2021-12-03','-rwxr-xr-x')
};

export function createWorkstationFilesystem() {
 const kernelLog='Jul 31 13:41 EDT workstation kernel: usb 2-1: new high-speed USB device\nJul 31 13:41 EDT workstation kernel: usb-storage 2-1:1.0: USB Mass Storage device detected\nJul 31 13:41 EDT workstation kernel: scsi host6: usb-storage 2-1:1.0\n';
 const home=dir('m.weber',{
  Desktop:dir('Desktop',{
   'TODO.txt':file('TODO.txt','Wednesday\n---------\n[x] Check overnight backup report\n[x] Record the Printer-03 toner ETA\n[ ] Review inventory 2.4 release notes\n[ ] Test the HDMI adapter\n\nThis week\n---------\n[ ] Add UPS-02 autumn test calendar entry\n[ ] Sort technical PDFs into Documents\n','2026-07-29'),
   'network-map.odg':file('network-map.odg','OpenDocument drawing: Office network map, revised after SW-02 replacement.\nSW-02/18: Meeting Room 2; SW-02/22: Printer-03; UPS-02: rack B.\n','2025-02-12'),
   'network-map-old.odg':file('network-map-old.odg','OpenDocument drawing: 2023 office network map. Ports 17/18 annotations may be reversed.\n','2023-08-18'),
   'Screenshot_2026-07-28_16-42-11.png':file('Screenshot_2026-07-28_16-42-11.png','PNG: inventory 2.4 duplicate serial report after final run.\n','2026-07-28'),
   'UPS battery quote.pdf':file('UPS battery quote.pdf','PDF: Nordstrom Power quote Q-260714, replacement battery options for UPS-02. Waiting for autumn runtime test.\n','2026-07-14'),
   'store-02-notification-check.txt':file('store-02-notification-check.txt','Confirm whether the STORE-02 recovery notification was emitted once or twice.\nCompare service state with the notification log before changing the alert rule.\n','2026-07-27')
  },'2019-02-11'),
  Documents:dir('Documents',{
   ...activeReferences,
   office:dir('office',{
    'assets.csv':file('assets.csv','asset,location,purchased,status\nPrinter-01,Accounts,2018-04-12,active\nPrinter-03,Shipping,2017-09-21,active\nUPS-01,Rack A,2018-02-03,active\nUPS-02,Rack B,2017-11-14,watch\nUPS-03,Rack C,2019-06-05,active\nSW-02,Rack B,2025-02-12,active\nSTORE-02,Server room,2021-05-19,active\nSPARE-04,IT cupboard,2022-10-08,spare\n','2026-06-18'),
    'printer-03-service.md':file('printer-03-service.md','# Printer-03 — Brother MFC-L8900CDW\n\nShipping office, SW-02 port 22. Purchased 2017-09-21.\n\n- 2019-03-06 cleaned pickup rollers; fan damp label stock.\n- 2021-02-15 replaced cyan toner after blue streak (TKT-2021-014).\n- 2023-04-18 installed Brother 4.1.0 driver (TKT-2023-041).\n- 2026-03-09 low toner warning; cartridge held until print fades (TKT-2026-023).\n','2026-03-09'),
    'ups-register.md':file('ups-register.md','# UPS register\n\nUPS-01 rack A — annual test 24 min (2026-01-12).\nUPS-02 rack B — battery 2020-01-17; 21 min in 2026, test again October.\nUPS-03 rack C — battery 2024-01-19; 29 min in 2026.\n\nReturn spent batteries through Nordstrom Power collection.\n','2026-01-12'),
    'new-starter-checklist.md':file('new-starter-checklist.md','# IT starter checklist\n\nAccount, MFA token, laptop, charger, VPN test, printer mapping, inventory signature.\n\n2025 note: the inventory operator found the monitoring acknowledgement section too terse; use docs from the monitoring repository.\n','2025-07-18')
   },'2019-02-11'),
   'meeting-template.md':file('meeting-template.md','# Meeting\n\nDate:\nAttending:\n\n## Decisions\n\n## Actions\n','2020-05-04'),
   'restore-test-2025-11.md':file('restore-test-2025-11.md','# Restore test — 6 November 2025\n\nRestored October accounts snapshot to SPARE-04 in 23 minutes. The inventory operator corrected ownership; Finance opened three sampled files. See TKT-2025-088.\n','2025-11-06')
  },'2019-02-11'),
  Downloads:dir('Downloads',{
   'README':file('README','Temporary downloads and retained installation references. Review before reuse; filenames alone do not establish a trusted source.\n','2026-05-06'),
   'tar-examples.txt':file('tar-examples.txt','Tar reminders\n\nList first: `tar -tf archive.tar`\nExtract into an empty directory: `tar -xf archive.tar -C TARGET`\nCreate gzip archive: `tar -czf archive.tar.gz DIRECTORY`\nUse `--same-owner` only when restoring ownership intentionally.\n','2024-03-02'),
   'RFC notes.txt':file('RFC notes.txt','Reading queue\n- RFC 3339 for inventory timestamps\n- RFC 5322 for exported mail headers\n- RFC 9110 caching terminology\n','2022-04-11'),
   'BrotherDriver.tar.gz':file('BrotherDriver.tar.gz','Archive: Brother Linux driver 3.5.1, downloaded for Printer-03; superseded but retained for rollback.\n','2019-03-06'),
   'BrotherDriver-4.1.0.tar.gz':file('BrotherDriver-4.1.0.tar.gz','Archive: Brother Linux driver 4.1.0 used by Printer-03 since 2023-04-18.\n','2023-04-17'),
   'BrotherDriver-4.1.0.sha256':file('BrotherDriver-4.1.0.sha256','bf76d4b319f0c7c689c2f12611be12381c25057397762d96df7195c04c4944be  BrotherDriver-4.1.0.tar.gz\n','2023-04-17'),
   'driver.zip':file('driver.zip','ZIP: old USB serial adapter driver from the technician. Probably for the grey adapter in the bottom drawer.\n','2020-01-16'),
   'driver-new.zip':file('driver-new.zip','ZIP: USB serial adapter driver mirror, newer than driver.zip but never tested.\n','2021-08-09'),
   'invoice.pdf':file('invoice.pdf','PDF invoice draft: Nordstrom Power, UPS-03 battery.\n','2024-01-11'),
   'invoice-final.pdf':file('invoice-final.pdf','PDF invoice 2024-0187: Nordstrom Power, UPS-03 battery. Filed copy is in Accounts.\n','2024-01-22'),
   'printer.pdf':file('printer.pdf','PDF user guide: Brother MFC-L8900CDW (Printer-03).\n','2019-03-06'),
   'wifi-map.png':file('wifi-map.png','PNG: office Wi-Fi survey heat map before meeting-room access point move.\n','2022-08-16'),
   'debian-12.5.0-amd64-netinst.iso.torrent':file('debian-12.5.0-amd64-netinst.iso.torrent','BitTorrent metainfo for Debian 12.5 netinst, used for SPARE-04 rebuild.\n','2024-02-12'),
   'firmware-SW02-3.2.7.bin':file('firmware-SW02-3.2.7.bin','Firmware image staged for retired SW-02; never applied after replacement was approved.\n','2024-12-04'),
  },'2019-03-06'),
  Mail:dir('Mail',{Inbox:dir('Inbox',inbox,'2026-07-30'),EMMA:dir('EMMA',emmaMail,'2026-07-31'),Sent:dir('Sent',{},'2026-07-31'),Drafts:dir('Drafts',{},'2026-07-31'),Archive:dir('Archive',{
   README:file('README','Older email is stored in the encrypted company archive.\n\nThis workstation keeps only the active local mailbox.\n\nHistorical mail can be restored if required.\n','2026-07-29')
  },'2026-07-29')},'2026-07-29'),
  Calendar:dir('Calendar',{
   '2026-07-31-pick-up-emma.ics':file('2026-07-31-pick-up-emma.ics','BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTAMP:20260728\nDTSTART:20260731T150500\nSUMMARY:PICK UP EMMA — VANCE HOUSE\nSTATUS:CONFIRMED\nDESCRIPTION:Routine pickup reminder; created three days earlier as redundancy.\nEND:VEVENT\nEND:VCALENDAR\n','2026-07-28')
  },'2026-07-28'),
  Notes:dir('Notes',{
   ...practicalNotes,
   work:dir('work',{
    '2026-07-31.txt':file('2026-07-31.txt','Parser correction completed.\nCustomer drive received for diagnostics.\nStatus: pending examination.\nLegacy archive notice closed.\n','2026-07-31')
   },'2026-07-31'),
   'ups-batteries.txt':file('ups-batteries.txt','UPS-02: fitted 2020-01-17, 21 min Jan 2026, retest October\nUPS-03: fitted 2024-01-19, 29 min Jan 2026\nBattery supplier: Nordstrom Power; collection cage by loading door\n','2026-01-12'),
   'printer-toner.txt':file('printer-toner.txt','Printer-01 black TN-3480\nPrinter-03 CMYK TN-421 series — cyan replaced 2021; black spare in cabinet\nDo not change just because warning appears; the operator checks print quality.\n','2026-03-09'),
   'rack-reference.md':file('rack-reference.md','# Rack reference\n\n- Rack B cage key sticks: lift door slightly.\n- SW-02 port 18 is Meeting Room 2.\n- UPS service cards are behind the PDU, not on the door.\n\nVerify labels against the current network map before maintenance.\n','2025-04-24'),
   'terminal-cheatsheet.md':file('terminal-cheatsheet.md','# Terminal reminders\n\n```sh\nfind . -type f -mtime -7\nrg "pattern" .\nsha256sum -c checksums.sha256\njournalctl -u SERVICE --since today\n```\n\nPrefer a readable command over a clever one. Future Michael is usually tired.\n','2022-03-04'),
  },'2019-02-11'),
  Projects:dir('Projects',{
   'major-tom':dir('major-tom',{'README':file('README',"Printable pages for Emma and Chloe's Major Tom project.\n\nThe project files themselves are not stored on this company workstation.\n",'2026-07-29')},'2026-07-29'),
   monitoring:repo('monitoring','2019-05-06','Small service checks that alert once, recover once, and tell the next person what to do.',{'check.py':file('check.py','from dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass Result:\n    host: str\n    healthy: bool\n    detail: str = ""\n\ndef changed(previous, current):\n    return previous is None or previous.healthy != current.healthy\n','2022-11-29')},'# Operations\n\nAcknowledge with the asset name. STORE-02 disk alerts use a 30-minute recovery window. Escalate UPS runtime alerts to the duty administrator.','## 2.8 — 2026-06-18\n\n- Keep recovery notification state across restarts.\n\n## 1.7 — 2022-11-29\n\n- Stop repeated STORE-02 disk mail.'),
   inventory:repo('inventory','2020-09-14','Normalize the office asset sheet while preserving source values and collection dates.',{'inventory.py':file('inventory.py','import csv, json\n\ndef rows(source):\n    for row in csv.DictReader(source):\n        yield {key: (value or None) for key, value in row.items()}\n','2026-06-18')},'# Operations\n\nRun duplicate serial check before publishing. Null means absent; the literal string “unknown” is not a null value. Version 2.4 was verified by the inventory operator.','## 2.4 — 2026-06-18\n\n- Report duplicate serial numbers.\n- Preserve null values in JSON.\n\n## 1.0 — 2020-09-14\n\n- Import office CSV.'),
   'backup-tools':repo('backup-tools','2020-04-20','Verify manifests and practice restores; this project never deletes snapshots.',{'verify.py':file('verify.py','from pathlib import Path\n\ndef newest_snapshot(root: Path) -> Path:\n    return max((p for p in root.iterdir() if p.is_dir()), key=lambda p: p.stat().st_mtime)\n','2025-11-06')},'# Operations\n\nQuarterly restore target is SPARE-04. Mount read-only first, record elapsed time and have the file owner inspect samples. See TKT-2025-088.','## 1.9 — 2025-11-06\n\n- Record manifest verification duration.\n- Document SPARE-04 permission repair.'),
   'weather-parser':repo('weather-parser','2021-11-09','Parse WS-07 observation exports for the weather group without losing the evidence in the original row.',{'parser.py':file('parser.py','from decimal import Decimal\n\ndef temperature(value):\n    text=value.strip()\n    return None if text in {"", "-"} else Decimal(text)\n\ndef observation(line):\n    return {"source": line.rstrip("\\n"), "fields": line.rstrip("\\n").split(";")}\n','2023-02-03')},'# Samples\n\nWS-07 older exports use a dash for missing wind direction. Every parsed record retains the complete original line. The weather group supplies anonymised fixtures.','## 1.3 — 2023-02-03\n\n- Keep the original WS-07 line.\n- Accept dash as missing wind direction.'),
   'printer-audit':repo('printer-audit','2024-08-12','Combine monthly page counts, lease costs and service history for the office printers.',{'audit.py':file('audit.py','import csv\n\ndef cost_per_page(cost, pages):\n    return None if not pages else round(cost / pages, 4)\n','2024-09-30')},'# Monthly run\n\nThe operator exports page counts on the last working day. Printer-03 remains in service until lease review; record toner and repair cost separately.','## 1.1 — 2024-09-30\n\n- Include monthly page counts for Finance.\n- Separate consumables from repairs.'),
   'station-db':repo('station-db','2022-03-21','A small SQLite import tool for weather station metadata used by weather-parser.',{'schema.sql':file('schema.sql','CREATE TABLE station (code TEXT PRIMARY KEY, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);\n','2022-03-21')},'# Imports\n\nTake a backup before imports. WS-07 belongs to the coastal observations group; do not rename published codes.','## 0.8 — 2025-03-07\n\n- Document backups before station imports.')
  },'2019-05-06'),
  Tickets:dir('Tickets',{
   '2019':dir('2019',{'TKT-2019-031.md':ticket('TKT-2019-031','2019-03-06','Printer-03 multiple label feed','Cleaned pickup roller and tested 40 shipping labels with the operator. Added note inside drawer about fanning stock in damp weather.'),'TKT-2019-104.md':ticket('TKT-2019-104','2019-10-14','SW-02 map disagrees with cabinet','Confirmed Meeting Room 2 is port 18, not 17. Updated working map; old printed copy marked in red.')},'2019-03-06'),
   '2020':dir('2020',{'TKT-2020-006.md':ticket('TKT-2020-006','2020-01-17','Replace UPS-02 battery','Installed approved RBC7 equivalent with the technician. Runtime increased from 11 to 31 minutes. Old battery placed in supplier collection cage.'),'TKT-2020-029.md':ticket('TKT-2020-029','2020-03-17','Remote access readiness','VPN instructions tested with the operator. Loan chargers recorded against staff assets; printer mapping excluded from home profile.')},'2020-01-17'),
   '2021':dir('2021',{'TKT-2021-014.md':ticket('TKT-2021-014','2021-02-15','Printer-03 blue streak','Replaced cyan TN-421 cartridge, cleaned transfer area and printed the operator’s A5 test form. Output clean.')},'2021-02-15'),
   '2022':dir('2022',{'TKT-2022-006.md':ticket('TKT-2022-006','2022-01-10','Annual UPS runtime test','UPS-01 27 min, UPS-02 26 min, UPS-03 19 min. Watch UPS-03 at next test.'),'TKT-2022-077.md':ticket('TKT-2022-077','2022-11-29','STORE-02 repeated disk alert','Scan export filled volume to 91%. The operator moved export. Monitoring changed to state transitions with 30-minute recovery window.')},'2022-01-10'),
   '2023':dir('2023',{'TKT-2023-041.md':ticket('TKT-2023-041','2023-04-18','Update Printer-03 Linux driver','Installed Brother 4.1.0. The operator tested invoices, labels and A5 form. Package checksum retained in Downloads for rollback evidence.')},'2023-04-18'),
   '2024':dir('2024',{'TKT-2024-009.md':ticket('TKT-2024-009','2024-01-19','Replace UPS-03 battery','Installed replacement from Nordstrom Power. Runtime test passed at 34 minutes; asset inventory and service card updated.'),'TKT-2024-063.md':ticket('TKT-2024-063','2024-09-30','Printer cost review','Added page counts to printer-audit. Printer-03 remains cheaper to maintain through lease review.')},'2024-01-19'),
   '2025':dir('2025',{'TKT-2025-012.md':ticket('TKT-2025-012','2025-02-12','Replace SW-02','Replaced switch after intermittent port resets. Restored Meeting Room 2 to port 18 and Printer-03 to port 22. Updated network-map.odg.'),'TKT-2025-088.md':ticket('TKT-2025-088','2025-11-06','Quarterly restore test','The inventory operator restored October accounts snapshot to SPARE-04 in 23 minutes, corrected ownership, and Finance opened three samples.')},'2025-02-12'),
   '2026':dir('2026',{'TKT-2026-004.md':ticket('TKT-2026-004','2026-01-12','Annual UPS runtime test','UPS-01 24 min, UPS-02 21 min, UPS-03 29 min. Put UPS-02 on October watch list; no early replacement.'),'TKT-2026-023.md':ticket('TKT-2026-023','2026-03-09','Printer-03 toner warning','Print remains clean. The operator placed unopened black cartridge in labelled cabinet; replace only when quality fades.'),'TKT-2026-071.md':ticket('TKT-2026-071','2026-07-28','Inventory 2.4 duplicate check','Final report contains no duplicate serials. The inventory operator tagged release and saved screenshot to Michael’s desktop for Wednesday review.')},'2026-01-12')
  },'2019-03-06'),
  Photos:dir('Photos',{
   Office:dir('Office',{'2019-03-06_printer03-roller.jpg':file('2019-03-06_printer03-roller.jpg','JPEG reference photograph: Printer-03 pickup roller before cleaning.\n','2019-03-06'),'2020-01-17_ups02-service-card.jpg':file('2020-01-17_ups02-service-card.jpg','JPEG reference photograph: UPS-02 replacement label with the installation date visible.\n','2020-01-17'),'2025-02-12_sw02-before.jpg':file('2025-02-12_sw02-before.jpg','JPEG reference photograph: old SW-02 cabling before replacement, port labels visible.\n','2025-02-12')},'2019-03-06'),
   Workshop:dir('Workshop',{'2022-10-08_spare04-open.jpg':file('2022-10-08_spare04-open.jpg','JPEG photograph: SPARE-04 open on the bench before memory test.\n','2022-10-08')},'2022-10-08')
  },'2019-03-06'),
  Scripts:dir('Scripts',{...safeScripts,'backup.sh':file('backup.sh','#!/bin/sh\nset -eu\n# Manual home-document copy; scheduled office backups use backup-tools.\nstamp=$(date +%Y%m%d-%H%M%S)\ntar -czf "$HOME/Archive/manual/documents-$stamp.tar.gz" -C "$HOME/Documents" .\n','2020-04-20','-rwxr-xr-x'),'cleanup.sh':file('cleanup.sh','#!/bin/sh\nfind "${1:-$HOME/Downloads}" -type f -mtime +90 -print\nprintf "Review only: nothing has been deleted.\\n"\n','2021-01-08','-rwxr-xr-x')},'2020-04-20'),
  Archive:dir('Archive',{
   README:file('README',"Michael's personal archive for older files and finished projects.\n\nYearly folders contain selected working notes. Completed project material is under Projects; reference documents are under Documents. Photos contains an index of technical reference images only, and manual holds manual backup notes.\n\nEmail is kept separately in ~/Mail/.\n",'2026-07-29'),
   '2019':dir('2019',yearlyArchive['2019'],'2019-12-31'),
   '2020':dir('2020',yearlyArchive['2020'],'2020-12-31'),
   '2021':dir('2021',yearlyArchive['2021'],'2021-12-31'),
   '2022':dir('2022',yearlyArchive['2022'],'2022-12-31'),
   '2023':dir('2023',yearlyArchive['2023'],'2023-12-31'),
   '2024':dir('2024',yearlyArchive['2024'],'2024-12-31'),
   Projects:dir('Projects',{'monitoring-v1':dir('monitoring-v1',{'design-notes.md':file('design-notes.md','# Monitoring v1 design notes\n\nThe first version stored previous state in shell-created files. It was easy to inspect but awkward to validate after interruption.\n\nCurrent implementation: ~/Projects/monitoring\n\nKeep these notes for configuration-name lookup only.\n','2022-01-14'),'deprecation.txt':file('deprecation.txt','Deprecated copy.\n\nDo not deploy or update this directory.\nUse ~/Projects/monitoring for current code and operations notes.\nRetain until old configuration references are no longer needed.\n','2022-01-14'),'README-old.md':file('README-old.md','# monitoring v1\n\nArchived in 2022 after alert state moved from shell files to the Python checker. Kept because the STORE-01 deployment still referenced its variable names.\n','2022-01-14'),'README-final.md':file('README-final.md','# Migration note\n\nDo not deploy this copy. Current code is ~/Projects/monitoring. The old config naming is documented for STORE-01 retirement only.\n','2022-01-14')},'2022-01-14')},'2022-01-14'),
   Photos:dir('Photos',{'README':file('README','Binary photo files are not included in this workstation archive view. The active photo directories remain under ~/Photos.\n','2026-07-29')},'2026-07-29'),
   Documents:dir('Documents',{'filesystem-locations.md':file('filesystem-locations.md','# Debian filesystem locations\n\n- `/etc`: system configuration\n- `/var/log`: persistent service logs when configured\n- `/var/lib`: application state\n- `/run`: volatile runtime state\n- `/srv`: locally served data\n- `/usr/local`: locally managed software\n\nCheck the package file list before assuming ownership of a path.\n','2023-05-19'),'logrotate-reference.conf':file('logrotate-reference.conf','# Archived reference only; not an active configuration.\n/var/log/example/*.log {\n    weekly\n    rotate 8\n    compress\n    delaycompress\n    missingok\n    notifempty\n}\n','2024-04-26')},'2023-05-19'),
   manual:dir('manual',{'README':file('README','Manual document archives made before workstation maintenance. Scheduled office snapshots are not stored here.\n','2020-04-20')},'2020-04-20')
  },'2020-04-20'),
  Books:dir('Books',{'reading-list.md':file('reading-list.md','# Reading list\n\n- The Practice of System and Network Administration — incident reviews\n- Debian Administrator’s Handbook — packaging chapters\n- The Linux Programming Interface — process and filesystem chapters\n','2026-06-02')},'2021-02-04'),
  Research:dir('Research',{'filesystem-checks.md':file('filesystem-checks.md','# Filesystem checks\n\nUnmount before an offline filesystem check.\nConfirm the device path from `findmnt` and `lsblk`; labels can be clearer than device ordering.\nFor live systems, inspect kernel messages and SMART data first.\nNever treat a repair command as a diagnostic preview.\n','2025-08-15'),'journald-retention.txt':file('journald-retention.txt','journald retention notes\n\nInspect current usage with `journalctl --disk-usage`.\nEffective limits may come from the main file or drop-ins.\nVacuuming is not a substitute for setting an appropriate limit.\nCheck whether persistent storage is enabled before expecting old boots.\n','2025-09-12'),'automation-boundaries.md':file('automation-boundaries.md','# Automation boundaries\n\nAutomate observation before remediation.\nDefault to dry-run when a command can rename, remove or overwrite.\nMake target selection visible in output.\nReturn a non-zero status for incomplete verification.\nKeep recovery steps usable without the helper.\n','2026-03-20'),weather:dir('weather',{'ws07-format-notes.md':file('ws07-format-notes.md','# WS-07 formats\n\nThe weather group’s pre-2020 exports use semicolons and a dash for missing wind direction. Preserve each source row in weather-parser output.\n','2023-02-03')},'2023-02-03'),storage:dir('storage',{'restore-timings.csv':file('restore-timings.csv','date,target,minutes,result\n2023-11-09,SPARE-04,31,pass\n2024-11-07,SPARE-04,26,pass\n2025-11-06,SPARE-04,23,pass\n','2025-11-06')},'2023-11-09')},'2022-03-21'),
  '.bash_history':file('.bash_history',bash.repeat(3),'2026-07-29'),
  '.profile':file('.profile','# ~/.profile\nPATH="$HOME/Scripts:$HOME/.local/bin:$PATH"\nexport EDITOR=vim\nexport PAGER=less\n','2019-02-11')
 },'2019-02-11');
 return dir('',{etc:dir('etc',{hostname:file('hostname','workstation\n','2024-02-12','-rw-r--r--','root'),'os-release':file('os-release','PRETTY_NAME="Debian GNU/Linux 13 (trixie)"\nNAME="Debian GNU/Linux"\nVERSION_ID="13"\n','2026-07-20','-rw-r--r--','root'),hosts:file('hosts','127.0.0.1 localhost\n127.0.1.1 workstation\n10.24.8.12 monitor-01\n10.24.8.22 store-02\n10.24.8.32 sw-02\n','2025-02-12','-rw-r--r--','root'),passwd:file('passwd','root:x:0:0:root:/root:/bin/bash\nm.weber:x:1000:1000:Michael Weber:/home/m.weber:/bin/bash\n','2019-02-11','-rw-r--r--','root')},'2019-02-11','root'),home:dir('home',{'m.weber':home},'2019-02-11','root'),tmp:dir('tmp',{},'2026-07-29','root'),root:dir('root',{},'2019-02-11','root'),var:dir('var',{log:dir('log',{chesapeake:dir('chesapeake',{'backup-verification.log':file('backup-verification.log','Jul 31 13:26 EDT  scheduled backup verification completed\nJul 31 13:26 EDT  result: OK\n','2026-07-31','-rw-r--r--','root')},'2026-07-31','root'),'kern.log':file('kern.log',kernelLog,'2026-07-31','-rw-r--r--','root')},'2026-07-31','root')},'2019-02-11','root'),srv:dir('srv',{'archive-index':dir('archive-index',{'legacy-sites.tsv':file('legacy-sites.tsv','CMTA-SF-12 | PHYSICAL / PARTIAL DIGITAL | PERMANENT | WFR-04 | FOLDER 12\n','2026-07-31','-rw-r--r--','root')},'2026-07-31','root')},'2026-07-31','root'),usr:dir('usr',{bin:dir('bin',{},'2026-07-20','root')},'2019-02-11','root')},'2019-02-11','root');
}
