import { isHostError, PLUGIN_ERROR_NAMES } from "@clipbus/plugin-sdk";
import type { PluginRuntimeCtx } from "@clipbus/plugin-sdk/runtime";

/** Shared by pages and Runtime. Contention is a normal skip, so detector writes can still commit. */
export async function playCopiedSound(
  ctx: Pick<PluginRuntimeCtx, "system" | "capabilities">,
): Promise<"started" | "busy" | "unsupported"> {
  if (!ctx.capabilities.has("system.playSound")) return "unsupported";
  try {
    await ctx.system.playSound({ path: "package/sounds/copied.wav" });
    return "started";
  } catch (error) {
    if (isHostError(error, PLUGIN_ERROR_NAMES.limitExceeded)) return "busy";
    throw error;
  }
}
