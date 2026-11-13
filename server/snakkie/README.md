# Snakkie on Worldnode

The site uses `POST /api/snakkie/chat`. Familiar questions, Platt, jokes and
Wiesmoor weather still use the browser’s curated paths. Open questions and up to
two relevant exchanges go to the API for follow-ups. One short research query may go to
SearXNG. Source links come from SearXNG results supplied to the model. Whole
web pages are never fetched by the chat API.

## Start the chat bridge

Check the existing user services and their loopback bindings first. The model
API must reject unauthenticated requests and SearXNG must accept JSON requests.
The bridge runs as `nebu` and reads the existing model credential using
systemd’s `LoadCredential`. Node 22 is the runtime already used by WOPR.

From the website checkout on Worldnode:

```sh
sudo install -m 0644 server/snakkie/snakkie-chat.service /etc/systemd/system/snakkie-chat.service
sudo systemd-analyze verify /etc/systemd/system/snakkie-chat.service
sudo systemctl daemon-reload
sudo systemctl start snakkie-chat.service
```

Try a harmless open question against the bridge on loopback. This checks
authentication, model compatibility and the real model response together:

```sh
curl -fsS --max-time 55 http://127.0.0.1:8791/api/snakkie/chat \
  -H 'Content-Type: application/json' \
  --data-binary '{"language":"de","message":"Erklär mir in zwei Sätzen, warum ein Regenbogen gekrümmt aussieht."}'
```

Repeat with a short current-information question to verify SearXNG and check the
returned source links. Check the effective model and search service logging
before launch. Keep request text, search terms and keys out of the logs.

## Test Gemini on Worldnode

Run this in a separate SSH terminal as `nebu`. Create an API key in
[Google AI Studio](https://aistudio.google.com/api-keys) and save it as a
one-line file at `/home/nebu/snakkie-lab/secrets/gemini-api-key` with mode
`0600`. The key is a server credential. Keep it outside the web root.

```sh
SNAKKIE_KEY_FILE=/home/nebu/snakkie-lab/secrets/llama-api-key \
SNAKKIE_GEMINI_TEST_KEY_FILE=/home/nebu/snakkie-lab/secrets/gemini-api-key \
/srv/www/.tools/node22/bin/node /srv/www/dennishilk.github.io/server/snakkie/server.mjs
```

With the test credential set, the process listens only on `127.0.0.1:8792`.
Use the existing production service and nginx mapping for port 8791. In a
second SSH terminal, send a synthetic everyday question to the test process:

```sh
curl -fsS -i --max-time 55 http://127.0.0.1:8792/api/snakkie/chat \
  -H 'Content-Type: application/json' \
  --data-binary '{"language":"de","message":"Warum ist der Himmel blau? Antworte in zwei Sätzen."}'
```

`Server-Timing: gemini;dur=..., total;dur=...` identifies a Gemini reply.
A `model` timing identifies llama.cpp. Standalone everyday questions can go to
Gemini 3.5 Flash-Lite. Requests with conversation history, requests selected
for web search, and recognized sensitive phrases use the existing local
path. If Gemini fails, the test process falls back to llama.cpp and pauses
cloud requests for one minute. Stop the test process with Ctrl+C.

Before public activation, check
[Google’s terms](https://ai.google.dev/gemini-api/terms) for age and regional
requirements and set the account’s billing and quota. Update the chat’s data
disclosure for the external model. Google Search grounding has separate
[pricing](https://ai.google.dev/gemini-api/docs/pricing) and
[display requirements](https://ai.google.dev/gemini-api/docs/google-search).

## Publish

Copy `nginx-location.conf` to a file outside the document root. Include it in
the HTTPS server block for `www.dennishilk.com`. Back up the vhost first, use
`sudo nginx -t` before reloading, and enable the service after a successful
external check.

The vhost forwards the trusted nginx peer address using its own
`X-Snakkie-Client-IP` header. The app trusts this header only on loopback.
Check that nginx’s effective real-IP setup matches the trusted proxy topology.
The API allows same-origin browser requests on either hostname served by this
vhost. Search metadata points to the canonical www URL.

The bridge runs one expensive request at a time, accepts up to four per minute
per client and ten per minute overall, and returns a retry hint when busy.
Upstream calls have deadlines. Aborting an active browser request closes the
upstream connection. Verify that the installed llama.cpp cancels generation and
releases its own slot as expected. The application logs outcome and elapsed
time, without chat contents. Successful replies expose search, model and total
time as `Server-Timing` metrics. Prompt and generation time are included when
llama.cpp reports them. The browser keeps only the latest local lookup and
reply durations in its performance timeline. The site’s existing HTTP access logs still apply.

After reload, check both public language routes, source links, both blog posts
and the sitemaps. Run the isolated backend tests for repeated and concurrent
requests. Use only a small production check, with an immediate stop if the
website, GoToSocial, guestbook or Observer responds abnormally.

To roll back the API, remove the Snakkie include, validate and reload nginx,
then stop and disable `snakkie-chat.service`. The curated UI continues to work
when the API is unavailable. Keep the model and search user services on
loopback.
