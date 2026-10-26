// Display helpers shared by the runtime (detector, actions) and the card pages.
// Pure functions over the contract types: no Node and no DOM APIs.

import type { PluginContent, PluginContentImage, PluginItemSnapshot } from "@clipbus/plugin-sdk";

export interface DisplayFact {
  label: string;
  value: string;
}

export interface DisplayInfo {
  /** "Text" or "PNG image". */
  typeLabel: string;
  /** Short size note used in the card title: "3 lines", "1920×1080". */
  badge: string;
  headline: string;
  subheadline: string;
  facts: DisplayFact[];
}

export function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

export function truncateText(value: string, maxLength = 72): string {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  let end = Math.max(0, maxLength - 1);
  // Never keep half of a surrogate pair (an emoji, say): a lone surrogate is not text.
  if (end > 0 && /[\uD800-\uDBFF]/.test(normalized[end - 1])) {
    end -= 1;
  }
  return `${normalized.slice(0, end).trimEnd()}…`;
}

export function formatByteCount(byteCount: number): string {
  if (!Number.isFinite(byteCount) || byteCount <= 0) {
    return "0 B";
  }
  if (byteCount < 1024) {
    return `${byteCount} B`;
  }
  if (byteCount < 1024 * 1024) {
    return `${(byteCount / 1024).toFixed(1)} KB`;
  }
  return `${(byteCount / (1024 * 1024)).toFixed(1)} MB`;
}

function textDisplay(text: string): DisplayInfo {
  const normalized = normalizeText(text);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const lineCount = Math.max(lines.length, 1);
  return {
    typeLabel: "Text",
    badge: lineCount === 1 ? "1 line" : `${lineCount} lines`,
    headline: truncateText(lines[0] ?? "") || "Empty text",
    subheadline: truncateText(lines[1] ?? "") || "Single-line text item.",
    facts: [
      { label: "Lines", value: String(lineCount) },
      { label: "Chars", value: String(normalized.length) },
    ],
  };
}

function imageDisplay(image: PluginContentImage): DisplayInfo {
  const format = (image.format || "image").toUpperCase();
  const size = image.width > 0 && image.height > 0 ? `${image.width}×${image.height}` : "unknown size";
  return {
    typeLabel: `${format} image`,
    badge: size,
    headline: `${format} image`,
    subheadline: image.width > 0 && image.height > 0 ? `${image.width} × ${image.height} pixels` : "Image without size metadata.",
    facts: [
      { label: "Size", value: size },
      { label: "Bytes", value: formatByteCount(image.bytes) },
    ],
  };
}

/** How the template shows an item's content; images only carry metadata (spec: pixels via ctx.input.imagePath()). */
export function buildContentDisplay(content: PluginContent): DisplayInfo {
  return content.kind === "image" ? imageDisplay(content) : textDisplay(content.text);
}

/** Content facts plus item facts, for Action output. */
export function buildItemDisplay(item: PluginItemSnapshot, content: PluginContent): DisplayInfo {
  const display = buildContentDisplay(content);
  return {
    ...display,
    facts: [
      ...display.facts,
      { label: "Tags", value: String(item.tags.length) },
      { label: "Source", value: item.sourceApp ?? "Unknown" },
    ],
  };
}

/** The text the detector puts into the search extension. */
export function buildSearchText(display: DisplayInfo): string {
  return [display.headline, display.subheadline, ...display.facts.map((fact) => `${fact.label} ${fact.value}`)]
    .filter(Boolean)
    .join(" ");
}

export function formatJSON(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}
