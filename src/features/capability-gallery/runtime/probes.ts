// One demo call per runtime-side capability, reached from the bounded page via
// the `gallery.runtimeProbe` message. Inside a message call `ctx.item` is the
// card's item and `ctx.input` is its content. Writes are staged and committed
// when the handler returns; `ctx.system.*` side effects run at once.

import type { PluginMethodName } from "@clipbus/plugin-sdk";
import type { PluginRuntimeCtx } from "@clipbus/plugin-sdk/runtime";
import { GALLERY_COUNTER_KEY, GALLERY_NOTE_SCOPE, galleryCards, galleryCounter, type RuntimeProbe } from "../contracts";
import { writeSwatch } from "./swatch";

export const PROBE_TAG = "gallery-runtime";

const PROBED_CAPABILITIES: PluginMethodName[] = ["input.imagePath", "system.reveal", "renderer.update"];

async function bumpCounter(ctx: PluginRuntimeCtx) {
  const [stored] = (await galleryCounter.get(ctx, { key: GALLERY_COUNTER_KEY })).filter((attachment) => attachment.own);
  const payload = { count: (stored?.payload.count ?? 0) + 1, writer: "runtime" as const };
  await galleryCounter.set(ctx, [{ key: GALLERY_COUNTER_KEY, payload }]);
  return payload;
}

export async function runProbe(probe: RuntimeProbe, ctx: PluginRuntimeCtx): Promise<unknown> {
  switch (probe) {
    case "item.get":
      return ctx.item.get();
    case "item.getContent":
      return ctx.item.getContent();
    case "item.getAttachments":
      return ctx.item.getAttachments({ type: galleryCards.bounded.type });
    case "item.setAttachments":
      return bumpCounter(ctx);
    case "item.setSearchExtension":
      await ctx.item.setSearchExtension({
        scope: GALLERY_NOTE_SCOPE,
        entries: [{ key: "runtime", text: "gallery note written by the runtime", label: "Gallery" }],
      });
      return { scope: GALLERY_NOTE_SCOPE };
    case "item.addTags":
      return ctx.item.addTags({ tags: [PROBE_TAG] });
    case "item.removeTags":
      return ctx.item.removeTags({ tags: [PROBE_TAG] });
    case "item.setTags": {
      // setTags replaces every tag, including the user's: keep theirs.
      const { tags } = await ctx.item.get();
      return ctx.item.setTags({ tags: [...tags.filter((tag) => tag !== PROBE_TAG), PROBE_TAG] });
    }
    case "item.setPinned": {
      const { pinned } = await ctx.item.get();
      return ctx.item.setPinned({ pinned: !pinned });
    }
    case "input.imagePath":
      return ctx.input.imagePath();
    case "system.copyText":
      await ctx.system.copyText({ text: "Copied by the gallery runtime" });
      return { copied: true };
    case "system.openUrl":
      await ctx.system.openUrl({ url: "https://clipbus.app/" });
      return { opened: "https://clipbus.app/" };
    case "system.openPath": {
      const swatch = await writeSwatch(ctx, "#f97316");
      await ctx.system.openPath({ path: swatch.absolutePath });
      return { opened: swatch.path };
    }
    case "system.reveal": {
      const swatch = await writeSwatch(ctx, "#f97316");
      await ctx.system.reveal({ path: swatch.absolutePath });
      return { revealed: swatch.path };
    }
    case "env.get":
      return ctx.env.get();
    case "settings.get":
      return ctx.settings.get();
    case "log.write":
      await ctx.log.write({ level: "info", message: "gallery runtime probe: log.write" });
      ctx.log.debug("gallery runtime probe: ctx.log.debug formats", { args: 2 });
      return { written: true };
    case "plugin.path":
      return {
        id: ctx.plugin.id,
        version: ctx.plugin.version,
        dirs: ctx.plugin.dirs,
        swatches: ctx.plugin.path("cache/swatches"),
      };
    case "capabilities.has":
      return Object.fromEntries(PROBED_CAPABILITIES.map((name) => [name, ctx.capabilities.has(name)]));
    default: {
      const unknownProbe: never = probe;
      throw new RangeError(`Unknown probe ${String(unknownProbe)}`);
    }
  }
}
