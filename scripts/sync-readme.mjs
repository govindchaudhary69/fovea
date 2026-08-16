/**
 * Copies the root README into the CLI package, rewriting relative links to
 * absolute ones.
 *
 * npm renders a package's own README and has no idea what the repository
 * around it looks like, so `demo/fovea.gif` resolves to nothing there. Running
 * this from prepack keeps the published page correct without maintaining a
 * second copy of the text by hand.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const RAW = "https://raw.githubusercontent.com/govindchaudhary69/fovea/main";
const BLOB = "https://github.com/govindchaudhary69/fovea/blob/main";

const readme = readFileSync(join(root, "README.md"), "utf8")
  // Images have to point at raw content; ordinary links read better as blobs.
  .replace(/!\[([^\]]*)\]\((?!https?:)([^)]+)\)/g, `![$1](${RAW}/$2)`)
  .replace(/(?<!!)\[([^\]]*)\]\((?!https?:|#)([^)]+)\)/g, `[$1](${BLOB}/$2)`);

writeFileSync(join(root, "packages/cli/README.md"), readme);
