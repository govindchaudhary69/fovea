import { renderAnsi, tokenize, type Options } from "fovea-core";
import type { AnsiStyle } from "fovea-core";
import { SgrState } from "./sgr.js";
import { RegionTracker, type CodeDetection, type Run } from "./region.js";

const CSI = "\\x1b\\[[0-9;:?]*[ -/]*[@-~]";
// OSC, DCS, SOS, PM and APC all carry a payload terminated by BEL or ST.
const STRING = "\\x1b[\\]PX^_][\\s\\S]*?(?:\\x07|\\x1b\\\\)";
// Two-character escapes, minus [ (CSI) and the string introducers above —
// leaving them in lets an unterminated OSC match here and spill its payload
// into the text stream.
const SHORT = "\\x1b[@A-OQ-WYZ\\\\]";
const ANY_ESCAPE = `${CSI}|${STRING}|${SHORT}`;
const ESCAPE = new RegExp(ANY_ESCAPE, "g");
const STARTS_WITH_ESCAPE = new RegExp(`^(?:${ANY_ESCAPE})`);
const SGR_PARAMS = /^\x1b\[([0-9;:]*)m$/;

/**
 * Longest trailing word fragment we will hold back waiting for the rest of the
 * word. Beyond this the text is almost certainly not a word, and holding it
 * would visibly stall the stream.
 */
const MAX_HOLD = 64;

export interface StreamOptions extends Partial<Options> {
  style?: AnsiStyle;
  /**
   * How hard to work at leaving code blocks alone.
   *
   *  - `fences` follows Markdown fences, which survive in piped output.
   *  - `auto` adds a background-colour signal, for agents that have already
   *    rendered their Markdown to ANSI and left no fences behind.
   *  - `off` emphasizes everything that is not caught per-word.
   */
  codeDetection?: CodeDetection;
}

/**
 * Applies fixation-point emphasis to a terminal stream, one chunk at a time.
 *
 * Two problems make this different from transforming a finished string:
 *
 *  - Chunks split anywhere. A word or an escape sequence can straddle the
 *    boundary, so incomplete tails are held until the next chunk.
 *  - The stream is already styled. Bytes inside escape sequences must never be
 *    treated as text, and the emphasis must restore whatever SGR state the
 *    producer had set.
 */
export class BionicTransform {
  private held = "";
  private readonly sgr = new SgrState();
  private readonly options: StreamOptions;
  private readonly detection: CodeDetection;
  private readonly region: RegionTracker;

  constructor(options: StreamOptions = {}) {
    this.options = options;
    this.detection = options.codeDetection ?? "auto";
    this.region = new RegionTracker(this.detection !== "off");
  }

  feed(chunk: string): string {
    let data = this.held + chunk;
    this.held = "";

    const boundary = holdFrom(data);
    if (boundary < data.length) {
      this.held = data.slice(boundary);
      data = data.slice(0, boundary);
    }
    if (!data) return "";

    let out = "";
    let position = 0;
    ESCAPE.lastIndex = 0;

    for (let match = ESCAPE.exec(data); match; match = ESCAPE.exec(data)) {
      out += this.render(this.region.text(data.slice(position, match.index)));
      const sequence = match[0];
      const params = SGR_PARAMS.exec(sequence);
      if (params) this.sgr.apply(params[1]!);
      out += this.render(this.region.escape(sequence));
      position = match.index + sequence.length;
    }
    out += this.render(this.region.text(data.slice(position)));

    return out;
  }

  /** Emit anything still held back. Call when the source closes. */
  flush(): string {
    const remaining = this.held;
    this.held = "";
    const trailing = remaining ? this.region.text(remaining) : [];
    return this.render(trailing) + this.render(this.region.flush());
  }

  private render(runs: Run[]): string {
    let out = "";
    for (const run of runs) {
      const verbatim = run.escape || run.code || this.painted();
      out += verbatim ? run.text : this.emphasize(run.text);
    }
    return out;
  }

  /**
   * A painted background almost always means a rendered code block, a diff, or
   * a selection — none of which should be skimmed.
   */
  private painted(): boolean {
    return this.detection === "auto" && this.sgr.hasBackground();
  }

  private emphasize(slice: string): string {
    if (!slice) return "";
    return renderAnsi(tokenize(slice, this.options), {
      style: this.options.style ?? "bold",
      restore: this.sgr.restore(),
    });
  }
}

/**
 * Index at which the tail of `data` should be held back for the next chunk:
 * either an unterminated escape sequence or a word that may continue.
 */
function holdFrom(data: string): number {
  const lastEscape = data.lastIndexOf("\x1b");
  if (lastEscape !== -1) {
    if (!STARTS_WITH_ESCAPE.test(data.slice(lastEscape))) return lastEscape;
  }

  let index = data.length;
  while (index > 0 && isWordCharacter(data[index - 1]!)) index--;
  if (index === data.length) return data.length;
  if (data.length - index > MAX_HOLD) return data.length;
  return index;
}

const WORD_CHARACTER = /[\p{L}\p{Nd}'’-]/u;

function isWordCharacter(character: string): boolean {
  return WORD_CHARACTER.test(character);
}
