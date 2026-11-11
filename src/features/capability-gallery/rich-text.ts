import type { PluginSystemCopyRichTextParams } from "@clipbus/plugin-sdk";
import type { PluginRuntimeCtx } from "@clipbus/plugin-sdk/runtime";

/** Shared by Runtime and View: the RTF and HTML describe the same two lines. */
export const RICH_TEXT_SAMPLE: PluginSystemCopyRichTextParams = {
  text: "Clipbus rich text\nBold and blue",
  richText: {
    html: {
      document: '<html><body><h3>Clipbus rich text</h3><p><strong>Bold</strong> and <span style="color:rgb(0,80,210)">blue</span></p></body></html>',
    },
    rtfBase64: "e1xydGYxXGFuc2l7XGNvbG9ydGJsO1xyZWQwXGdyZWVuODBcYmx1ZTIxMDt9XGZzMzZcYiBDbGlwYnVzIHJpY2ggdGV4dFxiMFxmczI0XHBhciBcYiBCb2xkXGIwICBhbmQgXGNmMSBibHVlXGNmMH0=",
  },
};

export async function copyOriginalRichText(ctx: Pick<PluginRuntimeCtx, "item" | "system">) {
  const content = await ctx.item.getContent();
  if (content.kind !== "text") throw new Error("Select a text item to copy its rich text.");
  const { richText } = await ctx.item.getRichText();
  if (!richText) throw new Error("This item has no saved HTML or RTF. Copy the rich-text sample first.");
  await ctx.system.copyRichText({ text: content.text, richText });
  return { copied: true };
}
