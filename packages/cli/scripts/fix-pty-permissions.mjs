/**
 * node-pty ships prebuilt binaries whose `spawn-helper` loses its executable
 * bit somewhere between the tarball and node_modules. Without it every spawn
 * fails with a bare "posix_spawnp failed", which gives no hint at the cause.
 *
 * Restoring the bit here keeps the failure from reaching users. Nothing is
 * fatal: node-pty is optional, and piped mode does not need it.
 */
import { chmodSync, existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

try {
  const root = dirname(require.resolve("node-pty/package.json"));
  const prebuilds = join(root, "prebuilds");
  if (!existsSync(prebuilds)) process.exit(0);

  for (const platform of readdirSync(prebuilds)) {
    const helper = join(prebuilds, platform, "spawn-helper");
    if (existsSync(helper)) chmodSync(helper, 0o755);
  }
} catch {
  // node-pty is not installed, or the layout changed. Either is fine.
}
