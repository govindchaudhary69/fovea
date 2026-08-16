export { BionicTransform } from "./transform.js";
export type { StreamOptions } from "./transform.js";
export { SgrState } from "./sgr.js";
export { RegionTracker } from "./region.js";
export type { CodeDetection, Run } from "./region.js";

import { Transform, type TransformCallback } from "node:stream";
import { BionicTransform, type StreamOptions } from "./transform.js";

/** Node stream wrapper, for `process.stdin.pipe(foveaStream()).pipe(...)`. */
export function foveaStream(options: StreamOptions = {}): Transform {
  const transform = new BionicTransform(options);
  return new Transform({
    decodeStrings: false,
    transform(chunk: Buffer | string, _encoding, done: TransformCallback) {
      done(null, transform.feed(chunk.toString()));
    },
    flush(done: TransformCallback) {
      done(null, transform.flush());
    },
  });
}
