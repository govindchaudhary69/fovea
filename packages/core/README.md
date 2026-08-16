# fovea-core

The text transform behind [fovea](https://github.com/govindchaudhary69/fovea):
splits prose into words and works out how many leading characters of each to
emphasize.

```
npm install fovea-core
```

```js
import { toHtml, tokenize } from "fovea-core";

toHtml("Fixation points guide the eye");
// '<b class="fovea-stem">Fixa</b>tion <b class="fovea-stem">poi</b>nts …'
```

Tokenizing and rendering are separate steps. `tokenize` returns
`{ text, kind, stem }[]`, so one pass over the text can feed a terminal, a DOM,
or a Markdown file:

```js
for (const token of tokenize(source)) {
  if (token.kind === "word") emphasize(token.text.slice(0, token.stem));
}
```

`renderAnsi`, `renderHtml` and `renderMarkdown` ship with it. Anything else is a
fold over the same tokens.

## What it leaves alone

Emphasizing `src/index.ts` or `--max-stem` is what makes naive implementations
unreadable, so code-shaped chunks are detected before word segmentation and
passed through verbatim: paths, flags, URLs, `camelCase`, `CONSTANT_CASE`, and
anything mixing letters with digits.

Word breaking goes through `Intl.Segmenter` rather than an ASCII regex, so
accented and non-Latin alphabetic scripts work properly. Han, Kana, Hangul and
Thai are skipped on purpose — there is no leading stem to emphasize in a
logographic or abugida script.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `ratio` | `0.4` | fraction of a word to emphasize |
| `maxStem` | `5` | cap on emphasized characters |
| `minWordLength` | `2` | leave shorter words alone |
| `skipStopwords` | `false` | skip common function words |
| `locale` | `"en"` | locale for word segmentation |
| `skip` | — | predicate for words to leave alone |

Words of three characters or fewer get one emphasized character and words of
four or five get two, regardless of `ratio`; a proportional rule produces
fractional stems at those lengths and rounding either way looks wrong beside its
neighbours.

For streaming or ANSI-coloured input, use
[fovea-stream](https://www.npmjs.com/package/fovea-stream) instead.

MIT
