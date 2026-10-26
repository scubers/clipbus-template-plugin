// Messages between the expanded card page and the plugin runtime. The page
// calls `analyzeItem.call()`; the runtime answers with `analyzeItem.handle(fn)`
// (see ./analyze.ts). Only this contract is shared: the handler stays in Node.

import { defineMessage, type PluginContentKind } from "@clipbus/plugin-sdk";

export interface WordCount {
  word: string;
  count: number;
}

export interface ItemAnalysis {
  contentKind: PluginContentKind;
  /** Text items. */
  lines?: number;
  words?: number;
  characters?: number;
  topWords?: WordCount[];
  /** Image items: size and digest of the image file. */
  fileBytes?: number;
  sha256?: string;
}

/** Ask the runtime to analyze the card item; it works on the full content, not the attachment. */
export const analyzeItem = defineMessage<void, ItemAnalysis>("template.analyze");
