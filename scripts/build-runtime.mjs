// Bundle the plugin runtime (src/plugin.ts) into the manifest's
// `runtime.nodeEntry`. The Host's Node bridge require()s it and accepts
// either `module.exports = definePlugin(...)` or the `default` export esbuild
// emits for `export default definePlugin(...)`.

import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(projectRoot, "manifest.json"), "utf8"));

await build({
  absWorkingDir: projectRoot,
  entryPoints: [path.join(projectRoot, "src/plugin.ts")],
  outfile: path.join(projectRoot, manifest.runtime.nodeEntry),
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  logLevel: "info",
});
