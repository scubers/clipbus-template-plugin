// Runtime handler of `template.analyze`: the card page asks, Node does the work.
// In a message call `ctx.item` is the card's item and `ctx.input` its content.

import { stat } from "node:fs/promises";
import type { PluginRuntimeCtx } from "@clipbus/plugin-sdk/runtime";
import { fileSha256 } from "../../shared/digest";
import { analyzeText } from "./analysis";
import { analyzeItem, type ItemAnalysis } from "./messages";

export const handleAnalyzeItem = analyzeItem.handle(async (_data, ctx: PluginRuntimeCtx): Promise<ItemAnalysis> => {
  const content = await ctx.item.getContent();
  if (content.kind === "text") {
    return analyzeText(content.text);
  }
  const { path } = await ctx.input.imagePath();
  if (path === undefined) {
    return { contentKind: "image" };
  }
  const [{ size }, sha256] = await Promise.all([stat(path), fileSha256(path)]);
  return { contentKind: "image", fileBytes: size, sha256 };
});
