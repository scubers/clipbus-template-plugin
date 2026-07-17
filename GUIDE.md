# Plugin Development Guide (Scaffold Workflow)

*English · [中文](./GUIDE_zh.md)*

This project (`plugins/template-plugin/`) is the **scaffold and runnable example** for Clipbus third-party plugins. This file covers only the **scaffold workflow** (getting started, local development, debugging inside Clipbus, building, testing) and the **project structure**.

**The authoritative knowledge for plugin development** (architecture, manifest, SDK entry points, detector/renderer/action, input shapes, RPC, permissions, pitfalls) **ships with the SDK package**. After `npm install` it lives in `node_modules/@clipbus/plugin-sdk/docs/` — and always matches the SDK version you currently have installed.

- **AI / tools**: read this project's root [`AGENTS.md`](./AGENTS.md) first; it points to the stable entry point of the SDK docs.
- **Documentation map**: `node_modules/@clipbus/plugin-sdk/docs/README.md`
- **Capability source of truth**: `node_modules/@clipbus/plugin-sdk/API.md` (generated; in case of conflict, it wins)
- Refresh the docs and capabilities via `npm update @clipbus/plugin-sdk` — **no need to replace any file in this project**.

> The code and notes inside this project are **examples** and may lag behind the installed SDK; when they conflict with the SDK docs, **the SDK docs win**.

---

## 0. Quick start

### Prerequisites

- Node.js >= 18
- Clipbus plugin manifest schema v3 / `@clipbus/plugin-sdk` 0.9.x

### Initialize

```sh
npm install
```

The dependency `@clipbus/plugin-sdk` is an independently published npm package (third-party projects install it via `npm install @clipbus/plugin-sdk`). `npm install` fetches and compiles the SDK; once it finishes, you can use it directly.

> All symbols available to plugin authors are produced by codegen and listed in the SDK package's `API.md` and `README.md` (see [`@clipbus/plugin-sdk`](https://www.npmjs.com/package/@clipbus/plugin-sdk)). **Plugin authors do not need to view or modify the SDK's internal source.**

### Local development

```sh
npm run dev
```

Starts the Vite preview workbench. `src/preview/preview-host/main.ts` calls `createPreviewWorkbench` from `@clipbus/plugin-sdk/preview`; the SDK harness provides the workbench chrome (two-level Renderer/Action navigation with a scenario dropdown for both modes, 4-preset theme switcher, native card shell, per-view width slider, in-card button strip), host→plugin wire injection and `--clipbus-*` CSS variable mirroring, call log panel (all plugin→host native calls), and viewport height tracking via `clipbus.window.setHeight`. Editing `src/features/*/app.vue` triggers a hot-reload.

You can also open a targeted view directly:

```sh
npm run dev:renderer
npm run dev:action
```

For the full harness API (scenario configuration, viewport policy, call log), see `node_modules/@clipbus/plugin-sdk/docs/preview.md`.

### Debugging inside Clipbus

Clipbus → Settings → Plugins → the Developer Plugins section provides lifecycle management for development plugins:

1. **Add Path** — select the directory containing `manifest.json` (i.e. the `sourceRootPath`).
2. If `manifest.json` declares an `install` field, Clipbus **runs the install script automatically**, with the working directory set to `sourceRootPath`. Artifacts such as `node_modules/` land in the project directory (equivalent to running `npm install` yourself).
3. Install logs are written to `<AppData>/development-plugins/<pluginID>/install-logs/` and will not pollute your git status.

| Button | Behavior |
|---|---|
| **Reload** | Re-reads `manifest.json`, refreshing fingerprint / permissions / loadState. Does **not** re-run install. |
| **Run Install** | Re-runs the install hook in place and updates `lastInstallExecution`. Does **not** re-read the manifest. |
| **View Logs** | Shown in the `installFailed` state; opens the most recent install log (supports live tail). |

States: `installing` → installing; `installFailed` → non-zero exit code or runtime unreachable; `ready` → usable.

Existing schema v2 plugins must rename Action `supportedItemTypes` to
`supportedInputKinds`. The host intentionally does not provide a v2 runtime
adapter; incompatible installed/development sources remain visible as
`requiresUpdate` until rebuilt.

### Production build

```sh
npm run build
```

In order: clean → build:runtime → build:ui → verify:build, output to `dist/`.

### Verifying your plugin

```sh
npm run verify
```

Runs in order: **manifest validation → build → tests**.

The manifest validation step (`npm run verify:manifest`) checks your `manifest.json`
for structural issues — namespace violations, unsupported schema versions, legacy fields,
unrecognised item types, invalid `plugin.id` formats (lowercase letters/digits and `-` `.` `_`
only, no `..`, no leading `.`, max 128 chars), and more — before the build runs. This catches
errors early, the same ones the host validates at install time.

You can also run manifest validation alone:

```sh
npm run verify:manifest
# or directly via the SDK binary:
npx clipbus-validate-manifest .
npx clipbus-validate-manifest . --runtime  # also checks built file existence
```

### Testing

```sh
npm test         # integration tests under tests/runtime/
```

---

## 1. Project structure

A new plugin is split by feature, each feature a self-contained directory. Recommended layout:

```text
your-plugin/
├── manifest.json
├── package.json                        ← depends on @clipbus/plugin-sdk (npm install)
├── scripts/                            ← build:runtime / build:ui / verify:build
├── src/
│   ├── features/<feature-name>/        ← one folder per capability
│   │   ├── payload.ts                  ← data types / draft types
│   │   ├── detector.ts                 ← detector (if any)
│   │   ├── renderer.ts                 ← renderer runtime side (if any)
│   │   ├── action.ts                   ← action runtime side (if any)
│   │   ├── app.vue                     ← UI entry (renderer or draft action)
│   │   ├── main.ts / index.html        ← Vite entry
│   ├── shared/                         ← thin utility layer across features
│   ├── preview/                        ← local preview workbench (dev-only)
│   └── plugin.ts                       ← definePlugin entry; registers all handlers
└── tests/runtime/
```

For template-plugin's concrete feature list (`preview-renderer/` / `expanded-renderer/` / `auto-action/` / `capability-gallery/`), see the "Capabilities demonstrated" section in [README.md](./README.md).

> The SDK is a standalone package `@clipbus/plugin-sdk`, synced by codegen — **do not edit it by hand**. To extend capabilities see the package's `SPECIFICATION.md` ([`@clipbus/plugin-sdk`](https://www.npmjs.com/package/@clipbus/plugin-sdk)), Ch 3.

---

## Next steps

That's all for the scaffold workflow. **All the knowledge for implementing a plugin lives in the SDK docs** — see the root [`AGENTS.md`](./AGENTS.md), or open `node_modules/@clipbus/plugin-sdk/docs/README.md` (documentation map) and `node_modules/@clipbus/plugin-sdk/API.md` (capability source of truth) directly.
