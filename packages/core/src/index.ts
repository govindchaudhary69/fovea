export { tokenize, split } from "./segment.js";
export { stemLength } from "./stem.js";
export { looksLikeCode, bare, STOPWORDS } from "./skip.js";
export { defaults, resolve } from "./types.js";
export type { Options, Token, TokenKind } from "./types.js";

export { renderAnsi, emphasize } from "./render/ansi.js";
export type { AnsiOptions, AnsiStyle } from "./render/ansi.js";
export { renderHtml, escapeHtml } from "./render/html.js";
export type { HtmlOptions } from "./render/html.js";
export { renderMarkdown } from "./render/markdown.js";

import { tokenize } from "./segment.js";
import { renderAnsi } from "./render/ansi.js";
import { renderHtml } from "./render/html.js";
import { renderMarkdown } from "./render/markdown.js";
import type { Options } from "./types.js";

/** Convenience wrappers for the common one-shot case. */
export function toAnsi(text: string, options?: Partial<Options>): string {
  return renderAnsi(tokenize(text, options));
}

export function toHtml(text: string, options?: Partial<Options>): string {
  return renderHtml(tokenize(text, options));
}

export function toMarkdown(text: string, options?: Partial<Options>): string {
  return renderMarkdown(tokenize(text, options));
}
