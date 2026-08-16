import assert from "node:assert/strict";
import test from "node:test";
import { BionicTransform } from "../dist/index.js";

const FENCED = [
  "Here is how you would wire it up.",
  "",
  "```js",
  "const transform = new BionicTransform();",
  "if (done) flush();",
  "```",
  "",
  "That handles the streaming case.",
  "",
].join("\n");

function run(input, options) {
  const transform = new BionicTransform(options);
  return transform.feed(input) + transform.flush();
}

/** Feed one character at a time — the worst case for line classification. */
function drip(input, options) {
  const transform = new BionicTransform(options);
  let out = "";
  for (const character of input) out += transform.feed(character);
  return out + transform.flush();
}

const strip = (s) => s.replace(/\x1b\[[0-9;:]*m/g, "");
const emphasized = (s) => [...s.matchAll(/\x1b\[1m([^\x1b]*)\x1b\[22m/g)].map((m) => m[1]);

test("fenced code is left alone", () => {
  const words = emphasized(run(FENCED));
  assert.ok(words.length > 0, "prose should still be emphasized");
  // Stems as the length bands actually produce them: const -> co, flush -> fl.
  // Single letters are avoided here because prose legitimately produces them.
  for (const bad of ["co", "tran", "Bioni", "fl"]) {
    assert.ok(!words.includes(bad), `emphasized inside the fence: ${bad}`);
  }
});

test("the fence markers and language tag are untouched", () => {
  const out = run(FENCED);
  assert.ok(out.includes("```js\n"), "language tag was emphasized");
  assert.ok(!out.includes("\x1b[1mj\x1b[22ms"), "language tag was emphasized");
});

test("prose on both sides of a fence is still emphasized", () => {
  const out = run(FENCED);
  assert.ok(out.includes("\x1b[1mHe\x1b[22mre"), "prose before the fence");
  assert.ok(out.includes("\x1b[1mTh\x1b[22mat"), "prose after the fence");
});

test("classification survives character-by-character input", () => {
  assert.equal(drip(FENCED), run(FENCED));
});

test("no text is lost or duplicated", () => {
  assert.equal(strip(run(FENCED)), FENCED);
  assert.equal(strip(drip(FENCED)), FENCED);
});

test("an unclosed fence keeps suppressing to the end of the stream", () => {
  const out = run("intro line\n```\ncode here\nmore code\n");
  assert.deepEqual(emphasized(out), ["in", "li"]);
});

test("tildes open a fence too", () => {
  const out = run("text\n~~~\ncode here\n~~~\ntext\n");
  assert.ok(!emphasized(out).includes("co"), "tilde fence ignored");
});

test("a backtick-led prose line is not mistaken for a fence", () => {
  const out = run("`code` is inline and the rest is prose\n");
  assert.ok(emphasized(out).includes("inl"), "line was suppressed wrongly");
});

test("code detection can be turned off", () => {
  const words = emphasized(run(FENCED, { codeDetection: "off" }));
  assert.ok(words.includes("co"), "off should emphasize inside fences");
});

test("fences mode ignores background colour", () => {
  const painted = "\x1b[48;5;236mrendered code block\x1b[0m\n";
  assert.ok(emphasized(run(painted, { codeDetection: "fences" })).length > 0);
});

test("auto mode leaves a painted background alone", () => {
  const painted = "\x1b[48;5;236mrendered code block\x1b[0m\n";
  assert.deepEqual(emphasized(run(painted, { codeDetection: "auto" })), []);
});

test("auto mode resumes after the background is cleared", () => {
  const out = run("\x1b[48;5;236mcode\x1b[49m and prose again\n");
  const words = emphasized(out);
  assert.ok(!words.includes("co"), "painted run was emphasized");
  assert.ok(words.includes("pr"), "prose after the background was skipped");
});
