import { isHostError, PLUGIN_ERROR_NAMES, PLUGIN_SOUND_LIMITS } from "@clipbus/plugin-sdk";
import type { PluginRuntimeCtx } from "@clipbus/plugin-sdk/runtime";

export const SOUND_FORMATS = ["wav", "mp3", "aiff"] as const;
export type SoundFormat = (typeof SOUND_FORMATS)[number];

export function isSoundFormat(value: unknown): value is SoundFormat {
  return SOUND_FORMATS.some((format) => format === value);
}

/** Shared by pages and Runtime. Contention is a normal skip, so detector writes can still commit. */
export async function playCopiedSound(
  ctx: Pick<PluginRuntimeCtx, "system" | "capabilities">,
  volume: number = PLUGIN_SOUND_LIMITS.fullVolume,
  format: SoundFormat = "wav",
): Promise<"started" | "busy" | "unsupported"> {
  if (!ctx.capabilities.has("system.playSound")) return "unsupported";
  if (!isSoundFormat(format)) throw new RangeError("Choose WAV, MP3 or AIFF.");
  try {
    await ctx.system.playSound({ path: `package/sounds/copied.${format}`, volume });
    return "started";
  } catch (error) {
    if (isHostError(error, PLUGIN_ERROR_NAMES.limitExceeded)) return "busy";
    throw error;
  }
}
