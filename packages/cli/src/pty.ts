import { BionicTransform, type StreamOptions } from "fovea-stream";

const MISSING_PTY = `fovea needs node-pty to wrap an interactive command.

  npm install -g node-pty

Piping still works without it:  <command> | fovea`;

/**
 * Run a command inside a pseudo-terminal and emphasize everything it prints.
 *
 * The command keeps a real tty, so agents that draw a full-screen interface
 * behave exactly as they do unwrapped. Emphasis is added with SGR sequences,
 * which occupy no columns — the wrapped program's own layout arithmetic stays
 * correct because nothing it printed changed width.
 */
export async function wrap(
  command: string[],
  options: StreamOptions,
): Promise<number> {
  const pty = await load();
  const [file, ...args] = command as [string, ...string[]];
  const transform = new BionicTransform(options);

  let child: import("node-pty").IPty;
  try {
    child = pty.spawn(file, args, {
      name: process.env.TERM ?? "xterm-256color",
      cols: process.stdout.columns ?? 80,
      rows: process.stdout.rows ?? 24,
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
    });
  } catch (error) {
    throw new Error(spawnFailure(file, error));
  }

  child.onData((data: string) => process.stdout.write(transform.feed(data)));

  const resize = () => child.resize(process.stdout.columns ?? 80, process.stdout.rows ?? 24);
  process.stdout.on("resize", resize);

  const wasRaw = process.stdin.isRaw;
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  const forward = (data: Buffer) => child.write(data.toString("utf8"));
  process.stdin.on("data", forward);

  return new Promise<number>((resolve) => {
    child.onExit(({ exitCode }: { exitCode: number }) => {
      process.stdout.write(transform.flush());
      process.stdin.off("data", forward);
      process.stdout.off("resize", resize);
      if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw ?? false);
      process.stdin.pause();
      resolve(exitCode);
    });
  });
}

function spawnFailure(file: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  // node-pty reports every spawn problem as this one opaque string, and the
  // usual cause is its own prebuilt helper losing the executable bit.
  if (detail.includes("posix_spawnp")) {
    return `could not start ${file}.

If ${file} exists and runs on its own, node-pty's helper is probably not
executable. Repair it with:

  chmod +x "$(node -p "require.resolve('node-pty/package.json').replace(/package.json$/,'')")"prebuilds/*/spawn-helper`;
  }
  return `could not start ${file}: ${detail}`;
}

type Pty = typeof import("node-pty");

async function load(): Promise<Pty> {
  try {
    return (await import("node-pty")) as Pty;
  } catch {
    throw new Error(MISSING_PTY);
  }
}
