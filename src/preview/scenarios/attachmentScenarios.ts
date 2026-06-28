import type { PreviewScenario } from '@clipbus/plugin-sdk/preview';

const PLUGIN_ID = 'plugin.template.full';
const BASE_ITEM_TAGS = ['template-plugin'];
const BASE_SOURCE_APP = 'com.preview.editor';

const DEFAULT_BUTTONS = [
  { id: 'copy-payload-json', title: 'Copy Payload', isEnabled: true },
  { id: 'copy-renderer-context', title: 'Copy Context', isEnabled: true },
];

export const attachmentScenarios: PreviewScenario[] = [
  {
    id: 'short-text',
    label: 'Short Text',
    mode: 'attachmentRenderer',
    pluginID: PLUGIN_ID,
    accentHex: '#0f766e',
    view: 'compact',
    viewport: { heightPolicy: 'fixed', height: 320 },
    item: {
      id: 'item-short-text',
      type: 'text',
      tags: BASE_ITEM_TAGS,
      sourceAppID: BASE_SOURCE_APP,
    },
    attachment: {
      item: {
        id: 'item-short-text',
        type: 'text',
        tags: BASE_ITEM_TAGS,
        sourceAppID: BASE_SOURCE_APP,
      },
      attachment: {
        historyID: 'preview-short-text',
        owner: PLUGIN_ID,
        attachmentType: 'plugin.template.full.preview',
        attachmentKey: 'preview-short-text',
        payloadJson: JSON.stringify({
          kind: 'template_preview',
          version: 2,
          contentKind: 'text',
          display: {
            typeLabel: 'Text',
            headline: 'Template plugin preview',
            subheadline: 'Supports compact payload inspection inside a fixed-height renderer.',
            facts: [
              { label: 'Lines', value: '2' },
              { label: 'Chars', value: '68' },
              { label: 'Source', value: 'Preview.app' },
            ],
          },
        }),
      },
    },
    buttons: DEFAULT_BUTTONS,
  },
  {
    id: 'long-title',
    label: 'Long Title',
    mode: 'attachmentRenderer',
    pluginID: PLUGIN_ID,
    accentHex: '#0f766e',
    view: 'compact',
    viewport: { heightPolicy: 'fixed', height: 320 },
    item: {
      id: 'item-long-title',
      type: 'text',
      tags: BASE_ITEM_TAGS,
      sourceAppID: BASE_SOURCE_APP,
    },
    attachment: {
      item: {
        id: 'item-long-title',
        type: 'text',
        tags: BASE_ITEM_TAGS,
        sourceAppID: BASE_SOURCE_APP,
      },
      attachment: {
        historyID: 'preview-long-title',
        owner: PLUGIN_ID,
        attachmentType: 'plugin.template.full.preview',
        attachmentKey: 'preview-long-title',
        payloadJson: JSON.stringify({
          kind: 'template_preview',
          version: 2,
          contentKind: 'text',
          display: {
            typeLabel: 'Text',
            headline: 'static func configure(_ webView: WKWebView) {',
            subheadline: 'Stress-case for truncation, fixed facts, and stable action-strip ownership.',
            facts: [
              { label: 'Lines', value: '1' },
              { label: 'Chars', value: '45' },
              { label: 'Scope', value: 'Swift snippet' },
            ],
          },
        }),
      },
    },
    buttons: DEFAULT_BUTTONS,
  },
  {
    id: 'path-reference',
    label: 'Path Reference',
    mode: 'attachmentRenderer',
    pluginID: PLUGIN_ID,
    accentHex: '#0f766e',
    view: 'compact',
    viewport: { heightPolicy: 'fixed', height: 320 },
    item: {
      id: 'item-path-reference',
      type: 'text',
      tags: BASE_ITEM_TAGS,
      sourceAppID: BASE_SOURCE_APP,
    },
    attachment: {
      item: {
        id: 'item-path-reference',
        type: 'text',
        tags: BASE_ITEM_TAGS,
        sourceAppID: BASE_SOURCE_APP,
      },
      attachment: {
        historyID: 'preview-path-reference',
        owner: PLUGIN_ID,
        attachmentType: 'plugin.template.full.preview',
        attachmentKey: 'preview-path-reference',
        payloadJson: JSON.stringify({
          kind: 'template_preview',
          version: 2,
          contentKind: 'text',
          display: {
            typeLabel: 'Path',
            headline: 'Quarterly Assets Bundle',
            subheadline: 'Path reference payloads should still read clearly without requiring preview scrolling.',
            facts: [
              { label: 'Entries', value: '4' },
              { label: 'Folder', value: '/Users/demo/Desktop' },
              { label: 'Source', value: 'Finder' },
            ],
          },
        }),
      },
    },
    buttons: DEFAULT_BUTTONS,
  },
  {
    id: 'expanded-preview',
    label: 'Expanded (Dynamic Height)',
    mode: 'attachmentRenderer',
    pluginID: PLUGIN_ID,
    accentHex: '#2563eb',
    view: 'expanded',
    viewport: { heightPolicy: 'auto' },
    item: {
      id: 'item-expanded-preview',
      type: 'text',
      tags: BASE_ITEM_TAGS,
      sourceAppID: BASE_SOURCE_APP,
    },
    attachment: {
      item: {
        id: 'item-expanded-preview',
        type: 'text',
        tags: BASE_ITEM_TAGS,
        sourceAppID: BASE_SOURCE_APP,
      },
      attachment: {
        historyID: 'preview-expanded-preview',
        owner: PLUGIN_ID,
        attachmentType: 'plugin.template.full.expanded',
        attachmentKey: 'preview-expanded-preview',
        payloadJson: JSON.stringify({
          kind: 'template_expanded',
          version: 2,
          contentKind: 'text',
          display: {
            typeLabel: 'Text',
            headline: 'Template expanded preview',
            subheadline: 'Toggle Debug below to see clipbus.window.autoFit drive clipbus.window.setHeight as content grows.',
            facts: [
              { label: 'Lines', value: '3' },
              { label: 'Chars', value: '118' },
              { label: 'Source', value: 'Preview.app' },
              { label: 'Tags', value: '1' },
            ],
          },
          extended: {
            contentKind: 'text',
            sourceAppID: BASE_SOURCE_APP,
            tags: ['template-plugin', 'expanded-demo'],
            text: 'Template expanded preview\nDemonstrates the {min,max} height policy together with bridge.theme.onChange().',
          },
        }),
      },
    },
    buttons: [
      { id: 'toggle-debug', title: 'Toggle Debug', isEnabled: true },
      { id: 'copy-debug-json', title: 'Copy Debug', isEnabled: true },
    ],
  },
  {
    id: 'gallery-fixed-240',
    label: 'Gallery Fixed 240',
    mode: 'attachmentRenderer',
    pluginID: PLUGIN_ID,
    view: 'gallery-fixed',
    viewport: { heightPolicy: 'fixed', height: 240 },
    item: {
      id: 'item-gallery-fixed',
      type: 'text',
      tags: BASE_ITEM_TAGS,
      sourceAppID: BASE_SOURCE_APP,
    },
    attachment: {
      item: {
        id: 'item-gallery-fixed',
        type: 'text',
        tags: BASE_ITEM_TAGS,
        sourceAppID: BASE_SOURCE_APP,
      },
      attachment: {
        historyID: 'gallery-fixed',
        owner: PLUGIN_ID,
        attachmentType: 'plugin.template.full.gallery.fixed',
        attachmentKey: 'gallery-fixed',
        payloadJson: JSON.stringify({
          kind: 'fixed',
          title: 'Gallery Fixed 240px',
          inputKindSeen: 'text',
          capabilityCount: 3,
          capabilitiesShown: ['theme', 'attachment', 'buttons'],
        }),
      },
    },
    buttons: [
      { id: 'ping-fixed', title: 'Ping', isEnabled: true },
    ],
  },
  {
    id: 'gallery-auto',
    label: 'Gallery Auto Height',
    mode: 'attachmentRenderer',
    pluginID: PLUGIN_ID,
    view: 'gallery-auto',
    viewport: { heightPolicy: 'auto' },
    item: {
      id: 'item-gallery-auto',
      type: 'text',
      tags: BASE_ITEM_TAGS,
      sourceAppID: BASE_SOURCE_APP,
    },
    attachment: {
      item: {
        id: 'item-gallery-auto',
        type: 'text',
        tags: BASE_ITEM_TAGS,
        sourceAppID: BASE_SOURCE_APP,
      },
      attachment: {
        historyID: 'gallery-auto',
        owner: PLUGIN_ID,
        attachmentType: 'plugin.template.full.gallery.auto',
        attachmentKey: 'gallery-auto',
        payloadJson: JSON.stringify({
          kind: 'auto',
          title: 'Gallery Auto Height',
          inputKindSeen: 'text',
          capabilityCount: 2,
          capabilitiesShown: ['item', 'plugin-context'],
        }),
      },
    },
    buttons: [],
  },
  {
    id: 'gallery-bounded',
    label: 'Gallery Bounded 120-480',
    mode: 'attachmentRenderer',
    pluginID: PLUGIN_ID,
    view: 'gallery-bounded',
    viewport: { heightPolicy: 'bounded', min: 120, max: 480 },
    item: {
      id: 'item-gallery-bounded',
      type: 'text',
      tags: BASE_ITEM_TAGS,
      sourceAppID: BASE_SOURCE_APP,
    },
    attachment: {
      item: {
        id: 'item-gallery-bounded',
        type: 'text',
        tags: BASE_ITEM_TAGS,
        sourceAppID: BASE_SOURCE_APP,
      },
      attachment: {
        historyID: 'gallery-bounded',
        owner: PLUGIN_ID,
        attachmentType: 'plugin.template.full.gallery.bounded',
        attachmentKey: 'gallery-bounded',
        payloadJson: JSON.stringify({
          kind: 'bounded',
          title: 'Gallery Bounded 120-480',
          inputKindSeen: 'text',
          capabilityCount: 5,
          capabilitiesShown: ['theme', 'attachment', 'buttons', 'runtime', 'clipboard'],
        }),
      },
    },
    buttons: [
      { id: 'expand', title: 'Expand', isEnabled: true },
      { id: 'compact', title: 'Compact', isEnabled: true },
      { id: 'reset-height', title: 'Reset Height', isEnabled: true },
      { id: 'autofit-toggle', title: 'AutoFit: OFF', isEnabled: true },
    ],
  },
];
