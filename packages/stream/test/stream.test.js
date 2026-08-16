import assert from "node:assert/strict";
import test from "node:test";
import { BionicTransform, SgrState } from "../dist/index.js";

/** Feed a string one character at a time — the worst case for chunking. */
function drip(input, options) {
  const transform = new BionicTransform(options);
  let out = "";
  for (const character of input) out += transform.feed(character);
  return out + transform.flush();
}

const strip = (s) => s.replace(/\x1b\[[0-9;:]*m/g, "");

test("a word split across chunks is still emphasized once", () => {
  const transform = new BionicTransform();
  const first = transform.feed("read");
  const second = transform.feed("ing here") + transform.flush();
  assert.equal(first, "", "partial word is held back");
  assert.ok((first + second).includes("\x1b[1mrea\x1b[22m"), first + second);
});

test("character-by-character input matches whole-string input", () => {
  const source = "Fixation points guide the eye quickly.";
  const whole = new BionicTransform();
  assert.equal(drip(source), whole.feed(source) + whole.flush());
});

test("text is preserved exactly once styling is stripped", () => {
  const source = "Emphasis must not lose or duplicate a single character.";
  assert.equal(strip(drip(source)), source);
});

test("escape sequences split across chunks are not corrupted", () => {
  const transform = new BionicTransform();
  const out = transform.feed("\x1b[3") + transform.feed("1mred text") + transform.flush();
  assert.ok(out.startsWith("\x1b[31m"), JSON.stringify(out));
  assert.equal(strip(out), "red text");
});

test("dim surroundings survive an emphasized stem", () => {
  const transform = new BionicTransform();
  const out = transform.feed("\x1b[2mdimmed words\x1b[0m") + transform.flush();
  // After the stem ends with SGR 22, dim must be re-asserted for the tail.
  assert.ok(out.includes("\x1b[1mdim\x1b[22m\x1b[2mmed"), JSON.stringify(out));
});

test("bytes inside escape sequences are never treated as words", () => {
  const out = drip("\x1b]0;window title\x07body");
  assert.ok(out.includes("\x1b]0;window title\x07"), JSON.stringify(out));
});

test("dim-tail style leaves the head unstyled", () => {
  const transform = new BionicTransform({ style: "dim-tail" });
  const out = transform.feed("reading") + transform.flush();
  assert.equal(out, "rea\x1b[2mding\x1b[22m");
});

test("SgrState reconstructs compound attributes", () => {
  const state = new SgrState();
  state.apply("2");
  state.apply("38;5;204");
  assert.equal(state.restore(), "\x1b[2;38;5;204m");
  state.apply("0");
  assert.equal(state.restore(), "");
});

test("SgrState treats 22 as clearing both bold and dim", () => {
  const state = new SgrState();
  state.apply("1;2;4");
  state.apply("22");
  assert.equal(state.restore(), "\x1b[4m");
});
