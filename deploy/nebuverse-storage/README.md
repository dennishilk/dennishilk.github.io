# NEBUVERSE storage telemetry — manual Worldnode setup

The website changes live in GitHub. Dennis deploys them by pulling `main` on
Worldnode. Nothing in this directory installs itself, and GitHub Actions cannot
measure the server's storage. Before the collector is installed, the dashboard
shows **Awaiting telemetry** with empty metrics.

Public dashboard: <https://www.dennishilk.com/traffic.html>
German mirror: <https://www.dennishilk.com/de/traffic.html>
Public instance: <https://social.dennishilk.com>

## Measurement contract

The Python 3 collector supports **local media storage and a file-backed SQLite
database on Linux**. It reads directory entries, file metadata and available
filesystem space. It does not read uploads, open/query SQLite, inspect logs or
GoToSocial credentials, contact a network service, or perform cleanup.

- Media usage is allocated disk space in the configured media directory,
  including directory metadata; hard links are counted once.
- SQLite usage includes the database and any `-wal`, `-shm` and `-journal` files.
- Total GoToSocial storage is media plus SQLite usage. Binaries, configuration,
  logs, backups and unrelated directories are excluded.
- Available space uses bytes available to an ordinary user, excluding reserved
  filesystem blocks. If media and SQLite are on separate filesystems, it is the
  **lower** available space of those two filesystems.
- Measurements reflect a live filesystem scan, not a transactional database
  snapshot. Concurrently deleted cache entries are skipped. Permission errors,
  missing required paths, symlinks and nested media mounts fail the run rather
  than publish an incomplete measurement.

The only public file is `/data/nebuverse/storage.json`. Its fields are:

| Field | Meaning |
| --- | --- |
| `schema_version` | `1` |
| `status` | `ok` or `warning`, derived from the configured thresholds |
| `measured_at` | UTC timestamp of the last completed measurement, ISO 8601 with `Z` |
| `stale_after_seconds` | Snapshot expiry, default 1200 seconds |
| `storage.media_bytes` | Allocated media storage bytes |
| `storage.database_bytes` | Allocated SQLite storage bytes, including journal files |
| `storage.total_bytes` | Sum of media and SQLite bytes |
| `storage.available_bytes` | Available disk space as defined above |
| `thresholds.usage_warning_bytes` | Warning when total is **at least** this value |
| `thresholds.free_warning_bytes` | Warning when free space is **below** this value |

There are no hostnames, IP addresses, private paths, account identifiers,
credentials, logs or arbitrary error messages in this JSON. The frontend accepts
only this contract, validates values/timestamps/status, and never renders unknown
fields. It makes an independent same-origin request once a minute, with an
8-second timeout and no cookies. Traffic and home-connection feeds are unaffected.
Human requests to the new storage JSON are excluded from traffic aggregates using
the existing internal-polling rule; bot and scanner requests remain observable.

Each successful run writes a temporary file in the destination directory,
flushes it, and replaces the public JSON atomically. A directory lock prevents
overlapping collectors. Failure leaves the last successful snapshot intact and
returns a nonzero exit status with a generic local error. The UI marks old data
as **Stale data** after its configured expiry, preserves the measurement time,
and distinguishes failed downloads from fresh measurements. The displayed date
uses Europe/Berlin; JSON timestamps remain UTC. No generated snapshot belongs
in Git (`/data/` is already ignored).

## Initial installation

Run these commands **later, manually on Worldnode**, one at a time. The existing
Debian 13 Python 3 and systemd are sufficient; there are no Python dependencies.
The output uses the same static `/data/` area as the traffic feed.

Start in the existing checkout and pull the finished website changes:

```bash
cd /srv/www/dennishilk.github.io
```

```bash
git pull --ff-only origin main
```

Install the collector outside the public website directory:

```bash
sudo install -d -m 0755 /usr/local/libexec
```

```bash
sudo install -m 0755 scripts/collect-nebuverse-storage.py /usr/local/libexec/collect-nebuverse-storage.py
```

Create its dedicated public output directory:

```bash
sudo install -d -o root -g root -m 0755 /srv/www/dennishilk.github.io/data/nebuverse
```

Install the private configuration **for the first installation only**:

```bash
sudo install -o root -g root -m 0600 deploy/nebuverse-storage/config.example.json /etc/nebuverse-storage.json
```

Edit the two `/CHANGE/ME/` values before running the collector:

```bash
sudoedit /etc/nebuverse-storage.json
```

Set `media_path` to the existing GoToSocial **`storage-local-base-path`** and
`database_path` to the existing **`db-address`**, converted to absolute paths.
Resolve relative GoToSocial paths against its actual service working directory.
Use host paths for container bind mounts. Do not copy GoToSocial's full
configuration into this file or into the web directory.

Keep `output_path` at
`/srv/www/dennishilk.github.io/data/nebuverse/storage.json`. If the website
checkout is elsewhere, adjust this output path and the service's `ReadWritePaths`
together. The destination must be outside GoToSocial's media and database
directories. Do not point this collector at S3 storage or PostgreSQL.

Defaults preserve the existing monitor: `usage_warning_gib: 5` and
`free_warning_gib: 10`. Positive fractional GiB thresholds are supported.
`stale_after_seconds` may be 60–86400; 1200 allows four missed five-minute runs.
These public thresholds are emitted in every snapshot, so changing the private
configuration does not require a frontend edit.

Run one real collection before enabling periodic execution:

```bash
sudo /usr/bin/python3 /usr/local/libexec/collect-nebuverse-storage.py --config /etc/nebuverse-storage.json
```

Inspect the minimal public result:

```bash
python3 -m json.tool /srv/www/dennishilk.github.io/data/nebuverse/storage.json
```

The JSON is published with mode `0644`; private configuration stays `0600`.
The web server only needs read access to the output. Keep the dedicated output
directory writable only by root. View `/traffic.html` to check the measurement.
If your existing nginx setup blocks this static directory, review that local
configuration yourself; no nginx configuration is installed by these steps.

## Periodic execution through systemd

The supplied oneshot runs as root to read metadata in the existing private
storage tree without changing GoToSocial's permissions. Its filesystem is read
only except for the dedicated public output directory, and it has no network
access. It neither restarts nor changes the GoToSocial service.

```bash
sudo install -m 0644 deploy/nebuverse-storage/nebuverse-storage.service /etc/systemd/system/nebuverse-storage.service
```

```bash
sudo install -m 0644 deploy/nebuverse-storage/nebuverse-storage.timer /etc/systemd/system/nebuverse-storage.timer
```

```bash
sudo systemd-analyze verify /etc/systemd/system/nebuverse-storage.service /etc/systemd/system/nebuverse-storage.timer
```

```bash
sudo systemctl daemon-reload
```

```bash
sudo systemctl start nebuverse-storage.service
```

```bash
sudo systemctl enable --now nebuverse-storage.timer
```

Check the scheduled execution:

```bash
systemctl list-timers nebuverse-storage.timer --all
```

To inspect a failed run locally:

```bash
sudo journalctl -u nebuverse-storage.service -n 20 --no-pager
```

If GoToSocial data is under `/home`, `/root` or `/run/user`, set
`ProtectHome=read-only` in a local service override using
`sudo systemctl edit nebuverse-storage.service`. `PrivateTmp=true` hides temporary
locations: permanent GoToSocial storage should not be in `/tmp` or `/var/tmp`.
After any unit/override change, run `sudo systemctl daemon-reload` and test the
oneshot again. Do not loosen write access to the GoToSocial data directories.

## Updates and verification

For a later repository update, pull `main`, reinstall the collector and units,
reload systemd and start the oneshot. Preserve `/etc/nebuverse-storage.json`;
do not overwrite it with the example again. No server-generated JSON is committed.

Repository checks, runnable locally without server access:

```bash
node --test tests/site-traffic-observer.test.mjs tests/traffic-live-stream-rendering.test.mjs tests/nebuverse-storage.test.mjs
```

```bash
python3 -m unittest discover -s tests -p 'test_nebuverse_storage.py' -v
```

Configuration references:
[GoToSocial storage](https://docs.gotosocial.org/en/latest/configuration/storage/),
[GoToSocial SQLite](https://docs.gotosocial.org/en/latest/configuration/database/),
[Debian 13 systemd sandboxing](https://manpages.debian.org/trixie/systemd/systemd.exec.5.en.html).
