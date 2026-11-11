'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildSync } = require('esbuild');

const compiled = { exports: {} };
new Function('module', buildSync({
  entryPoints: [path.join(__dirname, '../../src/features/http-work/model.ts')],
  bundle: true, write: false, platform: 'node', format: 'cjs', target: 'es2022',
}).outputFiles[0].text)(compiled);
const { streamModel } = compiled.exports;
const origin = 'https://model.example';
const defaults = () => ({ origin, url: origin + '/v1/chat/completions', apiKey: 'synthetic-key', model: 'test-model', prompt: 'synthetic prompt', signal: new AbortController().signal });
const event = text => 'data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\r\n\r\n';
async function* split(text) {
  const bytes = Buffer.from(text);
  for (let i = 0; i < bytes.length; i++) yield bytes.subarray(i, i + 1);
}
function host(body, { status = 200, headers = [['content-type', 'text/event-stream; charset=utf-8']] } = {}) {
  const calls = [];
  let cancelled = 0;
  return {
    calls, get cancelled() { return cancelled; },
    request: async request => {
      calls.push(request);
      return { status, headers, body, cancel: async () => { cancelled++; } };
    },
  };
}

test('model text arrives before DONE, across UTF-8 and CRLF boundaries, with the chosen endpoint and Bearer key', async () => {
  let receivedFirst;
  let release;
  const first = new Promise(resolve => { receivedFirst = resolve; });
  const continueStream = new Promise(resolve => { release = resolve; });
  let closed = false;
  const http = host((async function* () {
    try {
      yield* split(': heartbeat\r\n\r\ndata: {"choices":[{"delta":{"role":"assistant"}}]}\r\n\r\n' + event('你'));
      receivedFirst();
      await continueStream;
      yield* split('data: {"choices":[\r\ndata: {"delta":{"content":"好"}}]}\r\n\r\n');
      yield* split('data: {"choices":[],"usage":{"total_tokens":2}}\n\ndata: [DONE]\n\n');
      assert.fail('DONE must close the stream without requesting more bytes');
    } finally { closed = true; }
  })());
  const options = { ...defaults(), url: origin + '/custom/chat/completions?mode=test' };
  const text = [];
  const running = streamModel(http, options, delta => text.push(delta));
  try {
    await first;
    assert.deepEqual(text, ['你']);
  } finally { release(); }
  await running;
  assert.deepEqual(text, ['你', '好']);
  assert.equal(closed, true);
  assert.equal(http.cancelled, 1);
  const request = http.calls[0];
  assert.equal(request.permission, 'model-api');
  assert.equal(request.method, 'POST');
  assert.equal(request.url, options.url);
  assert.equal(request.signal, options.signal);
  assert.deepEqual(request.headers, [['Content-Type', 'application/json'], ['Accept', 'text/event-stream'], ['Authorization', 'Bearer synthetic-key']]);
  assert.deepEqual(JSON.parse(request.body), { model: 'test-model', messages: [{ role: 'user', content: 'synthetic prompt' }], stream: true });
});

test('cancelling keeps partial text, stops further events in the same chunk and releases the response', async () => {
  const controller = new AbortController();
  const http = host((async function* () { yield Buffer.from(event('first') + event('late') + 'data: [DONE]\n\n'); })());
  const text = [];
  await assert.rejects(streamModel(http, { ...defaults(), signal: controller.signal }, delta => {
    text.push(delta);
    controller.abort();
  }), { name: 'AbortError' });
  assert.deepEqual(text, ['first']);
  assert.equal(http.cancelled, 1);
});

test('premature EOF and stream errors are failures, preserve earlier text and release the request', async () => {
  for (const suffix of ['', 'data: {invalid}\n\n', 'data: {"error":{"message":"synthetic-key"}}\n\n']) {
    const text = [];
    const http = host(split(event('partial') + suffix));
    await assert.rejects(streamModel(http, defaults(), delta => text.push(delta)), error => {
      assert.ok(!error.message.includes('synthetic-key'));
      return /incomplete|invalid JSON|error event/.test(error.message);
    });
    assert.deepEqual(text, ['partial']);
    assert.equal(http.cancelled, 1);
  }
});

test('HTTP errors and non-SSE responses are explicit and never expose a remote error body', async () => {
  for (const response of [{ status: 401 }, { headers: [['Content-Type', 'application/json']] }]) {
    const http = host((async function* () { assert.fail('Rejected response bodies must not be read'); })(), response);
    await assert.rejects(streamModel(http, defaults(), () => assert.fail('No model text expected')), /HTTP 401|text\/event-stream/);
    assert.equal(http.cancelled, 1);
  }
});

test('foreign endpoints and empty inputs fail before sending; local services can omit a key', async () => {
  const http = host(split('data: [DONE]\n\n'));
  for (const changed of [{ url: 'https://other.example/v1/chat/completions' }, { url: 'https://user:secret@model.example/v1/chat/completions' }, { model: ' ' }, { prompt: ' ' }]) {
    await assert.rejects(streamModel(http, { ...defaults(), ...changed }, () => {}));
  }
  assert.equal(http.calls.length, 0);
  await streamModel(http, { ...defaults(), apiKey: '' }, () => {});
  assert.ok(http.calls[0].headers.every(([name]) => name !== 'Authorization'));
});
