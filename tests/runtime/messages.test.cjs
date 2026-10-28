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

  assert.deepEqual(swatch, { color: '#1a2b3c', path: 'cache/swatches/1a2b3c.png' });
  const png = decodeRgbPng(fs.readFileSync(path.join(launch.dirs.cache, 'swatches', '1a2b3c.png')));
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
    'system.reveal': ['system.reveal'],
    'env.get': ['env.get'],
    'settings.get': ['settings.get'],
    'log.write': ['log.write', 'log.write'],
    'plugin.path': [],
    'plugin.folder': [],
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

test('the reveal probe hands the Host the plugin-relative path of the swatch it drew', async t => {
  const { registry, launch } = await setupPlugin(t);
  const host = fakeHost(launch);
  await probe(registry, host, 'system.reveal');
  assert.deepEqual(host.paramsOf('system.reveal'), [{ path: 'cache/swatches/f97316.png' }]);
  assert.ok(fs.existsSync(path.join(launch.dirs.cache, 'swatches', 'f97316.png')));
});

test('the plugin.path and capabilities.has probes answer from the launch context', async t => {
  const { registry, launch } = await setupPlugin(t, ['input.imagePath']);

  const paths = await probe(registry, fakeHost(launch), 'plugin.path');
  assert.deepEqual(paths.result.dirs, launch.dirs);
  assert.equal(paths.result.swatches, path.join(launch.dirs.cache, 'swatches'));

  const capabilities = await probe(registry, fakeHost(launch), 'capabilities.has');
  assert.deepEqual(capabilities.result, { 'input.imagePath': true, 'system.reveal': false, 'renderer.update': false });
});

test('the folder probe exports a swatch only into the folder the user granted', async t => {
  const { registry, launch } = await setupPlugin(t);

  const missing = await probe(registry, fakeHost(launch), 'plugin.folder');
  assert.deepEqual(missing.result, { folder: 'exports', granted: false });

  const folder = path.join(launch.scratch, 'exports');
  fs.mkdirSync(folder);
  const granted = { ...launch, grants: { folders: { exports: folder } } };
  const host = fakeHost(granted);
  const answer = await probe(registry, host, 'plugin.folder');
  const exported = path.join(folder, '22c55e.png');
  assert.deepEqual(answer.result, { folder: 'exports', granted: true, exported });
  assert.deepEqual(decodeRgbPng(fs.readFileSync(exported)).colors, ['#22c55e']);
  assert.deepEqual(host.paramsOf('system.reveal'), [{ path: exported }]);
});

// ── gallery.runtimeLimit ─────────────────────────────────────────────────────

const tryLimit = (registry, host, limit) => registry.messages['gallery.runtimeLimit']({ limit }, host.ctx);

/** Replace `object[key]` for one test. */
function stub(t, object, key, value) {
  const original = object[key];
  object[key] = value;
  t.after(() => { object[key] = original; });
}

test('each limit answers refused with the error a plugin gets when the attempt fails', async t => {
  const { registry, launch } = await setupPlugin(t);
  // Plays what Clipbus does to these attempts: tests run outside its sandbox.
  stub(t, globalThis, 'fetch', async () => {
    throw new TypeError('fetch failed', { cause: Object.assign(new Error('getaddrinfo ENOTFOUND clipbus.app'), { code: 'ENOTFOUND' }) });
  });
  stub(t, require('node:child_process'), 'spawnSync', () => {
    throw Object.assign(new Error('Clipbus plugins cannot start other programs.'), { code: 'ERR_ACCESS_DENIED' });
  });
  stub(t, require('node:os'), 'homedir', () => path.join(launch.scratch, 'unreadable-home'));
  const confined = { ...launch, dirs: { ...launch.dirs, root: path.join(launch.scratch, 'read-only-package') } };
  const host = fakeHost(confined, {
    'system.reveal': () => { throw Object.assign(new Error('The resource was rejected.'), { name: 'PluginResourceRejected' }); },
  });

  const answers = {};
  for (const limit of ['network', 'startProgram', 'readHome', 'writePackage', 'revealOutside']) {
    answers[limit] = await tryLimit(registry, host, limit);
    assert.equal(answers[limit].limit, limit);
    assert.equal(answers[limit].outcome, 'refused', limit);
  }
  assert.equal(answers.network.error, 'ENOTFOUND: getaddrinfo ENOTFOUND clipbus.app');
  assert.equal(answers.startProgram.error, 'ERR_ACCESS_DENIED: Clipbus plugins cannot start other programs.');
  assert.match(answers.readHome.error, /^ENOENT: /);
  assert.match(answers.writePackage.error, /^ENOENT: /);
  assert.equal(answers.revealOutside.error, 'PluginResourceRejected: The resource was rejected.');
});

test('a limit the environment does not enforce answers allowed', async t => {
  const { registry, launch } = await setupPlugin(t);
  stub(t, globalThis, 'fetch', async () => new Response('ok'));
  assert.deepEqual(await tryLimit(registry, fakeHost(launch), 'network'), {
    limit: 'network', attempt: 'fetch https://clipbus.app/', outcome: 'allowed',
  });
});

test('an unknown limit is refused', async t => {
  const { registry, launch } = await setupPlugin(t);
  await assert.rejects(tryLimit(registry, fakeHost(launch), 'readEverything'), RangeError);
});

test('an unknown probe is refused', async t => {
  const { registry, launch } = await setupPlugin(t);
  await assert.rejects(probe(registry, fakeHost(launch), 'item.delete'), RangeError);
});
