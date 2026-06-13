'use strict';
// Tests that UI source code has NO direct bridge/window references
// (grep-style assertions on source text)
// Note: src/ui/preview/ is excluded — the preview host is allowed to set
// bootstrap globals because it simulates what the native host does.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');

function collectUISource() {
  // UI source (Vue SFCs) lives under src/features/ (moved from src/ui/ in §1-§5).
  // Only .vue files are collected — .ts runtime files legitimately import @clipbus/plugin-sdk/runtime.
  // src/preview/ is excluded — the preview host is allowed to set bootstrap globals.
  const featuresDir = path.join(projectRoot, 'src/features');
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (/\.vue$/.test(entry.name)) files.push(full);
    }
  }
  walk(featuresDir);
  return files.map(f => ({ path: f, content: fs.readFileSync(f, 'utf8') }));
}

test('UI source has no direct window.webkit.messageHandlers calls', () => {
  const files = collectUISource();
  for (const { path: p, content } of files) {
    assert.ok(
      !content.includes('window.webkit.messageHandlers'),
      `${p}: must not use window.webkit.messageHandlers directly`
    );
  }
});

test('UI source has no direct window.__CLIPBUS_PLUGIN_BOOTSTRAP__ access', () => {
  const files = collectUISource();
  for (const { path: p, content } of files) {
    assert.ok(
      !content.includes('window.__CLIPBUS_PLUGIN_BOOTSTRAP__'),
      `${p}: must not access window.__CLIPBUS_PLUGIN_BOOTSTRAP__ directly`
    );
  }
});

test('UI source has no createAttachmentBridge or createActionBridge', () => {
  const files = collectUISource();
  for (const { path: p, content } of files) {
    assert.ok(!content.includes('createAttachmentBridge'), `${p}: must not use createAttachmentBridge`);
    assert.ok(!content.includes('createActionBridge'), `${p}: must not use createActionBridge`);
  }
});

test('UI source has no addEventListener for clipbus-plugin-* custom events', () => {
  const files = collectUISource();
  for (const { path: p, content } of files) {
    assert.ok(
      !content.includes("addEventListener('clipbus-plugin-") && !content.includes('addEventListener("clipbus-plugin-'),
      `${p}: must not listen to clipbus-plugin-* events directly`
    );
  }
});

test('UI source has no clipbus.action.invoke references', () => {
  const files = collectUISource();
  for (const { path: p, content } of files) {
    assert.ok(
      !content.includes('clipbus.action.invoke'),
      `${p}: must not use clipbus.action.invoke (removed verb)`
    );
  }
});

test('Gallery DraftActionApp.vue contains at least one clipbus.action.complete call', () => {
  // template-draft-action and src/features/draft-action/ were removed in plugin-api-shrink.
  // The live draft action UI is now capability-gallery/draft-action-ui/app.vue (gallery-draft).
  const draftAppPath = path.join(projectRoot, 'src/features/capability-gallery/draft-action-ui/app.vue');
  const content = fs.readFileSync(draftAppPath, 'utf8');
  assert.ok(
    content.includes('clipbus.action.complete') || content.includes('complete('),
    `capability-gallery/draft-action-ui/app.vue must call clipbus.action.complete (via complete() wrapper from composable)`
  );
  assert.ok(
    content.includes("resultKind"),
    `capability-gallery/draft-action-ui/app.vue must pass resultKind in complete() payload`
  );
});

test('UI source does not import directly from @clipbus/plugin-sdk/runtime', () => {
  const files = collectUISource();
  for (const { path: p, content } of files) {
    assert.ok(
      !content.includes('@clipbus/plugin-sdk/runtime'),
      `${p}: UI files must not import from @clipbus/plugin-sdk/runtime`
    );
  }
});

test('AttachmentTemplateApp declares its buttons via setButtons', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'src/features/preview-renderer/app.vue'), 'utf8');
  assert.ok(src.includes('setButtons('), 'preview-renderer/app.vue must call setButtons');
});

test('ExpandedAttachmentTemplateApp declares its buttons via setButtons', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'src/features/expanded-renderer/app.vue'), 'utf8');
  assert.ok(src.includes('setButtons('), 'expanded-renderer/app.vue must call setButtons');
});

test('Gallery DraftActionApp declares its buttons via clipbus.action.setButtons', () => {
  // template-draft-action and src/features/draft-action/ were removed in plugin-api-shrink.
  // The live draft action UI is now capability-gallery/draft-action-ui/app.vue (gallery-draft).
  const src = fs.readFileSync(path.join(projectRoot, 'src/features/capability-gallery/draft-action-ui/app.vue'), 'utf8');
  assert.ok(src.includes('clipbus.action.setButtons('), 'capability-gallery/draft-action-ui/app.vue must call clipbus.action.setButtons');
});
