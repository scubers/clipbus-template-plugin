import type { DetectorHandler } from "@clipbus/plugin-sdk/runtime";
import { computeDigest } from "./compute";
import { BACKGROUND_ROUNDS, LOCAL_DIGEST_TASK, localDigest } from "./contracts";

export const handleLocalDigest = localDigest.handle(({ text, rounds }) => computeDigest(text, rounds));

export const detectBackground: DetectorHandler = async ({ content, trigger }, ctx) => {
  if (content.kind !== "text" || !content.text.startsWith("local-digest:")) return;
  await ctx.tasks.enqueue({
    id: LOCAL_DIGEST_TASK,
    data: { rounds: BACKGROUND_ROUNDS },
    policy: trigger === "edit" || trigger === "manual" ? "replace" : "reuse",
  });
};
