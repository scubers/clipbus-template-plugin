// Single source of truth for the bounded renderer capability gallery.
// Each button declares an apiSignature (used by tests/integration/galleryWiring.test.cjs
// to verify that every base-scope SDK verb has at least one demo button) and
// an invoke() function that drives the actual call.
//
// IMPORTANT: when the SDK adds a new base-scope capability verb,
//   1. Add a button entry below referencing it.
//   2. Update EXPECTED_BASE_VERBS in galleryWiring.test.cjs.
//
// Post plugin-api-shrink (commit cd2130cf):
//   - The 7 item.* write verbs and action.allocateImageTempPath are now
//     runtime-only (side: 'runtime'). They are NOT callable from UI; the
//     bounded renderer demonstrates one of them (item.setTags) via the
//     runtime-bridge pattern (clipbus.runtime.invoke → Node messageHandler →
//     host.item.setTags). The remaining 6 mirror handlers live in
//     ../runtime/draft-action.ts:createGalleryMessageHandlers and can be
//     wired in additional bridge buttons if needed.
//   - item.readAttachment is still UI-callable (side: 'both').
//
// The bounded renderer cannot call action-scope verbs
// (clipbus.action.{setButtons,complete}) — those live in
// draft-action-ui/catalog.ts.

import { clipbus } from "@clipbus/plugin-sdk/ui";
import { GALLERY_RPC_KEYS } from "../runtime/messages.ts";

// Module-level ref so close(last) can target the most recently opened panel.
let _lastInfoPanelID: string | null = null;

export type GalleryPermissionID = "setTags" | "setPinned" | "setAttachment" | "setSearchExtension";

export interface CapabilityButton {
  id: string;
  label: string;
  apiSignature: string;
  permissionRequired?: GalleryPermissionID;
  invoke(): Promise<unknown>;
}

export interface CapabilitySection {
  id: string;
  title: string;
  description: string;
  buttons: CapabilityButton[];
}

function nowIsoTag(): string {
  return new Date().toISOString().replace(/[^0-9A-Za-z]/g, "").slice(8, 14);
}

const SETTINGS_KEY = "plugin.template.full.gallery.label";

export const galleryCapabilitySections: CapabilitySection[] = [
  {
    id: "item-read",
    title: "Item reads",
    description: "clipbus.item.* (read) — UI-callable directly. Writes moved to runtime-bridge section.",
    buttons: [
      {
        id: "item-readAttachment",
        label: "readAttachment",
        apiSignature: "clipbus.item.readAttachment({ attachmentType, attachmentKey })",
        // attachmentKey must match what the detector emits. The gallery detector
        // (runtime/detector.ts L59) emits `attachmentKey: kind` where `kind` is
        // the literal "bounded"/"auto"/"fixed". This card is in the bounded
        // renderer, so the matching key is "bounded". Passing "self" or any
        // other value makes the host return `payloadJson: nil` → log shows `{}`.
        invoke: () => clipbus.item.readAttachment({
          attachmentType: "plugin.template.full.gallery.bounded",
          attachmentKey: "bounded",
        }),
      },
    ],
  },
  {
    id: "clipboard",
    title: "Clipboard",
    description: "clipbus.clipboard.* — host writes to the user clipboard.",
    buttons: [
      {
        id: "clipboard-copyText",
        label: "copyText",
        apiSignature: "clipbus.clipboard.copyText({ text })",
        invoke: () => clipbus.clipboard.copyText({ text: `Gallery demo @ ${nowIsoTag()}` }),
      },
    ],
  },
  {
    id: "navigation",
    title: "Navigation",
    description: "clipbus.navigation.* — open URLs and OS paths.",
    buttons: [
      {
        id: "navigation-openUrl",
        label: "openUrl",
        apiSignature: "clipbus.navigation.openUrl({ url })",
        invoke: () => clipbus.navigation.openUrl({ url: "https://clipbus.app/" }),
      },
      {
        id: "navigation-revealInFinder",
        label: "revealInFinder",
        apiSignature: "clipbus.navigation.revealInFinder({ path })",
        invoke: () => clipbus.navigation.revealInFinder({ path: "/tmp" }),
      },
      {
        id: "navigation-openFilePath",
        label: "openFilePath",
        apiSignature: "clipbus.navigation.openFilePath({ path })",
        invoke: () => clipbus.navigation.openFilePath({ path: "/tmp" }),
      },
    ],
  },
  {
    id: "window",
    title: "Window sizing",
    description: "clipbus.window.* — programmatic height control inside the bounded shape.",
    buttons: [
      {
        id: "window-setHeight-480",
        label: "setHeight(480)",
        apiSignature: "clipbus.window.setHeight({ height })",
        invoke: () => clipbus.window.setHeight({ height: 480 }),
      },
      {
        id: "window-setHeight-120",
        label: "setHeight(120)",
        apiSignature: "clipbus.window.setHeight({ height })",
        invoke: () => clipbus.window.setHeight({ height: 120 }),
      },
      {
        id: "window-autoFit",
        label: "autoFit()",
        apiSignature: "clipbus.window.autoFit()",
        invoke: () => clipbus.window.autoFit(),
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    description: "clipbus.settings.* — read external settings JSON; plugin defaults to its own prefix.",
    buttons: [
      {
        id: "settings-get",
        label: "get(label)",
        apiSignature: "clipbus.settings.get({ key })",
        invoke: () => clipbus.settings.get({ key: SETTINGS_KEY }),
      },
      {
        id: "settings-getAll",
        label: "getAll()",
        apiSignature: "clipbus.settings.getAll()",
        invoke: () => clipbus.settings.getAll(),
      },
    ],
  },
  {
    id: "diagnostics",
    title: "Diagnostics",
    description: "clipbus.console.log — surfaces to host logging at the requested level.",
    buttons: [
      {
        id: "console-log-info",
        label: "log(info)",
        apiSignature: "clipbus.console.log({ level, message })",
        invoke: () => clipbus.console.log({ level: "info", message: "[gallery] info entry" }),
      },
      {
        id: "console-log-warn",
        label: "log(warn)",
        apiSignature: "clipbus.console.log({ level, message })",
        invoke: () => clipbus.console.log({ level: "warn", message: "[gallery] warn entry" }),
      },
      {
        id: "console-log-error",
        label: "log(error)",
        apiSignature: "clipbus.console.log({ level, message })",
        invoke: () => clipbus.console.log({ level: "error", message: "[gallery] error entry" }),
      },
    ],
  },
  {
    id: "text-input",
    title: "Text-input state",
    description: "clipbus.textInput.stateChanged — host hides global shortcuts while a probe is focused. The probe in this panel emits real focus/blur events; this button is the manual equivalent.",
    buttons: [
      {
        id: "textInput-stateChanged",
        label: "stateChanged(isFocused: true)",
        apiSignature: "clipbus.textInput.stateChanged({ isFocused, isComposing })",
        invoke: () => clipbus.textInput.stateChanged({ isFocused: true, isComposing: false }),
      },
    ],
  },
  {
    id: "info-panel",
    title: "Info panel",
    description: "clipbus.infoPanel.* — open a rich info panel with blocks, badges, and actions. Buttons fire onAction events back to the plugin.",
    buttons: [
      {
        id: "infoPanel-open-full",
        label: "open(full demo)",
        apiSignature: "clipbus.infoPanel.open({ document })",
        invoke: async () => {
          const result = await clipbus.infoPanel.open({
            document: {
              icon: "📋",
              title: "Gallery Info Panel",
              subtitle: "All 7 block types demonstrated",
              badges: ["demo", "gallery", "v1"],
              blocks: [
                { type: "label", text: "Text styles" },
                { type: "text", text: "Body text — normal readable prose.", style: "body" },
                { type: "text", text: "mono text — fixed-width, like a path or hash.", style: "mono" },
                { type: "text", text: "Muted text — de-emphasised secondary note.", style: "muted" },
                { type: "divider" },
                { type: "label", text: "Code block (JSON)" },
                { type: "code", text: JSON.stringify({ plugin: "template", version: "0.1.0", ts: new Date().toISOString() }, null, 2), language: "json" },
                { type: "divider" },
                { type: "label", text: "QR code" },
                { type: "qrCode", value: "https://clipbus.app/" },
                { type: "divider" },
                { type: "label", text: "Fields" },
                {
                  type: "fields",
                  fields: [
                    { key: "Plugin", value: "template-plugin" },
                    { key: "Surface", value: "bounded renderer" },
                    { key: "Hash", value: "a1b2c3d4e5f6", isMono: true },
                  ],
                },
                { type: "divider" },
                { type: "label", text: "Tags" },
                { type: "tags", tags: ["gallery", "info-panel", "demo", "bounded"] },
              ],
              actions: [
                { id: "copy", label: "Copy Text", isPrimary: true },
                { id: "open-url", label: "Open URL" },
                { id: "dismiss", label: "Dismiss" },
              ],
            },
          });
          _lastInfoPanelID = result.panelID;
          return result;
        },
      },
      {
        id: "infoPanel-open-minimal",
        label: "open(minimal)",
        apiSignature: "clipbus.infoPanel.open({ document })",
        invoke: async () => {
          const result = await clipbus.infoPanel.open({
            document: {
              title: "Minimal Panel",
              blocks: [
                { type: "text", text: "A minimal info panel with one block.", style: "body" },
              ],
              actions: [{ id: "ok", label: "OK", isPrimary: true }],
            },
          });
          _lastInfoPanelID = result.panelID;
          return result;
        },
      },
      {
        id: "infoPanel-close-last",
        label: "close(last)",
        apiSignature: "clipbus.infoPanel.close({ panelID })",
        invoke: async () => {
          if (!_lastInfoPanelID) return { skipped: "no panel opened yet" };
          const result = await clipbus.infoPanel.close({ panelID: _lastInfoPanelID });
          _lastInfoPanelID = null;
          return result;
        },
      },
    ],
  },
  {
    id: "runtime-bridge",
    title: "Runtime bridge",
    description: "clipbus.runtime.invoke — round-trip UI → runtime handler → host.* → response. Use these to compare UI-scope vs runtime-scope identical capabilities.",
    buttons: [
      {
        id: "runtime-host-item-readAttachment",
        label: "host.item.readAttachment",
        apiSignature: "clipbus.runtime.invoke({ key })",
        invoke: () => clipbus.runtime.invoke({
          key: GALLERY_RPC_KEYS.itemReadAttachment,
          payload: { payload: { attachmentType: "plugin.template.full.gallery.bounded", attachmentKey: "bounded" } },
        }),
      },
      {
        id: "runtime-host-item-materializeImagePath",
        label: "host.item.materializeImagePath",
        apiSignature: "clipbus.runtime.invoke({ key })",
        invoke: () => clipbus.runtime.invoke({
          key: GALLERY_RPC_KEYS.itemMaterializeImagePath,
          payload: { payload: {} },
        }),
      },
      {
        id: "runtime-host-settings-getAll",
        label: "host.settings.getAll",
        apiSignature: "clipbus.runtime.invoke({ key })",
        invoke: () => clipbus.runtime.invoke({
          key: GALLERY_RPC_KEYS.settingsGetAll,
          payload: { payload: {} },
        }),
      },
      {
        id: "runtime-host-console-log",
        label: "host.console.log",
        apiSignature: "clipbus.runtime.invoke({ key })",
        invoke: () => clipbus.runtime.invoke({
          key: GALLERY_RPC_KEYS.consoleLog,
          payload: { payload: { level: "info", message: "[gallery/runtime-bridge] hello from UI" } },
        }),
      },
      // The canonical post-shrink demo: item.setTags moved to side: 'runtime',
      // so UI invokes it through the user RPC bridge. Mirror handlers for the
      // other 5 item write verbs (addTags / removeTags / setPinned /
      // setAttachments / setSearchExtension) are registered in
      // ../runtime/draft-action.ts:createGalleryMessageHandlers and can be
      // exposed here by adding similar buttons when needed.
      {
        id: "runtime-host-item-setTags",
        label: "host.item.setTags (runtime-bridge demo)",
        apiSignature: "clipbus.runtime.invoke({ key })",
        permissionRequired: "setTags",
        invoke: () => clipbus.runtime.invoke({
          key: GALLERY_RPC_KEYS.itemSetTags,
          payload: { payload: { tags: [`gallery-bridge-${nowIsoTag()}`] } },
        }),
      },
    ],
  },
];
