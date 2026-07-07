# WOPR auth service

Small dependency-free Node.js service for the private `/wopr/dashboard/` area on `dennishilk.com`.
It is intentionally stateless and reads all secrets from the server environment.

## Endpoints

- `POST /wopr/auth/login` — accepts JSON `{ "identifier": "...", "password": "..." }`; returns `200` and a signed `HttpOnly` session cookie on success, `401` on failure.
- `GET /wopr/auth/session` — returns `204` when the session cookie is valid, otherwise `401`; intended for nginx `auth_request`.
- `POST /wopr/auth/logout` — clears the session cookie.
- `POST /wopr/auth/event` — accepts allow-listed anonymous event names and keeps only in-memory aggregate counters.
- `GET /healthz` — local service health check.

The service never stores password values, never prints request bodies, and needs no database.

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
```

Generate a session secret on worldnode:

```sh
openssl rand -base64 48
```

Do not commit `/etc/wopr/wopr-auth.env`, `.env`, real passwords, password hashes, or session secrets.

## systemd setup on worldnode

From a current checkout at `/srv/www/dennishilk.github.io`:

```sh
sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin wopr-auth
sudo install -d -m 0750 -o root -g root /etc/wopr
sudo install -m 0640 -o root -g wopr-auth /dev/null /etc/wopr/wopr-auth.env
sudo editor /etc/wopr/wopr-auth.env
sudo cp /srv/www/dennishilk.github.io/server/wopr-auth/wopr-auth.service /etc/systemd/system/wopr-auth.service
sudo systemctl daemon-reload
sudo systemctl enable --now wopr-auth.service
sudo systemctl status wopr-auth.service
curl -fsS http://127.0.0.1:8787/healthz
```

## nginx setup on worldnode

Use `wopr/nginx.example.conf` as the WOPR section for the `dennishilk.com` server block. The important pieces are:

1. `/wopr/`, `/wopr/wopr.css`, and `/wopr/wopr.js` stay public.
2. `/wopr/auth/login`, `/wopr/auth/logout`, and `/wopr/auth/event` proxy to `127.0.0.1:8787`.
3. `/_wopr_session_check` is `internal` and proxies to `GET /wopr/auth/session`.
4. `location ^~ /wopr/` uses `auth_request /_wopr_session_check;` before serving dashboard files.

After editing nginx:

```sh
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
```

The wrong login must return `401` and must not log the submitted password.
