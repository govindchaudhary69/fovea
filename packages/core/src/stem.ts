import type { Options } from "./types.js";

/**
 * Short words don't survive a proportional rule: 0.4 of a 3-letter word is
 * 1.2 characters, and rounding it either way looks wrong next to its
 * neighbours. Fixing the first two length bands by hand keeps short words
 * legible and lets the ratio govern everything from six characters up.
 */
export function stemLength(word: string, options: Options): number {
  const length = [...word].length;
  if (length < options.minWordLength) return 0;
  if (length <= 3) return 1;
  if (length <= 5) return 2;

  const proportional = Math.ceil(length * options.ratio);
  // Never emphasize the whole word — the unbolded tail is what the eye skips.
  return Math.min(proportional, options.maxStem, length - 1);
}
