// Contracts the gallery runtime and the gallery card pages share: attachment
// types with their payloads, and the typed messages pages send to the runtime.

import { defineAttachment, defineMessage, type PluginContentKind } from "@clipbus/plugin-sdk";

// ── Attachments ──────────────────────────────────────────────────────────────

/** One gallery card per manifest height shape. */
export type GalleryShape = "fixed" | "auto" | "bounded";

export const GALLERY_SHAPES: readonly GalleryShape[] = ["fixed", "auto", "bounded"];

export interface GalleryCardPayload {
  shape: GalleryShape;
  /** The content kind the detector saw. */
  inputKind: PluginContentKind;
  /** What the card demonstrates. */
  highlights: string[];
}

export const galleryCards = {
  fixed: defineAttachment<GalleryCardPayload>("plugin.template.full.gallery.fixed"),
  auto: defineAttachment<GalleryCardPayload>("plugin.template.full.gallery.auto"),
  bounded: defineAttachment<GalleryCardPayload>("plugin.template.full.gallery.bounded"),
} as const;

/**
 * Interaction state, written by the bounded page and by the runtime probes.
 * Detection output and interaction state use different types: a detector
 * replaces its own output on every run, interactive writes survive it. This
 * type has no renderer, so it never shows up as a card.
 */
export interface GalleryCounterPayload {
  count: number;
  /** Which side wrote the last value. */
  writer: "page" | "runtime";
}

export const galleryCounter = defineAttachment<GalleryCounterPayload>("plugin.template.full.gallery.counter");

export const GALLERY_COUNTER_KEY = "clicks";

/** Search extension scope of interactive gallery writes (the detector uses "gallery"). */
export const GALLERY_NOTE_SCOPE = "gallery.note";

// ── Messages ─────────────────────────────────────────────────────────────────

/** Runtime-side capabilities the bounded page can exercise through `runtimeProbe`. */
export const RUNTIME_PROBES = [
  "item.get",
  "item.getContent",
  "item.getAttachments",
  "item.setAttachments",
  "item.setSearchExtension",
  "item.addTags",
  "item.removeTags",
  "item.setTags",
  "item.setPinned",
  "input.imagePath",
  "system.copyText",
  "system.openUrl",
  "system.openPath",
  "system.reveal",
  "env.get",
  "settings.get",
  "log.write",
  "plugin.path",
  "capabilities.has",
] as const;

export type RuntimeProbe = (typeof RUNTIME_PROBES)[number];

export interface RuntimeProbeResult {
  probe: RuntimeProbe;
  result: unknown;
}

/** Run one runtime ctx method in a message call and return what it answered. */
export const runtimeProbe = defineMessage<{ probe: RuntimeProbe }, RuntimeProbeResult>("gallery.runtimeProbe");

export interface SwatchRequest {
  /** `#RRGGBB`; a random color when omitted. */
  color?: string;
}

export interface SwatchResult {
  color: string;
  /** Plugin-relative path (`cache/…`); pages turn it into a URL with `ctx.asset.fileUrl`. */
  path: string;
  /** Absolute path, for `system.openPath` and `system.reveal`, which take absolute paths only. */
  absolutePath: string;
}

/** Let Node draw a solid-color PNG into the plugin cache. */
export const renderSwatch = defineMessage<SwatchRequest, SwatchResult>("gallery.renderSwatch");

/** A handler that throws on purpose: the page receives the error with its own name and data. */
export const failOnPurpose = defineMessage<{ reason: string }, never>("gallery.fail");

/** The error `gallery.fail` throws. */
export const GALLERY_ERROR_NAME = "GalleryDemoError";
