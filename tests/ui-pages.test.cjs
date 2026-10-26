'use strict';
// scripts/ui-pages.mjs decides which card pages scripts/build-ui.mjs builds.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../scripts/ui-pages.mjs');

test('renderers sharing a page and a source build it once', async () => {
  const { planPages } = await load();
  const pages = planPages(
    [
      { id: 'a', page: 'dist/ui/a/index.html' },
      { id: 'b', page: 'dist/ui/a/index.html' },
      { id: 'c', page: 'dist/ui/c/index.html' },
    ],
    { a: 'src/a', b: 'src/a', c: 'src/c' },
  );
  assert.deepEqual(pages.map(({ page, source }) => [page, source]), [
    ['dist/ui/a/index.html', 'src/a'],
    ['dist/ui/c/index.html', 'src/c'],
  ]);
});

test('two pages in one folder are refused before anything is built', async () => {
  const { planPages } = await load();
  assert.throws(
    () => planPages([{ id: 'a', page: 'dist/ui/a.html' }, { id: 'b', page: 'dist/ui/b.html' }], { a: 'src/a', b: 'src/b' }),
    /share the folder dist\/ui\//,
  );
});

test('a renderer without a source, or a source without a renderer, is refused', async () => {
  const { planPages } = await load();
  assert.throws(() => planPages([{ id: 'a', page: 'dist/ui/a/index.html' }], {}), /no page source/);
  assert.throws(() => planPages([], { a: 'src/a' }), /does not declare: a/);
});
