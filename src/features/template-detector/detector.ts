// template-detector: runs after every copy, edit and manual re-detection.
//
// The Host clears old detector results before a full detection. Each call only
// replaces the attachment types and search scopes it explicitly writes.
// Unchanged group writes are skipped and do not send item.changed.

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
 * stored, including the matching search projection. Entries without `card` keep the
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
    previewAttachment.replace(ctx, [{ key: PREVIEW_KEY, payload: preview.payload }]),
    expandedAttachment.replace(ctx, [{ key: EXPANDED_KEY, payload: expanded.payload }]),
    ctx.item.replaceSearchExtension({ scope: TEMPLATE_SEARCH_SCOPE, entries: searchEntries(preview.payload) }),
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
    previewAttachment.replace(ctx, [{ key: PREVIEW_KEY, payload: preview, card: { title: previewCardTitle(preview) } }]),
    expandedAttachment.replace(ctx, [{ key: EXPANDED_KEY, payload: createExpandedPayload(content) }]),
    ctx.item.replaceSearchExtension({ scope: TEMPLATE_SEARCH_SCOPE, entries: searchEntries(preview) }),
  ];
  if (content.kind === "text" && looksLikeJson(content.text)) {
    writes.push(ctx.item.addTags({ tags: [JSON_TAG] }));
  }
  await Promise.all(writes);
};
