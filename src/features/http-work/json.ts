import type { PluginHttpApi } from "@clipbus/plugin-sdk";

/** Manual request under the configured origin; the Host still enforces all permissions. */
export async function requestJsonDemo(http: PluginHttpApi, options: {
  origin: string;
  path: string;
  method: string;
  body?: string;
}): Promise<{ status: number; body: string }> {
  const path = options.path.trim();
  const url = new URL(path, options.origin);
  if (!path.startsWith("/") || path.startsWith("//") || url.origin !== new URL(options.origin).origin) {
    throw new Error("Enter a path under the configured origin, such as /todos/1.");
  }
  const body = options.method === "GET" || !options.body?.trim() ? undefined : options.body;
  if (body !== undefined) {
    try { JSON.parse(body); }
    catch { throw new Error("Request body must be valid JSON."); }
  }
  const response = await http.request({
    permission: "http-demo",
    url: url.href,
    method: options.method,
    headers: body === undefined ? [["Accept", "application/json"]]
      : [["Accept", "application/json"], ["Content-Type", "application/json"]],
    ...(body === undefined ? {} : { body }),
  });
  try {
    const body = await response.text();
    try {
      return { status: response.status, body: JSON.stringify(body.trim() ? JSON.parse(body) : null, null, 2).slice(0, 2048) };
    } catch {
      throw new Error(`HTTP ${response.status}: response is not valid JSON.`);
    }
  } finally {
    await response.cancel();
  }
}
