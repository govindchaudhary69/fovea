#!/usr/bin/env node
import { createRequire } from "node:module";
import { foveaStream } from "fovea-stream";
import { HELP, parse } from "./options.js";
import { wrap } from "./pty.js";

const require = createRequire(import.meta.url);

async function main(): Promise<number> {
  const invocation = parse(process.argv.slice(2));

  if (invocation.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (invocation.version) {
    process.stdout.write(`${require("../package.json").version}\n`);
    return 0;
  }
  if (invocation.command.length > 0) {
    return wrap(invocation.command, invocation.options);
  }
  if (process.stdin.isTTY) {
    process.stderr.write(`${HELP}\n`);
    return 1;
  }
  return pipe(invocation.options);
}

function pipe(options: Parameters<typeof foveaStream>[0]): Promise<number> {
  return new Promise((resolve, reject) => {
    process.stdin
      .setEncoding("utf8")
      .pipe(foveaStream(options))
      .on("error", reject)
      .pipe(process.stdout)
      .on("finish", () => resolve(0));
  });
}

main().then(
  (code) => { process.exitCode = code; },
  (error: unknown) => {
    process.stderr.write(`fovea: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  },
);
