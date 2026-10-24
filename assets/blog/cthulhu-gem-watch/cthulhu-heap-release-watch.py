#!/usr/bin/env python3
"""Cthulhu Heap Release Watch v5; Python standard library only.

Separate derivative of the live-validated Native Pool Watch v4. Historical
collectors stay unchanged. Exact x86_64 Linux 7.2.11 / module hashes only.

--check: read prerequisites and three module identities only (default).
--probe-check: register seven DISABLED kernel probes and two DISABLED native
uprobes in one private instance, validate fields, then remove them. No game
start, enabled measurement, reader or log file.
--arm: foreground capture, 30 minute default; Ctrl+C/SIGTERM/SIGHUP cleanup;
queue BO-ENOENT stops after five seconds. Do not force a hardlock.

The same ELF instruction offsets 0x2ee80/0x2eea9 bracket the host call in
thunk64_vkDestroyDescriptorPool. No PE uprobe or uretprobe is installed.
The existing native ABI, Wine return slot at file offset 0x12a7a, mapping
identity checks, bounded logs and loss/cleanup statistics remain in place.

NEW: Four additional candidate values, read from the current process only:
  caller2=*(params+104): return out of the observed heap cleanup, but ONLY
    when caller maps to verified d3d12core.dll RVA 0x386ce4.
  caller3=*(params+200): original caller of the Release-shaped function,
    but ONLY if caller2 maps to verified d3d12core.dll RVA 0x386afa.
  heap_hint=*(params+88): saved RSI from cleanup; a heap candidate only on
    that verified Release path.
  heap_pool=*(heap_hint+176): independent candidate object-field check;
    it must equal the non-null Vulkan pool argument before heap attribution.

These slots are build-specific, NOT a universal Wine ABI or stack walker.
They were derived from the exact Wine wrapper plus the two D3D12-Core
prologues and independently cross-checked with PE unwind metadata. Entry/exit
must agree on the four new values. Missing optional values are recorded and
disable their attribution; they do not stop the kernel lifecycle capture.

The alternative known cleanup caller, RVA 0x387b70, matches heap-creation
error handling. For that path caller3 and heap_hint MUST NOT be interpreted
as the Release caller or heap. All symbol names remain source/binary
inferences; these binaries have no recovered D3D12 internal debug symbols.

Require matching process/TID, fresh mapped-inode file hashes, exact caller
RVAs, complete base/native pairs and unchanged candidate slots. Verify loss
counters. A return address alone does not establish Release/fence ordering,
proper application lifetimes, an intended reused BO generation or a fix.

No kernel/Mesa/firmware/game-option changes. The same held verified ELF FD
pins the uprobe inode; global stack/tracer options are never changed.
Extra stack/object fields have NOT yet been validated by a real Cthulhu
capture. --probe-check tests registration, not actual hits or attribution.
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


VERSION = 5
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
MAX_MAP_SCAN_BYTES = 8 * 1024 * 1024
MAX_MAP_ATTEMPTS = 8
BASE_SCRIPT_SHA256 = '89fb0b03b695d21c80d334bee6105f76de2dbd0096c3451ca026353ce80e44fd'
INPUTS = {
    'winevulkan.dll': {
        'path': '/mnt/Games.Vol2/SteamLibrary/steamapps/common/Proton 11.0/files/lib/wine/x86_64-windows/winevulkan.dll',
        'size': 515693,
        'sha256': 'cbc66525322b91cb9ff365ebc549fc2b523304676235bad1fe1f0f97ac4ebd0d',
    },
    'd3d12core.dll': {
        'path': '/mnt/Games.Vol2/SteamLibrary/steamapps/compatdata/1643320/pfx/drive_c/windows/system32/d3d12core.dll',
        'size': 5189632,
        'sha256': 'aa0895bae41eb365f24f38038022b932f0dd1e92d33fec053a46bd710704aea5',
    },
}
INPUTS['winevulkan.so'] = {
    'path': '/mnt/Games.Vol2/SteamLibrary/steamapps/common/Proton 11.0/files/lib/wine/x86_64-unix/winevulkan.so',
    'size': 935200,
    'sha256': '7a06e7eaa28ac9312fdfd8d63585704b79f8f911075814113c7576f41c62d55c',
}
PARENT_V3_SHA256 = 'cd7f5d170e6c3a724a7619b221ca22f0de748050d01e8eaa38c969719b28ae4a'
# Two plain probes in the native ELF, at entry and immediately AFTER the host
# call, while RBX still holds the original parameter-block pointer. No uretprobe.
# For this EXACT Windows wrapper, params = Windows RBP - 32. Its D3D12 caller
# return slot is params + 40, and its Unix-dispatch return slot is params - 56.
# These are candidate slots, not a generic ABI promise. Validate api_ret against
# the mapped Windows DLL at file offset 0x12a7a before caller attribution.
PARENT_V4_SHA256 = 'd4b844a6cb5598a84807ebeede08e630d6a48ddfd8fa03ed435545951205f073'
CANDIDATE_FIELDS = ('caller2', 'caller3', 'heap_hint', 'heap_pool')
# Hash checking already pins every byte; these guards make the additional
# prologue/call-site assumptions explicit and independently inspectable.
CORE_INSTRUCTION_CHECKS = (
    (0x386a80, '554156415541545756534883ec20488d6c2420'),
    (0x386af5, 'e886010000'),
    (0x386c80, '5556534883ec20488d6c2420'),
    (0x386c9b, '4889cb'),
    (0x386cd3, '488b93b0000000'),
    (0x386cde, 'ff9698030000'),
    (0x387b6b, 'e810f1ffff'),
    (0x4c4d58, '010c05250c030732033002600150'),
    (0x4c4d68, '0113092513030e320a300960087007c005d003e00150'),
)
USER_PROBES = (
    ('pool_enter', 0x2ee80,
     'args=%di:x64 device=+0(%di):x64 pool=+8(%di):x64 caller=+40(%di):x64 api_ret=-56(%di):x64 sp=$stack:x64 caller2=+104(%di):x64 caller3=+200(%di):x64 heap_hint=+88(%di):x64 heap_pool=+176(+88(%di)):x64',
     {'args':'x64','device':'x64','pool':'x64','caller':'x64','api_ret':'x64','sp':'x64',
      'caller2':'x64','caller3':'x64','heap_hint':'x64','heap_pool':'x64'}),
    ('pool_exit', 0x2eea9,
     'args=%bx:x64 device=+0(%bx):x64 pool=+8(%bx):x64 caller=+40(%bx):x64 api_ret=-56(%bx):x64 sp=$stack:x64 caller2=+104(%bx):x64 caller3=+200(%bx):x64 heap_hint=+88(%bx):x64 heap_pool=+176(+88(%bx)):x64',
     {'args':'x64','device':'x64','pool':'x64','caller':'x64','api_ret':'x64','sp':'x64',
      'caller2':'x64','caller3':'x64','heap_hint':'x64','heap_pool':'x64'}),
)
USER_SPEC = {p[0]: p for p in USER_PROBES}


def option_values(instance):
    result = {}
    for option in STACK_OPTIONS:
        value = (instance / 'options' / option).read_text().strip()
        if value not in ('0', '1'):
            raise RuntimeError('Abweichender Optionswert: ' + option + '=' + value)
        result[option] = value
    return result


def open_verified_inputs(inputs=None):
    inputs = INPUTS if inputs is None else inputs
    handles, metadata = {}, {}
    try:
        for name, item in inputs.items():
            fd = os.open(item['path'], os.O_RDONLY | os.O_CLOEXEC | os.O_NONBLOCK)
            handles[name] = fd
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_size != item['size']:
                raise RuntimeError('Abweichende Dateigroesse/-art: ' + name)
            # Known inputs are under 6 MiB; bound this read independently.
            if info.st_size > 16 * 1024 * 1024:
                raise RuntimeError('Modul zu gross: ' + name)
            data = os.pread(fd, info.st_size+1, 0)
            digest = hashlib.sha256(data).hexdigest()
            if len(data) != info.st_size or digest != item['sha256']:
                raise RuntimeError('SHA-256 stimmt nicht mit der untersuchten Datei ueberein: ' + name)
            if name == 'winevulkan.so':
                if data[:6] != b'\x7fELF\x02\x01':
                    raise RuntimeError('Kein ELF64 little endian: ' + name)
                if (data[0x2ee80:0x2ee8a] != bytes.fromhex('554889e54154534889fb') or
                    data[0x2eea3:0x2eead] != bytes.fromhex('ff90380c0000488d65f0')):
                    raise RuntimeError('Abweichende native Eintritts-/Host-Call-Instruktionen.')
            else:
                if data[:2] != b'MZ':
                    raise RuntimeError('Kein PE-Modul: ' + name)
                pe = struct.unpack_from('<I', data, 60)[0]
                if data[pe:pe+4] != b'PE\0\0' or struct.unpack_from('<H', data, pe+4)[0] != 0x8664:
                    raise RuntimeError('Kein AMD64-PE: ' + name)
            if name == 'winevulkan.dll':
                if (data[0x12a50:0x12a58] != bytes.fromhex('554889e54883ec50') or
                    data[0x12a7e:0x12a84] != bytes.fromhex('4883c4505dc3')):
                    raise RuntimeError('Abweichende Eintritts-/Return-Instruktionen.')
            if name == 'd3d12core.dll':
                for offset, expected in CORE_INSTRUCTION_CHECKS:
                    expected = bytes.fromhex(expected)
                    if data[offset:offset+len(expected)] != expected:
                        raise RuntimeError('Abweichende D3D12-Core-Stack-/Call-Annahme bei ' + hex(offset))
            metadata[name] = {'path': item['path'], 'bytes': info.st_size,
                              'sha256': digest, 'dev': info.st_dev, 'inode': info.st_ino,
                              'mtime_ns': info.st_mtime_ns}
        return handles, metadata
    except BaseException:
        for fd in handles.values():
            os.close(fd)
        raise


_lifecycle_preflight = preflight


def preflight(roots=TRACE_ROOTS, release=None, machine=None):
    root = _lifecycle_preflight(roots, release, machine)
    for name in ('uprobe_events', 'uprobe_profile'):
        if not (root / name).is_file():
            raise RuntimeError('Uprobe-Schnittstelle fehlt: ' + name)
    option_values(root)
    handles, _ = open_verified_inputs()
    for fd in handles.values():
        os.close(fd)
    return root


class TraceSession(LifecycleSession):
    def __init__(self, root, log, group=None):
        group = group or ('cthulhu_gem_heap_' + str(os.getpid()) + '_' + secrets.token_hex(4))
        super().__init__(root, log, group)
        self.created_uprobes = []
        self.input_fds = {}
        self.module_manifest = {}
        self.global_before = None
        self.active_pools = collections.defaultdict(list)
        self.pool_serial = 0
        self.pool_pairs = self.pool_unmatched_exits = self.pool_scoped_closes = 0
        self.map_attempts = 0
        self.map_reasons = set()

    def assert_global_unchanged(self):
        if option_values(self.root) != self.global_before:
            raise RuntimeError('Globale Stack-Optionen wurden waehrenddessen geaendert; keine Rueckschreibung.')

    def uprobe_command(self, command):
        fd = os.open(self.root / 'uprobe_events', os.O_WRONLY | os.O_APPEND | os.O_CLOEXEC)
        try:
            data = (command + '\n').encode('ascii')
            if os.write(fd, data) != len(data):
                raise OSError('Unvollstaendiger Schreibvorgang an uprobe_events')
        finally:
            os.close(fd)

    def prepare(self):
        self.global_before = option_values(self.root)
        self.input_fds, self.module_manifest = open_verified_inputs()
        super().prepare()
        # All nine events share one private instance and one kernel clock.
        for option in STACK_OPTIONS:
            self.control(self.instance / 'options' / option, '0')
        self.assert_global_unchanged()
        self.log.meta('module_identity', self.module_manifest)
        target = '/proc/' + str(os.getpid()) + '/fd/' + str(self.input_fds['winevulkan.so'])
        # Keep this FD open until both probes are removed. A /proc FD path avoids
        # whitespace in the Proton directory and pins the verified file inode.
        for key, offset, fetch, fields in USER_PROBES:
            name = self.group + '_' + key
            definition = 'p:' + self.group + '/' + name + ' ' + target + ':' + hex(offset) + ' ' + fetch
            self.uprobe_command(definition)
            self.created_uprobes.append(name)
            event = self.instance / 'events' / self.group / name
            self.control(event / 'enable', '0')
            validate_format((event / 'format').read_text(), fields)
            if (event / 'filter').read_text().strip() not in ('none', '0', ''):
                raise RuntimeError('Unerwarteter Uprobe-Filter: ' + name)
            self.log.meta('uprobe', {'key': key, 'definition': definition,
                                    'file_offset': offset, 'kind': 'plain_instruction_probe'})
        self.log.meta('pool_setup', {'global_before': self.global_before,
                      'global_now': option_values(self.root),
                      'private_options': option_values(self.instance),
                      'base_stack_watch_sha256': BASE_SCRIPT_SHA256,
                      'caller': 'Exact wrapper stack slots: caller=params+40, api_ret=params-56; not a full stack; validate api_ret mapping',
                      'parent_v3_sha256': PARENT_V3_SHA256,
                      'parent_v4_sha256': PARENT_V4_SHA256,
                      'candidate_slots': {'caller2': 104, 'caller3': 200, 'heap_hint': 88, 'heap_pool_field': 176},
                      'candidate_requirements': 'Same mapped modules; caller RVA 0x386ce4; caller2 RVA 0x386afa for Release; non-null heap_pool equals pool; entry/exit candidates equal; no optional read faults',
                      'candidate_limit': 'caller3/heap_hint only interpreted on the verified Release path; no automatic blame or fence inference',
                      'alternative_cleanup_return_rva': 0x387b70,
                      'expected_api_ret_file_offset': 0x12a7a,
                      'native_exit_sp_delta': -24,
                      'scope': 'Pair by TID, args/caller/api_ret/pool/device; entry SP equals post-call SP+24; verify mappings and losses',
                      'ret_marker': 'Plain native probe at 0x2eea9 immediately after host call; not uretprobe',
                      'no_claim': 'The rejected BO list intended generation is not identified by a close caller alone'})

    def start(self):
        if len(self.created_uprobes) != 2:
            raise RuntimeError('Uprobes nicht vollstaendig vorbereitet.')
        for name in self.created_uprobes:
            self.control(self.instance / 'events' / self.group / name / 'enable', '1')
        super().start()

    def snapshot_process(self, tid, reason):
        identity = task_identity(tid)
        try:
            tgid = int(identity['Tgid'])
        except (KeyError, ValueError):
            self.log.meta('process_maps_unavailable', {'tid': tid, 'reason': reason, 'identity': identity})
            return
        proc = Path('/proc') / str(tgid)
        try:
            st = (proc / 'stat').read_text()
            starttime = st[st.rindex(')')+2:].split()[19]
        except (OSError, ValueError, IndexError) as exc:
            self.log.meta('process_maps_unavailable', {'tid': tid, 'reason': reason, 'error': str(exc)})
            return
        marker = (tgid, starttime, reason)
        if marker in self.map_reasons:
            return
        self.map_reasons.add(marker)
        if self.map_attempts >= MAX_MAP_ATTEMPTS:
            self.log.meta('process_maps_limit', {'tgid': tgid, 'reason': reason})
            return
        self.map_attempts += 1
        selected, source_bytes, source_lines, truncated = [], 0, 0, False
        try:
            # Filter while streaming: do not let numerous non-executable GPU
            # VMAs consume the output budget before high native ELF mappings.
            with (proc / 'maps').open('rb') as stream:
                for line in stream:
                    source_bytes += len(line)
                    source_lines += 1
                    if source_bytes > MAX_MAP_SCAN_BYTES:
                        truncated = True
                        break
                    text = line.decode('utf-8', 'replace').rstrip('\n')
                    fields = text.split(None, 5)
                    if len(fields) < 6 or not fields[5].startswith('/'):
                        continue
                    basename = fields[5].removesuffix(' (deleted)').rsplit('/', 1)[-1]
                    if 'x' in fields[1] or basename in INPUTS:
                        selected.append(text)
            st_after = (proc / 'stat').read_text()
            if st_after[st_after.rindex(')')+2:].split()[19] != starttime:
                raise RuntimeError('Prozessidentitaet waehrend Mappingaufnahme gewechselt.')
        except (OSError, ValueError, IndexError, RuntimeError) as exc:
            self.log.meta('process_maps_unavailable', {'tid': tid, 'tgid': tgid,
                          'reason': reason, 'error': str(exc)})
            return
        comparisons = []
        for text in selected:
            fields = text.split(None, 5)
            name = fields[5].removesuffix(' (deleted)').rsplit('/', 1)[-1]
            if name not in self.module_manifest:
                continue
            item = self.module_manifest[name]
            dev = tuple(int(x, 16) for x in fields[3].split(':'))
            expected = (os.major(item['dev']), os.minor(item['dev']))
            comparisons.append({'name': name, 'mapping': fields[0],
                                'same_verified_inode': dev == expected and int(fields[4]) == item['inode']})
        self.log.meta('process_maps', {'tid': tid, 'tgid': tgid, 'starttime_ticks': starttime,
                      'reason': reason, 'clock': clock_sample(), 'source_bytes': source_bytes,
                      'source_lines': source_lines, 'source_truncated': truncated,
                      'selection': 'all executable file mappings plus all mappings of the two verified PE basenames',
                      'text': '\n'.join(selected)+'\n', 'verified_inode_comparisons': comparisons})
        self.snapshot_mapped_file_identities(selected, tid, tgid, starttime, reason)

    def snapshot_mapped_file_identities(self, selected, tid, tgid, starttime, reason):
        """Hash only known module basenames, and label whether the path still
        names the observed mapping inode. Never call a path hash mapped bytes
        when dev/inode differ. This handles prefix-file replacement explicitly.
        """
        seen = set()
        results = []
        for text in selected:
            fields = text.split(None, 5)
            path = fields[5].removesuffix(' (deleted)')
            name = path.rsplit('/', 1)[-1]
            if name not in INPUTS or name in seen:
                continue
            seen.add(name)
            result = {'name': name, 'mapping_path': fields[5], 'mapped_dev': fields[3],
                      'mapped_inode': int(fields[4]), 'mapping': fields[0]}
            try:
                fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NONBLOCK)
                try:
                    info = os.fstat(fd)
                    observed_dev = tuple(int(v, 16) for v in fields[3].split(':'))
                    same_inode = ((os.major(info.st_dev), os.minor(info.st_dev)) == observed_dev
                                  and info.st_ino == int(fields[4]))
                    result.update(opened_dev=info.st_dev, opened_inode=info.st_ino,
                                  bytes=info.st_size, same_mapping_inode=same_inode)
                    if not stat.S_ISREG(info.st_mode) or info.st_size > 16*1024*1024:
                        result['status'] = 'not_regular_or_size_limit'
                    elif not same_inode:
                        result['status'] = 'path_no_longer_names_mapping_inode'
                    else:
                        data = os.pread(fd, info.st_size+1, 0)
                        after = os.fstat(fd)
                        if (len(data) != info.st_size or
                            (info.st_size, info.st_mtime_ns, info.st_ctime_ns) !=
                            (after.st_size, after.st_mtime_ns, after.st_ctime_ns)):
                            result['status'] = 'file_changed_during_read'
                        else:
                            result.update(status='ok', sha256=hashlib.sha256(data).hexdigest(),
                                          matches_expected_upload=hashlib.sha256(data).hexdigest()==INPUTS[name]['sha256'])
                finally:
                    os.close(fd)
            except (OSError, ValueError, OverflowError) as exc:
                result['unavailable'] = str(exc)
            results.append(result)
        self.log.meta('mapped_file_identities', {'tid': tid, 'tgid': tgid,
                      'starttime_ticks': starttime, 'reason': reason, 'modules': results,
                      'limit': 'Hashes of files with matching observed inodes, not hashes of private runtime COW pages'})

    def record(self, line):
        event = self.event_pattern.search(line)
        key = event.group(1) if event else None
        if key not in USER_SPEC:
            super().record(line)
            if event is None:
                return
            header = self.header_pattern.match(line[:event.start()])
            tid = int(header.group('tid'))
            if key == 'close_begin' and self.active_pools.get(tid):
                values = dict(re.findall(r'\b(\w+)=([^\s]+)', line[event.end():]))
                current = self.active_pools[tid][-1]
                current['close_count'] += 1
                self.pool_scoped_closes += 1
                self.log.meta('pool_scoped_close', {'tid': tid, 'time': header.group('stamp'),
                              'ctx': values.get('ctx'), 'handle': values.get('handle'),
                              'span': current.copy(),
                              'limit': 'Candidate span only; require matching native exit, api_ret file offset 0x12a7a, mapped identities and loss checks'})
            if key == 'bo' and header.group('comm').strip() == 'vkd3d_queue':
                self.snapshot_process(tid, 'BO_ENOENT')
            return
        self.log.line(line)
        header = self.header_pattern.match(line[:event.start()])
        if header is None:
            raise RuntimeError('Uprobe-Header nicht lesbar.')
        tokens = dict(re.findall(r'\b(\w+)=([^\s]+)', line[event.end():]))
        values = {}
        optional_unavailable = []
        for field in USER_SPEC[key][3]:
            token = tokens.get(field, '')
            try:
                value = int(token, 16)
            except ValueError:
                if field not in CANDIDATE_FIELDS:
                    raise RuntimeError('Uprobe-Feld nicht lesbar: ' + field + '=' + token)
                optional_unavailable.append(field)
                value = 0
            if not 0 <= value < (1 << 64):
                raise RuntimeError('Uprobe-Feld ausserhalb x64: ' + field)
            values[field] = value
        if optional_unavailable:
            self.log.meta('candidate_slots_unavailable', {'key': key, 'fields': optional_unavailable,
                          'time': header.group('stamp'), 'limit': 'Kernel capture continues; do not attribute the optional frame chain'})
        values['candidate_slots_readable'] = not optional_unavailable
        if values['args'] == 0 or values['sp'] == 0:
            raise RuntimeError('Native Argumentadresse/SP nicht erfasst; Aufnahme abgebrochen.')
        tid = int(header.group('tid'))
        self.counts[key] += 1
        if tid not in self.seen_tasks:
            self.seen_tasks.add(tid)
            self.log.meta('task', {'tid': tid, 'status': task_identity(tid)})
        if key == 'pool_enter':
            if values['caller'] == 0 or values['api_ret'] == 0:
                self.log.meta('native_abi_unverified', {'tid': tid, 'values': values,
                              'limit': 'Candidate return slots unavailable; kernel capture continues, no caller attribution'})
                if values['pool'] != 0:
                    self.snapshot_process(tid, 'first_nonnull_pool_call')
                return
            self.pool_serial += 1
            item = dict(values, serial=self.pool_serial, time=header.group('stamp'), close_count=0)
            self.active_pools[tid].append(item)
            if values['pool'] != 0:
                self.snapshot_process(tid, 'first_nonnull_pool_call')
        else:
            active = self.active_pools.get(tid, [])
            if (active and all(active[-1][n] == values[n] for n in ('args', 'caller', 'api_ret', 'pool', 'device'))
                and active[-1]['sp'] == values['sp'] + 24):
                item = active.pop()
                self.pool_pairs += 1
                if item['close_count']:
                    extra_agree = (item['candidate_slots_readable'] and values['candidate_slots_readable'] and
                                   all(item[n] == values[n] for n in CANDIDATE_FIELDS))
                    self.log.meta('pool_span_complete', {'tid': tid, 'enter': item,
                                  'exit_time': header.group('stamp'), 'exit': values,
                                  'candidate_slots_agree': extra_agree,
                                  'candidate_limit': 'Base span only unless candidate slots agree, RVAs/maps/hashes match and heap_pool equals non-null pool'})
                if not active:
                    self.active_pools.pop(tid, None)
            else:
                self.pool_unmatched_exits += 1
                # Do not attribute later closes to an unbalanced earlier span.
                abandoned = self.active_pools.pop(tid, [])
                self.log.meta('pool_unmatched_exit', {'tid': tid, 'time': header.group('stamp'),
                              'values': values, 'abandoned_spans': abandoned,
                              'limit': 'No attribution through this unmatched interval'})

    def cleanup(self):
        errors = []
        def attempt(label, action):
            try:
                action()
            except Exception as exc:
                errors.append(label + ': ' + str(exc))
        if self.created_instance:
            attempt('eigene Instanz stoppen', lambda: self.control(self.instance / 'tracing_on', '0'))
            for name in self.created_uprobes:
                target = self.instance / 'events' / self.group / name / 'enable'
                if target.exists():
                    attempt('eigene Uprobe deaktivieren', lambda p=target: self.control(p, '0'))
        # Base cleanup drains the single stream, saves its loss statistics,
        # removes the private instance and removes only our seven kprobes.
        errors.extend(super().cleanup())
        if self.created_instance and not self.instance.exists():
            self.created_instance = False
        profile = read_optional(self.root / 'uprobe_profile')
        own = [line for line in profile.splitlines()
               if any(word.rsplit('/', 1)[-1] in self.created_uprobes for word in line.split())]
        attempt('Uprobe-Profil sichern', lambda: self.log.meta('uprobe_profile', own or {'unavailable_or_empty': profile}))
        for name in reversed(self.created_uprobes):
            if (self.root / 'events' / self.group / name).exists():
                attempt('eigene Uprobe entfernen', lambda n=name: self.uprobe_command('-:' + self.group + '/' + n))
        for fd in self.input_fds.values():
            attempt('eigenen Modul-FD schliessen', lambda f=fd: os.close(f))
        self.input_fds = {}
        if self.global_before is not None:
            attempt('globale Stack-Optionen vergleichen', self.assert_global_unchanged)
        attempt('Pool-Enddaten sichern', lambda: self.log.meta('pool_end', {
                'complete_pairs': self.pool_pairs, 'unmatched_exits': self.pool_unmatched_exits,
                'scoped_closes': self.pool_scoped_closes,
                'incomplete_spans': dict(self.active_pools),
                'global_before': self.global_before, 'global_after': option_values(self.root),
                'errors': list(errors)}))
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
    print('Cthulhu Heap Release Watch v' + str(VERSION))
    print('Kernel: ' + platform.release() + '; Tracefs: ' + str(root))
    print('7 Kernel-Funktionen und Uprobe-Schnittstellen vorhanden; alle drei Modul-Hashes passen.')
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
        path = Path(account.pw_dir) / ('cthulhu-heap-release-watch-' + stamp + '-' + str(os.getpid()) + '.log')
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
            print('REGISTRIERUNG OK: 7 Kernel-Proben + 2 deaktivierte native Uprobes; 1 private Instanz; globale Optionen unveraendert.')
        elif not stopped:
            session.start()
            print('\nMESSUNG AKTIV. Protokoll: ' + str(path), flush=True)
            print('GEM-Lifecycle, native Pool-Caller und zusaetzliche Release-Kandidaten stehen im Log; Fehler auch hier. Strg+C beendet die Messung.', flush=True)
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
            print('Eigene Trace-Instanz und registrierte Kernel-/User-Messpunkte entfernt.', flush=True)
            if args.probe_check and status == 0:
                print('REGISTRIERUNGSPRUEFUNG FERTIG. Keine Messung aktiviert, keine Datei angelegt.')
    return status


if __name__ == '__main__':
    raise SystemExit(main())
