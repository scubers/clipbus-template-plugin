// Runtime only (Node): content digests for the detector and the analyze message.

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import type { PluginContent } from "@clipbus/plugin-sdk";
import type { PluginRuntimeCtx } from "@clipbus/plugin-sdk/runtime";

/** SHA-256 of a file, streamed so a large image does not sit in memory. */
export async function fileSha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest("hex");
}

/**
 * SHA-256 of the input: the UTF-8 text, or the image file. Images only carry
 * metadata in `content`; the pixels are read from the Host's read-only copy
 * that `ctx.input.imagePath()` returns. Returns "" when the Host has no file.
 */
export async function contentSha256(content: PluginContent, ctx: PluginRuntimeCtx): Promise<string> {
  if (content.kind === "text") {
    return createHash("sha256").update(content.text, "utf8").digest("hex");
  }
  const { path } = await ctx.input.imagePath();
  return path === undefined ? "" : fileSha256(path);
}
