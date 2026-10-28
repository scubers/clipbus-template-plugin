// Examples of what the runtime cannot do, reached from the bounded page via the
// `gallery.runtimeLimit` message. Each tries the operation and answers how it
// ended instead of throwing, so the page can show the error a plugin gets. In
// Clipbus every one is refused: the runtime has no network, cannot start other
// programs, and reaches only its own directories and the folders the user chose.

import * as childProcess from "node:child_process";
import { readdir, writeFile } from "node:fs/promises";
import * as os from "node:os";
import type { PluginRuntimeCtx } from "@clipbus/plugin-sdk/runtime";
import { LIMIT_URL, type RuntimeLimit, type RuntimeLimitResult } from "../contracts";

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  // fetch reports the network error as its cause.
  const cause = error.cause instanceof Error ? error.cause : undefined;
  const code = (cause as { code?: unknown } | undefined)?.code ?? (error as { code?: unknown }).code;
  const label = typeof code === "string" ? code : error.name;
  const message = cause?.message ?? error.message;
  // Node's file system errors already start with their code.
  return message.startsWith(label) ? message : `${label}: ${message}`;
}

async function attempt(limit: RuntimeLimit, description: string, run: () => unknown): Promise<RuntimeLimitResult> {
  try {
    await run();
    return { limit, attempt: description, outcome: "allowed" };
  } catch (error) {
    return { limit, attempt: description, outcome: "refused", error: describe(error) };
  }
}

export function tryLimit(limit: RuntimeLimit, ctx: PluginRuntimeCtx): Promise<RuntimeLimitResult> {
  switch (limit) {
    case "network":
      return attempt(limit, `fetch ${LIMIT_URL}`, () => fetch(LIMIT_URL, { signal: AbortSignal.timeout(5000) }));
    case "startProgram":
      return attempt(limit, "child_process.spawnSync(node --version)", () => {
        const { error } = childProcess.spawnSync(process.execPath, ["--version"]);
        if (error) throw error;
      });
    case "readHome":
      return attempt(limit, "list the home folder", () => readdir(os.homedir()));
    case "writePackage":
      return attempt(limit, "write package/limit-probe.txt", () => writeFile(ctx.plugin.path("package/limit-probe.txt"), "probe"));
    case "revealOutside":
      return attempt(limit, "system.reveal(home folder)", () => ctx.system.reveal({ path: os.homedir() }));
    default: {
      const unknownLimit: never = limit;
      throw new RangeError(`Unknown limit "${String(unknownLimit)}"`);
    }
  }
}
