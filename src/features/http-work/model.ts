import type { PluginHttpApi } from "@clipbus/plugin-sdk";
import { sseData } from "./sse";

export const MODEL_PERMISSION = "model-api";

/** Text-only Chat Completions, with no provider SDK, storage or logging. */
export async function streamModel(http: PluginHttpApi, options: {
  origin: string;
  url: string;
  apiKey: string;
  model: string;
  prompt: string;
  signal: AbortSignal;
}, onText: (text: string) => void): Promise<void> {
  const url = new URL(options.url.trim());
  if (url.origin !== new URL(options.origin).origin || url.username || url.password || url.hash) {
    throw new Error("The API URL must use the model service origin approved in plugin network settings, without URL credentials or fragments.");
  }
  if (!options.model.trim() || !options.prompt.trim()) throw new Error("Enter a model and a prompt.");
  options.signal.throwIfAborted();
  const headers: [string, string][] = [["Content-Type", "application/json"], ["Accept", "text/event-stream"]];
  if (options.apiKey.trim()) headers.push(["Authorization", `Bearer ${options.apiKey.trim()}`]);
  const response = await http.request({
    permission: MODEL_PERMISSION, url: url.href, method: "POST", headers,
    body: JSON.stringify({ model: options.model.trim(), messages: [{ role: "user", content: options.prompt }], stream: true }),
    signal: options.signal, timeoutMs: 600_000,
  });
  try {
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}. Check the API URL, key and model.`);
    }
    if (!response.headers.some(([name, value]) => name.toLowerCase() === "content-type" && value.split(";")[0].trim().toLowerCase() === "text/event-stream")) {
      throw new Error("Expected a text/event-stream response from a Chat Completions endpoint.");
    }
    for await (const data of sseData(response.body, options.signal)) {
      options.signal.throwIfAborted();
      if (data.trim() === "[DONE]") return;
      if (!data.trim()) continue;
      let event: { error?: unknown; choices?: { delta?: { content?: unknown; refusal?: unknown } }[] };
      try { event = JSON.parse(data); }
      catch { throw new Error("The model returned an invalid JSON stream event."); }
      if (event?.error !== undefined) throw new Error("The model service returned an error event.");
      if (!Array.isArray(event?.choices)) throw new Error("Expected a Chat Completions stream event with choices.");
      const delta = event.choices[0]?.delta;
      const text = delta?.content ?? delta?.refusal;
      if (typeof text === "string") onText(text);
    }
    throw new Error("The model stream ended before [DONE]; the response may be incomplete.");
  } finally {
    await response.cancel();
  }
}
