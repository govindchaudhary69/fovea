import { split } from "../segment.js";
import type { Token } from "../types.js";

/**
 * Emits `**st**em` markers. Note that Markdown emphasis cannot nest inside a
 * fenced code block, so callers rendering whole documents should keep fences
 * out of the token stream rather than relying on this to no-op there.
 */
export function renderMarkdown(tokens: Token[]): string {
  let out = "";

  for (const token of tokens) {
    if (token.kind !== "word" || token.stem <= 0) {
      out += token.text;
      continue;
    }
    const [head, tail] = split(token);
    out += `**${head}**${tail}`;
  }

  return out;
}
