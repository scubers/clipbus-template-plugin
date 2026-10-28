// Images a plugin produces live in its own cache directory. The runtime writes
// them with absolute paths from `ctx.plugin.path(...)`; pages and Action
// results refer to them by the plugin-relative path (`cache/...`).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PluginRuntimeCtx } from "@clipbus/plugin-sdk/runtime";
import type { SwatchResult } from "../contracts";
import { solidColorPng } from "./solid-png";

const SWATCH_SIZE = 160;

export function parseHexColor(color: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  return match === null ? null : [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

export function randomHexColor(): string {
  return `#${Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, "0")}`;
}

/** Write a solid-color PNG to `cache/swatches/<color>.png`. */
export async function writeSwatch(ctx: PluginRuntimeCtx, color: string): Promise<SwatchResult> {
  const rgb = parseHexColor(color);
  if (rgb === null) {
    throw new RangeError(`"${color}" is not a #RRGGBB color`);
  }
  const normalized = color.toLowerCase();
  const path = `cache/swatches/${normalized.slice(1)}.png`;
  const absolutePath = ctx.plugin.path(path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, solidColorPng(SWATCH_SIZE, SWATCH_SIZE, rgb));
  return { color: normalized, path };
}
