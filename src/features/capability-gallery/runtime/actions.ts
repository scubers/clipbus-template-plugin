// Gallery Actions, one per Action result kind:
//   gallery-auto-text  → result.text(...)
//   gallery-auto-image → result.image(path): plugin-relative or absolute
//   gallery-auto-none  → result.none(message), with side effects only

import { createHash } from "node:crypto";
import { result, type ActionHandler } from "@clipbus/plugin-sdk/runtime";
import { formatJSON } from "../../../shared/display";
import { writeSwatch } from "./swatch";

export const galleryTextAction: ActionHandler = async ({ item, content }, ctx) => {
  ctx.log.info("gallery-auto-text ran on", content.kind);
  const summary = { itemId: item.id, itemKind: item.kind, contentKind: content.kind, tags: item.tags };
  return result.text(["Gallery: result.text", "", formatJSON(summary)].join("\n"), "Gallery text result");
};

/**
 * A text input becomes a swatch whose color comes from the text, written to
 * the plugin cache and returned by its plugin-relative path. An image input is
 * returned as is, by the absolute path of the Host's read-only copy. Either
 * way the Host copies the file before the call ends; the plugin keeps its own.
 */
export const galleryImageAction: ActionHandler = async ({ content }, ctx) => {
  if (content.kind === "image") {
    const { path } = await ctx.input.imagePath();
    return path === undefined ? result.none("The Host has no file for this image") : result.image(path, "Gallery image result (input image)");
  }
  const color = `#${createHash("sha256").update(content.text, "utf8").digest("hex").slice(0, 6)}`;
  const swatch = await writeSwatch(ctx, color);
  return result.image(swatch.path, `Gallery image result (${swatch.color})`);
};

/** No value: the Flow stops here and only the message is shown. Side effects run at once. */
export const galleryNoneAction: ActionHandler = async ({ content }, ctx) => {
  await ctx.system.copyText({ text: `Gallery Auto (none) ran on a ${content.kind} item` });
  ctx.log.info("gallery-auto-none copied its note");
  return result.none("Gallery none result: a note was copied to the clipboard");
};
