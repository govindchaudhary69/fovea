import type { StreamOptions } from "fovea-stream";

export interface Invocation {
  options: StreamOptions;
  command: string[];
  help: boolean;
  version: boolean;
}

export const HELP = `fovea — fixation-point reading for terminal output

Usage:
  fovea [options] <command> [args...]   run a command, emphasizing its output
  <command> | fovea [options]           filter piped output

Options:
  -s, --style <name>    bold | dim-tail | both        (default: bold)
  -r, --ratio <n>       fraction of a word to emphasize (default: 0.4)
  -m, --max-stem <n>    cap on emphasized characters  (default: 5)
      --min-word <n>    leave words shorter than this (default: 2)
      --stopwords       skip common function words
      --locale <tag>    locale for word segmentation  (default: en)
  -c, --code <mode>     leave code blocks alone: auto | fences | off
                        (default: auto)
  -h, --help            show this message
  -v, --version         print the version

Examples:
  fovea claude
  fovea aider --model sonnet
  git log | fovea --style dim-tail

Everything after the first non-option argument is passed to the command
untouched, so its own flags do not need escaping.`;

export function parse(argv: string[]): Invocation {
  const options: StreamOptions = {};
  const invocation: Invocation = {
    options,
    command: [],
    help: false,
    version: false,
  };

  let index = 0;
  for (; index < argv.length; index++) {
    const argument = argv[index]!;

    // The first bare word starts the wrapped command; everything after it,
    // including its own flags, belongs to that command.
    if (argument === "--") { index++; break; }
    if (!argument.startsWith("-")) break;

    const value = () => {
      const next = argv[++index];
      if (next === undefined) throw new Error(`${argument} needs a value`);
      return next;
    };

    switch (argument) {
      case "-h": case "--help": invocation.help = true; break;
      case "-v": case "--version": invocation.version = true; break;
      case "-s": case "--style": options.style = style(value()); break;
      case "-r": case "--ratio": options.ratio = number(value(), argument); break;
      case "-m": case "--max-stem": options.maxStem = number(value(), argument); break;
      case "--min-word": options.minWordLength = number(value(), argument); break;
      case "--stopwords": options.skipStopwords = true; break;
      case "--locale": options.locale = value(); break;
      case "-c": case "--code": options.codeDetection = detection(value()); break;
      default: throw new Error(`unknown option ${argument}`);
    }
  }

  invocation.command = argv.slice(index);
  return invocation;
}

function detection(value: string): "auto" | "fences" | "off" {
  if (value === "auto" || value === "fences" || value === "off") return value;
  throw new Error(`--code expects auto, fences or off, got ${value}`);
}

function style(value: string): "bold" | "dim-tail" | "both" {
  if (value === "bold" || value === "dim-tail" || value === "both") return value;
  throw new Error(`--style expects bold, dim-tail or both, got ${value}`);
}

function number(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${flag} expects a number, got ${value}`);
  return parsed;
}
