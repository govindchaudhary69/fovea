/**
 * Tracks which parts of a stream are code rather than prose.
 *
 * The per-word heuristics in fovea-core catch `src/index.ts` and `--max-stem`,
 * but they see one word at a time and cannot tell that ten consecutive lines
 * are a code block. Bare identifiers inside a fenced block — `const`, `new`,
 * `if` — look exactly like prose to them.
 *
 * Deciding a line's kind needs only the first few characters, so classification
 * holds back a bounded prefix and then streams the rest of the line freely.
 * Waiting for a whole line would stall output mid-sentence, which is precisely
 * what a reader of streaming agent output would notice.
 */

export type CodeDetection = "auto" | "fences" | "off";

export interface Run {
  text: string;
  /** Emit verbatim rather than emphasizing. */
  code: boolean;
  /** An escape sequence, passed through untouched. */
  escape: boolean;
}

/** Cap on held-back characters, so an unusual line cannot stall the stream. */
const MAX_PENDING = 64;

type Verdict = "fence" | "code" | "prose";

interface Held {
  text: string;
  escape: boolean;
}

export class RegionTracker {
  private inFence = false;
  private decided = false;
  private isCode = false;
  private isFence = false;
  private held: Held[] = [];
  private heldText = "";

  constructor(private readonly enabled: boolean) {}

  /** Escape sequences never change classification, but must keep their place. */
  escape(sequence: string): Run[] {
    if (!this.enabled || this.decided) {
      return [{ text: sequence, code: false, escape: true }];
    }
    this.held.push({ text: sequence, escape: true });
    return [];
  }

  text(slice: string): Run[] {
    if (!this.enabled) return [{ text: slice, code: false, escape: false }];

    const runs: Run[] = [];
    let rest = slice;
    while (rest.length > 0) {
      const newline = rest.indexOf("\n");
      const piece = newline === -1 ? rest : rest.slice(0, newline + 1);
      rest = newline === -1 ? "" : rest.slice(newline + 1);
      runs.push(...this.consume(piece));
    }
    return runs;
  }

  /** Release anything still held. Call when the source closes. */
  flush(): Run[] {
    if (this.held.length === 0) return [];
    this.isCode = this.inFence;
    return this.release();
  }

  private consume(piece: string): Run[] {
    const runs: Run[] = [];
    const endsLine = piece.endsWith("\n");

    if (this.decided) {
      runs.push({ text: piece, code: this.isCode, escape: false });
    } else {
      this.held.push({ text: piece, escape: false });
      this.heldText += piece;

      const verdict = classify(this.heldText, this.inFence, endsLine);
      if (verdict) {
        this.decided = true;
        this.isFence = verdict === "fence";
        this.isCode = verdict !== "prose";
        runs.push(...this.release());
      }
    }

    if (endsLine) {
      // A fence line both belongs to the block and toggles it, so the switch
      // happens once the line is complete rather than when it is recognized.
      if (this.isFence) this.inFence = !this.inFence;
      this.decided = false;
      this.isFence = false;
      this.isCode = false;
    }

    return runs;
  }

  private release(): Run[] {
    const runs = this.held.map((item) => ({
      text: item.text,
      code: item.escape ? false : this.isCode,
      escape: item.escape,
    }));
    this.held = [];
    this.heldText = "";
    return runs;
  }
}

function classify(text: string, inFence: boolean, force: boolean): Verdict | null {
  const body = text.replace(/^[ \t]*/, "");

  if (body.startsWith("```") || body.startsWith("~~~")) return "fence";

  // A line can only open a fence if it starts with a backtick or tilde, so one
  // character is usually enough to rule that out and let the line stream.
  const settled =
    body.length >= 3 || (body.length >= 1 && body[0] !== "`" && body[0] !== "~");

  if (settled || force || text.length > MAX_PENDING) {
    return inFence ? "code" : "prose";
  }
  return null;
}
