import type { PreviewScenario } from '@clipbus/plugin-sdk/preview';

const PLUGIN_ID = 'plugin.template.full';
const BASE_ITEM_TAGS = ['template-plugin'];

// width omitted → uses the SDK's per-view default (action ≈ 675, native ⌘K panel).
const ACTION_VIEWPORT = { heightPolicy: 'fixed' as const, height: 250 };
const ACTION_BUTTONS = [
  { id: 'copy-item-json', title: 'Copy Item JSON', isEnabled: true },
  { id: 'copy-session-json', title: 'Copy Session JSON', isEnabled: true },
  { id: 'copy-draft-json', title: 'Copy Draft JSON', isEnabled: true },
  { id: 'apply-metadata', title: 'Apply Metadata', isEnabled: true },
];
const DEFAULT_BUTTON_ID = 'apply-metadata';

export const actionScenarios: PreviewScenario[] = [
  {
    id: 'default-draft',
    label: 'Default Draft',
    mode: 'action',
    pluginID: PLUGIN_ID,
    viewport: ACTION_VIEWPORT,
    item: {
      id: 'action-item-default-draft',
      type: 'text',
      tags: BASE_ITEM_TAGS,
      sourceAppID: 'com.preview.editor',
    },
    // GalleryDraft schema (what draft-action-ui/app.vue actually decodes):
    // empty scratch + default variant — the baseline 4-button state.
    draft: {
      scratchText: '',
      buttonsConfigVariant: 'default',
    },
    actionInput: {
      kind: 'text',
      text: 'Draft UI receives this current value, not the original item content.',
    },
    buttons: ACTION_BUTTONS,
    defaultButtonID: DEFAULT_BUTTON_ID,
  },
  {
    id: 'prefilled-note',
    label: 'Prefilled Note',
    mode: 'action',
    pluginID: PLUGIN_ID,
    viewport: ACTION_VIEWPORT,
    item: {
      id: 'action-item-prefilled-note',
      type: 'text',
      tags: BASE_ITEM_TAGS,
      sourceAppID: 'com.preview.editor',
    },
    // Prefilled scratch text + compact variant — distinct from the baseline so
    // switching scenarios visibly changes the rendered draft (text + 2 buttons).
    draft: {
      scratchText: 'Release note: shipped the Wire Bench preview redesign.',
      buttonsConfigVariant: 'compact',
    },
    actionInput: {
      kind: 'path_reference',
      entries: [
        { kind: 'file', displayName: 'release-notes.md' },
        { kind: 'folder', displayName: 'assets' },
      ],
    },
    buttons: ACTION_BUTTONS,
    defaultButtonID: DEFAULT_BUTTON_ID,
  },
  {
    id: 'long-copy-buttons',
    label: 'Long Content',
    mode: 'action',
    pluginID: PLUGIN_ID,
    viewport: ACTION_VIEWPORT,
    item: {
      id: 'action-item-long-copy-buttons',
      type: 'text',
      tags: BASE_ITEM_TAGS,
      sourceAppID: 'com.preview.editor',
    },
    // Long scratch text + verbose variant — stresses the fixed-height panel and
    // the 4 long-titled buttons, clearly distinct from the other two scenarios.
    draft: {
      scratchText:
        'This long scratch note stresses the fixed-height action panel — it should wrap across several lines while the card stays readable with the host chrome present.',
      buttonsConfigVariant: 'verbose',
    },
    actionInput: {
      kind: 'image',
      width: 1200,
      height: 800,
      format: 'png',
      bytes: 245760,
    },
    buttons: ACTION_BUTTONS,
    defaultButtonID: DEFAULT_BUTTON_ID,
  },
];
