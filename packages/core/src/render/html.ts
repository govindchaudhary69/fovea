import { split } from "../segment.js";
import type { Token } from "../types.js";

export interface HtmlOptions {
  /** Element wrapped around each stem. */
  tag: string;
  /** Class applied to that element, or "" for none. */
  className: string;
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (character) => ESCAPES[character]!);
}

export function renderHtml(
  tokens: Token[],
  options: Partial<HtmlOptions> = {},
): string {
  const tag = options.tag ?? "b";
  const className = options.className ?? "fovea-stem";
  const attribute = className ? ` class="${escapeHtml(className)}"` : "";
  let out = "";

  for (const token of tokens) {
    if (token.kind !== "word" || token.stem <= 0) {
      out += escapeHtml(token.text);
      continue;
    }
    const [head, tail] = split(token);
    out += `<${tag}${attribute}>${escapeHtml(head)}</${tag}>${escapeHtml(tail)}`;
  }

  return out;
}
