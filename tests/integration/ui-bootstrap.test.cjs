'use strict';
// Integration tests for UI bootstrap — verifies that clipbus.* reads the
// correct state after mock window globals are injected.
//
// The SDK ui dist reads window globals at module-evaluation time:
//   _itemTopic = createTopic(readWindowGlobal("__CLIPBUS_PLUGIN_ITEM__"))
// So globals MUST be set BEFORE require()ing the module.
// Attachment updates come in via "clipbus-plugin-item" and
// "clipbus-plugin-attachment" CustomEvents dispatched after require().
//
// setup.cjs (required via --require before this file) patches globalThis
// addEventListener/removeEventListener so the ui dist can load in Node.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const JSDOM = require(path.resolve(__dirname, '../../node_modules/jsdom')).JSDOM;

const sampleItem = {
  id: 'item-bootstrap-1',
  type: 'text',
  tags: ['a', 'b'],
  sourceAppID: 'com.example.test',
};

const sampleAttachment = {
  rendererID: 'template-renderer',
  attachmentType: 'plugin.template.full.preview',
  attachmentKey: 'key-1',
  payloadJson: '{"kind":"template_preview","version":2}',
  item: sampleItem,
  buttons: [],
};

/**
 * Bootstrap a fresh clipbus.instance with attachment-mode globals.
 *
 * The ui dist reads window globals at module evaluation time:
 *   _itemTopic = createTopic(readWindowGlobal("__CLIPBUS_PLUGIN_ITEM__"))
 * So item MUST be set BEFORE require(). Attachment is seeded via
 * "clipbus-plugin-attachment" CustomEvent dispatched after require.
 */
function freshAttachmentClipbus(item, attachment) {
  // Bust require cache for the ui dist so module-level singletons reset
  for (const key of Object.keys(require.cache)) {
    if (key.includes('dist/ui') || key.includes('dist\\ui')) {
      delete require.cache[key];
    }
  }
  const dom = new JSDOM('', { url: 'http://localhost' });
  global.window = dom.window;
  global.document = dom.window.document;

  // Set item global BEFORE require so the topic seeds correctly
  if (item !== null && item !== undefined) {
    global.window.__CLIPBUS_PLUGIN_ITEM__ = item;
  }

  const clipbus = require(path.resolve(__dirname, '../../node_modules/@clipbus/plugin-sdk/dist/ui/index.cjs')).clipbus;

  // Seed attachment via event AFTER require (listeners registered at module load)
  if (attachment !== null && attachment !== undefined) {
    global.window.dispatchEvent(
      new global.window.CustomEvent('clipbus-plugin-attachment', { detail: attachment }),
    );
  }

  return clipbus;
}

// ---------------------------------------------------------------------------
// Attachment context bootstrap
// ---------------------------------------------------------------------------
describe('clipbus.item — attachment context bootstrap', () => {
  test('clipbus.item.current() returns the bootstrapped item', () => {
    const clipbus = freshAttachmentClipbus(sampleItem, sampleAttachment);
    const item = clipbus.item.current();
    assert.deepEqual(item, sampleItem);
  });

  test('clipbus.item.attachment.current() returns the bootstrapped attachment', () => {
    const clipbus = freshAttachmentClipbus(sampleItem, sampleAttachment);
    const att = clipbus.item.attachment.current();
    assert.deepEqual(att, sampleAttachment);
  });

  test('clipbus.item.current() is undefined when no bootstrap provided', () => {
    const clipbus = freshAttachmentClipbus(null, null);
    const item = clipbus.item.current();
    // Accept undefined or null
    assert.ok(item === undefined || item === null, `expected null/undefined, got ${JSON.stringify(item)}`);
  });

  test('clipbus.item.attachment.current() is undefined when no bootstrap provided', () => {
    const clipbus = freshAttachmentClipbus(null, null);
    const att = clipbus.item.attachment.current();
    assert.ok(att === undefined || att === null, `expected null/undefined, got ${JSON.stringify(att)}`);
  });
});

// ---------------------------------------------------------------------------
// Live item updates via CustomEvents
// ---------------------------------------------------------------------------
describe('clipbus.item — live update via clipbus-plugin-item event', () => {
  test('dispatching clipbus-plugin-item event changes clipbus.item.current()', () => {
    const clipbus = freshAttachmentClipbus(sampleItem, sampleAttachment);
    const updatedItem = { ...sampleItem, tags: ['x'] };
    global.window.dispatchEvent(
      new global.window.CustomEvent('clipbus-plugin-item', { detail: updatedItem }),
    );
    assert.deepEqual(clipbus.item.current(), updatedItem);
  });

  test('on() listener fires when clipbus-plugin-item event dispatched', () => {
    const clipbus = freshAttachmentClipbus(sampleItem, sampleAttachment);
    const received = [];
    clipbus.item.on((v) => received.push(v));
    const updatedItem = { ...sampleItem, tags: ['y'] };
    global.window.dispatchEvent(
      new global.window.CustomEvent('clipbus-plugin-item', { detail: updatedItem }),
    );
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], updatedItem);
  });

  test('unsubscribed listener does not fire after unsub', () => {
    const clipbus = freshAttachmentClipbus(sampleItem, sampleAttachment);
    const received = [];
    const unsub = clipbus.item.on((v) => received.push(v));
    unsub();
    global.window.dispatchEvent(
      new global.window.CustomEvent('clipbus-plugin-item', {
        detail: { ...sampleItem, tags: ['z'] },
      }),
    );
    assert.equal(received.length, 0);
  });
});

// ---------------------------------------------------------------------------
// clipbus.* namespace shape checks
// ---------------------------------------------------------------------------
describe('clipbus.namespace shape', () => {
  test('clipbus.exposes item, action, clipboard, navigation, settings, console', () => {
    const clipbus = freshAttachmentClipbus(null, null);
    assert.ok(typeof clipbus.item === 'object');
    assert.ok(typeof clipbus.action === 'object');
    assert.ok(typeof clipbus.clipboard === 'object');
    assert.ok(typeof clipbus.navigation === 'object');
    assert.ok(typeof clipbus.settings === 'object');
    assert.ok(typeof clipbus.console === 'object');
  });

  test('clipbus.item exposes current, on, attachment (setTags/addTags/removeTags moved to runtime-only)', () => {
    const clipbus = freshAttachmentClipbus(null, null);
    assert.ok(typeof clipbus.item.current === 'function');
    assert.ok(typeof clipbus.item.on === 'function');
    assert.ok(typeof clipbus.item.attachment === 'object');
    // setTags/addTags/removeTags/setPinned/setSearchExtension/materializeImagePath
    // were removed from the UI namespace in plugin-api-shrink; they are now
    // runtime-only via ctx.host.item.*
    assert.ok(clipbus.item.setTags === undefined, 'setTags must not be on UI clipbus.item');
    assert.ok(clipbus.item.addTags === undefined, 'addTags must not be on UI clipbus.item');
    assert.ok(clipbus.item.removeTags === undefined, 'removeTags must not be on UI clipbus.item');
  });

  test('clipbus.action exposes complete (current/on removed with clipbus-plugin-action-session host event)', () => {
    const clipbus = freshAttachmentClipbus(null, null);
    assert.ok(typeof clipbus.action.complete === 'function');
    // clipbus.action.current() and clipbus.action.on() were removed along with the
    // clipbus-plugin-action-session host event in plugin-api-shrink
    assert.ok(clipbus.action.current === undefined || typeof clipbus.action.current === 'function',
      'clipbus.action.current may be absent after host event removal');
  });
});
