/**
 * Tracks the SGR attributes currently active in a terminal stream.
 *
 * Emphasizing a word means emitting SGR 22 ("normal intensity") to end the
 * stem — and 22 clears dim as well as bold. If the surrounding text was dim,
 * ending a stem there silently un-dims the remainder of the line. So we keep
 * enough state to re-assert what was active and replay it after each stem.
 *
 * State is a fixed set of slots rather than an accumulated string, so a long
 * session with thousands of colour changes stays bounded.
 */
export class SgrState {
  private bold = false;
  private dim = false;
  private italic = false;
  private underline = false;
  private inverse = false;
  private strike = false;
  private foreground: number[] | null = null;
  private background: number[] | null = null;

  /** Feed the parameter string of one SGR sequence, e.g. "1;38;5;204". */
  apply(params: string): void {
    // An empty parameter list means SGR 0.
    const codes = (params === "" ? "0" : params).split(";").map((p) => {
      const n = Number.parseInt(p, 10);
      return Number.isNaN(n) ? 0 : n;
    });

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i]!;
      switch (code) {
        case 0: this.reset(); break;
        case 1: this.bold = true; break;
        case 2: this.dim = true; break;
        case 3: this.italic = true; break;
        case 4: this.underline = true; break;
        case 7: this.inverse = true; break;
        case 9: this.strike = true; break;
        case 21:
        case 22: this.bold = false; this.dim = false; break;
        case 23: this.italic = false; break;
        case 24: this.underline = false; break;
        case 27: this.inverse = false; break;
        case 29: this.strike = false; break;
        case 39: this.foreground = null; break;
        case 49: this.background = null; break;
        case 38:
        case 48: {
          const extended = readExtended(codes, i);
          if (!extended) { i = codes.length; break; }
          if (code === 38) this.foreground = extended.slot;
          else this.background = extended.slot;
          i = extended.next - 1;
          break;
        }
        default:
          if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
            this.foreground = [code];
          } else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) {
            this.background = [code];
          }
      }
    }
  }

  reset(): void {
    this.bold = false;
    this.dim = false;
    this.italic = false;
    this.underline = false;
    this.inverse = false;
    this.strike = false;
    this.foreground = null;
    this.background = null;
  }

  /** The sequence that re-establishes this state from normal intensity. */
  restore(): string {
    const codes: number[] = [];
    if (this.bold) codes.push(1);
    if (this.dim) codes.push(2);
    if (this.italic) codes.push(3);
    if (this.underline) codes.push(4);
    if (this.inverse) codes.push(7);
    if (this.strike) codes.push(9);
    if (this.foreground) codes.push(...this.foreground);
    if (this.background) codes.push(...this.background);
    return codes.length ? `\x1b[${codes.join(";")}m` : "";
  }
}

/** Read a 38/48 extended-colour run: `5;n` or `2;r;g;b`. */
function readExtended(
  codes: number[],
  start: number,
): { slot: number[]; next: number } | null {
  const kind = codes[start + 1];
  if (kind === 5 && codes.length > start + 2) {
    return { slot: codes.slice(start, start + 3), next: start + 3 };
  }
  if (kind === 2 && codes.length > start + 4) {
    return { slot: codes.slice(start, start + 5), next: start + 5 };
  }
  return null;
}
