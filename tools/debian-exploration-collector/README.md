# Debian Exploration Collector

This standard-library Python service accepts **completed, reduced sessions**, immediately updates aggregate counters, and atomically persists only those counters. It never writes into the website checkout. The public endpoint derives display data from the shared aggregate file.

## Data and privacy policy

`POST /api/debian-exploration/session` accepts exactly schema version 1, a duration in seconds, and 1–500 `{command, elapsed_seconds}` entries. The final normalized command must be `exit` or `logout`, timings must be monotonic and within the session, duration is capped at eight hours, commands at 256 characters, and JSON at 32 KiB.

Normalization is deterministic: trim, lowercase, and fold whitespace; retain only explicitly allowlisted museum patterns (for example `rm -rf /`, `cat /etc/os-release`, and `systemctl status nginx`); otherwise retain only an allowlisted command name. Thus `ssh user@example.com`, `curl https://example/private-token`, `export API_KEY=secret`, and `echo mypassword` become `ssh`, `curl`, `export`, and `echo`. Unknown commands become `other`. The browser performs an initial reduction, but the service never trusts it.

No transcript, name, account, cookie, session identifier, IP address, user agent, referrer, or request header is persisted. The service suppresses its request log. nginx access logging must also be disabled using the supplied snippet; other infrastructure logs remain an operator responsibility. A process-wide in-memory sliding-window limit (30 POST attempts/minute) provides modest abuse protection without identifying visitors. It resets on restart, is shared by all visitors, and is not a defense against distributed abuse. Browser `sessionStorage` prevents a second submission from the same completed page; it is not an identity and is not sent. Since no identifier is accepted or retained, exactly-once delivery across devices is intentionally impossible.

The state file contains totals, frequency maps, theme visitor counts, early root-removal counts, and 3–5-command sequence counts. The public GET response contains only derived aggregates. Missing state is an honest empty archive. Writes use a same-directory temporary file, `fsync`, and `os.replace`, under a process lock.

## Debian 13 deployment

Do not deploy runtime data under `/srv/www/dennishilk.github.io`.

```sh
sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin debian-exploration
sudo install -d -o root -g root -m 0755 /opt/debian-exploration-collector
sudo install -o root -g root -m 0755 collector.py /opt/debian-exploration-collector/collector.py
sudo install -o root -g root -m 0644 deploy/debian-exploration-collector.service /etc/systemd/system/debian-exploration-collector.service
sudo install -d -o debian-exploration -g debian-exploration -m 0700 /var/lib/debian-exploration
sudo systemctl daemon-reload
sudo systemctl enable --now debian-exploration-collector.service
```

Copy `deploy/nginx-location.conf` into the existing HTTPS `server` block (or include it there), then run:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

The location deliberately forwards no client address, user-agent, or referrer headers, disables access logging only for `/api/debian-exploration/`, applies the matching 32 KiB body limit, and exposes no filesystem location. The collector binds only to `127.0.0.1:8765`.

## Verification

```sh
curl -i http://127.0.0.1:8765/api/debian-exploration/statistics
curl -i -X POST http://127.0.0.1:8765/api/debian-exploration/session \
  -H 'Content-Type: application/json' \
  --data '{"schema_version":1,"duration_seconds":12,"commands":[{"command":"ls","elapsed_seconds":2},{"command":"exit","elapsed_seconds":12}]}'
curl -i https://dennishilk.com/api/debian-exploration/statistics
sudo journalctl -u debian-exploration-collector.service
```

Open `/museum/debian-server-experiment/`, complete a session, then verify the public archive. The service can also be started manually for development:

```sh
python3 collector.py --host 127.0.0.1 --port 8765 --state /tmp/debian-exploration-statistics.json
```

Run tests with `python3 -m unittest discover -s tests -v` from this directory.
