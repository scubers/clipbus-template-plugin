// Text analysis behind `template.analyze`. Pure, so the preview workbench can
// answer the message with the same logic the runtime uses.

import type { ItemAnalysis, WordCount } from "./messages";

const TOP_WORDS = 5;

export function analyzeText(text: string): ItemAnalysis {
  const words = text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const topWords: WordCount[] = [...counts]
    .map(([word, count]) => ({ word, count }))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word))
    .slice(0, TOP_WORDS);
  return {
    contentKind: "text",
    lines: text === "" ? 0 : text.split(/\r\n|\n/).length,
    words: words.length,
    characters: [...text].length,
    topWords,
  };
}
