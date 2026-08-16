# fovea-stream

Incremental fixation-point emphasis for text that arrives in pieces and is
already coloured — the transform behind
[fovea](https://github.com/govindchaudhary69/fovea).

```
npm install fovea-stream
```

```js
import { BionicTransform } from "fovea-stream";

const transform = new BionicTransform({ style: "dim-tail" });
for await (const chunk of source) process.stdout.write(transform.feed(chunk));
process.stdout.write(transform.flush());
```

There is a Node stream wrapper too:

```js
import { foveaStream } from "fovea-stream";

process.stdin.pipe(foveaStream()).pipe(process.stdout);
```

## Why this is not just `toAnsi` in a loop

Transforming a finished string never has to deal with either of these:

- **Chunks split anywhere.** A word or an escape sequence can straddle the
  boundary. Incomplete tails are held back and emitted once whole, capped so a
  long run of non-word bytes cannot stall the stream.
- **The text is already styled.** SGR 22, which ends a bold stem, also clears
  dim. Emphasizing one word inside dim text would silently un-dim the rest of
  the line, so the active attributes are tracked and re-asserted after every
  stem. Bytes inside escape sequences are never treated as text.

Attributes are held in fixed slots rather than an accumulated string, so a long
session with thousands of colour changes stays bounded.

## Options

Everything [fovea-core](https://www.npmjs.com/package/fovea-core) accepts, plus:

| Option | Default | Meaning |
| --- | --- | --- |
| `style` | `"bold"` | `bold`, `dim-tail`, or `both` |
| `codeDetection` | `"auto"` | `auto`, `fences`, or `off` |

`codeDetection` keeps whole code blocks unemphasized. `fences` follows Markdown
fences, which survive in piped output. `auto` adds a painted background as a
second signal, for agents that have already rendered their Markdown to ANSI and
left no fences behind — a heuristic, so right most of the time rather than
always. Classification reads only the first few characters of a line, so output
is never buffered to the next newline.

`dim-tail` fades the back of each word instead of bolding the front. On
terminals whose bold is a brighter colour rather than a heavier weight, it is
often the only one that reads at all.

MIT
