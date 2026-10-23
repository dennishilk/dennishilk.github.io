#!/usr/bin/env python3
"""Cthulhu: narrow ENOENT return tracing for Linux 7.2.11, Python stdlib only.

Default / --check: read-only prerequisite inspection. No tracefs writes or log.
--arm: temporary kretprobes on three known int-returning kernel functions.
It creates a unique trace instance and probe group, filters ret == -2, and
logs raw trace lines plus boot identity, task IDs and loss/probe statistics.
The global tracer, global buffer and other probe definitions are not reset.
It never mounts tracefs, starts a game, changes graphics options or installs
anything. SIGINT, SIGTERM and normal errors run cleanup; SIGKILL and a system
hardlock cannot. Reboot discards volatile probes, but the log file persists.

Usage (save this file in your home directory):
  sudo python3 -B ~/cthulhu-cs-watch.py --check
  sudo python3 -B ~/cthulhu-cs-watch.py --arm

The armed session lasts at most 30 minutes by default. Keep this terminal
open. Use the existing game configuration normally; do not force a hardlock.
Ctrl+C stops capture and removes only this session's own trace objects.
The log is created exclusively, mode 0600, owned by the invoking sudo user.

Interpretation:
  bo:   amdgpu_bo_list_create returned ENOENT; in the inspected kernel this
        identifies a failed GEM handle lookup while creating a BO list.
  sync: drm_syncobj_find_fence returned ENOENT; investigate sync/fence lookup.
  cs:   amdgpu_cs_ioctl returned ENOENT; compare same native thread/timestamps
        with the inner function events. No inner event is not an exclusion
        of other error paths, tracing gaps or ABI differences.
No event or a surviving session proves no fix. Instrumentation changes timing.
These events do not identify a D3D12 object or prove the Oct 21 GPU fault is
the same failure. They capture failures system-wide; task IDs matter.

Version scope: upstream Linux v7.2.11 has int return values for all three.
The program refuses other release families rather than assuming their ABI.
Local checks cover parsing, isolation and failure cleanup using a tracefs
simulation. Actual kretprobe registration has not been tested on Cthulhu.

Primary references:
https://docs.kernel.org/trace/kprobetrace.html
https://docs.kernel.org/trace/ftrace.html#instances
https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu_bo_list.c
https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/drm_syncobj.c
https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu_cs.c
"""

import argparse
import datetime
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


TARGETS = (
    ("bo", "amdgpu_bo_list_create", "amdgpu"),
    ("sync", "drm_syncobj_find_fence", None),
    ("cs", "amdgpu_cs_ioctl", "amdgpu"),
)
TRACE_ROOTS = (Path("/sys/kernel/tracing"), Path("/sys/kernel/debug/tracing"))


def parse_functions(text):
    found = {}
    for line in text.splitlines():
        fields = line.split()
        if fields:
            module = fields[1].strip("[]") if len(fields) > 1 else None
            found[fields[0]] = module
    return found


def preflight(roots=TRACE_ROOTS, release=None):
    release = platform.release() if release is None else release
    if not re.fullmatch(r"7\.2\.11(?:[-+].*)?", release):
        raise RuntimeError("Dieses Werkzeug ist fuer Kernel 7.2.11 geprueft; gefunden: " + release)
    root = next((p for p in roots if (p / "available_filter_functions").is_file()), None)
    if root is None:
        raise RuntimeError("Keine bereits verfuegbare tracefs-Schnittstelle gefunden.")
    functions = parse_functions((root / "available_filter_functions").read_text())
    for _, function, module in TARGETS:
        if function not in functions or functions[function] != module:
            raise RuntimeError("Funktions-/Modulzuordnung stimmt nicht: " + function)
    for name in ("kprobe_events", "kprobe_profile", "trace_clock"):
        if not (root / name).is_file():
            raise RuntimeError("Erforderliche Schnittstelle fehlt: " + str(root / name))
    if not (root / "instances").is_dir():
        raise RuntimeError("Private Trace-Instanzen sind nicht verfuegbar.")
    clocks = (root / "trace_clock").read_text().replace("[", "").replace("]", "").split()
    if "mono" not in clocks:
        raise RuntimeError("Der benoetigte mono-Trace-Zeitgeber ist nicht verfuegbar.")
    return root


def read_optional(path):
    try:
        return path.read_text().strip()
    except OSError as exc:
        return "nicht lesbar: " + str(exc)


def task_identity(tid):
    try:
        lines = Path("/proc") / str(tid) / "status"
        wanted = {"Name", "Tgid", "Pid", "PPid"}
        return dict(line.split(":", 1) for line in lines.read_text().splitlines()
                    if ":" in line and line.split(":", 1)[0] in wanted)
    except OSError as exc:
        return {"tid": tid, "status": "bereits beendet oder nicht lesbar", "error": str(exc)}


class Log:
    def __init__(self, path, uid, gid):
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
        try:
            os.fchown(fd, uid, gid)
            os.fchmod(fd, 0o600)
            self.file = os.fdopen(fd, "w", encoding="utf-8", buffering=1)
        except BaseException:
            os.close(fd)
            raise

    def meta(self, kind, data):
        self.file.write("# " + json.dumps({"kind": kind, "data": data}, ensure_ascii=True) + "\n")

    def line(self, line):
        self.file.write(line + "\n")

    def close(self):
        try:
            self.file.flush()
            os.fsync(self.file.fileno())
        finally:
            self.file.close()


class TraceSession:
    """Own only a freshly created instance/group, never the global buffer."""
    def __init__(self, root, log, group=None):
        self.root = root
        self.log = log
        self.group = group or ("cthulhu_cs_" + str(os.getpid()) + "_" + secrets.token_hex(3))
        if not re.fullmatch(r"cthulhu_cs_[A-Za-z0-9_]+", self.group):
            raise ValueError("Ungueltiger eigener Trace-Name")
        self.instance = root / "instances" / self.group
        self.created_instance = False
        self.attempted_events = []
        self.fd = None
        self.pending = ""
        self.count = 0
        self.seen_tasks = set()

    def control(self, path, value):
        path.write_text(value + "\n", encoding="ascii")

    def probe_command(self, command):
        # O_APPEND, never O_TRUNC: existing global probe definitions must survive.
        fd = os.open(self.root / "kprobe_events", os.O_WRONLY | os.O_APPEND | os.O_CLOEXEC)
        try:
            data = (command + "\n").encode("ascii")
            if os.write(fd, data) != len(data):
                raise OSError("Unvollstaendiger Schreibvorgang an kprobe_events")
        finally:
            os.close(fd)

    def arm(self):
        self.instance.mkdir()  # Must be new; fail if it already exists.
        self.created_instance = True
        self.control(self.instance / "tracing_on", "0")
        self.control(self.instance / "events" / "enable", "0")
        tracer = self.instance / "current_tracer"
        if tracer.exists() and tracer.read_text().strip() != "nop":
            raise RuntimeError("Unerwarteter Tracer in der neu erstellten Instanz.")
        self.control(self.instance / "buffer_size_kb", "64")
        self.control(self.instance / "trace_clock", "mono")
        for key, function, module in TARGETS:
            name = self.group + "_" + key
            self.attempted_events.append(name)
            symbol = (module + ":" if module else "") + function
            definition = "r256:" + self.group + "/" + name + " " + symbol + " ret=$retval:s32"
            self.probe_command(definition)
            event = self.instance / "events" / self.group / name
            fmt = (event / "format").read_text()
            if not re.search(r"field:[^;\n]*\bret;\s*offset:\d+;\s*size:4;\s*signed:1;", fmt):
                raise RuntimeError("Rueckgabefeld hat nicht den erwarteten signierten 32-Bit-Typ: " + name)
            self.control(event / "filter", "ret == -2")
            self.control(event / "enable", "1")
            self.log.meta("probe", {"key": key, "definition": definition,
                                    "filter": (event / "filter").read_text().strip()})
        self.fd = os.open(self.instance / "trace_pipe", os.O_RDONLY | os.O_NONBLOCK | os.O_CLOEXEC)
        self.control(self.instance / "tracing_on", "1")

    def consume(self, chunk):
        self.pending += chunk.decode("utf-8", errors="replace")
        lines = self.pending.split("\n")
        self.pending = lines.pop()
        for line in lines:
            self.log.line(line)
            if self.group not in line or not re.search(r"\bret=-2(?:\s|$)", line):
                continue
            self.count += 1
            print(line.strip(), flush=True)
            match = re.search(r"-(\d+)\s+(?:\([^)]*\)\s+)?\[\d+\]", line)
            if match:
                tid = int(match.group(1))
                if tid not in self.seen_tasks:
                    self.seen_tasks.add(tid)
                    self.log.meta("task", {"tid": tid, "status": task_identity(tid)})

    def poll(self):
        try:
            chunk = os.read(self.fd, 65536)
        except BlockingIOError:
            return False
        if chunk:
            self.consume(chunk)
            return True
        return False

    def safe_meta(self, kind, value):
        try:
            self.log.meta(kind, value)
        except Exception as exc:
            print("Protokoll-Schreibfehler: " + str(exc), file=sys.stderr, flush=True)

    def cleanup(self):
        errors = []
        def attempt(label, call):
            try:
                call()
            except Exception as exc:
                errors.append(label + ": " + str(exc))
        if self.created_instance:
            attempt("eigene Aufzeichnung stoppen", lambda: self.control(self.instance / "tracing_on", "0"))
            for name in self.attempted_events:
                enable = self.instance / "events" / self.group / name / "enable"
                if enable.exists():
                    attempt("eigenes Event deaktivieren " + name, lambda p=enable: self.control(p, "0"))
        if self.fd is not None:
            # Stop writers first, then drain this instance. Bounded even on errors.
            for _ in range(128):
                try:
                    if not self.poll():
                        break
                except Exception as exc:
                    errors.append("Restdaten lesen: " + str(exc))
                    break
            attempt("eigenen Reader schliessen", lambda: os.close(self.fd))
            self.fd = None
        if self.pending:
            attempt("letzte Textzeile sichern", lambda: self.log.line(self.pending))
            self.pending = ""
        if self.created_instance:
            profile = read_optional(self.root / "kprobe_profile")
            own_profile = [line for line in profile.splitlines()
                           if any(name in line for name in self.attempted_events)]
            self.safe_meta("kprobe_profile", own_profile or {"unavailable_or_empty": profile})
            stats = {p.parent.name: read_optional(p)
                     for p in sorted((self.instance / "per_cpu").glob("cpu*/stats"))}
            self.safe_meta("buffer_stats", stats)
            # Close all instance files before rmdir; tracefs provides virtual children.
            attempt("eigene Instanz entfernen", self.instance.rmdir)
        for name in reversed(self.attempted_events):
            own = self.root / "events" / self.group / name
            if own.exists():
                attempt("eigene Probe entfernen " + name,
                        lambda n=name: self.probe_command("-:" + self.group + "/" + n))
        self.safe_meta("cleanup", {"group": self.group, "errors": errors, "events": self.count})
        return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Nur Voraussetzungen lesen (Standard)")
    mode.add_argument("--arm", action="store_true", help="Temporare Messpunkte aktivieren; Strg+C beendet sie")
    parser.add_argument("--minutes", type=float, default=30.0, help="Maximale Messdauer: 1 bis 120 Minuten (Standard 30)")
    args = parser.parse_args(argv)
    if not 1 <= args.minutes <= 120:
        parser.error("--minutes muss zwischen 1 und 120 liegen")
    if os.geteuid() != 0:
        parser.error("Bitte mit sudo python3 -B starten, damit tracefs gelesen werden kann.")
    try:
        root = preflight()
    except (OSError, RuntimeError) as exc:
        print("PRUEFUNG NICHT ERFOLGREICH: " + str(exc), file=sys.stderr)
        return 1
    print("Kernel: " + platform.release())
    print("Tracefs: " + str(root))
    for key, function, _ in TARGETS:
        print("  " + key + ": " + function)
    print("Voraussetzungen lesbar; Registrierung einer Probe ist damit noch nicht getestet.")
    if not args.arm:
        print("PRUEFUNG FERTIG. Keine Messpunkte aktiviert, keine Datei angelegt.")
        return 0
    uid = int(os.environ.get("SUDO_UID", str(os.getuid())))
    account = pwd.getpwuid(uid)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = Path(account.pw_dir) / ("cthulhu-cs-watch-" + stamp + "-" + str(os.getpid()) + ".log")
    try:
        log = Log(path, uid, account.pw_gid)
    except OSError as exc:
        print("Protokoll konnte nicht exklusiv angelegt werden: " + str(exc), file=sys.stderr)
        return 1
    stopped = False
    def stop(signum, frame):
        nonlocal stopped
        stopped = True
    old_handlers = {sig: signal.signal(sig, stop) for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP)}
    session = TraceSession(root, log)
    status = 0
    try:
        log.meta("start", {"utc": stamp, "kernel": platform.release(),
                          "boot_id": read_optional(Path("/proc/sys/kernel/random/boot_id")),
                          "monotonic_ns": time.monotonic_ns(), "minutes": args.minutes,
                          "tracefs": str(root), "group": session.group,
                          "global_tracer": read_optional(root / "current_tracer"),
                          "global_tracing_on": read_optional(root / "tracing_on"),
                          "firmware": read_optional(Path("/sys/kernel/debug/dri/0000:55:00.0/amdgpu_firmware_info"))})
        session.arm()
        print("\nMESSUNG AKTIV. Protokoll: " + str(path), flush=True)
        print("Diesen Prozess laufen lassen. Gewohnte Nutzung; keinen Hardlock erzwingen.", flush=True)
        print("Ende mit Strg+C oder automatisch nach " + str(args.minutes) + " Minuten.", flush=True)
        deadline = time.monotonic() + args.minutes * 60
        heartbeat = time.monotonic() + 30
        while not stopped and time.monotonic() < deadline:
            session.poll()
            if time.monotonic() >= heartbeat:
                print("Messung laeuft; erfasste ENOENT-Rueckgaben: " + str(session.count), flush=True)
                heartbeat = time.monotonic() + 30
            time.sleep(0.25)
    except (OSError, RuntimeError, ValueError) as exc:
        status = 1
        session.safe_meta("error", str(exc))
        print("MESSUNG ABGEBROCHEN: " + str(exc), file=sys.stderr, flush=True)
    finally:
        errors = session.cleanup()
        for sig, handler in old_handlers.items():
            signal.signal(sig, handler)
        try:
            log.close()
        except OSError as exc:
            errors.append("Protokoll abschliessen: " + str(exc))
        print("Protokoll: " + str(path), flush=True)
        if errors:
            status = 1
            print("AUFRAEUMEN UNVOLLSTAENDIG; Fehler bitte vollstaendig weitergeben:", file=sys.stderr)
            for error in errors:
                print("  " + error, file=sys.stderr)
            print("Eigene Trace-Gruppe: " + session.group, file=sys.stderr)
        else:
            print("MESSUNG BEENDET. Eigene Trace-Instanz und Messpunkte entfernt.", flush=True)
    return status


if __name__ == "__main__":
    raise SystemExit(main())
