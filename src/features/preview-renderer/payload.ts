// The template preview attachment: one contract shared by the detector that
// writes it and the card page that shows it.

import { defineAttachment, type PluginContent, type PluginContentKind } from "@clipbus/plugin-sdk";
import { buildContentDisplay, buildSearchText, type DisplayInfo } from "../../shared/display";

export interface TemplatePreviewPayload {
  contentKind: PluginContentKind;
  display: DisplayInfo;
  /** SHA-256 of the text or of the image file: the detector's expensive step. */
  sha256: string;
  /** What the detector indexed; kept so a recopy can re-index without recomputing. */
  searchText: string;
}

export const previewAttachment = defineAttachment<TemplatePreviewPayload>("plugin.template.full.preview");

/** The detector writes one preview per item under this key. */
export const PREVIEW_KEY = "primary";

/** Search extension scope of the template detector. */
export const TEMPLATE_SEARCH_SCOPE = "template";

export function createPreviewPayload(content: PluginContent, sha256: string): TemplatePreviewPayload {
  const display = buildContentDisplay(content);
  return { contentKind: content.kind, display, sha256, searchText: buildSearchText(display) };
}

/** Card title written with the attachment; it overrides the manifest renderer title. */
export function previewCardTitle(payload: TemplatePreviewPayload): string {
  return `${payload.display.typeLabel} · ${payload.display.badge}`;
}

/** Payloads come from storage: check the shape before the page relies on it. */
export function isPreviewPayload(value: unknown): value is TemplatePreviewPayload {
  const payload = value as Partial<TemplatePreviewPayload> | null;
  return typeof payload === "object" && payload !== null
    && typeof payload.sha256 === "string"
    && typeof payload.display === "object" && payload.display !== null
    && Array.isArray(payload.display.facts);
}
