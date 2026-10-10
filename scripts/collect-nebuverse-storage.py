#!/usr/bin/env python3
"""Publish metadata-only storage measurements. Never open media or SQLite contents."""

import argparse
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import fcntl
import json
import os
from pathlib import Path
import stat
import sys
import tempfile

GIB = 1024 ** 3
MAX_SAFE_INTEGER = 2 ** 53 - 1


class CollectionError(Exception):
    """An operator error whose message contains no internal identifiers."""


def threshold_bytes(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise CollectionError("Invalid storage threshold.")
    try:
        amount = Decimal(str(value)) * GIB
        if not amount.is_finite() or not 1 <= amount <= MAX_SAFE_INTEGER:
            raise CollectionError("Invalid storage threshold.")
        return int(amount)
    except InvalidOperation:
        raise CollectionError("Invalid storage threshold.") from None


def absolute_path(value):
    if not isinstance(value, str) or not value or not Path(value).is_absolute():
        raise CollectionError("Storage paths must be configured as absolute paths.")
    return Path(value)


def read_config(path):
    with open(path, encoding="utf-8") as handle:
        config = json.load(handle)
    allowed = {"media_path", "database_path", "output_path", "usage_warning_gib", "free_warning_gib", "stale_after_seconds"}
    if not isinstance(config, dict) or set(config) - allowed:
        raise CollectionError("Invalid collector configuration.")
    media = absolute_path(config.get("media_path"))
    database = absolute_path(config.get("database_path"))
    output = absolute_path(config.get("output_path"))
    if media.is_symlink() or database.is_symlink() or output.is_symlink():
        raise CollectionError("Symlink storage paths are not supported.")
    media = media.resolve(strict=True)
    database = database.resolve(strict=True)
    output = output.parent.resolve(strict=True) / output.name
    if not media.is_dir() or not database.is_file() or not output.parent.is_dir() or output.name != "storage.json":
        raise CollectionError("Required storage locations are unavailable.")
    if database.is_relative_to(media) or output.is_relative_to(media) or output.is_relative_to(database.parent):
        raise CollectionError("Storage and public output locations must not overlap.")
    stale = config.get("stale_after_seconds", 1200)
    if type(stale) is not int or not 60 <= stale <= 86400:
        raise CollectionError("Invalid snapshot expiry.")
    return {
        "media_path": media, "database_path": database, "output_path": output,
        "usage_warning_bytes": threshold_bytes(config.get("usage_warning_gib", 5)),
        "free_warning_bytes": threshold_bytes(config.get("free_warning_gib", 10)),
        "stale_after_seconds": stale,
    }


def allocated_bytes(metadata, seen):
    identity = (metadata.st_dev, metadata.st_ino)
    if identity in seen:
        return 0
    seen.add(identity)
    return metadata.st_blocks * 512


def media_usage(root, seen):
    def scan_error(error):
        if not isinstance(error, FileNotFoundError):
            raise error

    # Descriptor-relative walking avoids following directories swapped for symlinks.
    root_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        device = os.fstat(root_fd).st_dev
        total = 0
        for _, directories, files, directory_fd in os.fwalk(".", dir_fd=root_fd, follow_symlinks=False, onerror=scan_error):
            directory = os.fstat(directory_fd)
            if directory.st_dev != device:
                raise CollectionError("Nested media mounts are not supported.")
            total += allocated_bytes(directory, seen)
            for name in directories + files:
                try:
                    metadata = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
                except FileNotFoundError:
                    continue  # An upload/cache entry was removed during the scan.
                if stat.S_ISLNK(metadata.st_mode) or metadata.st_dev != device:
                    raise CollectionError("Symlinks and nested media mounts are not supported.")
                if stat.S_ISREG(metadata.st_mode):
                    total += allocated_bytes(metadata, seen)
                elif not stat.S_ISDIR(metadata.st_mode):
                    raise CollectionError("Unsupported media storage entry.")
        return total
    finally:
        os.close(root_fd)


def database_usage(database, seen):
    total = 0
    # WAL and SHM are storage too; rollback journals cover non-WAL configurations.
    for suffix in ("", "-wal", "-shm", "-journal"):
        path = Path(str(database) + suffix)
        try:
            metadata = path.stat(follow_symlinks=False)
        except FileNotFoundError:
            if not suffix:
                raise
            continue
        if not stat.S_ISREG(metadata.st_mode):
            raise CollectionError("Unsupported database storage entry.")
        total += allocated_bytes(metadata, seen)
    return total


def collect_snapshot(config):
    seen = set()
    media = media_usage(config["media_path"], seen)
    database = database_usage(config["database_path"], seen)
    available = []
    for location in (config["media_path"], config["database_path"].parent):
        filesystem = os.statvfs(location)
        available.append(max(0, filesystem.f_bavail) * filesystem.f_frsize)
    storage = {"media_bytes": media, "database_bytes": database, "total_bytes": media + database, "available_bytes": min(available)}
    if any(type(value) is not int or not 0 <= value <= MAX_SAFE_INTEGER for value in storage.values()):
        raise CollectionError("Storage measurement is outside supported limits.")
    warning = storage["total_bytes"] >= config["usage_warning_bytes"] or storage["available_bytes"] < config["free_warning_bytes"]
    return {
        "schema_version": 1,
        "status": "warning" if warning else "ok",
        "measured_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "stale_after_seconds": config["stale_after_seconds"],
        "storage": storage,
        "thresholds": {"usage_warning_bytes": config["usage_warning_bytes"], "free_warning_bytes": config["free_warning_bytes"]},
    }


def atomic_write(output, snapshot):
    descriptor, temporary = tempfile.mkstemp(prefix=".nebuverse-storage-", suffix=".tmp", dir=output.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(snapshot, handle, separators=(",", ":"), allow_nan=False)
            handle.write("\n")
            handle.flush()
            os.fchmod(handle.fileno(), 0o644)
            os.fsync(handle.fileno())
        os.replace(temporary, output)
        directory = os.open(output.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def publish(config):
    # Linux directory lock: concurrent manual runs cannot overwrite newer runs.
    directory = os.open(config["output_path"].parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        fcntl.flock(directory, fcntl.LOCK_EX | fcntl.LOCK_NB)
        snapshot = collect_snapshot(config)
        atomic_write(config["output_path"], snapshot)
        return snapshot
    finally:
        os.close(directory)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Collect public NEBUVERSE storage statistics; no cleanup or database queries.")
    parser.add_argument("--config", default="/etc/nebuverse-storage.json", help="Private JSON configuration file")
    args = parser.parse_args(argv)
    try:
        publish(read_config(args.config))
    except CollectionError as error:
        print(str(error), file=sys.stderr)
        return 1
    except (OSError, ValueError, TypeError):
        print("Storage collection failed; check the private configuration and filesystem permissions.", file=sys.stderr)
        return 1
    print("Storage snapshot published.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
