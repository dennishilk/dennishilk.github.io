import contextlib
from datetime import datetime, timezone
import fcntl
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("collector", Path(__file__).resolve().parents[1] / "scripts/collect-nebuverse-storage.py")
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class StorageCollectorTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="nebuverse-collector-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.media = self.root / "media"
        self.database = self.root / "database" / "sqlite.db"
        self.output = self.root / "public" / "storage.json"
        self.media.mkdir()
        self.database.parent.mkdir()
        self.output.parent.mkdir()
        self.database.write_bytes(b"database fixture" * 1000)
        (self.media / "upload").write_bytes(b"media fixture" * 1000)
        self.config_file = self.root / "config.json"
        self.raw_config = {"media_path": str(self.media), "database_path": str(self.database), "output_path": str(self.output)}
        self.write_config()

    def write_config(self, **changes):
        self.config_file.write_text(json.dumps({**self.raw_config, **changes}))

    def config(self):
        return collector.read_config(self.config_file)

    def test_existing_threshold_defaults_and_adjustments(self):
        config = self.config()
        self.assertEqual(config["usage_warning_bytes"], 5 * collector.GIB)
        self.assertEqual(config["free_warning_bytes"], 10 * collector.GIB)
        self.assertEqual(config["stale_after_seconds"], 1200)
        self.write_config(usage_warning_gib=6.5, free_warning_gib=12, stale_after_seconds=1800)
        config = self.config()
        self.assertEqual(config["usage_warning_bytes"], int(6.5 * collector.GIB))
        self.assertEqual(config["free_warning_bytes"], 12 * collector.GIB)
        self.assertEqual(config["stale_after_seconds"], 1800)

    def test_invalid_configuration_is_rejected(self):
        for changes in [
            {"media_path": "relative"}, {"unknown_key": "secret"},
            {"usage_warning_gib": 0}, {"usage_warning_gib": True},
            {"free_warning_gib": -1}, {"usage_warning_gib": float("nan")},
            {"usage_warning_gib": float("inf")}, {"free_warning_gib": "10"},
            {"stale_after_seconds": True}, {"stale_after_seconds": 59},
            {"stale_after_seconds": 86401},
        ]:
            with self.subTest(changes=changes):
                self.write_config(**changes)
                with self.assertRaises(collector.CollectionError):
                    self.config()

    def test_allocated_usage_matches_du_and_counts_hardlinks_once(self):
        (self.media / "nested").mkdir()
        (self.media / "nested" / "another").write_bytes(b"a" * 30000)
        os.link(self.media / "upload", self.media / "copy")
        expected = int(subprocess.check_output(["du", "-s", "-B1", str(self.media)], text=True).split()[0])
        self.assertEqual(collector.collect_snapshot(self.config())["storage"]["media_bytes"], expected)

    def test_sqlite_sidecars_are_included_and_no_file_contents_are_read(self):
        sidecars = [Path(str(self.database) + suffix) for suffix in ("-wal", "-shm", "-journal")]
        for sidecar in sidecars:
            sidecar.write_bytes(b"journal fixture" * 2000)
        paths = [self.database, *sidecars, self.media / "upload"]
        before = {path: hashlib.sha256(path.read_bytes()).digest() for path in paths}
        expected = sum(path.stat().st_blocks * 512 for path in [self.database, *sidecars])
        config = self.config()
        with patch("builtins.open", side_effect=AssertionError("Collector must not read media or SQLite content")):
            snapshot = collector.collect_snapshot(config)
        self.assertEqual(snapshot["storage"]["database_bytes"], expected)
        self.assertEqual(snapshot["storage"]["total_bytes"], snapshot["storage"]["media_bytes"] + expected)
        self.assertEqual(before, {path: hashlib.sha256(path.read_bytes()).digest() for path in paths})

    def test_reserved_disk_blocks_are_excluded_and_lower_free_volume_is_reported(self):
        with patch.object(collector.os, "statvfs", side_effect=[
            SimpleNamespace(f_bavail=20, f_bfree=30, f_frsize=collector.GIB),
            SimpleNamespace(f_bavail=12, f_bfree=40, f_frsize=collector.GIB),
        ]):
            snapshot = collector.collect_snapshot(self.config())
        self.assertEqual(snapshot["storage"]["available_bytes"], 12 * collector.GIB)

    def test_warning_boundaries(self):
        for used, free, expected in [
            (5 * collector.GIB - 1, 10 * collector.GIB, "ok"),
            (5 * collector.GIB, 10 * collector.GIB, "warning"),
            (0, 10 * collector.GIB - 1, "warning"),
            (0, 10 * collector.GIB, "ok"),
        ]:
            with self.subTest(used=used, free=free):
                with patch.object(collector, "media_usage", return_value=used), patch.object(collector, "database_usage", return_value=0), patch.object(collector.os, "statvfs", return_value=SimpleNamespace(f_bavail=free, f_frsize=1)):
                    self.assertEqual(collector.collect_snapshot(self.config())["status"], expected)

    def test_snapshot_exposes_only_allowlisted_statistics_and_truthful_utc_time(self):
        before = datetime.now(timezone.utc).replace(microsecond=0)
        snapshot = collector.publish(self.config())
        after = datetime.now(timezone.utc)
        measured = datetime.fromisoformat(snapshot["measured_at"].replace("Z", "+00:00"))
        self.assertLessEqual(before, measured)
        self.assertLessEqual(measured, after)
        self.assertEqual(set(snapshot), {"schema_version", "status", "measured_at", "stale_after_seconds", "storage", "thresholds"})
        self.assertEqual(set(snapshot["storage"]), {"media_bytes", "database_bytes", "total_bytes", "available_bytes"})
        self.assertEqual(set(snapshot["thresholds"]), {"usage_warning_bytes", "free_warning_bytes"})
        public = self.output.read_text()
        self.assertNotIn(str(self.root), public)
        self.assertNotIn("sqlite.db", public)
        self.assertEqual(json.loads(public), snapshot)
        self.assertLess(len(public), 4096)
        self.assertEqual(stat.S_IMODE(self.output.stat().st_mode), 0o644)

    def test_failed_atomic_replace_keeps_previous_snapshot_and_removes_temporary_file(self):
        collector.publish(self.config())
        previous = self.output.read_bytes()

        def failed_replace(temporary, destination):
            self.assertEqual(Path(destination).read_bytes(), previous)
            self.assertEqual(Path(temporary).parent, self.output.parent)
            candidate = json.loads(Path(temporary).read_text())
            self.assertEqual(candidate["schema_version"], 1)
            raise OSError("private filesystem failure")

        with patch.object(collector.os, "replace", side_effect=failed_replace):
            with self.assertRaises(OSError):
                collector.publish(self.config())
        self.assertEqual(self.output.read_bytes(), previous)
        self.assertEqual(sorted(path.name for path in self.output.parent.iterdir()), ["storage.json"])

    def test_successful_atomic_replacement_has_no_partial_public_file(self):
        self.output.write_text("previous complete snapshot")
        original_replace = os.replace

        def checked_replace(temporary, destination):
            self.assertEqual(self.output.read_text(), "previous complete snapshot")
            self.assertEqual(json.loads(Path(temporary).read_text())["schema_version"], 1)
            original_replace(temporary, destination)

        with patch.object(collector.os, "replace", side_effect=checked_replace):
            collector.publish(self.config())
        self.assertEqual(json.loads(self.output.read_text())["schema_version"], 1)

    def test_collection_failure_retains_old_snapshot_and_hides_private_error_details(self):
        collector.publish(self.config())
        previous = self.output.read_bytes()
        output, error = io.StringIO(), io.StringIO()
        with patch.object(collector, "media_usage", side_effect=PermissionError("SECRET internal path")), contextlib.redirect_stdout(output), contextlib.redirect_stderr(error):
            result = collector.main(["--config", str(self.config_file)])
        self.assertEqual(result, 1)
        self.assertEqual(output.getvalue(), "")
        self.assertNotIn("SECRET", error.getvalue())
        self.assertNotIn(str(self.root), error.getvalue())
        self.assertEqual(self.output.read_bytes(), previous)

    def test_missing_database_does_not_publish_zero_or_update_time(self):
        collector.publish(self.config())
        previous = self.output.read_bytes()
        self.database.unlink()
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(collector.main(["--config", str(self.config_file)]), 1)
        self.assertEqual(self.output.read_bytes(), previous)

    def test_symlinked_media_entry_is_rejected_without_following_it(self):
        (self.media / "link").symlink_to(self.database.parent, target_is_directory=True)
        with self.assertRaises(collector.CollectionError):
            collector.collect_snapshot(self.config())
        self.assertFalse(self.output.exists())

    def test_configured_symlinks_and_overlapping_public_output_are_rejected(self):
        link = self.root / "media-link"
        link.symlink_to(self.media, target_is_directory=True)
        self.write_config(media_path=str(link))
        with self.assertRaises(collector.CollectionError):
            self.config()
        for output in (self.media / "storage.json", self.database.parent / "storage.json"):
            self.write_config(output_path=str(output))
            with self.assertRaises(collector.CollectionError):
                self.config()
        (self.media / "sqlite.db").write_bytes(b"fixture")
        self.write_config(database_path=str(self.media / "sqlite.db"))
        with self.assertRaises(collector.CollectionError):
            self.config()

    def test_sidecar_symlink_is_rejected(self):
        Path(str(self.database) + "-wal").symlink_to(self.media / "upload")
        with self.assertRaises(collector.CollectionError):
            collector.collect_snapshot(self.config())

    def test_directory_lock_prevents_overlapping_collection(self):
        descriptor = os.open(self.output.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):
                collector.publish(self.config())
            self.assertFalse(self.output.exists())
        finally:
            os.close(descriptor)
        collector.publish(self.config())
        self.assertTrue(self.output.exists())


if __name__ == "__main__":
    unittest.main()
