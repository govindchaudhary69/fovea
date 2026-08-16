import { split } from "../segment.js";
import type { Token } from "../types.js";

export type AnsiStyle = "bold" | "dim-tail" | "both";

export interface AnsiOptions {
  style: AnsiStyle;
  /**
   * SGR sequence active in the surrounding stream, re-emitted after every
   * stem. Necessary because SGR 22 means "normal intensity" and clears dim as
   * well as bold — without restoring, emphasizing one word inside dim text
   * un-dims the rest of the line.
   */
  restore: string;
}

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const NORMAL = "\x1b[22m";

export function renderAnsi(
  tokens: Token[],
  options: Partial<AnsiOptions> = {},
): string {
  const style = options.style ?? "bold";
  const restore = options.restore ?? "";
  let out = "";

  for (const token of tokens) {
    if (token.kind !== "word" || token.stem <= 0) {
      out += token.text;
      continue;
    }
    const [head, tail] = split(token);
    out += emphasize(head, tail, style, restore);
  }

  return out;
}

export function emphasize(
  head: string,
  tail: string,
  style: AnsiStyle,
  restore: string,
): string {
  switch (style) {
    case "bold":
      return `${BOLD}${head}${NORMAL}${restore}${tail}`;
    case "dim-tail":
      return `${head}${DIM}${tail}${NORMAL}${restore}`;
    case "both":
      return `${BOLD}${head}${NORMAL}${DIM}${tail}${NORMAL}${restore}`;
  }
}
