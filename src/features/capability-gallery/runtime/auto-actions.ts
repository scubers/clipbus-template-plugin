// Four auto-run actions covering every actionResult shape:
//   - text           → actionResult.text(...)
//   - image          → actionResult.image(...)
//   - none           → actionResult.none(...)
//   - path_reference → actionResult.path_reference(...)
//
// Each handler also exercises a handful of ctx.host.* methods so the runtime
// log demonstrates that handlers are not limited to the result builder.

import { actionResult } from "@clipbus/plugin-sdk/runtime";
import type {
  PluginAutoRunActionHandler,
  PluginAutoRunActionInput,
  PluginActionOperationResult,
  PluginActionResolveResult,
} from "@clipbus/plugin-sdk/runtime";

// All gallery auto-run actions follow the same lifecycle: they execute
// directly from the host without a draft UI. After plugin-api-shrink (R13
// strict handler), PluginAutoRunActionHandler requires both `resolveSession`
// and `runAutoAction`; auto-run actions provide a minimal session that the
// host never reads.
const autoRunResolveSessionStub = async (): Promise<PluginActionResolveResult> => ({
  buttons: [],
  initialDraft: {},
});
import { promises as fs } from "node:fs";
import path from "node:path";

type CtxAny = {
  host?: {
    action?: {
      allocateImageTempPath?: (p: { formatHint: string }) => Promise<{ path: string }>;
      materializeInputImagePath?: () => Promise<{ path: string }>;
      allocateOutputFilePath?: (p: { suggestedName?: string }) => Promise<{ path: string }>;
    };
    clipboard?: {
      copyText?: (p: { text: string }) => Promise<unknown>;
    };
    console?: {
      log?: (p: { level: "debug" | "info" | "warn" | "error"; message: string }) => Promise<unknown>;
    };
  };
} | null | undefined;

function summarizeInput(input: PluginAutoRunActionInput): string {
  const item = (input?.sourceItem ?? null) as { id?: unknown; type?: unknown } | null;
  const content = (input?.content ?? null) as { kind?: unknown } | null;
  return JSON.stringify(
    {
      itemID: item?.id ?? null,
      itemType: item?.type ?? null,
      contentKind: content?.kind ?? null,
      capabilitiesShown: ["actionResult.text", "host.console.log"],
    },
    null,
    2,
  );
}

export function createAutoActionText(): PluginAutoRunActionHandler {
  return {
    resolveSession: autoRunResolveSessionStub,
    async runAutoAction(input: PluginAutoRunActionInput, ctx: unknown): Promise<PluginActionOperationResult> {
      const ctxAny = ctx as CtxAny;
      try {
        await ctxAny?.host?.console?.log?.({ level: "info", message: "gallery-auto-text fired" });
      } catch {
        // host.console.log is non-fatal demo
      }
      const dump = summarizeInput(input);
      return actionResult.text(
        ["Gallery: actionResult.text demo", "", dump].join("\n"),
        { userMessage: "Gallery text result" },
      );
    },
  };
}

export function createAutoActionImage(): PluginAutoRunActionHandler {
  return {
    resolveSession: autoRunResolveSessionStub,
    async runAutoAction(_input: PluginAutoRunActionInput, ctx: unknown): Promise<PluginActionOperationResult> {
      const ctxAny = ctx as CtxAny;
      // Manifest gates this action to image items, so materialization is safe
      // to require here.
      const materialized = await ctxAny?.host?.action?.materializeInputImagePath?.();
      const sourcePath = materialized?.path;
      if (typeof sourcePath !== "string" || sourcePath.length === 0) {
        throw new Error("materializeInputImagePath returned no path");
      }
      const ext = path.extname(sourcePath).toLowerCase().replace(/^\./, "");
      const imageFormatHint = ext || "png";

      const allocated = await ctxAny?.host?.action?.allocateImageTempPath?.({ formatHint: imageFormatHint });
      const tempPath = allocated?.path;
      if (typeof tempPath !== "string" || tempPath.length === 0) {
        throw new Error("allocateImageTempPath returned no path");
      }

      await fs.copyFile(sourcePath, tempPath);
      return actionResult.image(tempPath, {
        imageFormatHint,
        userMessage: "Gallery image result",
      });
    },
  };
}

export function createAutoActionNone(): PluginAutoRunActionHandler {
  return {
    resolveSession: autoRunResolveSessionStub,
    async runAutoAction(_input: PluginAutoRunActionInput, ctx: unknown): Promise<PluginActionOperationResult> {
      const ctxAny = ctx as CtxAny;
      try {
        await ctxAny?.host?.console?.log?.({ level: "info", message: "gallery-auto-none side-effect fired" });
      } catch {
        // best-effort demo
      }
      try {
        await ctxAny?.host?.clipboard?.copyText?.({ text: "gallery-auto-none demo copy" });
      } catch {
        // best-effort demo
      }
      return actionResult.none({ userMessage: "Gallery none result (side-effects only)" });
    },
  };
}

export function createAutoActionPathReference(): PluginAutoRunActionHandler {
  return {
    resolveSession: autoRunResolveSessionStub,
    async runAutoAction(
      input: PluginAutoRunActionInput,
      ctx: unknown
    ): Promise<PluginActionOperationResult> {
      if (input.content.kind === "path_reference" && input.content.entries.length > 0) {
        return actionResult.path_reference(
          [{ source: "input", inputIndex: 0 }],
          { userMessage: "Gallery reused the first current-input path" },
        );
      }

      const ctxAny = ctx as CtxAny;
      const allocated = await ctxAny?.host?.action?.allocateOutputFilePath?.({
        suggestedName: "gallery-action-output.txt",
      });
      if (!allocated?.path) {
        throw new Error("allocateOutputFilePath returned no path");
      }
      await fs.writeFile(
        allocated.path,
        [
          "Clipbus template plugin Action output",
          `sourceItem=${input.sourceItem.id}`,
          `contentKind=${input.content.kind}`,
        ].join("\n"),
        "utf8",
      );
      return actionResult.path_reference(
        [{
          source: "allocated_file",
          path: allocated.path,
          displayName: "gallery-action-output.txt",
        }],
        { userMessage: "Gallery file result" },
      );
    },
  };
}
