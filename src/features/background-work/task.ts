import type { TaskHandler } from "@clipbus/plugin-sdk/runtime";
import { createExpandedPayload, expandedAttachment } from "../expanded-renderer/payload";
import { computeDigest } from "./compute";
import type { LocalDigestOptions } from "./contracts";

export const digestTask: TaskHandler<LocalDigestOptions> = async ({ content, data }, ctx) => {
  if (content.kind !== "text") return;
  const localDigest = await computeDigest(content.text, data.rounds, ctx.task.signal);
  ctx.task.signal.throwIfAborted();
  await expandedAttachment.replace(ctx, [{
    key: "background-digest",
    payload: { ...createExpandedPayload(content), localDigest },
    card: { title: "Background digest result" },
  }]);
  // Notification is immediate; the Host still has to validate and commit the staged result.
  if (ctx.capabilities.has("system.notify")) {
    try {
      await ctx.system.notify({
        title: "Local calculation finished",
        body: "Reopen the source item to check whether its background result was saved.",
      });
    } catch {
      // System permission or rate limits must not turn a successful calculation into a failed task.
      ctx.log.info("Background calculation finished; notification was unavailable.");
    }
  }
};
