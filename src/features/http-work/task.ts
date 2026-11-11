import type { TaskHandler } from "@clipbus/plugin-sdk/runtime";
import { createExpandedPayload, expandedAttachment } from "../expanded-renderer/payload";
import { sseData } from "./sse";

export const HTTP_PERMISSION = "http-demo";
export const HTTP_TASK = "http-stream";

/** Plugin-side SSE framing; the Host supplies bytes, never provider-specific model events. */
async function collectEvents(body: AsyncIterable<Uint8Array>, signal: AbortSignal) {
  let events = 0;
  let lastEvent = "";
  for await (const data of sseData(body, signal)) {
    events++;
    lastEvent = data.slice(0, 2048);
  }
  return { events, lastEvent };
}

export const httpStreamTask: TaskHandler = async (_input, ctx) => {
  if (!ctx.capabilities.has("http.start")) throw new Error("This Host does not support HTTP");
  const origin = ctx.plugin.network(HTTP_PERMISSION);
  if (!origin) throw new Error("Configure the HTTP demo origin in the plugin's network settings");
  // Explicit manual demo: GET /events sends no clipboard content or credentials.
  const response = await ctx.http.request({
    permission: HTTP_PERMISSION,
    url: new URL("/events", origin).href,
    headers: [["Accept", "text/event-stream"]],
    timeoutMs: 600_000,
  });
  try {
    if (response.status >= 400) throw new Error("HTTP stream demo request failed");
    const httpResult = await collectEvents(response.body, ctx.task.signal);
    ctx.task.signal.throwIfAborted();
    await expandedAttachment.replace(ctx, [{
      key: "background-http",
      payload: { ...createExpandedPayload({ kind: "text", text: "HTTP streaming example" }), httpResult },
      card: { title: "HTTP stream result" },
    }]);
  } finally {
    await response.cancel();
  }
};
