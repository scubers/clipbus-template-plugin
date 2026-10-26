// The template expanded attachment: written by the detector next to the
// preview, shown by the adaptive-height card page.

import { defineAttachment, type PluginContent, type PluginContentKind } from "@clipbus/plugin-sdk";
import { buildContentDisplay, truncateText, type DisplayInfo } from "../../shared/display";

export interface TemplateExpandedPayload {
  contentKind: PluginContentKind;
  display: DisplayInfo;
  /** The first characters of a text item. */
  excerpt?: string;
  /** Image metadata; the pixels stay in the item. */
  image?: { width: number; height: number; format: string; bytes: number };
}

export const expandedAttachment = defineAttachment<TemplateExpandedPayload>("plugin.template.full.expanded");

export const EXPANDED_KEY = "expanded";

const EXCERPT_LENGTH = 480;

export function createExpandedPayload(content: PluginContent): TemplateExpandedPayload {
  const payload: TemplateExpandedPayload = { contentKind: content.kind, display: buildContentDisplay(content) };
  if (content.kind === "text") {
    payload.excerpt = truncateText(content.text, EXCERPT_LENGTH);
  } else {
    payload.image = { width: content.width, height: content.height, format: content.format, bytes: content.bytes };
  }
  return payload;
}

export function isExpandedPayload(value: unknown): value is TemplateExpandedPayload {
  const payload = value as Partial<TemplateExpandedPayload> | null;
  return typeof payload === "object" && payload !== null
    && (payload.contentKind === "text" || payload.contentKind === "image")
    && typeof payload.display === "object" && payload.display !== null
    && Array.isArray(payload.display.facts);
}
