import { createHash } from "node:crypto";
import { setImmediate } from "node:timers/promises";
import type { LocalDigestResult } from "./contracts";

// Iterated SHA-256 is a local CPU workload. Duration depends on the machine.
// Yielding lets Node receive cancellation; no network or files are required.
export async function computeDigest(text: string, rounds: number, signal?: AbortSignal): Promise<LocalDigestResult> {
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 1_000_000) {
    throw new RangeError("rounds must be an integer between 1 and 1000000");
  }
  signal?.throwIfAborted();
  let digest = createHash("sha256").update(text).digest();
  for (let round = 1; round < rounds; round++) {
    digest = createHash("sha256").update(digest).digest();
    if (round % 512 === 0) {
      await setImmediate();
      signal?.throwIfAborted();
    }
  }
  signal?.throwIfAborted();
  return { rounds, sha256: digest.toString("hex") };
}
