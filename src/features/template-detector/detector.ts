// template-detector: runs after every copy, edit and manual re-detection.
//
// A detector returns nothing; it writes through ctx. When it returns, the Host
// replaces everything this detector wrote on the item last time with what it
// wrote this time, so a run that writes nothing clears its earlier output.
// The Host also drops writes equal to what is stored, so re-writing the same
// values costs nothing and sends no item.changed.

import type { DetectorHandler, PluginRuntimeCtx } from "@clipbus/plugin-sdk/runtime";
import { contentSha256 } from "../../shared/digest";
import { createExpandedPayload, EXPANDED_KEY, expandedAttachment } from "../expanded-renderer/payload";
import {
  createPreviewPayload,
  PREVIEW_KEY,
  previewAttachment,
  previewCardTitle,
  TEMPLATE_SEARCH_SCOPE,
  type TemplatePreviewPayload,
} from "../preview-renderer/payload";

/** Added to text items that parse as a JSON object or array. Tags have no owner: they stay until the user removes them. */
export const JSON_TAG = "json";

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  if (!/^[[{]/.test(trimmed)) {
    return false;
  }
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function searchEntries(payload: TemplatePreviewPayload) {
  return [{ key: PREVIEW_KEY, text: payload.searchText, label: payload.display.typeLabel }];
}

/**
 * `recopy` means Core matched an existing item: the content is the one this
 * detector already saw. Instead of hashing it again, write back what is
 * stored — writing nothing would clear it. Entries without `card` keep the
 * stored card. Returns false when there is nothing to reuse yet.
 */
async function reuseStoredOutput(ctx: PluginRuntimeCtx): Promise<boolean> {
  const [previews, expandeds] = await Promise.all([
    previewAttachment.get(ctx, { key: PREVIEW_KEY }),
    expandedAttachment.get(ctx, { key: EXPANDED_KEY }),
  ]);
  const preview = previews.find((attachment) => attachment.own);
  const expanded = expandeds.find((attachment) => attachment.own);
  if (preview === undefined || expanded === undefined) {
    return false;
  }
  await Promise.all([
    previewAttachment.set(ctx, [{ key: PREVIEW_KEY, payload: preview.payload }]),
    expandedAttachment.set(ctx, [{ key: EXPANDED_KEY, payload: expanded.payload }]),
    ctx.item.setSearchExtension({ scope: TEMPLATE_SEARCH_SCOPE, entries: searchEntries(preview.payload) }),
  ]);
  return true;
}

export const detectTemplate: DetectorHandler = async ({ content, trigger }, ctx) => {
  if (trigger === "recopy" && (await reuseStoredOutput(ctx))) {
    return;
  }

  // The expensive step: for an image this reads the whole file.
  const sha256 = await contentSha256(content, ctx);
  const preview = createPreviewPayload(content, sha256);

  // Up to 8 ctx calls may run at once in one invocation; the Host commits the
  // staged writes together after the handler returns.
  const writes: Promise<unknown>[] = [
    previewAttachment.set(ctx, [{ key: PREVIEW_KEY, payload: preview, card: { title: previewCardTitle(preview) } }]),
    expandedAttachment.set(ctx, [{ key: EXPANDED_KEY, payload: createExpandedPayload(content) }]),
    ctx.item.setSearchExtension({ scope: TEMPLATE_SEARCH_SCOPE, entries: searchEntries(preview) }),
  ];
  if (content.kind === "text" && looksLikeJson(content.text)) {
    writes.push(ctx.item.addTags({ tags: [JSON_TAG] }));
  }
  await Promise.all(writes);
};
