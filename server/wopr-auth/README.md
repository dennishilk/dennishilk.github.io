# WOPR auth and transmission service

Small dependency-free Node.js service for the private `/wopr/dashboard/` area on `dennishilk.com` and the public **INCOMING TRANSMISSIONS** guestbook. Moderation is temporarily disabled by default; it can be restored with an environment flag.
It reads secrets from the server environment and stores guestbook data outside the Git checkout.

## Architecture decision

The existing `server/wopr-auth/` service is extended instead of adding a second server process. This keeps WOPR session validation, private moderation endpoints, and the public guestbook API in one dependency-free Node.js process on `127.0.0.1:8787`.

Guestbook persistence uses a small local JSON Lines file because the workflow is append-heavy, low-volume, and durable. No database is required for this use case.

## Endpoints

### Existing WOPR auth

- `POST /wopr/auth/login` — accepts JSON `{ "identifier": "...", "password": "..." }`; returns `200` and a signed `HttpOnly` session cookie on success, `401` on failure.
- `GET /wopr/auth/session` — returns `204` when the session cookie is valid, otherwise `401`; intended for nginx `auth_request`.
- `POST /wopr/auth/logout` — clears the session cookie.
- `POST /wopr/auth/event` — accepts allow-listed anonymous event names and keeps only in-memory aggregate counters.
- `GET /healthz` — local service health check.

### Public transmission API

- `POST /api/transmissions` — accepts JSON `{ "callsign": "...", "origin": "...", "message": "...", "contact_channel": "" }`. With moderation disabled (default), assigns a permanent signal number and immediately stores an `APPROVED` record. Set `WOPR_TRANSMISSIONS_MODERATION=true` to return to `PENDING` and manual approval.
- `GET /api/transmissions?page=N` — returns the requested numbered page of 10 published transmissions (newest first), along with `page`, `total`, `total_pages`, and `per_page`. All approved entries are accessible across pages; there is no 50-entry archive cap. It never returns `PENDING` or `REJECTED` records.

### Private WOPR moderation API

All `/wopr/api/...` endpoints require the existing valid WOPR session cookie. nginx should also protect them with the same `auth_request` check.

- `GET /wopr/api/transmissions/recent` — returns the last **100 stored entries** (approved, pending and rejected), plus their total count, pending count and original/optional display timestamps. Older entries remain on disk, even when not listed in WOPR.
- `POST /wopr/api/transmissions/:id/time` — authenticated JSON `{ "displayAt": "2026-11-10T13:35:00.000Z" }`, or `{ "displayAt": null }` to reset. Changes **only the public date/time**; the immutable `receivedAt` remains for audit. The WOPR editor accepts **Europe/Berlin local clock time** (10 Nov, 14:35 CET corresponds to 13:35 UTC in storage) and the public guestbook shows that same Berlin wall-clock time.
- `POST /wopr/api/transmissions/:id/hide` — hides an already published entry without deleting its record or signal number.
- `POST /wopr/api/transmissions/:id/restore` — restores a hidden entry and reuses the original signal number.
- `POST /wopr/api/transmissions/:id/approve` — publishes a pending transmission.
- `POST /wopr/api/transmissions/:id/reject` — rejects a pending transmission.

Admin actions require the existing WOPR session; mutating actions also check origin. The public guestbook always displays a record's manually chosen display time (when present), otherwise the original receipt time. The public archive is sorted by that display time, whereas the private 'last 100' list follows original storage order. No older records are automatically deleted.

## Stored data

Create this persistent directory on worldnode only:

```sh
sudo install -d -m 0750 -o wopr-auth -g wopr-auth /var/lib/wopr/transmissions
sudo -u wopr-auth touch /var/lib/wopr/transmissions/transmissions.jsonl
```

Records are stored as JSON Lines in:

```text
/var/lib/wopr/transmissions/transmissions.jsonl
```

Each record contains the visitor-provided callsign, optional origin, message, moderation status, generated id, timestamps, and a permanent `signal_number` assigned on approval. Existing approved records are migrated oldest-first. The adjacent `signal-state.json` counter prevents deleted numbers from being reused. On startup with moderation disabled, historical `PENDING` messages are automatically published in chronological order. No records are removed. **Never recreate an existing `transmissions.jsonl` using `install ... /dev/null`: that would truncate it.** IP addresses are not stored in these files. Do not commit `/var/lib/wopr/transmissions/` or any exported real messages.

## Abuse and privacy protections

- JSON `Content-Type` is required for submission and login requests.
- Request bodies are capped at 16 KiB.
- Only expected guestbook fields are accepted.
- Callsign, origin, and message have server-side length limits.
- Empty callsign/message submissions are rejected.
- A hidden `contact_channel` honeypot field accepts bots neutrally without storing a message.
- Guestbook submissions have **no per-IP or time-window quota**, in either the backend or the nginx example. The JSON size limit, input validation, honeypot, and origin checks remain. The login endpoint retains its own rate limit.
- Public reads return only approved messages.
- Frontend rendering uses `textContent`, not raw HTML.
- Passwords, secrets, request bodies, and visitor IP addresses are not logged by the service.
- ORIGIN is voluntary self-reported visitor text.

## Required server environment

Create this file on worldnode only:

```sh
sudo install -d -m 0750 -o root -g root /etc/wopr
sudo test -e /etc/wopr/wopr-auth.env || sudo install -m 0640 -o root -g wopr-auth /dev/null /etc/wopr/wopr-auth.env
sudo editor /etc/wopr/wopr-auth.env
```

Example keys for `/etc/wopr/wopr-auth.env`:

```dotenv
WOPR_AUTH_HOST=127.0.0.1
WOPR_AUTH_PORT=8787
WOPR_ALLOWED_ORIGIN=https://dennishilk.com
WOPR_AUTH_IDENTIFIER=replace-on-server
WOPR_AUTH_PASSWORD=replace-on-server
WOPR_SESSION_SECRET=replace-with-at-least-32-random-bytes
WOPR_SESSION_TTL_SECONDS=28800
WOPR_SESSION_COOKIE=wopr_session
WOPR_COOKIE_SECURE=true
WOPR_COOKIE_SAMESITE=Strict
WOPR_TRANSMISSIONS_DIR=/var/lib/wopr/transmissions
WOPR_TRANSMISSIONS_MODERATION=false
```

Generate a session secret on worldnode:

```sh
openssl rand -base64 48
```

Do not commit `/etc/wopr/wopr-auth.env`, `.env`, real passwords, password hashes, session secrets, `/var/lib/wopr/transmissions/`, or real visitor messages.

## systemd setup on worldnode

From a current checkout at `/srv/www/dennishilk.github.io`:

```sh
sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin wopr-auth || true
sudo install -d -m 0750 -o root -g root /etc/wopr
sudo test -e /etc/wopr/wopr-auth.env || sudo install -m 0640 -o root -g wopr-auth /dev/null /etc/wopr/wopr-auth.env
sudo editor /etc/wopr/wopr-auth.env
sudo install -d -m 0750 -o wopr-auth -g wopr-auth /var/lib/wopr/transmissions
sudo -u wopr-auth touch /var/lib/wopr/transmissions/transmissions.jsonl
sudo cp /srv/www/dennishilk.github.io/server/wopr-auth/wopr-auth.service /etc/systemd/system/wopr-auth.service
sudo systemctl daemon-reload
sudo systemctl enable --now wopr-auth.service
sudo systemctl restart wopr-auth.service
sudo systemctl status wopr-auth.service
curl -fsS http://127.0.0.1:8787/healthz
```

The service unit must allow writes to `/var/lib/wopr/transmissions` via `ReadWritePaths=/var/lib/wopr/transmissions`.

## nginx setup on worldnode

Use `wopr/nginx.example.conf` as the WOPR/API section for the `dennishilk.com` server block. The important pieces are:

1. `/wopr/`, `/wopr/wopr.css`, and `/wopr/wopr.js` stay public.
2. `/api/transmissions` proxies to `127.0.0.1:8787` without nginx request-rate limiting and with `client_max_body_size 16k`. Remove any existing `limit_req` from the actual server's `location = /api/transmissions`, not just from the tracked example.
3. `/wopr/auth/login`, `/wopr/auth/logout`, and `/wopr/auth/event` proxy to `127.0.0.1:8787`.
4. `/_wopr_session_check` is `internal` and proxies to `GET /wopr/auth/session`.
5. `location ^~ /wopr/api/` uses `auth_request /_wopr_session_check;` and proxies to `127.0.0.1:8787`.
6. `location ^~ /wopr/` continues to use `auth_request /_wopr_session_check;` before serving dashboard files.

After editing nginx:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

## Commands after git pull on worldnode

```sh
cd /srv/www/dennishilk.github.io
git pull --ff-only
sudo install -d -m 0750 -o wopr-auth -g wopr-auth /var/lib/wopr/transmissions
# Important: never overwrite or truncate the existing transmissions.jsonl.
sudo cp server/wopr-auth/wopr-auth.service /etc/systemd/system/wopr-auth.service
sudo systemctl daemon-reload
sudo systemctl restart wopr-auth.service
sudo nginx -t
sudo systemctl reload nginx
```

## Manual smoke test

```sh
curl -i https://dennishilk.com/wopr/
curl -i https://dennishilk.com/wopr/dashboard/
curl -i -X POST https://dennishilk.com/wopr/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"identifier":"wrong","password":"wrong"}'
curl -i -X POST https://dennishilk.com/api/transmissions \
  -H 'Content-Type: application/json' \
  --data '{"callsign":"tux42","origin":"DE","message":"found this through GitHub. stayed for WOPR.","contact_channel":""}'
curl -i https://dennishilk.com/api/transmissions
curl -i https://dennishilk.com/wopr/api/transmissions/pending
```

The wrong login must return `401`, published messages must appear without review, the numbered archive must expose every approved entry, and private moderation endpoints must reject requests without a valid WOPR session.

## WOPR Security Intelligence private state

The authenticated security endpoints read generated private state from:

- `/var/lib/wopr/security/security-state.json`

The file is not served by nginx as static content. The analyzer runs separately from `wopr-auth` so the web backend does not receive direct access to nginx logs. The ownership model is:

- `wopr-auth`: existing web backend user/group; reads the generated security state only. Do not add this user to `adm`.
- `wopr-security`: dedicated analyzer user; runs with primary group `wopr-auth` so new state files are group-readable by the web backend.
- `adm`: supplementary group for `wopr-security` only, allowing reads of `/var/log/nginx/access.log` while preserving the existing `www-data:adm` `0640` nginx log permissions.
- `/var/lib/wopr/security`: owned by `wopr-security:wopr-auth` with mode `0750`. This keeps the directory private while permitting `wopr-auth` to traverse it.
- `/var/lib/wopr/security/security-state.json`: owned by `wopr-security:wopr-auth` with mode `0640`. This keeps the generated state readable by `wopr-auth` and not publicly readable.
- `/var/lib/wopr/security/case-ledger.json`: owned by `wopr-security:wopr-auth` with mode `0640`. This durable, sanitized case ledger is separate from the raw 24-hour analyzer snapshot and retains cases after they are no longer detected.

Worldnode analyzer deployment steps from a current checkout at `/srv/www/dennishilk.github.io`:

```sh
sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin wopr-security || true
sudo usermod -g wopr-auth -a -G adm wopr-security
sudo install -d -m 0750 -o wopr-security -g wopr-auth /var/lib/wopr/security
sudo cp /srv/www/dennishilk.github.io/server/wopr-auth/wopr-security-analyzer.service /etc/systemd/system/wopr-security-analyzer.service
sudo cp /srv/www/dennishilk.github.io/server/wopr-auth/wopr-security-analyzer.timer /etc/systemd/system/wopr-security-analyzer.timer
sudo systemctl daemon-reload
sudo systemctl enable --now wopr-security-analyzer.timer
sudo systemctl start wopr-security-analyzer.service
sudo stat -c '%U:%G %a %n' /var/lib/wopr/security /var/lib/wopr/security/security-state.json
sudo systemctl status wopr-security-analyzer.timer
systemctl list-timers wopr-security-analyzer.timer
```

The timer runs at boot after two minutes and then every 10 minutes with `Persistent=true`, so missed runs are triggered after downtime. The service executes:

```sh
/usr/bin/node /srv/www/dennishilk.github.io/scripts/wopr-security-analyzer.mjs /var/log/nginx/access.log
```

The service hardening intentionally keeps `/var/log/nginx` read-only and `/var/lib/wopr/security` writable by combining `ProtectSystem=strict`, `ReadOnlyPaths=/var/log/nginx`, and `ReadWritePaths=/var/lib/wopr/security`. Keep nginx dotfile blocking in place; the security state intentionally stores aggregate counts and findings only. It must not contain raw IP addresses, user agents, request bodies, cookies, tokens, credentials, secret contents, or private filesystem paths.

### Operator review annotations

Operator decisions are stored independently from analyzer output in `/var/lib/wopr/security/operator-reviews.json` (override with `WOPR_SECURITY_REVIEWS_FILE`). It is a private, mode-`0640` JSON document with a `reviews` map keyed by deterministic finding ID. Each entry contains the current status (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`, or `EXPECTED`), plain-text note, review timestamps, and append-only status history. The analyzer never reads or rewrites this file.

The analyzer writes only current observations to `security-state.json`. It reconciles those observations into `/var/lib/wopr/security/case-ledger.json` (override with `WOPR_SECURITY_CASES_FILE`), which stores safe aggregate metadata only: deterministic ID, title/category/severity, first/last seen, current-detection flag, last automated status/message, and aggregate request count. The authenticated API composes ledger cases with separate operator reviews. When an observation disappears, its case becomes **NO LONGER DETECTED**, remains reviewable, and does not count as an active finding. A reappearing ID reactivates the same case while preserving `first_seen`; activity after an `RESOLVED` or `EXPECTED` review is shown as **REOCCURRED**. The legacy remediated Git incident is seeded once into this generic ledger, so it remains visible without being duplicated in raw analyzer output.

Generated findings use IDs based on their stable category and severity, such as `finding-secret_hunting-high`; this analyzer intentionally aggregates one finding per category/severity, so no collision is possible within its output. Counts and `last_seen` are deliberately excluded. The authenticated API decorates ledger findings at read time. If a `RESOLVED` or `EXPECTED` finding is active and its `last_seen` is later than `resolved_at`, it is marked as recurrence and once again counts in **ACTIVE FINDINGS**. Active `OPEN`, `ACKNOWLEDGED`, and recurrent findings count; closed non-recurrent findings do not. Cases that are no longer detected never count as active by default.
