// Preview workbench scenarios: one card each, the way a Host would open it.
//
// Card defaults (title, tint, buttons, height range) come from manifest.json
// and payloads from the same builders the detectors use, so the preview
// cannot drift from what the plugin ships. `messages` stand in for the
// plugin runtime: the workbench has no Node process.

import type { PreviewScenario } from "@clipbus/plugin-sdk/preview";
import type {
  AttachmentContract,
  PluginAttachment,
  PluginCard,
  PluginContent,
  PluginItemSnapshot,
  PluginManifest,
} from "@clipbus/plugin-sdk";
import manifestJson from "../../../manifest.json";
import {
  failOnPurpose,
  GALLERY_ERROR_NAME,
  galleryCards,
  renderSwatch,
  runtimeProbe,
  type GalleryCardPayload,
  type GalleryShape,
  type RuntimeProbeResult,
  type SwatchResult,
} from "../../features/capability-gallery/contracts";
import { analyzeText } from "../../features/expanded-renderer/analysis";
import { analyzeItem, type ItemAnalysis } from "../../features/expanded-renderer/messages";
import { createExpandedPayload, EXPANDED_KEY, expandedAttachment } from "../../features/expanded-renderer/payload";
import { createPreviewPayload, PREVIEW_KEY, previewAttachment, previewCardTitle } from "../../features/preview-renderer/payload";

const manifest = manifestJson as PluginManifest;
const PLUGIN = { id: manifest.plugin.id, version: manifest.plugin.version };
const COPIED_AT = Date.UTC(2026, 9, 25, 9, 30);
const FAKE_SHA256 = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

const SHORT_TEXT = "Template plugin preview\nA fixed-height card that shows what the detector stored.";
const LONG_TITLE_TEXT = "static func configure(_ webView: WKWebView, bridge: PluginBridge, theme: PluginTheme) -> Bool {\n  return true\n}";
const JSON_TEXT = '{\n  "name": "clipbus",\n  "kind": "template",\n  "tags": ["json", "preview"]\n}';
const ARTICLE_TEXT = [
  "Clipbus plugins run detectors after every copy, show cards next to the item and offer Actions.",
  "A card page talks to the Host through ctx; heavy work goes to the plugin runtime through typed messages.",
  "This expanded card grows with its content: toggle Debug or run Analyze and watch the height follow.",
].join("\n");
const IMAGE: PluginContent = { kind: "image", width: 1920, height: 1080, format: "png", bytes: 245_760 };

function cardDefaults(contract: { readonly type: string }): Pick<PreviewScenario, "renderer" | "height"> {
  const renderer = manifest.renderers?.find((candidate) => candidate.attachmentType === contract.type);
  if (renderer === undefined) {
    throw new Error(`manifest.json has no renderer for ${contract.type}`);
  }
  return { renderer: { title: renderer.title, tint: renderer.tint, buttons: renderer.buttons }, height: renderer.height };
}

function attachment<T>(contract: AttachmentContract<T>, key: string, payload: T, card?: PluginCard): PluginAttachment<T> {
  return { type: contract.type, key, updatedAt: COPIED_AT, own: true, payload, ...(card === undefined ? {} : { card }) };
}

function itemFor(id: string, content: PluginContent, shown: PluginAttachment<unknown>, tags: string[] = ["template-plugin"]): PluginItemSnapshot {
  return {
    id,
    kind: content.kind,
    tags,
    pinned: false,
    sourceApp: "com.preview.editor",
    createdAt: COPIED_AT,
    lastCopiedAt: COPIED_AT,
    attachments: [{ type: shown.type, key: shown.key, updatedAt: shown.updatedAt, own: shown.own }],
  };
}

function previewScenario(id: string, label: string, content: PluginContent, tags?: string[]): PreviewScenario {
  const payload = createPreviewPayload(content, FAKE_SHA256);
  const shown = attachment(previewAttachment, PREVIEW_KEY, payload, { title: previewCardTitle(payload) });
  return { id, label, plugin: PLUGIN, item: itemFor(`item-${id}`, content, shown, tags), content, attachment: shown, ...cardDefaults(previewAttachment) };
}

function analyzeStub(content: PluginContent): ItemAnalysis {
  return content.kind === "text" ? analyzeText(content.text) : { contentKind: "image", fileBytes: content.bytes, sha256: FAKE_SHA256 };
}

function expandedScenario(id: string, label: string, content: PluginContent): PreviewScenario {
  const shown = attachment(expandedAttachment, EXPANDED_KEY, createExpandedPayload(content));
  return {
    id,
    label,
    plugin: PLUGIN,
    item: itemFor(`item-${id}`, content, shown, ["template-plugin", "expanded-demo"]),
    content,
    attachment: shown,
    ...cardDefaults(expandedAttachment),
    messages: { [analyzeItem.name]: () => analyzeStub(content) },
  };
}

class GalleryDemoError extends Error {
  constructor(reason: string) {
    super(`Failed on purpose: ${reason}`);
    this.name = GALLERY_ERROR_NAME;
  }
}

const galleryMessages: PreviewScenario["messages"] = {
  [runtimeProbe.name]: (data): RuntimeProbeResult => ({
    probe: (data as { probe: RuntimeProbeResult["probe"] }).probe,
    result: "Answered by the preview stub; install the plugin in Clipbus to run the real runtime.",
  }),
  [renderSwatch.name]: (data): SwatchResult => {
    const color = (data as { color?: string } | null)?.color ?? "#f97316";
    const path = `cache/swatches/${color.slice(1)}.png`;
    return { color, path };
  },
  [failOnPurpose.name]: (data) => {
    throw new GalleryDemoError((data as { reason: string }).reason);
  },
};

function galleryScenario(shape: GalleryShape, label: string): PreviewScenario {
  const content: PluginContent = { kind: "text", text: SHORT_TEXT };
  const contract = galleryCards[shape];
  const payload: GalleryCardPayload = { shape, inputKind: content.kind, highlights: [`${shape} preview scenario`] };
  const shown = attachment(contract, shape, payload);
  return {
    id: `gallery-${shape}`,
    label,
    plugin: PLUGIN,
    item: itemFor(`item-gallery-${shape}`, content, shown),
    content,
    attachment: shown,
    ...cardDefaults(contract),
    messages: galleryMessages,
    settings: { greeting: "Settings come from the user's external settings file" },
  };
}

export const previewScenarios: PreviewScenario[] = [
  previewScenario("short-text", "Preview · short text", { kind: "text", text: SHORT_TEXT }),
  previewScenario("long-title", "Preview · long title", { kind: "text", text: LONG_TITLE_TEXT }),
  previewScenario("json", "Preview · JSON (tagged)", { kind: "text", text: JSON_TEXT }, ["template-plugin", "json"]),
  previewScenario("image", "Preview · image", IMAGE),
  expandedScenario("expanded-text", "Expanded · text", { kind: "text", text: ARTICLE_TEXT }),
  expandedScenario("expanded-image", "Expanded · image", IMAGE),
  galleryScenario("fixed", "Gallery · fixed 240"),
  galleryScenario("auto", "Gallery · auto height"),
  galleryScenario("bounded", "Gallery · bounded 120–480"),
];
