// Entries of the bounded page's log panel.

import { PluginRemoteError } from "@clipbus/plugin-sdk/view";

export interface LogError {
  name: string;
  message: string;
  data?: unknown;
  /** "plugin handler" when the runtime handler threw (PluginHandlerFailed), "host" otherwise. */
  source: "plugin handler" | "host";
}

export interface LogEntry {
  ts: string;
  api: string;
  args?: unknown;
  result?: unknown;
  error?: LogError;
}

/**
 * A rejected call. Host errors carry a contract name (`PluginInvalidRequest`,
 * …); an error a runtime handler threw is a `PluginRemoteError` that keeps its
 * own name, whichever SDK entry point the call went through.
 */
export function describeError(error: unknown): LogError {
  if (error instanceof Error) {
    const { data } = error as Error & { data?: unknown };
    return {
      name: error.name,
      message: error.message,
      ...(data === undefined ? {} : { data }),
      source: error instanceof PluginRemoteError ? "plugin handler" : "host",
    };
  }
  return { name: "Error", message: String(error), source: "host" };
}

export function timestamp(): string {
  return new Date().toLocaleTimeString();
}
