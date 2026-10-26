// Check the delivered build in dist/, as the Host will use it:
//
// 1. `runtime.nodeEntry` loads as a plugin module and registers exactly the
//    detectors and Actions the manifest declares. A declared id without a
//    handler fails every call with PluginHandlerNotFound; a handler without a
//    manifest entry is never called.
// 2. Every renderer page references its scripts, styles and images by paths
//    relative to the page that exist inside the plugin. The Host loads the page
//    from the plugin directory: an absolute or missing reference leaves the
//    card blank.
//
// File existence of the manifest paths themselves is checked by
// `clipbus-validate-manifest . --runtime`.

import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(projectRoot, "manifest.json"), "utf8"));
const problems = [];

// ── 1. Runtime registry ──────────────────────────────────────────────────────

/** The launch context a Host passes to `setup`; this check needs no real directories. */
function launchContext() {
  const scratch = path.join(projectRoot, "dist", ".verify-build");
  return {
    protocol: 2,
    plugin: { id: manifest.plugin.id, title: manifest.plugin.title, version: manifest.plugin.version },
    host: { platform: process.platform === "win32" ? "windows" : "macos", version: "verify-build", devMode: true },
    dirs: { root: projectRoot, data: path.join(scratch, "data"), cache: path.join(scratch, "cache") },
    capabilities: [],
  };
}

function compareHandlers(kind, declared, registered) {
  const declaredIds = (declared ?? []).map((entry) => entry.id);
  const registeredIds = Object.keys(registered ?? {});
  for (const id of declaredIds.filter((id) => !registeredIds.includes(id))) {
    problems.push(`manifest ${kind} "${id}" has no handler in ${manifest.runtime.nodeEntry}`);
  }
  for (const id of registeredIds.filter((id) => !declaredIds.includes(id))) {
    problems.push(`${manifest.runtime.nodeEntry} registers ${kind} "${id}", which manifest.json does not declare`);
  }
}

if (manifest.runtime?.nodeEntry !== undefined) {
  const require = createRequire(import.meta.url);
  const exported = require(path.join(projectRoot, manifest.runtime.nodeEntry));
  // The Host's bridge accepts `module.exports = plugin` or a `default` export.
  const plugin = exported?.default !== null && typeof exported?.default === "object" ? exported.default : exported;
  const registry = typeof plugin?.setup === "function" ? await plugin.setup(launchContext()) : plugin;
  if (registry === null || typeof registry !== "object") {
    problems.push(`${manifest.runtime.nodeEntry} does not export definePlugin(...)`);
  } else {
    compareHandlers("detectors", manifest.detectors, registry.detectors);
    compareHandlers("actions", manifest.actions, registry.actions);
  }
}

// ── 2. Page references ───────────────────────────────────────────────────────

const REFERENCE = /\s(?:src|href)\s*=\s*["']([^"']*)["']/gi;

async function checkPage(page) {
  const pagePath = path.join(projectRoot, page);
  const html = await readFile(pagePath, "utf8");
  for (const [, reference] of html.matchAll(REFERENCE)) {
    if (reference === "" || reference.startsWith("#")) {
      continue;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(reference) || reference.startsWith("/")) {
      problems.push(`${page} references "${reference}"; reference plugin files by a path relative to the page`);
      continue;
    }
    const target = path.resolve(path.dirname(pagePath), reference.split(/[?#]/)[0]);
    if (path.relative(projectRoot, target).startsWith("..")) {
      problems.push(`${page} references "${reference}", which is outside the plugin`);
      continue;
    }
    try {
      await access(target);
    } catch {
      problems.push(`${page} references "${reference}", which the build did not produce`);
    }
  }
}

for (const page of new Set((manifest.renderers ?? []).map((renderer) => renderer.page))) {
  await checkPage(page);
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`verify-build: ${problem}`);
  }
  process.exit(1);
}
console.log("Build verification passed.");
