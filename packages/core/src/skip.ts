/**
 * Heuristics for chunks that should be left verbatim.
 *
 * These run on whitespace-delimited chunks *before* word segmentation, because
 * a segmenter happily splits `src/utils/parse.ts` into five word-like pieces
 * and emphasizing each one is what makes naive implementations unreadable.
 */

// Deliberately excludes * [ ] { } — those carry markdown emphasis and link
// syntax, which is prose often enough that skipping on them costs more than
// the occasional false negative.
const SYMBOLS = /[/\\_@#$%^&=+<>|`~]|::|:\/\//;
const CAMEL_CASE = /^\p{Ll}+\p{Lu}/u;
const INNER_DOT = /\p{L}\.\p{L}/u;
const FLAG = /^--?\p{L}/u;
const MIXED_ALNUM = /\p{L}\p{Nd}|\p{Nd}\p{L}/u;
const HAS_LETTER = /\p{L}/u;

// Scripts without word-internal letter order to exploit — there is no leading
// stem to bold in 漢字, so the technique is meaningless and only adds noise.
const UNSUITED_SCRIPT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;

const LEADING_PUNCT = /^[("'`‘“]+/;
const TRAILING_PUNCT = /[)"'`.,;:!?’”]+$/;

/** Strip the punctuation a sentence wraps around a word, keeping the core. */
export function bare(chunk: string): string {
  return chunk.replace(LEADING_PUNCT, "").replace(TRAILING_PUNCT, "");
}

export function looksLikeCode(chunk: string): boolean {
  const core = bare(chunk);
  if (!core) return true;
  if (!HAS_LETTER.test(core)) return true;
  if (UNSUITED_SCRIPT.test(core)) return true;
  if (FLAG.test(core)) return true;
  if (SYMBOLS.test(core)) return true;
  if (CAMEL_CASE.test(core)) return true;
  if (MIXED_ALNUM.test(core)) return true;
  // `file.ts`, `obj.prop` — but not the period ending a sentence, which
  // TRAILING_PUNCT already removed.
  if (INNER_DOT.test(core)) return true;
  return false;
}

/**
 * Function words carry little meaning, and emphasizing them draws the eye to
 * the least informative part of a line. Off by default — it is a real taste
 * split among readers.
 */
export const STOPWORDS = new Set([
  "a", "an", "and", "as", "at", "be", "but", "by", "for", "from", "if", "in",
  "is", "it", "of", "on", "or", "so", "the", "to", "up", "was", "were", "with",
]);
