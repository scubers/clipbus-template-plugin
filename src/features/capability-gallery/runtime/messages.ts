// Gallery message handlers, registered in definePlugin({ messages }).

import type { PluginRuntimeCtx } from "@clipbus/plugin-sdk/runtime";
import { failOnPurpose, GALLERY_ERROR_NAME, renderSwatch, RUNTIME_PROBES, runtimeProbe } from "../contracts";
import { runProbe } from "./probes";
import { randomHexColor, writeSwatch } from "./swatch";

/** A plugin error with its own name and data; the page receives both. */
class GalleryDemoError extends Error {
  readonly data: { reason: string };

  constructor(reason: string) {
    super(`Failed on purpose: ${reason}`);
    this.name = GALLERY_ERROR_NAME;
    this.data = { reason };
  }
}

// Message data arrives as JSON from a page: the contract types it, but check
// what the handler relies on.
export const galleryMessages = [
  runtimeProbe.handle(async (request, ctx: PluginRuntimeCtx) => {
    const probe = request?.probe;
    if (!(RUNTIME_PROBES as readonly string[]).includes(probe)) {
      throw new RangeError(`Unknown probe "${String(probe)}"`);
    }
    return { probe, result: (await runProbe(probe, ctx)) ?? null };
  }),
  renderSwatch.handle(async (request, ctx: PluginRuntimeCtx) => writeSwatch(ctx, request?.color ?? randomHexColor())),
  failOnPurpose.handle(async ({ reason }) => {
    throw new GalleryDemoError(reason);
  }),
];
