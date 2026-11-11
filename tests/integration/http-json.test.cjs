'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('esbuild');

// Exercise the same request logic bundled into the card, without a WebView or live service.
const compiled = { exports: {} };
new Function('module', transformSync(fs.readFileSync(path.join(__dirname, '../../src/features/http-work/json.ts'), 'utf8'), {
  loader: 'ts', format: 'cjs', target: 'es2022',
}).code)(compiled);
const { requestJsonDemo } = compiled.exports;
const origin = 'https://jsonplaceholder.typicode.com';

test('JSON demo uses the chosen method, full path and query, and releases the response', async () => {
  const calls = [];
  let cancelled = 0;
  const http = { request: async request => {
    calls.push(request);
    return { status: 201, text: async () => '{"id":101,"title":"demo"}', cancel: async () => { cancelled++; } };
  } };
  const result = await requestJsonDemo(http, { origin, method: 'POST', path: '/posts?source=demo', body: '{"title":"demo"}' });
  assert.deepEqual(calls, [{
    permission: 'http-demo', url: origin + '/posts?source=demo', method: 'POST',
    headers: [['Accept', 'application/json'], ['Content-Type', 'application/json']], body: '{"title":"demo"}',
  }]);
  assert.equal(result.status, 201);
  assert.deepEqual(JSON.parse(result.body), { id: 101, title: 'demo' });
  assert.equal(cancelled, 1);
});

test('GET keeps /todos/1 and ignores a leftover body; HTTP errors retain their status and JSON', async () => {
  const http = { request: async request => {
    assert.equal(request.url, origin + '/todos/1');
    assert.equal(request.method, 'GET');
    assert.equal(request.body, undefined);
    return { status: 404, text: async () => '{}', cancel: async () => {} };
  } };
  assert.deepEqual(await requestJsonDemo(http, { origin, method: 'GET', path: '/todos/1', body: 'leftover' }), {
    status: 404, body: '{}',
  });
});

test('invalid paths and JSON fail before requesting; malformed responses still release the request', async () => {
  let calls = 0;
  let cancelled = 0;
  const http = { request: async () => {
    calls++;
    return { status: 502, text: async () => '<html>upstream failed</html>', cancel: async () => { cancelled++; } };
  } };
  for (const requestPath of ['https://other.example/todos/1', '//other.example/todos/1', '/\\other.example/todos/1', 'todos/1']) {
    await assert.rejects(requestJsonDemo(http, { origin, method: 'GET', path: requestPath }), /Enter a path/);
  }
  await assert.rejects(requestJsonDemo(http, { origin, method: 'PATCH', path: '/posts/1', body: 'invalid' }), /valid JSON/);
  assert.equal(calls, 0);
  await assert.rejects(requestJsonDemo(http, { origin, method: 'GET', path: '/todos/1' }), /HTTP 502: response is not valid JSON/);
  assert.equal(cancelled, 1);
});
