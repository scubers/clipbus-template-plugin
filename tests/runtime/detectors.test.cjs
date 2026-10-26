'use strict';
// Detectors write through ctx and return nothing. The Host replaces a
// detector's previous output with what one run writes, so each test checks
// the complete set of writes of a run.

const test = require('node:test');
const assert = require('node:assert/strict');
const { fakeHost, imageContent, itemSnapshot, setupPlugin, sha256, textContent, writeInputImage } = require('../support/plugin.cjs');

const PREVIEW = 'plugin.template.full.preview';
const EXPANDED = 'plugin.template.full.expanded';

function writesOf(host, type) {
  return host.paramsOf('item.setAttachments').find(params => params.type === type);
}

async function detect(registry, host, { kind = 'text', content, trigger = 'copy' }) {
  return registry.detectors['template-detector']({ item: itemSnapshot(kind), content, trigger }, host.ctx);
}

test('template-detector stores a preview with a card title, the expanded view and a search entry for text', async t => {
  const { registry, launch } = await setupPlugin(t);
  const host = fakeHost(launch);
  const text = 'Hello world\nsecond line';

  assert.equal(await detect(registry, host, { content: textContent(text) }), undefined);

  const preview = writesOf(host, PREVIEW);
  assert.equal(preview.entries.length, 1);
  const [entry] = preview.entries;
  assert.equal(entry.key, 'primary');
  assert.deepEqual(entry.card, { title: 'Text · 2 lines' });
  assert.equal(entry.payload.sha256, sha256(text));
  assert.equal(entry.payload.display.headline, 'Hello world');

  // No card on the expanded entry: the Host keeps a card the page wrote back.
  const expanded = writesOf(host, EXPANDED);
  assert.equal(expanded.entries.length, 1);
  assert.equal('card' in expanded.entries[0], false);
  assert.equal(expanded.entries[0].payload.excerpt, text);

  assert.deepEqual(host.paramsOf('item.setSearchExtension'), [
    { scope: 'template', entries: [{ key: 'primary', text: entry.payload.searchText, label: 'Text' }] },
  ]);
  assert.match(entry.payload.searchText, /Hello world/);
  // Plain text gets no tag, and text never needs the image file.
  assert.deepEqual(host.methods().sort(), ['item.setAttachments', 'item.setAttachments', 'item.setSearchExtension']);
});

test('template-detector cuts a long headline between characters, not inside an emoji', async t => {
  const { registry, launch } = await setupPlugin(t);
  const host = fakeHost(launch);

  await detect(registry, host, { content: textContent('a'.repeat(70) + '\u{1F600} tail') });

  const { headline } = writesOf(host, PREVIEW).entries[0].payload.display;
  assert.equal(headline, 'a'.repeat(70) + '…');
  assert.equal(headline.isWellFormed(), true);
});

test('template-detector tags text that parses as JSON, and only that', async t => {
  const { registry, launch } = await setupPlugin(t);

  const json = fakeHost(launch);
  await detect(registry, json, { content: textContent('{ "name": "clipbus" }') });
  assert.deepEqual(json.paramsOf('item.addTags'), [{ tags: ['json'] }]);

  const brokenJson = fakeHost(launch);
  await detect(registry, brokenJson, { content: textContent('{ not json') });
  assert.deepEqual(brokenJson.paramsOf('item.addTags'), []);
});

test('template-detector hashes an image through the file the Host hands out', async t => {
  const { registry, launch } = await setupPlugin(t);
  const { file, bytes } = writeInputImage(launch);
  const host = fakeHost(launch, { 'input.imagePath': { path: file } });

  await detect(registry, host, { kind: 'image', content: imageContent });

  const [entry] = writesOf(host, PREVIEW).entries;
  assert.equal(entry.payload.sha256, sha256(bytes));
  assert.deepEqual(entry.card, { title: 'PNG image · 4×3' });
  assert.deepEqual(writesOf(host, EXPANDED).entries[0].payload.image, { width: 4, height: 3, format: 'png', bytes: 128 });
  assert.equal(host.paramsOf('input.imagePath').length, 1);
});

test('template-detector on recopy writes back its stored output instead of recomputing it', async t => {
  const { registry, launch } = await setupPlugin(t);
  const storedPreview = {
    contentKind: 'image',
    display: { typeLabel: 'PNG image', badge: '4×3', headline: 'PNG image', subheadline: '', facts: [] },
    sha256: 'stored-digest',
    searchText: 'stored search text',
  };
  const storedExpanded = { contentKind: 'image', display: storedPreview.display, image: { width: 4, height: 3, format: 'png', bytes: 128 } };
  const stored = { [PREVIEW]: storedPreview, [EXPANDED]: storedExpanded };
  const host = fakeHost(launch, {
    'item.getAttachments': ({ type, key }) => ({
      attachments: [
        { type, key, updatedAt: 5, own: false, payload: { written: 'by another plugin' } },
        { type, key, updatedAt: 5, own: true, payload: stored[type], card: { title: 'Renamed by the page' } },
      ],
    }),
  });

  await detect(registry, host, { kind: 'image', content: imageContent, trigger: 'recopy' });

  assert.equal(host.paramsOf('input.imagePath').length, 0, 'the image is not read again');
  // Entries without card keep the stored card.
  assert.deepEqual(writesOf(host, PREVIEW).entries, [{ key: 'primary', payload: storedPreview }]);
  assert.deepEqual(writesOf(host, EXPANDED).entries, [{ key: 'expanded', payload: storedExpanded }]);
  assert.deepEqual(host.paramsOf('item.setSearchExtension'), [
    { scope: 'template', entries: [{ key: 'primary', text: 'stored search text', label: 'PNG image' }] },
  ]);
});

test('template-detector on recopy runs the full detection when it has no stored output of its own', async t => {
  const { registry, launch } = await setupPlugin(t);
  const host = fakeHost(launch, {
    'item.getAttachments': ({ type, key }) => ({
      attachments: [{ type, key, updatedAt: 5, own: false, payload: { written: 'by another plugin' } }],
    }),
  });

  await detect(registry, host, { content: textContent('fresh text'), trigger: 'recopy' });

  const [entry] = writesOf(host, PREVIEW).entries;
  assert.equal(entry.payload.sha256, sha256('fresh text'));
  assert.deepEqual(entry.card, { title: 'Text · 1 line' });
});

test('gallery-detector writes the same three cards and search entries on every run', async t => {
  const { registry, launch } = await setupPlugin(t);
  const run = async trigger => {
    const host = fakeHost(launch);
    await registry.detectors['gallery-detector']({ item: itemSnapshot('text'), content: textContent('x'), trigger }, host.ctx);
    return host;
  };

  const copy = await run('copy');
  const writes = copy.paramsOf('item.setAttachments');
  assert.deepEqual(writes.map(params => params.type).sort(), [
    'plugin.template.full.gallery.auto',
    'plugin.template.full.gallery.bounded',
    'plugin.template.full.gallery.fixed',
  ]);
  for (const { type, entries } of writes) {
    const shape = type.split('.').pop();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].key, shape);
    assert.equal(entries[0].payload.shape, shape);
    assert.equal(entries[0].payload.inputKind, 'text');
    // No card: a title or buttons the page wrote back survive re-detection.
    assert.equal('card' in entries[0], false);
  }
  const [search] = copy.paramsOf('item.setSearchExtension');
  assert.equal(search.scope, 'gallery');
  assert.deepEqual(search.entries.map(entry => entry.key).sort(), ['auto', 'bounded', 'fixed']);

  // Stable payloads let the Host skip unchanged writes on the next copy.
  const recopy = await run('recopy');
  assert.deepEqual(recopy.calls, copy.calls);
});
