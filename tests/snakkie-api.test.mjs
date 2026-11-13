import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createChatServer } from '../server/snakkie/server.mjs';

const model = text => Response.json({ choices: [{ message: { content: text } }] });

async function fixture(t, fetcher = async () => model('Moin from the model.')) {
  const server = createChatServer({ key: 'fixture-key', fetcher, log: () => {} });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = 'http://127.0.0.1:' + server.address().port + '/api/snakkie/chat';
  return {
    url,
    post: (data, options = {}) => fetch(url, {
      method: 'POST',
      body: typeof data === 'string' ? data : JSON.stringify(data),
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    })
  };
}

test('chat uses the protected local model, bounded history and selected language', async t => {
  const request = await fixture(t, async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8081/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer fixture-key');
    assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.equal(body.max_tokens, 120);
    assert.equal(body.chat_template_kwargs.enable_thinking, false);
    assert.match(body.messages[0].content, /Nebbys Cousin/);
    assert.match(body.messages[0].content, /Die Person im Chat ist ein Gast/);
    assert.match(body.messages[0].content, /in natürlichem Deutsch/);
    assert.deepEqual(body.messages.slice(1, -1), [
      { role: 'user', content: 'Was ist Debian?' },
      { role: 'assistant', content: 'Debian ist eine Linux-Distribution.' }
    ]);
    return model('<think>hidden reasoning</think>Debian liefert Linux als Distribution.');
  });
  const response = await request.post({
    language: 'de', message: 'Erklär das einfacher.', history: [
      { role: 'user', content: 'Was ist Debian?' },
      { role: 'assistant', content: 'Debian ist eine Linux-Distribution.' }
    ]
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { text: 'Debian liefert Linux als Distribution.', sources: [], search: 'unused' });
});

test('explicitly detailed requests retain the larger answer budget', async t => {
  const request = await fixture(t, async (_, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.max_tokens, 180);
    assert.match(body.messages[0].content, /natural English/);
    return model('A detailed answer.');
  });
  assert.equal((await request.post({ language: 'en', message: 'Explain this step by step.' })).status, 200);
});

test('the model timeout has a distinct response and releases the slot', async t => {
  let first = true;
  const request = await fixture(t, async () => {
    if (first) {
      first = false;
      throw new DOMException('deadline', 'TimeoutError');
    }
    return model('Ready again.');
  });
  const chat = { language: 'en', message: 'Explain rainbows.' };
  const timedOut = await request.post(chat);
  assert.equal(timedOut.status, 504);
  assert.deepEqual(await timedOut.json(), { error: 'timeout' });
  assert.equal((await request.post(chat)).status, 200);
});

test('research returns only cited results and prefers an official source', async t => {
  const request = await fixture(t, async (url, options) => {
    if (url.endsWith('/search')) {
      assert.equal(url, 'http://127.0.0.1:8888/search');
      assert.equal(options.method, 'POST');
      assert.equal(options.body.get('q'), 'Was ist aktuell bei Debian?');
      return Response.json({ results: [
        { url: 'https://example.com/story', title: 'Unofficial', content: 'Commentary' },
        { url: 'https://www.debian.org/News/', title: 'Debian News', content: 'Release notes excerpt' },
        { url: 'https://local.invalid/story', title: 'Invalid source', content: 'Fixture' }
      ] });
    }
    const prompt = JSON.parse(options.body).messages[0].content;
    assert.match(prompt, /nur Fakten aus den Auszügen.*Jede Behauptung direkt belegen/);
    assert.match(prompt, /\[1\] Debian News: Release notes excerpt/);
    assert.doesNotMatch(prompt, /Invalid source/);
    return model('Die offiziellen Neuigkeiten findest du hier [1]. [9]');
  });
  const response = await request.post({ language: 'de', message: 'Recherchiere Was ist aktuell bei Debian?' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    text: 'Die offiziellen Neuigkeiten findest du hier [1].',
    sources: [{ id: '1', label: 'Debian News', url: 'https://www.debian.org/News/' }],
    search: 'used'
  });
});

test('search failures, empty results and uncited results are distinguished', async t => {
  let searchCall = 0;
  const request = await fixture(t, async url => {
    if (!url.endsWith('/search')) return model('The fixture has no source citation.');
    searchCall++;
    if (searchCall === 1) return new Response(null, { status: 503 });
    if (searchCall === 2) return Response.json({ results: [] });
    return Response.json({ results: [{ url: 'https://example.com/', title: 'Fixture', content: 'Excerpt' }] });
  });
  for (const state of ['unavailable', 'empty', 'unverified']) {
    const response = await request.post({ language: 'en', message: 'What is the latest news?' });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.search, state);
    assert.deepEqual(data.sources, []);
    if (state === 'unverified') assert.match(data.text, /couldn’t reliably tie/);
  }
});

test('sensitive search text and conversation history are kept out of web requests', async t => {
  let searches = 0;
  const request = await fixture(t, async (url, options) => {
    if (url.endsWith('/search')) {
      searches++;
      assert.equal(options.body.get('q'), 'What is the latest Debian news?');
      return Response.json({ results: [] });
    }
    return model('Fixture response');
  });
  const history = [
    { role: 'user', content: 'Earlier conversation text' },
    { role: 'assistant', content: 'Earlier reply' }
  ];
  assert.equal((await (await request.post({ language: 'en', message: 'Latest news for a@example.com?', history })).json()).search, 'skipped');
  assert.equal((await (await request.post({ language: 'en', message: 'What is the latest Debian news?', history })).json()).search, 'empty');
  assert.equal(searches, 1);
});

test('invalid requests are rejected before using a service', async t => {
  let calls = 0;
  const request = await fixture(t, async () => { calls++; return model('fixture'); });
  const chat = { language: 'en', message: 'Hello' };
  assert.equal((await fetch(request.url)).status, 405);
  assert.equal((await request.post(chat, { headers: { Origin: 'https://example.com' } })).status, 403);
  assert.equal((await request.post(chat, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await request.post('{')).status, 400);
  assert.equal((await request.post({ ...chat, history: [{ role: 'system', content: 'fixture' }] })).status, 400);
  assert.equal((await request.post({ ...chat, message: 'a'.repeat(801) })).status, 413);
  assert.equal((await request.post('a'.repeat(12 * 1024 + 1))).status, 413);
  assert.equal(calls, 0);
});

test('concurrent requests are rejected politely and an aborted client releases the bridge slot', async t => {
  let start;
  const started = new Promise(resolve => { start = resolve; });
  let stopped;
  const aborted = new Promise(resolve => { stopped = resolve; });
  let calls = 0;
  const request = await fixture(t, async (_, { signal }) => {
    if (++calls !== 1) return model('Ready again.');
    start();
    return new Promise((_, reject) => signal.addEventListener('abort', () => {
      stopped();
      reject(signal.reason);
    }, { once: true }));
  });
  const chat = { language: 'en', message: 'Explain why rainbows look curved.' };
  const controller = new AbortController();
  const first = request.post(chat, { signal: controller.signal });
  await started;
  const second = await request.post(chat);
  assert.equal(second.status, 503);
  assert.deepEqual(await second.json(), { error: 'busy' });
  assert.equal(second.headers.get('Retry-After'), '5');
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  await aborted;
  const next = await request.post(chat);
  assert.equal(next.status, 200);
  assert.equal((await next.json()).text, 'Ready again.');
});

test('model outages are reported and repeated requests are rate-limited', async t => {
  let calls = 0;
  const request = await fixture(t, async () => {
    calls++;
    return new Response(null, { status: 503 });
  });
  const chat = { language: 'en', message: 'Explain why rainbows look curved.' };
  for (let index = 0; index < 4; index++) {
    const response = await request.post(chat);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'unavailable' });
  }
  const limited = await request.post(chat);
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('Retry-After')) > 0);
  assert.equal(calls, 4);
});
