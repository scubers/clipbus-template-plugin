'use strict';
// Actions return `{ result, message? }`; an image result names a file the Host
// copies before the call ends, by absolute or plugin-relative path.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { decodeRgbPng } = require('../support/png.cjs');
const { fakeHost, imageContent, itemSnapshot, setupPlugin, sha256, textContent, writeInputImage } = require('../support/plugin.cjs');

const run = (registry, host, id, content, item = itemSnapshot(content.kind)) =>
  registry.actions[id]({ item, content }, host.ctx);

/** Absolute path of a plugin-relative `cache/...` path. */
function inCache(launch, relative) {
  assert.match(relative, /^cache\//);
  return path.join(launch.dirs.cache, ...relative.split('/').slice(1));
}

test('template-auto-action describes the input as a text result', async t => {
  const { registry, launch } = await setupPlugin(t);
  const host = fakeHost(launch);
  const item = itemSnapshot('text', { id: 'flow-start', tags: ['work'] });

  const output = await run(registry, host, 'template-auto-action', textContent('First line\nSecond line'), item);

  assert.equal(output.result.kind, 'text');
  assert.equal(output.message, 'Template action context ready');
  assert.match(output.result.text, /First line/);
  assert.match(output.result.text, /"id": "flow-start"/);
});

test('template-auto-action-image reads the image file the Host hands out', async t => {
  const { registry, launch } = await setupPlugin(t);
  const { file } = writeInputImage(launch);
  const host = fakeHost(launch, { 'input.imagePath': { path: file } });

  const output = await run(registry, host, 'template-auto-action-image', imageContent);

  assert.equal(output.result.kind, 'text');
  assert.ok(output.result.text.includes(`Image file: ${file}`));
  assert.match(output.result.text, /File size: 128 B/);
});

test('gallery-auto-image turns text into a swatch in the plugin cache, by plugin-relative path', async t => {
  const { registry, launch } = await setupPlugin(t);
  const text = 'swatch me';

  const first = await run(registry, fakeHost(launch), 'gallery-auto-image', textContent(text));
  const again = await run(registry, fakeHost(launch), 'gallery-auto-image', textContent(text));

  assert.equal(first.result.kind, 'image');
  assert.equal(again.result.path, first.result.path, 'the same text gives the same file');
  const png = decodeRgbPng(fs.readFileSync(inCache(launch, first.result.path)));
  assert.deepEqual(png.colors, [`#${sha256(text).slice(0, 6)}`]);
});

test('gallery-auto-image returns an image input by its absolute path, and none without a file', async t => {
  const { registry, launch } = await setupPlugin(t);
  const { file } = writeInputImage(launch);

  const withFile = await run(registry, fakeHost(launch, { 'input.imagePath': { path: file } }), 'gallery-auto-image', imageContent);
  assert.deepEqual(withFile.result, { kind: 'image', path: file });

  const withoutFile = await run(registry, fakeHost(launch, { 'input.imagePath': {} }), 'gallery-auto-image', imageContent);
  assert.deepEqual(withoutFile.result, { kind: 'none' });
});

test('gallery-auto-none has only side effects: it copies a note and returns none', async t => {
  const { registry, launch } = await setupPlugin(t);
  const host = fakeHost(launch);

  const output = await run(registry, host, 'gallery-auto-none', textContent('x'));

  assert.deepEqual(output.result, { kind: 'none' });
  assert.ok(output.message);
  assert.deepEqual(host.paramsOf('system.copyText'), [{ text: 'Gallery Auto (none) ran on a text item' }]);
});

test('gallery-auto-text returns text and writes to the plugin log', async t => {
  const { registry, launch } = await setupPlugin(t);
  const host = fakeHost(launch);

  const output = await run(registry, host, 'gallery-auto-text', imageContent);

  assert.equal(output.result.kind, 'text');
  assert.match(output.result.text, /"contentKind": "image"/);
  assert.deepEqual(host.paramsOf('log.write'), [{ level: 'info', message: 'gallery-auto-text ran on image' }]);
});
