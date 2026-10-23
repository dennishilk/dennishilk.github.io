#!/usr/bin/env python3
"""Cthulhu GEM Stack Watch v2, for x86_64 Linux 7.2.11; Python stdlib only.

Standalone extension of cthulhu-gem-watch.py v1. Historical tools stay unchanged.
  --check        Read prerequisites only, no writes or log (also the default).
  --probe-check  Register seven DISABLED probes, validate fields/filters and
                 two private instances, test private stack-option isolation,
                 then remove only owned objects. No enabled events, reader,
                 capture, test ioctl or log file. No game is started.
  --arm          Foreground, at most 30 minutes; Ctrl+C/SIGTERM/SIGHUP clean up.
                 BO ENOENT in vkd3d_queue stops after five seconds.

The seven lifecycle probes and saved ENTRY arguments match v1. A second
private instance enables ONLY the existing close_begin event and records its
userspace stack. The lifecycle instance has userstacktrace=0. Stack options
are written only inside the new private instance, while tracing is disabled;
the global option values are checked before/after, never written or restored.
The additional stack flag sym-addr keeps absolute IPs alongside object names.

Log format: lifecycle trace text is unchanged. Each raw line from the separate
stack instance is prefixed 'STACK\t'; strip this prefix to recover that stream.
Stack records have their own timestamp/CPU/TID. A userspace stack is NOT joined
to a close by global line adjacency. Match CPU/TID/time and inspect intervening
records and loss counters. Stack headers/frames are counted separately; per-CPU
read events count records, not the multiple printed lines in a stack record.
The kprobe hit counters are system-wide, not a count of game-only submissions.

On the first observed RHIThread close, and again on a queue BO ENOENT, attempt
a bounded /proc/Tgid/maps snapshot with process start-time identity. Executable
file mappings are inspected through /proc/Tgid/map_files for GNU ELF build IDs
when permitted. Missing maps/build IDs are recorded, never invented. No command
line, arbitrary memory, device memory, credentials or symbols are dumped.
sym-userobj resolves at read time and can miss an exited process. Its printed
offset is relative to the VMA start, NOT automatically an ELF module offset;
absolute IPs, maps file offsets and ELF load segments are needed for resolution.
The x86 kernel walker follows frame pointers and may return only a short stack,
especially across Wine/PE code. Even a complete Release stack alone cannot
assign blame or establish which generation of a reused handle was intended.

All probes are system-wide; filtering does not eliminate probe-hit overhead.
Instrumentation and stack walking can change timing. No performance bound or
game stability is established by simulations or --probe-check. The mode-0600
sudo-user-owned log includes kernel/userspace addresses, paths and task IDs.
Raw text is capped at 128 MiB; metadata at 16 MiB, map snapshots at 1 MiB each
and eight attempts total. A reached raw/metadata cap stops as incomplete.
Buffers: 256 KiB per CPU for lifecycle, 512 KiB per CPU for close stacks.
SIGKILL/full hardlock prevents cleanup; reboot clears these volatile probes.

No installation, mounts, persistent configuration, DRM ioctl or game settings
are changed. --probe-check is NOT an active capture. --arm enables only the
owned temporary instances. Source/simulation validation is not live validation.

Sources:
https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/drm_gem.c
https://github.com/gregkh/linux/blob/v7.2.11/kernel/trace/trace_kprobe.c
https://github.com/gregkh/linux/blob/v7.2.11/kernel/trace/trace_probe.c
https://github.com/gregkh/linux/blob/v7.2.11/kernel/trace/trace.c
https://github.com/gregkh/linux/blob/v7.2.11/kernel/trace/trace_output.c
https://github.com/gregkh/linux/blob/v7.2.11/arch/x86/kernel/stacktrace.c
"""

import argparse
import collections
import datetime
import hashlib
import json
import os
from pathlib import Path
import platform
import pwd
import re
import secrets
import signal
import sys
import struct
import stat
import time


VERSION = 2
MAX_RAW_BYTES = 128 * 1024 * 1024
MAX_META_BYTES = 16 * 1024 * 1024
TRACE_ROOTS = (Path('/sys/kernel/tracing'), Path('/sys/kernel/debug/tracing'))

# key, symbol, module, kind, fetch expressions, field types, event filter.
PROBES = (
    ('lookup', 'drm_gem_object_lookup', None, 'r256',
     'ctx=$arg1:x64 handle=$arg2:u32 obj=$retval:x64',
     {'ctx': 'x64', 'handle': 'u32', 'obj': 'x64'}, 'obj == 0'),
    ('create', 'drm_gem_handle_create_tail', None, 'r256',
     'ctx=$arg1:x64 obj=$arg2:x64 handle=+0($arg3):u32 ret=$retval:s32',
     {'ctx': 'x64', 'obj': 'x64', 'handle': 'u32', 'ret': 's32'}, 'ret == 0'),
    ('close_begin', 'drm_gem_handle_delete', None, 'p',
     'ctx=$arg1:x64 handle=$arg2:u32',
     {'ctx': 'x64', 'handle': 'u32'}, None),
    ('close_done', 'drm_gem_handle_delete', None, 'r256',
     'ctx=$arg1:x64 handle=$arg2:u32 ret=$retval:s32',
     {'ctx': 'x64', 'handle': 'u32', 'ret': 's32'}, None),
    ('release', 'drm_gem_release', None, 'p', 'ctx=$arg2:x64',
     {'ctx': 'x64'}, None),
    ('bo', 'amdgpu_bo_list_create', 'amdgpu', 'r256',
     'ctx=$arg2:x64 entries=$arg4:u64 ret=$retval:s32',
     {'ctx': 'x64', 'entries': 'u64', 'ret': 's32'}, 'ret == -2'),
    ('cs', 'amdgpu_cs_ioctl', 'amdgpu', 'r256',
     'ctx=$arg3:x64 ret=$retval:s32',
     {'ctx': 'x64', 'ret': 's32'}, 'ret == -2'),
)
SPEC = {row[0]: row for row in PROBES}


class CaptureLimit(RuntimeError):
    pass


def parse_functions(text):
    result = {}
    for line in text.splitlines():
        words = line.split()
        if words:
            result[words[0]] = words[1].strip('[]') if len(words) > 1 else None
    return result


def preflight(roots=TRACE_ROOTS, release=None, machine=None):
    release = platform.release() if release is None else release
    machine = platform.machine() if machine is None else machine
    if not re.fullmatch(r'7\.2\.11(?:[-+].*)?', release) or machine != 'x86_64':
        raise RuntimeError('Geprueft ist x86_64 Linux 7.2.11; gefunden: ' + machine + ' ' + release)
    root = next((p for p in roots if (p / 'available_filter_functions').is_file()), None)
    if root is None:
        raise RuntimeError('Keine bereits verfuegbare tracefs-Schnittstelle gefunden.')
    available = parse_functions((root / 'available_filter_functions').read_text())
    for _, function, module, *_ in PROBES:
        if function not in available or available[function] != module:
            raise RuntimeError('Funktion oder Modulzuordnung fehlt/abweichend: ' + function)
    for filename in ('kprobe_events', 'kprobe_profile', 'trace_clock'):
        if not (root / filename).is_file():
            raise RuntimeError('Erforderliche Schnittstelle fehlt: ' + filename)
    if not (root / 'instances').is_dir():
        raise RuntimeError('Private Trace-Instanzen fehlen.')
    clocks = (root / 'trace_clock').read_text().replace('[', '').replace(']', '').split()
    if 'mono' not in clocks:
        raise RuntimeError('Der benoetigte mono-Trace-Zeitgeber fehlt.')
    return root


def read_optional(path):
    try:
        return path.read_text().strip()
    except OSError as exc:
        return 'nicht lesbar: ' + str(exc)


def clock_sample():
    before = time.monotonic_ns()
    raw = time.clock_gettime_ns(time.CLOCK_MONOTONIC_RAW) if hasattr(time, 'CLOCK_MONOTONIC_RAW') else None
    realtime = time.time_ns()
    return {'mono_before_ns': before, 'mono_raw_ns': raw,
            'realtime_ns': realtime, 'mono_after_ns': time.monotonic_ns(),
            'note': 'Clock sample only; the Wine logging clock has not been identified here.'}


def task_identity(tid):
    try:
        text = (Path('/proc') / str(tid) / 'status').read_text()
        wanted = {'Name', 'Tgid', 'Pid', 'PPid'}
        return {k: v.strip() for k, v in (line.split(':', 1) for line in text.splitlines() if ':' in line)
                if k in wanted}
    except OSError as exc:
        return {'unavailable': str(exc)}


class MemoryLog:
    """Registration check: deliberately no file and no trace reader."""
    def __init__(self):
        self.items = []

    def meta(self, kind, data):
        self.items.append((kind, data))

    def line(self, line):
        raise RuntimeError('Der Registrierungstest darf keine Trace-Daten lesen.')

    def close(self):
        pass


class Log:
    def __init__(self, path, uid, gid):
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
        try:
            os.fchown(fd, uid, gid)
            os.fchmod(fd, 0o600)
            self.file = os.fdopen(fd, 'w', encoding='utf-8', buffering=1)
        except BaseException:
            os.close(fd)
            raise
        self.raw_bytes = self.meta_bytes = 0

    def meta(self, kind, data):
        text = '# ' + json.dumps({'kind': kind, 'data': data}, ensure_ascii=True) + '\n'
        size = len(text.encode('utf-8'))
        if self.meta_bytes + size > MAX_META_BYTES:
            raise CaptureLimit('Metadatenlimit erreicht; Aufnahme unvollstaendig.')
        self.file.write(text)
        self.meta_bytes += size

    def line(self, line):
        text = line + '\n'
        size = len(text.encode('utf-8'))
        if self.raw_bytes + size > MAX_RAW_BYTES:
            raise CaptureLimit('128-MiB-Datenlimit erreicht; Aufnahme unvollstaendig.')
        self.file.write(text)
        self.raw_bytes += size

    def close(self):
        try:
            self.file.flush()
            os.fsync(self.file.fileno())
        finally:
            self.file.close()


def validate_format(text, fields):
    for name, kind in fields.items():
        size = int(kind[1:]) // 8
        signed = int(kind.startswith('s'))
        pattern = (r'field:[^;\n]*\b' + re.escape(name) + r';\s*offset:\d+;\s*size:'
                   + str(size) + r';\s*signed:' + str(signed) + r';')
        if not re.search(pattern, text):
            raise RuntimeError('Abweichendes Trace-Feld: ' + name + ' erwartet ' + kind)


class LifecycleSession:
    def __init__(self, root, log, group=None):
        self.root, self.log = root, log
        self.group = group or ('cthulhu_gem_' + str(os.getpid()) + '_' + secrets.token_hex(4))
        if not re.fullmatch(r'cthulhu_gem_[A-Za-z0-9_]+', self.group):
            raise ValueError('Ungueltiger eigener Trace-Name')
        self.instance = root / 'instances' / self.group
        self.created_instance = False
        self.created_names = []
        self.fd = None
        self.pending = ''
        self.counts = collections.Counter()
        self.seen_tasks = set()
        self.stop_deadline = None
        self.event_pattern = re.compile(r'\b' + re.escape(self.group) + r'_(\w+):\s*')
        self.header_pattern = re.compile(
            r'^\s*(?P<comm>.+)-(?P<tid>\d+)\s+(?:\(\s*[\d-]+\s*\)\s+)?'
            r'\[(?P<cpu>\d+)\]\s+.*?(?P<stamp>\d+\.\d+):\s*$')

    def control(self, path, text):
        path.write_text(text + '\n', encoding='ascii')

    def probe_command(self, command):
        fd = os.open(self.root / 'kprobe_events', os.O_WRONLY | os.O_APPEND | os.O_CLOEXEC)
        try:
            data = (command + '\n').encode('ascii')
            if os.write(fd, data) != len(data):
                raise OSError('Unvollstaendiger Schreibvorgang an kprobe_events')
        finally:
            os.close(fd)

    def prepare(self):
        if (self.root / 'events' / self.group).exists():
            raise RuntimeError('Eigene Gruppe existiert bereits; nichts veraendert.')
        self.instance.mkdir()  # Fail rather than adopt an existing instance.
        self.created_instance = True
        self.control(self.instance / 'tracing_on', '0')
        self.control(self.instance / 'events/enable', '0')
        tracer = self.instance / 'current_tracer'
        if tracer.exists() and tracer.read_text().strip() != 'nop':
            raise RuntimeError('Unerwarteter Tracer in der neuen privaten Instanz.')
        self.control(self.instance / 'buffer_size_kb', '256')
        self.control(self.instance / 'trace_clock', 'mono')
        for key, function, module, kind, fetch, fields, filter_text in PROBES:
            name = self.group + '_' + key
            symbol = (module + ':' if module else '') + function
            definition = kind + ':' + self.group + '/' + name + ' ' + symbol + ' ' + fetch
            self.probe_command(definition)
            self.created_names.append(name)
            event = self.instance / 'events' / self.group / name
            self.control(event / 'enable', '0')
            validate_format((event / 'format').read_text(), fields)
            if filter_text is not None:
                self.control(event / 'filter', filter_text)
            elif (event / 'filter').read_text().strip() not in ('none', '0', ''):
                raise RuntimeError('Unerwarteter Filter an neuer Probe: ' + name)
            self.log.meta('probe', {'key': key, 'definition': definition,
                                   'filter': (event / 'filter').read_text().strip()})

    def start(self):
        if len(self.created_names) != len(PROBES):
            raise RuntimeError('Messpunkte sind nicht vollstaendig vorbereitet.')
        self.fd = os.open(self.instance / 'trace_pipe', os.O_RDONLY | os.O_NONBLOCK | os.O_CLOEXEC)
        for name in self.created_names:
            self.control(self.instance / 'events' / self.group / name / 'enable', '1')
        self.log.meta('capture_start_clock', clock_sample())
        self.control(self.instance / 'tracing_on', '1')

    def record(self, line):
        self.log.line(line)
        event = self.event_pattern.search(line)
        if not event:
            if 'LOST' in line:
                print('HINWEIS: Trace meldet verlorene Ereignisse; Log aufbewahren.', flush=True)
            return
        key = event.group(1)
        header = self.header_pattern.match(line[:event.start()])
        if key not in SPEC or header is None:
            raise RuntimeError('Eigenes Trace-Ereignis nicht eindeutig lesbar; Aufnahme gestoppt.')
        types = SPEC[key][5]
        tokens = dict(re.findall(r'\b(\w+)=([^\s]+)', line[event.end():]))
        values = {}
        for name, kind in types.items():
            token = tokens.get(name, '')
            try:
                if token.lower().startswith(('0x', '-0x')):
                    value = int(token, 16)
                else:
                    value = int(token, 16 if kind.startswith('x') else 10)
            except ValueError:
                raise RuntimeError('Trace-Argument nicht auswertbar: ' + key + '.' + name + '=' + token)
            bits = int(kind[1:])
            low = -(1 << (bits - 1)) if kind.startswith('s') else 0
            high = (1 << (bits - 1)) - 1 if kind.startswith('s') else (1 << bits) - 1
            if not low <= value <= high:
                raise RuntimeError('Trace-Argument ausserhalb des erwarteten Typs: ' + name)
            values[name] = value
        if values['ctx'] == 0:
            raise RuntimeError('Null-DRM-Kontext: Argumenterfassung nicht plausibel; Aufnahme gestoppt.')
        if key == 'create' and (values['handle'] == 0 or values['obj'] == 0 or values['ret'] != 0):
            raise RuntimeError('Unplausibles erfolgreiches Create-Ereignis; Aufnahme gestoppt.')
        if (key == 'lookup' and values['obj'] != 0) or (key in ('bo', 'cs') and values['ret'] != -2):
            raise RuntimeError('Ereignis passt nicht zum gesetzten Filter; Aufnahme gestoppt.')
        if key == 'bo' and values['entries'] == 0:
            raise RuntimeError('ENOENT mit leerer BO-Liste ist nicht plausibel; Aufnahme gestoppt.')
        tid = int(header.group('tid'))
        self.counts[key] += 1
        if tid not in self.seen_tasks:
            self.seen_tasks.add(tid)
            self.log.meta('task', {'tid': tid, 'status': task_identity(tid)})
        if key in ('lookup', 'bo', 'cs'):
            print(line.strip(), flush=True)
        if key == 'bo' and header.group('comm').strip() == 'vkd3d_queue' and self.stop_deadline is None:
            self.stop_deadline = time.monotonic() + 5.0
            print('BO-ENOENT in vkd3d_queue erfasst; automatische Beendigung in 5 Sekunden.', flush=True)

    def consume(self, chunk):
        self.pending += chunk.decode('utf-8', errors='replace')
        lines = self.pending.split('\n')
        self.pending = lines.pop()
        if len(self.pending) > 256 * 1024:
            raise RuntimeError('Unerwartet lange unvollstaendige Trace-Zeile.')
        for line in lines:
            self.record(line)

    def poll(self):
        try:
            chunk = os.read(self.fd, 65536)
        except BlockingIOError:
            return False
        if chunk:
            self.consume(chunk)
            return True
        return False

    def cleanup(self):
        errors = []
        def attempt(label, action):
            try:
                action()
            except Exception as exc:
                errors.append(label + ': ' + str(exc))
        if self.created_instance:
            attempt('eigene Aufnahme stoppen', lambda: self.control(self.instance / 'tracing_on', '0'))
            for name in self.created_names:
                path = self.instance / 'events' / self.group / name / 'enable'
                if path.exists():
                    attempt('eigene Probe deaktivieren', lambda p=path: self.control(p, '0'))
        if self.fd is not None:
            for _ in range(256):
                try:
                    if not self.poll():
                        break
                except Exception as exc:
                    errors.append('Restdaten: ' + str(exc))
                    break
            attempt('eigenen Reader schliessen', lambda: os.close(self.fd))
            self.fd = None
        if self.pending:
            attempt('letzte Textzeile sichern', lambda: self.log.line(self.pending))
            self.pending = ''
        if self.created_instance:
            profile = read_optional(self.root / 'kprobe_profile')
            own_profile = [line for line in profile.splitlines()
                           if line.split() and line.split()[0].rsplit('/', 1)[-1] in self.created_names]
            attempt('Probenstatistik sichern', lambda: self.log.meta('kprobe_profile', own_profile or {'unavailable_or_empty': profile}))
            stats = {p.parent.name: read_optional(p) for p in sorted((self.instance / 'per_cpu').glob('cpu*/stats'))}
            attempt('Pufferstatistik sichern', lambda: self.log.meta('buffer_stats', stats))
            attempt('private Instanz entfernen', self.instance.rmdir)
        for name in reversed(self.created_names):
            if (self.root / 'events' / self.group / name).exists():
                attempt('eigene Probe entfernen ' + name,
                        lambda n=name: self.probe_command('-:' + self.group + '/' + n))
        attempt('Enddaten sichern', lambda: self.log.meta('end', {'clock': clock_sample(), 'counts': dict(self.counts)}))
        attempt('Aufraeumstatus sichern', lambda: self.log.meta('cleanup', {'group': self.group, 'errors': list(errors)}))
        return errors


STACK_OPTIONS = ('userstacktrace', 'sym-userobj', 'sym-addr')
MAX_MAP_BYTES = 1024 * 1024
MAX_MAP_ATTEMPTS = 8


def option_values(instance):
    values = {}
    for option in STACK_OPTIONS:
        value = (instance / 'options' / option).read_text().strip()
        if value not in ('0', '1'):
            raise RuntimeError('Unerwarteter Optionswert: ' + option + '=' + value)
        values[option] = value
    return values


_lifecycle_preflight = preflight


def preflight(roots=TRACE_ROOTS, release=None, machine=None):
    root = _lifecycle_preflight(roots, release, machine)
    option_values(root)
    return root


def elf_build_id(fd):
    """Bounded ELF64 little-endian PT_NOTE reader; no symbol installation."""
    if not stat.S_ISREG(os.fstat(fd).st_mode):
        return {'status': 'not_regular'}
    header = os.pread(fd, 64, 0)
    if header[:6] != b'\x7fELF\x02\x01' or len(header) != 64:
        return {'status': 'not_elf64_le'}
    phoff = struct.unpack_from('<Q', header, 32)[0]
    entsize, count = struct.unpack_from('<HH', header, 54)
    if entsize < 56 or entsize > 256 or count > 1024 or phoff > 16 * 1024 * 1024:
        return {'status': 'unsupported_program_headers'}
    notes_read = 0
    for index in range(count):
        ph = os.pread(fd, 56, phoff + index * entsize)
        if len(ph) != 56:
            return {'status': 'truncated_program_header'}
        if struct.unpack_from('<I', ph)[0] != 4:
            continue
        offset = struct.unpack_from('<Q', ph, 8)[0]
        size = struct.unpack_from('<Q', ph, 32)[0]
        if size > 256 * 1024 or notes_read + size > 1024 * 1024:
            return {'status': 'note_read_limit'}
        notes_read += size
        block = os.pread(fd, size, offset)
        if len(block) != size:
            return {'status': 'truncated_note'}
        pos = 0
        while pos + 12 <= len(block):
            namesize, descsize, kind = struct.unpack_from('<III', block, pos)
            pos += 12
            name_end = pos + namesize
            desc_start = pos + ((namesize + 3) & ~3)
            desc_end = desc_start + descsize
            next_pos = desc_start + ((descsize + 3) & ~3)
            if name_end > len(block) or desc_end > len(block) or next_pos > len(block):
                return {'status': 'malformed_note'}
            if block[pos:name_end] == b'GNU\0' and kind == 3 and 0 < descsize <= 64:
                return {'status': 'ok', 'gnu_build_id': block[desc_start:desc_end].hex()}
            pos = next_pos
    return {'status': 'no_gnu_build_id'}


class TraceSession(LifecycleSession):
    def __init__(self, root, log, group=None):
        if group is None:
            group = 'cthulhu_gem_stack_' + str(os.getpid()) + '_' + secrets.token_hex(4)
        super().__init__(root, log, group)
        self.stack_instance = root / 'instances' / (self.group + '_ustack')
        self.created_stack_instance = False
        self.stack_fd = None
        self.stack_pending = ''
        self.stack_counts = collections.Counter()
        self.global_before = None
        self.map_attempts = 0
        self.map_reasons = set()
        self.map_close_tids = set()
        self.elf_seen = set()

    def assert_global_unchanged(self):
        actual = option_values(self.root)
        if actual != self.global_before:
            self.log.meta('global_options_changed', {'before': self.global_before, 'now': actual})
            raise RuntimeError('Globale Stack-Optionen haben sich geaendert; eigene Messung wird beendet.')
        return actual

    def set_private_option(self, instance, option, value):
        target = instance / 'options' / option
        global_file = self.root / 'options' / option
        if target.samefile(global_file):
            raise RuntimeError('Optionsdatei ist nicht von der globalen Instanz getrennt: ' + option)
        self.control(target, value)
        if target.read_text().strip() != value:
            raise RuntimeError('Private Option wurde nicht angenommen: ' + option)
        self.assert_global_unchanged()

    def prepare(self):
        if self.stack_instance.exists():
            raise RuntimeError('Stack-Instanz existiert bereits; nichts uebernommen.')
        self.global_before = option_values(self.root)
        super().prepare()
        self.stack_instance.mkdir()
        self.created_stack_instance = True
        self.control(self.stack_instance / 'tracing_on', '0')
        self.control(self.stack_instance / 'events/enable', '0')
        tracer = self.stack_instance / 'current_tracer'
        if tracer.exists() and tracer.read_text().strip() != 'nop':
            raise RuntimeError('Unerwarteter Tracer in privater Stack-Instanz.')
        self.control(self.stack_instance / 'buffer_size_kb', '512')
        self.control(self.stack_instance / 'trace_clock', 'mono')
        option_values(self.instance)
        option_values(self.stack_instance)
        self.set_private_option(self.instance, 'userstacktrace', '0')
        for option in STACK_OPTIONS:
            self.set_private_option(self.stack_instance, option, '1')
            if (self.instance / 'options/userstacktrace').read_text().strip() != '0':
                raise RuntimeError('Lifecycle-Instanz hat unerwartet Stack-Aufzeichnung aktiviert.')
        event = self.stack_instance / 'events' / self.group / (self.group + '_close_begin')
        self.control(event / 'enable', '0')
        validate_format((event / 'format').read_text(), SPEC['close_begin'][5])
        if (event / 'filter').read_text().strip() not in ('none', '0', ''):
            raise RuntimeError('Unerwarteter Filter in privater Stack-Instanz.')
        self.log.meta('stack_setup', {'instance': str(self.stack_instance),
            'only_event': self.group + '_close_begin', 'raw_line_prefix': 'STACK\t',
            'global_before': self.global_before, 'global_now': self.assert_global_unchanged(),
            'lifecycle_options': option_values(self.instance),
            'stack_options': option_values(self.stack_instance),
            'stack_unwind': 'x86 user frame pointers; no complete unwind guaranteed',
            'symbol_offsets': 'VMA-relative at trace read time, not ELF module offsets'})

    def start(self):
        self.assert_global_unchanged()
        self.stack_fd = os.open(self.stack_instance / 'trace_pipe', os.O_RDONLY | os.O_NONBLOCK | os.O_CLOEXEC)
        event = self.stack_instance / 'events' / self.group / (self.group + '_close_begin')
        self.control(event / 'enable', '1')
        self.control(self.stack_instance / 'tracing_on', '1')
        self.log.meta('stack_capture_start_clock', clock_sample())
        super().start()

    def snapshot_maps(self, tid, reason):
        identity = task_identity(tid)
        try:
            tgid = int(identity.get('Tgid', ''))
        except (TypeError, ValueError):
            self.log.meta('maps_unavailable', {'tid': tid, 'reason': reason, 'status': identity})
            return
        # Include starttime, so a recycled numeric PID is not a process identity.
        proc = Path('/proc') / str(tgid)
        try:
            proc_stat = (proc / 'stat').read_text()
            starttime = proc_stat[proc_stat.rindex(')') + 2:].split()[19]
        except (OSError, ValueError, IndexError) as exc:
            self.log.meta('maps_unavailable', {'tid': tid, 'tgid': tgid, 'reason': reason, 'error': str(exc)})
            return
        marker = (tgid, starttime, reason)
        if marker in self.map_reasons:
            return
        self.map_reasons.add(marker)
        if self.map_attempts >= MAX_MAP_ATTEMPTS:
            self.log.meta('maps_attempt_limit', {'tid': tid, 'tgid': tgid, 'reason': reason})
            return
        self.map_attempts += 1
        snapshot = {'tid': tid, 'tgid': tgid, 'starttime_ticks': starttime,
                    'reason': reason, 'clock': clock_sample()}
        try:
            with (proc / 'maps').open('rb') as stream:
                data = stream.read(MAX_MAP_BYTES + 1)
            snapshot.update(text=data[:MAX_MAP_BYTES].decode('utf-8', 'replace'),
                            truncated=len(data) > MAX_MAP_BYTES,
                            sha256=hashlib.sha256(data[:MAX_MAP_BYTES]).hexdigest())
        except OSError as exc:
            snapshot['error'] = str(exc)
            self.log.meta('maps_snapshot', snapshot)
            return
        self.log.meta('maps_snapshot', snapshot)
        modules = []
        for line in snapshot['text'].splitlines():
            fields = line.split(None, 5)
            if len(fields) < 6 or 'x' not in fields[1] or not fields[5].startswith('/'):
                continue
            key = (tgid, starttime, fields[3], fields[4])
            if key in self.elf_seen:
                continue
            if len(modules) >= 64:
                modules.append({'status': 'snapshot_module_limit'})
                break
            self.elf_seen.add(key)
            module = {'mapping': fields[0], 'file_offset': fields[2], 'dev': fields[3],
                      'inode': fields[4], 'path': fields[5]}
            try:
                fd = os.open(proc / 'map_files' / fields[0], os.O_RDONLY | os.O_CLOEXEC | os.O_NONBLOCK)
                try:
                    info = os.fstat(fd)
                    module.update(mapped_file_dev=info.st_dev, mapped_file_inode=info.st_ino,
                                  elf=elf_build_id(fd))
                finally:
                    os.close(fd)
            except (OSError, OverflowError, ValueError, struct.error) as exc:
                module['unavailable'] = str(exc)
            modules.append(module)
        self.log.meta('mapped_elf_build_ids', {'tgid': tgid, 'starttime_ticks': starttime,
                                             'reason': reason, 'modules': modules})

    def record(self, line):
        super().record(line)
        event = self.event_pattern.search(line)
        if event is None:
            return
        header = self.header_pattern.match(line[:event.start()])
        key = event.group(1)
        comm = header.group('comm').strip()
        if key == 'close_begin' and comm == 'RHIThread' and header.group('tid') not in self.map_close_tids:
            self.map_close_tids.add(header.group('tid'))
            self.snapshot_maps(int(header.group('tid')), 'first_RHIThread_close')
        elif key == 'bo' and comm == 'vkd3d_queue':
            self.snapshot_maps(int(header.group('tid')), 'BO_ENOENT')

    def consume_stack(self, chunk):
        self.stack_pending += chunk.decode('utf-8', 'replace')
        lines = self.stack_pending.split('\n')
        self.stack_pending = lines.pop()
        if len(self.stack_pending) > 256 * 1024:
            raise RuntimeError('Unerwartet lange unvollstaendige Stack-Zeile.')
        for line in lines:
            self.log.line('STACK\t' + line)
            event = self.event_pattern.search(line)
            if event:
                if event.group(1) != 'close_begin' or self.header_pattern.match(line[:event.start()]) is None:
                    raise RuntimeError('Unerwartetes Ereignis in der Close-Stack-Instanz.')
                self.stack_counts['close_begin'] += 1
            elif '<user stack trace>' in line:
                self.stack_counts['user_stack_records'] += 1
            elif line.lstrip().startswith('=>'):
                self.stack_counts['frame_lines'] += 1
            elif 'LOST' in line:
                self.stack_counts['lost_notifications'] += 1

    def poll_stack(self):
        if self.stack_fd is None:
            return False
        try:
            chunk = os.read(self.stack_fd, 65536)
        except BlockingIOError:
            return False
        if chunk:
            self.consume_stack(chunk)
            return True
        return False

    def poll(self):
        lifecycle = super().poll()
        stack = self.poll_stack()
        return lifecycle or stack

    def cleanup(self):
        errors = []
        def attempt(label, action):
            try:
                action()
            except Exception as exc:
                errors.append(label + ': ' + str(exc))
        if self.created_instance:
            attempt('Lifecycle stoppen', lambda: self.control(self.instance / 'tracing_on', '0'))
        if self.created_stack_instance:
            attempt('Stack stoppen', lambda: self.control(self.stack_instance / 'tracing_on', '0'))
            event = self.stack_instance / 'events' / self.group / (self.group + '_close_begin') / 'enable'
            if event.exists():
                attempt('Stack-Ereignis deaktivieren', lambda: self.control(event, '0'))
        if self.stack_fd is not None:
            def drain():
                for _ in range(2048):
                    if not self.poll_stack():
                        return
                raise RuntimeError('Stack-Restdatenlimit; Aufnahme moeglicherweise unvollstaendig.')
            attempt('Stack-Restdaten', drain)
            attempt('Stack-Reader schliessen', lambda: os.close(self.stack_fd))
            self.stack_fd = None
        if self.stack_pending:
            attempt('letzte Stack-Zeile', lambda: self.log.line('STACK\t' + self.stack_pending))
            self.stack_pending = ''
        if self.created_stack_instance:
            stats = {p.parent.name: read_optional(p) for p in sorted((self.stack_instance / 'per_cpu').glob('cpu*/stats'))}
            attempt('Stack-Statistik', lambda: self.log.meta('stack_buffer_stats', stats))
            attempt('Stack-Instanz entfernen', self.stack_instance.rmdir)
        errors.extend(super().cleanup())
        if self.global_before is not None:
            attempt('globale Optionen vergleichen', self.assert_global_unchanged)
        attempt('Stack-Abschluss', lambda: self.log.meta('stack_end', {'counts': dict(self.stack_counts),
            'global_before': self.global_before, 'global_after': option_values(self.root),
            'map_attempts': self.map_attempts, 'errors': list(errors)}))
        return errors

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--check', action='store_true', help='Nur lesende Voraussetzungenpruefung (Standard)')
    modes.add_argument('--probe-check', action='store_true', help='Deaktivierte Proben registrieren/pruefen/entfernen, ohne Messung')
    modes.add_argument('--arm', action='store_true', help='Zeitlich begrenzte temporaere Messung aktivieren')
    parser.add_argument('--minutes', type=float, default=30.0, help='Maximaldauer 1 bis 120 Minuten, Standard 30')
    args = parser.parse_args(argv)
    if not 1 <= args.minutes <= 120:
        parser.error('--minutes muss zwischen 1 und 120 liegen')
    if os.geteuid() != 0:
        parser.error('Bitte mit sudo python3 -B starten.')
    try:
        root = preflight()
    except (OSError, RuntimeError) as exc:
        print('PRUEFUNG NICHT ERFOLGREICH: ' + str(exc), file=sys.stderr)
        return 1
    print('Cthulhu GEM Stack Watch v' + str(VERSION))
    print('Kernel: ' + platform.release() + '; Tracefs: ' + str(root))
    print('Alle sieben Messpunktdefinitionen haben ihre benoetigten Funktionen verfuegbar.')
    if not args.arm and not args.probe_check:
        print('PRUEFUNG FERTIG. Nichts registriert, keine Datei angelegt.')
        return 0
    path = None
    if args.probe_check:
        log = MemoryLog()
    else:
        uid = int(os.environ.get('SUDO_UID', str(os.getuid())) )
        account = pwd.getpwuid(uid)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        path = Path(account.pw_dir) / ('cthulhu-gem-stack-watch-' + stamp + '-' + str(os.getpid()) + '.log')
        try:
            log = Log(path, uid, account.pw_gid)
        except OSError as exc:
            print('Protokoll konnte nicht exklusiv angelegt werden: ' + str(exc), file=sys.stderr)
            return 1
    session = TraceSession(root, log)
    stopped = False
    def stop(signum, frame):
        nonlocal stopped
        stopped = True
    old_handlers = {sig: signal.signal(sig, stop) for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP)}
    status = 0
    try:
        if args.arm:
            log.meta('start', {'version': VERSION, 'kernel': platform.release(),
                     'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                     'boot_id': read_optional(Path('/proc/sys/kernel/random/boot_id')),
                     'minutes': args.minutes, 'group': session.group, 'trace_clock': 'mono',
                     'raw_limit_bytes': MAX_RAW_BYTES, 'clock': clock_sample(),
                     'global_tracer': read_optional(root / 'current_tracer'),
                     'global_tracing_on': read_optional(root / 'tracing_on'),
                     'firmware': read_optional(Path('/sys/kernel/debug/dri/0000:55:00.0/amdgpu_firmware_info'))})
        session.prepare()
        if args.probe_check:
            print('REGISTRIERUNG OK: 7 deaktivierte Proben; 2 private Instanzen; Stack-Optionen isoliert.')
        elif not stopped:
            session.start()
            print('\nMESSUNG AKTIV. Protokoll: ' + str(path), flush=True)
            print('Lifecycle und Close-Stacks stehen im Log; Fehler auch hier. Strg+C beendet die Messung.', flush=True)
            print('Maximal ' + str(args.minutes) + ' Minuten; BO-ENOENT in vkd3d_queue beendet nach 5 Sekunden.', flush=True)
            print('Instrumentation kann Timing aendern. Gewohnte Nutzung, keinen Hardlock erzwingen.', flush=True)
            deadline = time.monotonic() + args.minutes * 60
            heartbeat = time.monotonic() + 30
            while not stopped:
                for _ in range(8):
                    if not session.poll():
                        break
                now = time.monotonic()
                if now >= deadline or (session.stop_deadline is not None and now >= session.stop_deadline):
                    break
                if now >= heartbeat:
                    print('Messung laeuft: ' + json.dumps(dict(session.counts), sort_keys=True), flush=True)
                    heartbeat = now + 30
                time.sleep(0.1)
    except (OSError, RuntimeError, ValueError) as exc:
        status = 1
        try:
            log.meta('error', str(exc))
        except Exception:
            pass
        print('MESSUNG/PRUEFUNG ABGEBROCHEN: ' + str(exc), file=sys.stderr, flush=True)
    finally:
        errors = session.cleanup()
        for sig, old in old_handlers.items():
            signal.signal(sig, old)
        try:
            log.close()
        except OSError as exc:
            errors.append('Log abschliessen: ' + str(exc))
        if path is not None:
            print('Protokoll: ' + str(path), flush=True)
        if errors:
            status = 1
            print('ENDE MIT FEHLERN; Details und Gruppe aufbewahren: ' + session.group, file=sys.stderr)
            for error in errors:
                print('  ' + error, file=sys.stderr)
        else:
            print('Eigene Trace-Instanzen und registrierte Messpunkte entfernt.', flush=True)
            if args.probe_check and status == 0:
                print('REGISTRIERUNGSPRUEFUNG FERTIG. Keine Messung aktiviert, keine Datei angelegt.')
    return status


if __name__ == '__main__':
    raise SystemExit(main())
