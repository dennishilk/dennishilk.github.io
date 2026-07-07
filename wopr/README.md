# WOPR private staging area

`/wopr/` is the future private lab for unfinished World Observer modules on `dennishilk.com`.
This directory belongs to the website repository (`dennishilk.github.io`), not to `dennishilk/world-observer`.

## What is implemented here

- A WarGames/WOPR-inspired login page at `/wopr/`.
- A playable Tic-Tac-Toe Easter egg after an unrecognized login response.
- A placeholder internal dashboard at `/wopr/dashboard/` for future Observer staging cards.
- `noindex`, `nofollow` and `noarchive` meta tags on WOPR pages.
- A server-side auth contract and nginx example config.

## Security model

The visible terminal login is only the user interface. Real access control must happen on the server.
Do not put passwords, password hashes, API keys, session secrets or `.htpasswd` files in this repository.

The frontend posts credentials over HTTPS to:

```text
POST /wopr/auth/login
Content-Type: application/json

{ "identifier": "...", "password": "..." }
```

Expected responses:

- `200` with a secure `HttpOnly` session cookie: login succeeded; frontend redirects to `/wopr/dashboard/`.
- `401` or `403`: login failed; frontend starts Tic-Tac-Toe.
- Any network/server error: frontend reports that the auth service is not active.

The password value must never be logged, stored in browser storage, echoed, or written to analytics. The current JavaScript resets the form after every server response and only emits anonymous event names.

## Paths that must be protected server-side

The login page and static WOPR assets may be visible:

- `/wopr/`
- `/wopr/index.html`
- `/wopr/wopr.css`
- `/wopr/wopr.js`

Private paths must require a valid server-side session:

- `/wopr/dashboard/`
- future module paths such as `/wopr/geomagnetic/`
- any future `/wopr/private/` data exports

Do not rely on frontend routing or hidden links. Direct requests to private subpaths must be denied without a valid session.

## Anonymous/aggregated events

The frontend can send event names to `/wopr/auth/event` with `navigator.sendBeacon`:

- `wopr_view`
- `login_failed`
- `login_success`
- `tictactoe_started`
- `tictactoe_finished`

The server should store only aggregate counters and timestamps if needed. Do not store passwords, request bodies containing passwords, raw query strings with secrets, or long-lived visitor identifiers.
