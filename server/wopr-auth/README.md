# WOPR auth and transmission service

Small dependency-free Node.js service for the private `/wopr/dashboard/` area on `dennishilk.com` and the moderated public **INCOMING TRANSMISSIONS** guestbook.
It reads secrets from the server environment and stores guestbook data outside the Git checkout.

## Architecture decision

The existing `server/wopr-auth/` service is extended instead of adding a second server process. This keeps WOPR session validation, private moderation endpoints, and the public guestbook API in one dependency-free Node.js process on `127.0.0.1:8787`.

Guestbook persistence uses a small local JSON Lines file because the workflow is append-heavy, low-volume, and moderated. No database is required for this use case.

## Endpoints

### Existing WOPR auth

- `POST /wopr/auth/login` — accepts JSON `{ "identifier": "...", "password": "..." }`; returns `200` and a signed `HttpOnly` session cookie on success, `401` on failure.
- `GET /wopr/auth/session` — returns `204` when the session cookie is valid, otherwise `401`; intended for nginx `auth_request`.
- `POST /wopr/auth/logout` — clears the session cookie.
- `POST /wopr/auth/event` — accepts allow-listed anonymous event names and keeps only in-memory aggregate counters.
- `GET /healthz` — local service health check.

### Public transmission API

- `POST /api/transmissions` — accepts JSON `{ "callsign": "...", "origin": "...", "message": "...", "contact_channel": "" }`, stores a `PENDING` record, and returns a neutral review-pending response.
- `GET /api/transmissions` — returns only `APPROVED` transmissions. It never returns `PENDING` or `REJECTED` records.

### Private WOPR moderation API

All `/wopr/api/...` endpoints require the existing valid WOPR session cookie. nginx should also protect them with the same `auth_request` check.

- `GET /wopr/api/transmissions/pending` — returns pending transmissions and the pending count.
- `POST /wopr/api/transmissions/:id/approve` — marks one pending transmission as `APPROVED`.
- `POST /wopr/api/transmissions/:id/reject` — marks one pending transmission as `REJECTED`.

## Stored data

Create this persistent directory on worldnode only:

```sh
sudo install -d -m 0750 -o wopr-auth -g wopr-auth /var/lib/wopr/transmissions
sudo install -m 0640 -o wopr-auth -g wopr-auth /dev/null /var/lib/wopr/transmissions/transmissions.jsonl
```

Records are stored as JSON Lines in:

```text
/var/lib/wopr/transmissions/transmissions.jsonl
```

Each record contains the visitor-provided callsign, optional origin, message, moderation status, generated id, and timestamps. IP addresses are not stored in this file. Do not commit `/var/lib/wopr/transmissions/` or any exported real messages.

## Abuse and privacy protections

- JSON `Content-Type` is required for submission and login requests.
- Request bodies are capped at 16 KiB.
- Only expected guestbook fields are accepted.
- Callsign, origin, and message have server-side length limits.
- Empty callsign/message submissions are rejected.
- A hidden `contact_channel` honeypot field accepts bots neutrally without storing a message.
- Public submissions are rate-limited in process and should also be rate-limited in nginx.
- Public reads return only approved messages.
- Frontend rendering uses `textContent`, not raw HTML.
- Passwords, secrets, request bodies, and visitor IP addresses are not logged by the service.
- ORIGIN is voluntary self-reported visitor text.

## Required server environment

Create this file on worldnode only:

```sh
sudo install -d -m 0750 -o root -g root /etc/wopr
sudo install -m 0640 -o root -g wopr-auth /dev/null /etc/wopr/wopr-auth.env
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
sudo install -m 0640 -o root -g wopr-auth /dev/null /etc/wopr/wopr-auth.env
sudo editor /etc/wopr/wopr-auth.env
sudo install -d -m 0750 -o wopr-auth -g wopr-auth /var/lib/wopr/transmissions
sudo install -m 0640 -o wopr-auth -g wopr-auth /dev/null /var/lib/wopr/transmissions/transmissions.jsonl
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
2. `/api/transmissions` proxies to `127.0.0.1:8787` and should have nginx rate limiting plus `client_max_body_size 16k`.
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
sudo install -m 0640 -o wopr-auth -g wopr-auth /dev/null /var/lib/wopr/transmissions/transmissions.jsonl
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

The wrong login must return `401`, pending messages must not appear in the public API, and private moderation endpoints must reject requests without a valid WOPR session.

## WOPR Security Intelligence private state

The authenticated security endpoints read generated private state from:

- `/var/lib/wopr/security/security-state.json`

The file is not served by nginx as static content. Generate it locally from nginx access logs with the defensive analyzer, for example:

```sh
sudo install -d -m 0750 -o wopr -g wopr /var/lib/wopr/security
WOPR_SECURITY_STATE_FILE=/var/lib/wopr/security/security-state.json node /path/to/dennishilk.github.io/scripts/wopr-security-analyzer.mjs /var/log/nginx/access.log /var/log/nginx/access.log.1
sudo chown wopr:wopr /var/lib/wopr/security/security-state.json
sudo chmod 0640 /var/lib/wopr/security/security-state.json
```

Recommended worldnode deployment steps:

1. Create `/var/lib/wopr/security` with owner/group readable by the WOPR auth service account and mode `0750`.
2. Run `scripts/wopr-security-analyzer.mjs` on a schedule as the WOPR service account, passing only this site's nginx access logs.
3. Set `WOPR_SECURITY_STATE_FILE` only if the state file is moved from `/var/lib/wopr/security/security-state.json`.
4. Keep nginx dotfile blocking in place; the self-check expects sensitive paths such as `/.git/HEAD`, `/.git/config`, and `/.env` to return `403` or `404`.

The security state intentionally stores aggregate counts and findings only. It must not contain raw IP addresses, user agents, request bodies, cookies, tokens, credentials, secret contents, or private filesystem paths.
