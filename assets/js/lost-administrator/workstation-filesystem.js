const STAMP = '2026-07-29T08:14:00.000Z';
const dir = (name, children = {}, owner = 'michael') => ({ name, type:'directory', owner, group:owner, mode:'drwxr-xr-x', children, created:STAMP, modified:STAMP, protected:false });
const file = (name, content = '', mode = '-rw-r--r--', owner = 'michael') => ({ name, type:'file', owner, group:owner, mode, content, created:STAMP, modified:STAMP, protected:false });
const empty = name => dir(name);
const readme = (title, body) => file('README.md', `# ${title}\n\n${body}\n`);
const repository = (name, purpose, source, docs) => dir(name, {
  'README.md': readme(name, `${purpose}\n\n## Working notes\n\nKeep changes small, document assumptions, and test against a copied input first.`),
  src: dir('src', source), docs: dir('docs', { 'operations.md': file('operations.md', docs) }),
  LICENSE: file('LICENSE', 'MIT License\n\nCopyright (c) 2026 Michael Weber\n\nPermission is hereby granted, free of charge, to use, copy, modify, and distribute this software.\n'),
  '.git': dir('.git', { HEAD:file('HEAD','ref: refs/heads/main\n'), config:file('config',`[core]\n\trepositoryformatversion = 0\n\tbare = false\n[remote "origin"]\n\turl = ssh://git.internal/${name}.git\n`) })
});

export function createWorkstationFilesystem() {
  const home = dir('michael', {
    Desktop: dir('Desktop', {
      'TODO.txt': file('TODO.txt', 'Today\n-----\n[ ] Review the inventory export before lunch\n[ ] Call Arthur on the way home\n[ ] Put the Debian handbook back on the shelf\n\nThis week\n---------\n[ ] Test restore notes on the spare disk\n'),
      'Screenshot.png': file('Screenshot.png', '[PNG placeholder]\nCaptured: 2026-07-25 16:42\nSubject: monitoring dashboard layout before the label cleanup\n')
    }),
    Documents: dir('Documents', {
      'workstation-maintenance.md': file('workstation-maintenance.md', '# Workstation maintenance\n\nLast cleaned: 2026-07-12\n\n- SMART report looked normal.\n- Dust filters washed and dried overnight.\n- Keep the old keyboard until the replacement has survived a full week.\n'),
      'meeting-template.md': file('meeting-template.md', '# Meeting\n\nDate:\nAttending:\n\n## Decisions\n\n## Actions\n\n## Questions to carry forward\n')
    }),
    Downloads: dir('Downloads', {
      'Debian Handbook.pdf': file('Debian Handbook.pdf', '[PDF document placeholder]\nThe Debian Administrator’s Handbook\nSaved for offline reference.\n'),
      'RFC notes.txt': file('RFC notes.txt', 'Reading queue\n- RFC 9110: revisit caching terminology\n- RFC 3339: examples for inventory timestamps\n- RFC 5322: mailbox parser edge cases\n'),
      'driver.zip': file('driver.zip', '[ZIP archive placeholder]\nUSB serial adapter driver bundle; retained for the offline laptop.\n'),
      'kernel-links.md': file('kernel-links.md', '# Kernel reading\n\n- Filesystem notification APIs\n- Block-layer error reporting\n- Debian kernel handbook: package lifecycle\n\nSaved here temporarily; move useful notes into Research.\n')
    }),
    Mail: dir('Mail', { Inbox:empty('Inbox'), Sent:empty('Sent'), Drafts:empty('Drafts'), Archive:empty('Archive'), README:file('README','Local mailbox index. Message import will be handled separately; do not mix exported mail with attachments.\n') }),
    Notes: dir('Notes', {
      'shopping.txt': file('shopping.txt', 'oats\ncoffee filters\nbatteries (AA)\nlemons\nsmall envelopes\n'),
      'ideas.md': file('ideas.md', '# Ideas\n\n- Print a one-page recovery checklist and keep it beside the backup disk.\n- Make the weather parser retain the original observation line. Debugging is easier when evidence survives normalization.\n- Ask Emma whether the old scanner would be useful at the community archive.\n'),
      'terminal-cheatsheet.md': file('terminal-cheatsheet.md', '# Terminal reminders\n\n```sh\nfind . -type f -mtime -7\ngrep -Rni "pattern" .\nsha256sum file.iso\n```\n\nPrefer a readable command over a clever one. Future Michael is usually tired.\n'),
      'network-notes.md': file('network-notes.md', '# Network notes\n\nDesk switch ports:\n1. uplink\n2. workstation\n3. spare laptop\n4. test device\n\nThe label on port 3 is fading. Replace it before changing anything else.\n')
    }),
    Projects: dir('Projects', {
      'backup-tools': repository('backup-tools','Small checks around local backup jobs.', { 'verify.py':file('verify.py',`from pathlib import Path\n\ndef newest_snapshot(root: Path) -> Path:\n    snapshots = [p for p in root.iterdir() if p.is_dir()]\n    return max(snapshots, key=lambda p: p.stat().st_mtime)\n`) }, '# Operations\n\nRun verification after the backup window. Never delete a snapshot from this tool.'),
      inventory: repository('inventory','Normalize modest hardware inventories into stable JSON.', { 'inventory.py':file('inventory.py',`import json\nimport platform\n\ndef collect():\n    return {"hostname": platform.node(), "platform": platform.platform()}\n\nprint(json.dumps(collect(), indent=2, sort_keys=True))\n`) }, '# Input policy\n\nPreserve the collected timestamp and source hostname. Unknown values remain null.'),
      monitoring: repository('monitoring','Generate quiet, actionable local service checks.', { 'check.py':file('check.py',`from dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass Result:\n    name: str\n    healthy: bool\n    detail: str = ""\n`) }, '# Alert policy\n\nAn alert must say what was checked, when it changed, and what a human can do next.'),
      'weather-parser': repository('weather-parser','Parse archived station observations without discarding their source text.', { 'parser.py':file('parser.py',`from decimal import Decimal\n\ndef temperature(value: str) -> Decimal | None:\n    text = value.strip()\n    return None if text in {"", "-"} else Decimal(text)\n`) }, '# Samples\n\nKeep a small, anonymized sample for every format variation encountered.')
    }),
    Scripts: dir('Scripts', {
      'backup.sh': file('backup.sh', '#!/bin/sh\nset -eu\nsource_dir="${1:-$HOME/Documents}"\ndestination="${BACKUP_DIR:-$HOME/Archive/manual}"\nstamp=$(date +%Y%m%d-%H%M%S)\nmkdir -p "$destination"\ntar -czf "$destination/documents-$stamp.tar.gz" -C "$source_dir" .\nprintf "created %s\\n" "$destination/documents-$stamp.tar.gz"\n', '-rwxr-xr-x'),
      'inventory.py': file('inventory.py', '#!/usr/bin/env python3\nimport json\nimport platform\nfrom datetime import datetime, timezone\n\nrecord = {"captured_at": datetime.now(timezone.utc).isoformat(), "hostname": platform.node(), "system": platform.system(), "release": platform.release()}\nprint(json.dumps(record, indent=2, sort_keys=True))\n', '-rwxr-xr-x'),
      'hash-check.py': file('hash-check.py', '#!/usr/bin/env python3\nimport hashlib\nimport sys\nfrom pathlib import Path\n\nfor name in sys.argv[1:]:\n    path = Path(name)\n    digest = hashlib.sha256(path.read_bytes()).hexdigest()\n    print(f"{digest}  {path}")\n', '-rwxr-xr-x'),
      'cleanup.sh': file('cleanup.sh', '#!/bin/sh\nset -eu\nfind "${1:-$HOME/Downloads}" -type f -mtime +45 -print\nprintf "Review the list above; this script does not delete automatically.\\n"\n', '-rwxr-xr-x'),
      'rotate-logs.py': file('rotate-logs.py', '#!/usr/bin/env python3\nfrom pathlib import Path\n\ndef candidates(root: Path, limit: int = 5_000_000):\n    return sorted((p for p in root.glob("*.log") if p.stat().st_size > limit), key=lambda p: p.name)\n\nfor path in candidates(Path.home() / "Archive" / "logs"):\n    print(path)\n', '-rwxr-xr-x')
    }),
    Photos: dir('Photos', { Arthur:dir('Arthur',{'README.txt':file('README.txt','Reserved for scanned and dated photographs of Arthur. Originals remain with the family.\n')}), Emma:dir('Emma',{'README.txt':file('README.txt','Sort by year after the next phone import. Ask before sharing any copy.\n')}), Family:dir('Family',{'README.txt':file('README.txt','Family scans; filenames should begin with the best-known date.\n')}), Office:dir('Office',{'README.txt':file('README.txt','Equipment and cable reference photographs only.\n')}) }),
    Emma: dir('Emma', { 'README.txt':file('README.txt','Shared documents for Emma. Keep personal correspondence in Mail, not here.\n') }),
    Arthur: dir('Arthur', { 'README.txt':file('README.txt','Documents and practical notes for Arthur. Photograph scans belong under Photos/Arthur.\n') }),
    Tickets: dir('Tickets', { '2024':empty('2024'), '2025':empty('2025'), '2026':empty('2026'), README:file('README','Ticket exports are grouped by year. Preserve original identifiers when imports begin.\n') }),
    Archive: dir('Archive', { manual:empty('manual'), logs:empty('logs'), README:file('README','Long-term local material. Review checksums before moving anything here.\n') }),
    Books: dir('Books', { 'reading-list.md':file('reading-list.md','# Reading list\n\n- The Practice of System and Network Administration — revisit incident reviews\n- Debian Administrator’s Handbook — packaging chapters\n- A Pattern Language — borrowed from Arthur\n') }),
    Research: dir('Research', { 'README.md':file('README.md','# Research\n\nWorking notes organized by subject. Record sources and dates; distinguish observation from assumption.\n'), protocols:empty('protocols'), storage:empty('storage'), weather:empty('weather') }),
    '.bash_history': file('.bash_history','pwd\nls\ncd Projects/monitoring\ngit status\ncat README.md\ncd ~/Notes\ncat network-notes.md\ncd ~\nfind Scripts -type f\nsha256sum Downloads/driver.zip\n'),
    '.profile': file('.profile','# ~/.profile\nPATH="$HOME/Scripts:$HOME/.local/bin:$PATH"\nexport EDITOR=vim\n')
  });
  return dir('', { etc:dir('etc',{ hostname:file('hostname','workstation\n','-rw-r--r--','root'), 'os-release':file('os-release','PRETTY_NAME="Debian GNU/Linux 13 (trixie)"\nNAME="Debian GNU/Linux"\nVERSION_ID="13"\n','-rw-r--r--','root'), passwd:file('passwd','root:x:0:0:root:/root:/bin/bash\nmichael:x:1000:1000:Michael Weber:/home/michael:/bin/bash\n','-rw-r--r--','root') },'root'), home:dir('home',{michael:home},'root'), tmp:dir('tmp',{},'root'), root:dir('root',{},'root'), var:dir('var',{log:dir('log',{},'root')},'root'), usr:dir('usr',{bin:dir('bin',{},'root')},'root') }, 'root');
}
