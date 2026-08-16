import { stemLength } from "./stem.js";
import { looksLikeCode, STOPWORDS } from "./skip.js";
import { resolve, type Options, type Token } from "./types.js";

const segmenters = new Map<string, Intl.Segmenter>();

function segmenterFor(locale: string): Intl.Segmenter {
  let segmenter = segmenters.get(locale);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(locale, { granularity: "word" });
    segmenters.set(locale, segmenter);
  }
  return segmenter;
}

/**
 * Split text into tokens, each carrying how many leading characters to
 * emphasize. Rendering is a separate step so one pass over the text can feed
 * a terminal, a DOM, or a Markdown file.
 */
export function tokenize(text: string, options: Partial<Options> = {}): Token[] {
  const resolved = resolve(options);
  const tokens: Token[] = [];

  // Whitespace-delimited chunks first: code detection needs the whole
  // `src/parse.ts` before a segmenter takes it apart.
  const chunks = text.split(/(\s+)/);

  for (const chunk of chunks) {
    if (!chunk) continue;
    if (/^\s+$/.test(chunk)) {
      tokens.push({ text: chunk, kind: "gap", stem: 0 });
      continue;
    }
    if (looksLikeCode(chunk)) {
      tokens.push({ text: chunk, kind: "skip", stem: 0 });
      continue;
    }
    tokens.push(...segmentChunk(chunk, resolved));
  }

  return tokens;
}

function segmentChunk(chunk: string, options: Options): Token[] {
  const tokens: Token[] = [];

  for (const segment of segmenterFor(options.locale).segment(chunk)) {
    const text = segment.segment;
    if (!segment.isWordLike) {
      tokens.push({ text, kind: "gap", stem: 0 });
      continue;
    }
    if (options.skipStopwords && STOPWORDS.has(text.toLowerCase())) {
      tokens.push({ text, kind: "skip", stem: 0 });
      continue;
    }
    if (options.skip?.(text)) {
      tokens.push({ text, kind: "skip", stem: 0 });
      continue;
    }

    const stem = stemLength(text, options);
    tokens.push(stem > 0 ? { text, kind: "word", stem } : { text, kind: "skip", stem: 0 });
  }

  return tokens;
}

/** Split a word at its stem. Handles astral characters correctly. */
export function split(token: Token): [head: string, tail: string] {
  if (token.stem <= 0) return [token.text, ""];
  const characters = [...token.text];
  return [
    characters.slice(0, token.stem).join(""),
    characters.slice(token.stem).join(""),
  ];
}
