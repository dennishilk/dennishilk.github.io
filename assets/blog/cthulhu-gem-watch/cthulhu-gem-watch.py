#!/usr/bin/env python3
"""Cthulhu GEM-handle capture, version 1, inspected for x86_64 Linux 7.2.11.

Python standard library only. This is a separate tool; cthulhu-cs-watch.py
remains unchanged as the source for the first capture.

Modes:
  --check        Read prerequisites only (also the default). No writes or log.
  --probe-check  Register and validate seven DISABLED probes, then remove them.
                 No capture is enabled and no log file is created.
  --arm          Capture into a unique private trace instance for at most
                 30 minutes. Ctrl+C, SIGTERM and SIGHUP stop and clean up.
                 A BO ENOENT from a vkd3d_queue thread requests an automatic
                 stop five seconds later; it never starts or controls a game.

Probe records:
  lookup:        Failed drm_gem_object_lookup: DRM file context, handle, NULL.
  create:        Successful drm_gem_handle_create_tail: context, handle, object.
  close_begin:   Entry to drm_gem_handle_delete: context and handle.
  close_done:    Return from that call: same saved arguments and status.
  release:       Entry to drm_gem_release: context being released (not completion).
  bo / cs:       ENOENT from BO-list creation / the outer CS ioctl, with context.

The $argN values on RETURN probes are saved ENTRY arguments by the inspected
kernel implementation, not registers guessed at return. The create probe reads
the u32 output through saved $arg3 and logs only successful returns. Numeric
arguments require no BTF layouts or hard-coded structure offsets.

Limits: all probes are system-wide. Successful lookups are filtered out, but
the lookup return probe still executes for them and can perturb timing. Create
and close records go to the log rather than flooding the terminal. Raw event
data is capped at 128 MiB; reaching it explicitly stops an incomplete capture.
Every capture includes probe-miss and per-CPU buffer statistics. Compare both
context and handle; handles and context addresses can be reused. Close entry
and return bracket an operation, not the precise IDR removal instruction.
The create return is not the exact publication instant. A release entry does
not prove context destruction has completed. Events can arrive from CPU
buffers out of timestamp order; this collector makes no lifetime diagnosis.
Missing prior history is not proof of no prior close or creation. This does
not identify a D3D12 resource, prove an Oct 21 fault connection or a GPU reset.

No package installation, mounts, persistent configuration, DRM ioctls or game
settings are changed. Only --arm enables tracing. The mode-0600 log
is owned by the invoking sudo user; it contains kernel context/object addresses
and native task IDs. Check its contents before sharing. Cleanup touches only
the newly created instance/probes, not the global tracer or other sessions.
SIGKILL or a full machine lock prevents cleanup; reboot clears volatile probes.

Source inspection and local simulated tests do not establish live validation
of this new version. --probe-check tests registration and event formats, not
the correctness of real captured argument values or game stability.

Primary sources, pinned to the inspected ABI where applicable:
https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/drm_gem.c
https://github.com/gregkh/linux/blob/v7.2.11/kernel/trace/trace_kprobe.c
https://github.com/gregkh/linux/blob/v7.2.11/kernel/trace/trace_probe.c
https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu_bo_list.c
https://docs.kernel.org/trace/kprobetrace.html
https://docs.kernel.org/trace/ftrace.html#instances
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
import time


VERSION = 1
MAX_RAW_BYTES = 128 * 1024 * 1024
MAX_META_BYTES = 2 * 1024 * 1024
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


class TraceSession:
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
    print('Cthulhu GEM Watch v' + str(VERSION))
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
        path = Path(account.pw_dir) / ('cthulhu-gem-watch-' + stamp + '-' + str(os.getpid()) + '.log')
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
            print('REGISTRIERUNG OK: 7 deaktivierte Proben; Felder und Filter akzeptiert.')
        elif not stopped:
            session.start()
            print('\nMESSUNG AKTIV. Protokoll: ' + str(path), flush=True)
            print('Lifecycle-Ereignisse stehen im Log; Fehler auch hier. Strg+C beendet die Messung.', flush=True)
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
            print('Eigene Trace-Instanz und registrierte Messpunkte entfernt.', flush=True)
            if args.probe_check and status == 0:
                print('REGISTRIERUNGSPRUEFUNG FERTIG. Keine Messung aktiviert, keine Datei angelegt.')
    return status


if __name__ == '__main__':
    raise SystemExit(main())
