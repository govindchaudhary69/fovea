/** What a tokenizer produced for one run of characters. */
export type TokenKind =
  /** Prose. Gets a leading stem. */
  | "word"
  /** Left verbatim: code, paths, URLs, scripts the technique doesn't suit. */
  | "skip"
  /** Whitespace and punctuation between words. */
  | "gap";

export interface Token {
  text: string;
  kind: TokenKind;
  /** Leading characters to emphasize. Always 0 unless kind is "word". */
  stem: number;
}

export interface Options {
  /**
   * Fraction of a word to emphasize, applied to words long enough that the
   * short-word table below doesn't already decide. 0.4 is the common default.
   */
  ratio: number;
  /** Hard cap, so a 14-letter word doesn't get 6 bold characters. */
  maxStem: number;
  /** Words shorter than this are left alone entirely. */
  minWordLength: number;
  /** Leave common function words unemphasized to reduce visual noise. */
  skipStopwords: boolean;
  /** Locale passed to Intl.Segmenter for word breaking. */
  locale: string;
  /** Called for each candidate word; return true to leave it alone. */
  skip?: (word: string) => boolean;
}

export const defaults: Options = {
  ratio: 0.4,
  maxStem: 5,
  minWordLength: 2,
  skipStopwords: false,
  locale: "en",
};

export function resolve(options: Partial<Options> = {}): Options {
  return { ...defaults, ...options };
}
