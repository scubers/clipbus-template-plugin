'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { manifest, templateRoot, makeLaunch, setupPlugin, fakeHost, itemSnapshot, textContent } = require('../support/plugin.cjs');

async function setupWorker(t, capabilities = []) {
  const launch = { ...makeLaunch(t, capabilities), role: 'task' };
  const exported = require(path.join(templateRoot, manifest.runtime.taskEntry));
  const registry = await (exported.default ?? exported).setup(launch);
  return { registry, launch };
}

test('copy detection only admits work; the Worker publishes the same local digest as a foreground message', async t => {
  const { registry, launch } = await setupPlugin(t);
  const host = fakeHost(launch, { 'tasks.enqueue': { taskId: 'task-1', reused: false } });
  await registry.detectors['background-detector']({
    item: itemSnapshot('text'), content: textContent('local-digest: hello'), trigger: 'copy',
  }, host.ctx);
  assert.deepEqual(host.methods(), ['tasks.enqueue']);
  assert.equal(host.paramsOf('tasks.enqueue')[0].policy, 'reuse');

  const worker = await setupWorker(t);
  const taskHost = fakeHost(worker.launch);
  taskHost.ctx.signal = new AbortController().signal;
  await worker.registry.tasks['local-digest']({
    taskId: 'task-1', item: itemSnapshot('text'), content: textContent('hello'), data: { rounds: 1 },
  }, taskHost.ctx);
  const result = taskHost.paramsOf('item.replaceAttachments')[0].entries[0].payload.localDigest;
  assert.deepEqual(result, {
    rounds: 1,
    sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  });
  assert.deepEqual(await registry.messages['template.localDigest']({ text: 'hello', rounds: 1 }, fakeHost(launch).ctx), result);
});

test('cooperative cancellation during CPU work produces no staged result', async t => {
  const { registry, launch } = await setupWorker(t);
  const host = fakeHost(launch);
  const controller = new AbortController();
  host.ctx.signal = controller.signal;
  const running = registry.tasks['local-digest']({
    taskId: 'cancelled', item: itemSnapshot('text'), content: textContent('hello'), data: { rounds: 1000000 },
  }, host.ctx);
  setImmediate(() => controller.abort());
  await assert.rejects(running, { name: 'AbortError' });
  assert.deepEqual(host.calls, []);
});


test('notification denial does not discard a successful background calculation or expose its input', async t => {
  const { registry, launch } = await setupWorker(t, ['system.notify']);
  const secret = 'sensitive-template-fixture-secret';
  const host = fakeHost(launch, { 'system.notify': () => { throw new Error('permission denied'); } });
  host.ctx.signal = new AbortController().signal;
  await registry.tasks['local-digest']({
    taskId: 'notify-denied', item: itemSnapshot('text'), content: textContent(secret), data: { rounds: 1 },
  }, host.ctx);
  assert.equal(host.paramsOf('item.replaceAttachments').length, 1);
  const notices = host.paramsOf('system.notify');
  assert.equal(notices.length, 1);
  assert.ok(!JSON.stringify(notices[0]).includes(secret));
});

test('HTTP task parses split UTF-8 and CRLF SSE data without sending the source item', async t => {
  const worker = await setupWorker(t, ['http.start', 'http.write', 'http.read', 'http.cancel']);
  worker.launch.grants = { folders: {}, network: { 'http-demo': 'http://127.0.0.1:11434' } };
  const bytes = Buffer.from(': heartbeat\r\n\r\ndata: first\n\ndata: 测\r\ndata: 试\r\n\r\n');
  let reads = 0;
  const host = fakeHost(worker.launch, {
    'http.start': { requestId: 'sse-demo' },
    'http.read': () => reads++ === 0
      ? { kind: 'headers', status: 200, headers: [] }
      : reads <= bytes.length + 1 ? { kind: 'chunk', dataBase64: bytes.subarray(reads - 2, reads - 1).toString('base64') }
        : { kind: 'end' },
  });
  host.ctx.signal = new AbortController().signal;
  await worker.registry.tasks['http-stream']({
    taskId: 'network-task', item: itemSnapshot('text'), content: textContent('private-source-fixture'), data: null,
  }, host.ctx);
  const request = host.paramsOf('http.start')[0];
  assert.equal(request.url, 'http://127.0.0.1:11434/events');
  assert.equal(request.hasBody, false);
  assert.ok(!JSON.stringify(request).includes('private-source-fixture'));
  const result = host.paramsOf('item.replaceAttachments')[0].entries[0].payload.httpResult;
  assert.deepEqual(result, { events: 2, lastEvent: '测\n试' });
});

test('a partial failed HTTP stream is cancelled and publishes no result', async t => {
  const worker = await setupWorker(t, ['http.start', 'http.write', 'http.read', 'http.cancel']);
  worker.launch.grants = { folders: {}, network: { 'http-demo': 'http://127.0.0.1:11434' } };
  let reads = 0;
  const host = fakeHost(worker.launch, {
    'http.start': { requestId: 'failed-stream' },
    'http.read': () => {
      if (reads++ === 0) return { kind: 'headers', status: 200, headers: [] };
      if (reads === 2) return { kind: 'chunk', dataBase64: Buffer.from('data: partial\n\n').toString('base64') };
      throw new Error('synthetic disconnect');
    },
  });
  host.ctx.signal = new AbortController().signal;
  await assert.rejects(worker.registry.tasks['http-stream']({
    taskId: 'failed-stream', item: itemSnapshot('text'), content: textContent('fixture'), data: null,
  }, host.ctx), /synthetic disconnect/);
  assert.deepEqual(host.paramsOf('item.replaceAttachments'), []);
  assert.equal(host.paramsOf('http.cancel').length, 1);
});
