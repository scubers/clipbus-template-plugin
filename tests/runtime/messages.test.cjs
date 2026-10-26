'use strict';
// Message handlers answer card pages: `data` in, `data` out. Inside a message
// call ctx.item is the card's item and ctx.input its content.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { decodeRgbPng } = require('../support/png.cjs');
const { fakeHost, imageContent, setupPlugin, sha256, textContent, writeInputImage } = require('../support/plugin.cjs');

test('template.analyze counts lines and words of a text item', async t => {
  const { registry, launch } = await setupPlugin(t);
  const host = fakeHost(launch, { 'item.getContent': textContent('the cat\nthe dog and the cat') });

  const analysis = await registry.messages['template.analyze'](null, host.ctx);

  assert.deepEqual(analysis, {
    contentKind: 'text',
    lines: 2,
    words: 7,
    characters: 27,
    topWords: [
      { word: 'the', count: 3 },
      { word: 'cat', count: 2 },
      { word: 'and', count: 1 },
      { word: 'dog', count: 1 },
    ],
  });
});

test('template.analyze measures and hashes the file of an image item', async t => {
  const { registry, launch } = await setupPlugin(t);
  const { file, bytes } = writeInputImage(launch);
  const host = fakeHost(launch, { 'item.getContent': imageContent, 'input.imagePath': { path: file } });

  const analysis = await registry.messages['template.analyze'](null, host.ctx);

  assert.deepEqual(analysis, { contentKind: 'image', fileBytes: bytes.length, sha256: sha256(bytes) });
});

test('gallery.renderSwatch draws the requested color into the plugin cache', async t => {
  const { registry, launch } = await setupPlugin(t);

  const swatch = await registry.messages['gallery.renderSwatch']({ color: '#1A2B3C' }, fakeHost(launch).ctx);

  assert.deepEqual(swatch, {
    color: '#1a2b3c',
    path: 'cache/swatches/1a2b3c.png',
    absolutePath: path.join(launch.dirs.cache, 'swatches', '1a2b3c.png'),
  });
  const png = decodeRgbPng(fs.readFileSync(swatch.absolutePath));
  assert.deepEqual(png.colors, ['#1a2b3c']);
});

test('gallery.renderSwatch refuses a color it cannot draw', async t => {
  const { registry, launch } = await setupPlugin(t);
  await assert.rejects(registry.messages['gallery.renderSwatch']({ color: 'red' }, fakeHost(launch).ctx), RangeError);
});

test('gallery.fail throws an error with its own name and data', async t => {
  const { registry, launch } = await setupPlugin(t);
  await assert.rejects(
    registry.messages['gallery.fail']({ reason: 'demo' }, fakeHost(launch).ctx),
    error => error.name === 'GalleryDemoError' && error.data.reason === 'demo',
  );
});

// ── gallery.runtimeProbe ─────────────────────────────────────────────────────

const probe = (registry, host, name) => registry.messages['gallery.runtimeProbe']({ probe: name }, host.ctx);

test('each runtime probe exercises the runtime method it is named after', async t => {
  const { registry, launch } = await setupPlugin(t);
  const expected = {
    'item.get': ['item.get'],
    'item.getContent': ['item.getContent'],
    'item.getAttachments': ['item.getAttachments'],
    'item.setAttachments': ['item.getAttachments', 'item.setAttachments'],
    'item.setSearchExtension': ['item.setSearchExtension'],
    'item.addTags': ['item.addTags'],
    'item.removeTags': ['item.removeTags'],
    'item.setTags': ['item.get', 'item.setTags'],
    'item.setPinned': ['item.get', 'item.setPinned'],
    'input.imagePath': ['input.imagePath'],
    'system.copyText': ['system.copyText'],
    'system.openUrl': ['system.openUrl'],
    'system.openPath': ['system.openPath'],
    'system.reveal': ['system.reveal'],
    'env.get': ['env.get'],
    'settings.get': ['settings.get'],
    'log.write': ['log.write', 'log.write'],
    'plugin.path': [],
    'capabilities.has': [],
  };
  for (const [name, methods] of Object.entries(expected)) {
    const host = fakeHost(launch, {
      'item.get': { tags: [], pinned: false },
      'item.getAttachments': { attachments: [] },
    });
    const answer = await probe(registry, host, name);
    assert.equal(answer.probe, name);
    assert.ok('result' in answer, `${name} answers a result`);
    assert.deepEqual(host.methods(), methods, name);
  }
});

test('the setTags probe keeps the user tags and the setPinned probe toggles', async t => {
  const { registry, launch } = await setupPlugin(t);
  const answers = { 'item.get': { tags: ['work', 'gallery-runtime'], pinned: true } };

  const tags = fakeHost(launch, answers);
  await probe(registry, tags, 'item.setTags');
  assert.deepEqual(tags.paramsOf('item.setTags'), [{ tags: ['work', 'gallery-runtime'] }]);

  const pin = fakeHost(launch, answers);
  await probe(registry, pin, 'item.setPinned');
  assert.deepEqual(pin.paramsOf('item.setPinned'), [{ pinned: false }]);
});

test('the setAttachments probe counts on from this plugin\'s own counter', async t => {
  const { registry, launch } = await setupPlugin(t);
  const host = fakeHost(launch, {
    'item.getAttachments': ({ type, key }) => ({
      attachments: [
        { type, key, updatedAt: 1, own: false, payload: { count: 99, writer: 'page' } },
        { type, key, updatedAt: 1, own: true, payload: { count: 2, writer: 'page' } },
      ],
    }),
  });

  const answer = await probe(registry, host, 'item.setAttachments');

  assert.deepEqual(answer.result, { count: 3, writer: 'runtime' });
  assert.deepEqual(host.paramsOf('item.setAttachments'), [
    { type: 'plugin.template.full.gallery.counter', entries: [{ key: 'clicks', payload: { count: 3, writer: 'runtime' } }] },
  ]);
});

test('the openPath and reveal probes hand the Host an existing absolute path', async t => {
  const { registry, launch } = await setupPlugin(t);
  for (const name of ['system.openPath', 'system.reveal']) {
    const host = fakeHost(launch);
    await probe(registry, host, name);
    const [{ path: target }] = host.paramsOf(name);
    assert.ok(path.isAbsolute(target) && fs.existsSync(target), name);
  }
});

test('the plugin.path and capabilities.has probes answer from the launch context', async t => {
  const { registry, launch } = await setupPlugin(t, ['input.imagePath']);

  const paths = await probe(registry, fakeHost(launch), 'plugin.path');
  assert.deepEqual(paths.result.dirs, launch.dirs);
  assert.equal(paths.result.swatches, path.join(launch.dirs.cache, 'swatches'));

  const capabilities = await probe(registry, fakeHost(launch), 'capabilities.has');
  assert.deepEqual(capabilities.result, { 'input.imagePath': true, 'system.reveal': false, 'renderer.update': false });
});

test('an unknown probe is refused', async t => {
  const { registry, launch } = await setupPlugin(t);
  await assert.rejects(probe(registry, fakeHost(launch), 'item.delete'), RangeError);
});
