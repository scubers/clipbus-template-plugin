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
    draft: {
      title: 'Template draft example',
      templateTag: 'template-plugin',
      note: '',
      shouldPin: false,
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
    draft: {
      title: 'Release note snippet for plugin preview',
      templateTag: 'release-note',
      note: 'Carries the release summary into the tag workflow.',
      shouldPin: true,
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
    draft: {
      title: 'This long item preview stresses the available vertical space in the draft action panel.',
      templateTag: 'handoff-review',
      note: 'Keep the draft readable even when the host chrome is present and the panel height stays fixed.',
      shouldPin: false,
    },
    buttons: ACTION_BUTTONS,
    defaultButtonID: DEFAULT_BUTTON_ID,
  },
];
