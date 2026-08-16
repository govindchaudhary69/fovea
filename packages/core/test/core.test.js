import assert from "node:assert/strict";
import test from "node:test";
import {
  looksLikeCode,
  stemLength,
  toHtml,
  toMarkdown,
  tokenize,
} from "../dist/index.js";
import { defaults } from "../dist/index.js";

test("short words get a fixed stem instead of a proportional one", () => {
  assert.equal(stemLength("a", defaults), 0, "below minWordLength");
  assert.equal(stemLength("is", defaults), 1);
  assert.equal(stemLength("the", defaults), 1);
  assert.equal(stemLength("word", defaults), 2);
  assert.equal(stemLength("terms", defaults), 2);
});

test("longer words follow the ratio, capped by maxStem", () => {
  assert.equal(stemLength("fixation", defaults), 4);
  assert.equal(stemLength("internationalization", defaults), 5);
});

test("a stem never swallows the whole word", () => {
  const aggressive = { ...defaults, ratio: 1, maxStem: 99 };
  assert.equal(stemLength("reading", aggressive), 6);
});

test("code-shaped chunks are left alone", () => {
  for (const chunk of [
    "src/utils/parse.ts",
    "node_modules",
    "--max-stem",
    "https://example.com",
    "camelCase",
    "utf8",
    "Array::map",
    "config.json",
  ]) {
    assert.ok(looksLikeCode(chunk), `expected skip: ${chunk}`);
  }
});

test("ordinary prose is not mistaken for code", () => {
  for (const chunk of ["reading", "Sentence.", "(parenthetical)", "don't", "well-known"]) {
    assert.ok(!looksLikeCode(chunk), `expected prose: ${chunk}`);
  }
});

test("a path inside a sentence survives intact", () => {
  const out = toMarkdown("Open src/index.ts and read it.");
  assert.ok(out.includes("src/index.ts"), out);
  assert.ok(!out.includes("**src"), out);
});

test("logographic scripts are skipped", () => {
  const tokens = tokenize("読書 reading");
  assert.equal(tokens.find((t) => t.text === "読書")?.kind, "skip");
  assert.equal(tokens.find((t) => t.text === "reading")?.kind, "word");
});

test("html output escapes and marks only the stem", () => {
  assert.equal(
    toHtml("reading <tags>"),
    '<b class="fovea-stem">rea</b>ding &lt;tags&gt;',
  );
});

test("tokens reassemble into the original text", () => {
  const source = "Fixation points guide the eye across src/main.rs quickly.";
  assert.equal(tokenize(source).map((t) => t.text).join(""), source);
});

test("stopwords are skipped only when asked", () => {
  assert.ok(toMarkdown("the cat").startsWith("**t**he"));
  assert.ok(toMarkdown("the cat", { skipStopwords: true }).startsWith("the "));
});
