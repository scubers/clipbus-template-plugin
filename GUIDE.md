# Plugin Development Guide (Scaffold Workflow)

*English · [中文](./GUIDE_zh.md)*

This project (`plugins/template-plugin/`) is the **scaffold and runnable example** for Clipbus third-party plugins. This file covers only the **scaffold workflow** (getting started, local preview, debugging inside Clipbus, building, verifying, testing) and the **project structure**.

**The authoritative knowledge for plugin development** (architecture, manifest, SDK entry points, detectors, card pages, Actions, messages, input shapes, pitfalls) **ships with the SDK package**. After `npm install` it lives in `node_modules/@clipbus/plugin-sdk/docs/` and always matches the SDK version you have installed.

- **AI / tools**: read this project's root [`AGENTS.md`](./AGENTS.md) first; it points to the stable entry point of the SDK docs.
- **Documentation map**: `node_modules/@clipbus/plugin-sdk/docs/README.md`
- **API reference**: `node_modules/@clipbus/plugin-sdk/API.md` (generated; in case of conflict, it wins)
- Refresh the docs and the API via `npm update @clipbus/plugin-sdk` — **no need to replace any file in this project**.

> The code and notes inside this project are **examples** and may lag behind the installed SDK; when they conflict with the SDK docs, **the SDK docs win**.

---

## 0. Quick start

### Prerequisites

- Use the latest Node.js 22 patch release (matching CI) or a newer compatible version for development and tests: the tests use `node --test` with glob patterns and `zlib.crc32`. The lower Node.js minimum under `engines.node` in `package.json` does not cover the development toolchain.
- Clipbus with plugin protocol V2 (manifest `schemaVersion` 5) and `@clipbus/plugin-sdk` 1.x. Use the installed SDK's docs and `API.md` for the exact API.

### Initialize

```sh
npm install
```

`@clipbus/plugin-sdk` is an independently published npm package (third-party projects install it with `npm install @clipbus/plugin-sdk`). Its entry points:

| Import | Use it in | Gives you |
|---|---|---|
| `@clipbus/plugin-sdk` | runtime and pages | `defineMessage`, `defineAttachment`, errors, contract types and constants |
| `@clipbus/plugin-sdk/runtime` | runtime | `definePlugin`, `result`, the runtime `ctx` types |
| `@clipbus/plugin-sdk/view` | card pages | `ctx` of the page |
| `@clipbus/plugin-sdk/dom` | card pages | `autoFit`, `reportInputState`, `forwardConsole` |
| `@clipbus/plugin-sdk/validate` | tooling | the manifest validator (also the `clipbus-validate-manifest` CLI) |
| `@clipbus/plugin-sdk/preview` | development | `createPreviewWorkbench` |

**Plugin authors do not need to view or modify the SDK's source.**

### Local preview

```sh
npm run dev
```

Starts the Vite preview workbench. `src/preview/preview-host/main.ts` calls `createPreviewWorkbench` from `@clipbus/plugin-sdk/preview` and picks the card page by attachment type, as the Host does. The SDK's fake Host injects each scenario's startup snapshot, answers the page's calls with the contract's validation, draws the card header (title, tint, buttons) and pushes `item.changed`, `env.changed` and `renderer.button`. It offers a scenario menu, theme presets (applied as `--clipbus-*` CSS variables and pushed as `env.changed`), a width slider and a call log; `renderer.update({ height })` resizes the card within the scenario's height range. Editing `src/features/**/app.vue` hot-reloads.

The scenarios (`src/preview/scenarios/attachmentScenarios.ts`) take the card title, tint, buttons and height range from `manifest.json` and build payloads with the same functions the detectors use. The workbench has no Node process: a scenario's `messages` answer `runtime.call` in place of the plugin runtime, and asset URLs (`clipbus-asset://…`) do not load. For the full harness API see the SDK docs.

### Debugging inside Clipbus

`ctx.log.debug/info/warn/error(...)` (and `ctx.log.write`) write to the plugin's own log file on both sides; the product log only records counts and rate limiting. On card pages, `forwardConsole()` from `@clipbus/plugin-sdk/dom` (called in every `main.ts` here) also sends `console.*` output there. Output a runtime prints with `console.*` goes to the bridge's stderr, not to the protocol stream. A development plugin keeps its data, cache and logs apart from an installed plugin with the same id.

Clipbus → Settings → Plugins manages development plugins (labels below are the macOS ones):

1. **Add Plugin** → **Local Development Plugin** — select the directory containing `manifest.json` (the `sourceRootPath`). The project then appears under **Developer Plugins**. A development plugin runs from this directory and its runtime restarts when the source files change.
2. If `manifest.json` declares an `install` field, Clipbus asks for your confirmation before running it, with the working directory set to `sourceRootPath`. Artifacts such as `node_modules/` land in the project directory (equivalent to running `npm install` yourself).
3. Install logs are written to `<AppData>/development-plugins/<pluginID>/install-logs/` and will not pollute your git status.

> **npm in the install hook:** Clipbus supplies a verified npm command or CLI through `CLIPBUS_PLUGIN_NPM_PATH`. The template resolves symlinks, runs JavaScript CLI files as `process.execPath <npm-cli> ...`, and directly executes other host-provided npm executables or shims. It deliberately has no `npm` PATH fallback; when the variable is missing or unusable, the install fails.

Each development plugin row has an **Actions** menu:

| Action | Behavior |
|---|---|
| **Reload** | Re-reads and validates `manifest.json`, refreshing the fingerprint and load state. Does **not** re-run install. |
| **Run Install Script…** | Re-runs the install hook in place and updates `lastInstallExecution`. Enabled only when the manifest declares `install`. |
| **Installation Logs** | Opens the recorded install logs. |
| **Show in Finder** | Reveals the project directory. |
| **View Details** | Shown when the plugin is not `ready`; explains the last load or install failure. |
| **Unbind…** | Stops the plugin and removes the binding; the project files are kept. |

Load states:

| State | Meaning |
|---|---|
| `installing` | The install hook is running. |
| `installFailed` | The install hook failed or exited non-zero, or an install was interrupted before it finished. |
| `runtimeUnavailable` | Clipbus has no usable Node runtime for the install hook. |
| `loadFailed` | `manifest.json`, or a built file it points at, failed validation on Reload or at launch. |
| `requiresUpdate` | The manifest uses an unsupported `schemaVersion` (see below). |
| `conflict` | An enabled installed plugin already uses the same `plugin.id`. |
| `ready` | Usable. |

Plugins written for manifest schema v4 show as `requiresUpdate` until they are migrated to v5 and rebuilt; there is no compatibility layer. For this template the migration meant: `attachmentRenderers` became `renderers` with a `page` path relative to the plugin root (no `runtime.uiRoot`), `height` became `{ min, max }` with optional `tint` and `buttons` defaults, `supportedInputKinds` became `inputKinds` (text and image only), `permissions` went away, detector `attachmentTypes` became the plugin-wide `writes` list (every attachment type and search scope the plugin writes), detectors write through `ctx` instead of returning artifacts, and card pages moved from `clipbus.*` to `ctx` from `@clipbus/plugin-sdk/view`. The SDK docs list the full mapping.

### Production build

```sh
npm run build
```

In order: typecheck → lint → clean → build:runtime → build:ui → verify:build, output to `dist/`.

- `build:runtime` bundles `src/plugin.ts` into the manifest's `runtime.nodeEntry`.
- `build:ui` builds one self-contained page (`index.html` + `index.js` + `index.css`) for each manifest renderer, at the renderer's `page`. `PAGE_SOURCES` in `scripts/build-ui.mjs` maps each renderer id to its source folder; the build stops when a renderer has no source, a source has no renderer, or two pages share a folder (each page gets its own folder, such as `dist/ui/renderers/<renderer id>/index.html`, because the build writes `index.js` and `index.css` next to it).
- `verify:build` checks the built output: the runtime module registers exactly the detectors and Actions the manifest declares, and every page references only files that exist next to it, by relative path.

### Verifying your plugin

```sh
npm run verify
```

Runs in order: **manifest validation → build → runtime manifest validation → tests**.

`npm run verify:manifest` runs the SDK's manifest validator, the one the Hosts run when they load a plugin. It reports each problem as a JSON path and a rule (`pattern`, `uniqueBy`, `pluginNamespace`, `requiredWhen`, `fieldOrder`, `unsupportedSchemaVersion`, …) before the build runs. After the build, `npm run verify:manifest:runtime` repeats it with `--runtime`, which also requires the files the manifest points at (`runtime.nodeEntry`, `install.entry`, each `renderers[].page`) to exist inside the plugin directory.

You can also run the validator alone:

```sh
npm run verify:manifest
# or directly via the SDK binary:
npx clipbus-validate-manifest .
npx clipbus-validate-manifest . --runtime  # also checks the built files
```

### Testing

```sh
npm test         # every test under tests/ (tests/**/*.test.cjs)
```

The tests load the built runtime (`dist/plugin.cjs`), so build first (`npm run verify` does). `tests/support/plugin.cjs` sets the plugin up with a launch context and real temporary data and cache directories, and plays the Host for one call: each `ctx` method records its parameters and answers from the test's script. Test what a handler writes and returns — the writes of a detector run, an Action's result, a message's answer — rather than how the code is laid out.

---

## 1. Project structure

A plugin is split by feature, each feature a self-contained directory. Recommended layout:

```text
your-plugin/
├── manifest.json
├── package.json                        ← depends on @clipbus/plugin-sdk
├── scripts/                            ← build:runtime / build:ui / verify:build / install
├── src/
│   ├── plugin.ts                       ← definePlugin: detectors, actions, messages
│   ├── features/<feature-name>/        ← one folder per capability
│   │   ├── payload.ts                  ← defineAttachment contract + payload builders (both sides)
│   │   ├── messages.ts                 ← defineMessage contracts (both sides)
│   │   ├── detector.ts / action.ts     ← runtime handlers (Node)
│   │   ├── app.vue                     ← the card page
│   │   └── main.ts / index.html        ← page entry, built by build:ui
│   ├── shared/                         ← thin utility layer across features
│   └── preview/                        ← preview workbench (dev only)
└── tests/
```

Keep files that both the runtime and the pages import free of Node and DOM APIs; the runtime bundle targets Node and every page bundle targets the WebView. For the template's own features see "Capabilities demonstrated" in [README.md](./README.md).

> The SDK is a standalone package, `@clipbus/plugin-sdk`, generated from the plugin contract — **do not edit it by hand**.

---

## Next steps

That's all for the scaffold workflow. **All the knowledge for implementing a plugin lives in the SDK docs** — see the root [`AGENTS.md`](./AGENTS.md), or open `node_modules/@clipbus/plugin-sdk/docs/README.md` (documentation map) and `node_modules/@clipbus/plugin-sdk/API.md` (API reference) directly.
