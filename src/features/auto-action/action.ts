// The template Actions. An Action receives `{ item, content }`: `item` is the
// item the Flow started from and stays the same through the Flow; `content` is
// the current cascaded value (text or image). It returns a result built with
// `result.text / image / none`; a text or image result can continue the Flow.

import { stat } from "node:fs/promises";
import { result, type ActionHandler } from "@clipbus/plugin-sdk/runtime";
import type { PluginContent, PluginItemSnapshot } from "@clipbus/plugin-sdk";
import { buildItemDisplay, formatByteCount, formatJSON, truncateText } from "../../shared/display";

/** The input as JSON, with long text shortened so the result stays readable. */
function inputSnapshot(item: PluginItemSnapshot, content: PluginContent): unknown {
  return {
    item,
    content: content.kind === "text" ? { kind: "text", text: truncateText(content.text, 240) } : content,
  };
}

function describe(title: string, item: PluginItemSnapshot, content: PluginContent, extra: string[] = []): string {
  const display = buildItemDisplay(item, content);
  return [
    title,
    `${display.typeLabel}: ${display.headline}`,
    display.subheadline,
    ...display.facts.map((fact) => `${fact.label}: ${fact.value}`),
    ...extra,
    "",
    formatJSON(inputSnapshot(item, content)),
  ].join("\n");
}

/** template-auto-action: text and image. */
export const describeInput: ActionHandler = async ({ item, content }) =>
  result.text(describe("Template Auto Action", item, content), "Template action context ready");

// Plugin Pro quota demo: the text-only and image-only variants below, with the
// gallery Actions, push the manifest past the free-tier Action quota (3). On a
// free-tier Host the Actions beyond the quota are locked in the plugin settings.

/** template-auto-action-text: the manifest offers it for text only. */
export const describeTextInput: ActionHandler = async ({ item, content }) =>
  result.text(describe("Template Auto Action (Text)", item, content), "Template text-only action context ready");

/**
 * template-auto-action-image: `content` carries image metadata only; the
 * pixels are in a read-only copy the Host hands out through `ctx.input.imagePath()`.
 */
export const describeImageInput: ActionHandler = async ({ item, content }, ctx) => {
  const { path } = await ctx.input.imagePath();
  const extra = path === undefined ? [] : [`Image file: ${path}`, `File size: ${formatByteCount((await stat(path)).size)}`];
  return result.text(describe("Template Auto Action (Image)", item, content, extra), "Template image-only action context ready");
};
