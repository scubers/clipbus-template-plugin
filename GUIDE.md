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
- Clipbus with plugin protocol V2 (manifest `schemaVersion` 6) and the matching `@clipbus/plugin-sdk`. Use the installed SDK's docs and `API.md` for the exact API.

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

The fake Host currently advertises `tasks.*` but returns `{}` for those calls without simulating a task lifecycle. Validate task admission, querying, cancellation and result writeback in Clipbus, even if `ctx.capabilities.has("tasks.enqueue")` is true in preview.

### Debugging inside Clipbus

`ctx.log.debug/info/warn/error(...)` (and `ctx.log.write`) write to the plugin's own log file on both sides; the product log only records counts and rate limiting. On card pages, `forwardConsole()` from `@clipbus/plugin-sdk/dom` (called in every `main.ts` here) also sends `console.*` output there. Output a runtime prints with `console.*` goes to the bridge's stderr, not to the protocol stream. A development plugin keeps its data, cache and logs apart from an installed plugin with the same id.

Clipbus → Settings → Plugins manages development plugins (labels below are the macOS ones):

1. **Add Plugin** → **Local Development Plugin** — select the directory containing `manifest.json` (the `sourceRootPath`). The project then appears under **Developer Plugins**. A development plugin runs from this directory and its runtime restarts when the source files change.
2. If `manifest.json` declares an `install` field, Clipbus asks for your confirmation before running it, with the working directory set to `sourceRootPath`. Artifacts such as `node_modules/` land in the project directory (equivalent to running `npm install` yourself).
3. Install logs are written to `<AppData>/development-plugins/<pluginID>/install-logs/` and will not pollute your git status.

> **npm in the install hook:** Clipbus supplies a verified npm command or CLI through `CLIPBUS_PLUGIN_NPM_PATH`. The template resolves symlinks, runs JavaScript CLI files as `process.execPath <npm-cli> ...`, and directly executes other host-provided npm executables or shims. It deliberately has no `npm` PATH fallback; when the variable is missing or unusable, the install fails. The install hook uses the machine's npm configuration and cache; Clipbus sets `npm_config_ignore_scripts=true`, so dependency packages' own install scripts (`postinstall` and the like) do not run, while `npm run build` does. With a `package-lock.json` the template uses `npm ci`, installing exactly the versions and checksums the lockfile pins.

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

Clipbus loads manifest schema v6; an unsupported `schemaVersion` produces `requiresUpdate`. The installed SDK's `docs/manifest.md` describes the current fields and validation rules. In the default sandbox, Runtime and Task Workers cannot access the network directly or start other programs. User-folder access uses declared slots selected by the user (the gallery's `exports` slot); HTTP through `ctx.http` uses the Host's approved network slots. `ctx.system.reveal` accepts existing paths in the plugin's directories or user-granted folders.

A plugin may declare `"permissions": { "unrestrictedRuntime": true }` to request the high-trust Runtime mode; only user approval lets Runtime and Task Workers run in `direct` mode. Direct file, network and child-process access is subject to the OS and current user, rather than the folder/network slots. Card pages and Host-mediated APIs keep their restrictions. This template leaves it undeclared and uses the default sandbox.

Use `ctx.item.replaceAttachments({ type, entries })` and `ctx.item.replaceSearchExtension({ scope, entries })` for new code. Pass an empty list to clear that group. The former `setAttachments` and `setSearchExtension` names still work and are deprecated. To edit only one attachment, pass its returned `ref` to `ctx.item.updateAttachment({ attachment, payload })`.

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

## Short sound example

After copying text or an image in Clipbus, click **Play sound** in the first preview card's header; the gallery also has a page button and Runtime probe. Choose **Format** (WAV / MP3 / AIFF) and **Volume** in the first card or the gallery’s **System** section; both choices also reach the sound Runtime probe and are remembered locally. The three real references in `sounds/` ship with a standalone export. Browser preview only records calls. The shared helper in `src/shared/sound.ts` treats a busy slot as a normal skip; automatic playback is off by default. See the [README sound example](README.md#short-sound-example) for an optional copy/recopy detector, and SDK `docs/files.md` for Host formats and limits.

## Try the default configuration

The root `settings.defaults.json` is included when exporting this template. Install or update the plugin in Clipbus to initialize `plugin.template.full.actionTitle` in External Settings. Change that value, then update again: your title stays, while newly declared keys are added. The `template-auto-action` Action reads the saved title through `ctx.settings.get()`; it falls back locally on older Hosts. Reload alone does not import defaults. Run `npm run verify` to validate the optional file and exercise the configured/fallback Action behavior. For the package rules, see the SDK's `docs/manifest.md`.

## Background tasks

This scaffold requires a Host that serves the tasks capabilities. Older Hosts reject the new manifest fields even though the schema remains v6.

Copy text beginning with `local-digest:` to let the short detector enqueue a local CPU workload: one million chained SHA-256 rounds. Duration depends on the machine. In a text item's Expanded Preview, **Start background** replaces the current task and **Cancel background** targets its exact taskId. The page queries active work and queries again on reopen; closing it leaves accepted work running. Exiting Clipbus can interrupt it.

`src/plugin.ts` handles detectors/messages; `src/tasks.ts` is the independent Worker entry. Both import `features/background-work/compute.ts`. The foreground message `template.localDigest` uses the same function with a caller-selected smaller round count. Imports share implementation; instances, caches and globals remain separate between processes.

Tasks are scheduled by the subject itemId. Reuse keeps the active input snapshot when data is equal; use replace to compute from updated content. Hash is checked only at final writeback: missing items or changed hashes discard the result, while A→B→A is accepted.

The Worker yields between batches, checks `ctx.task.signal`, and publishes an expanded attachment with key `background-digest` under its task owner. Failure or cancellation preserves a previous successful result. It uses no network or child processes. The browser preview workbench does not run real Node workers: validate background lifecycle in Clipbus.

`build:runtime` bundles both `runtime.nodeEntry` and `runtime.taskEntry`; `verify:build` checks their respective handler registries. Full API and limits: SDK `docs/runtime.md` and `API.md`.

## System notifications

Expanded Preview has a **Notify demo** button. The background Worker also requests a best-effort notification after calculation. Notification permission or rate limits do not fail the calculation.

```ts
if (ctx.capabilities.has("system.notify")) {
  try {
    await ctx.system.notify({
      title: "Calculation finished",
      body: "Reopen the source item to check whether its result was saved.",
    });
  } catch {
    // Keep the task result even when notifications are disabled or rate limited.
  }
}
```

This method is available to ordinary Runtime calls, Task Workers and card pages. Title and body are nonblank single-line plain text, bounded by UTF-8 bytes. The Host supplies the Clipbus/plugin identity. The current budget is one admission per plugin per 10 seconds and one globally per 2 seconds, shared across processes and pages.

On macOS the first call can request system notification permission; Windows respects the system notification setting. Try **Notify demo** first to establish permission before calling from a short detector. Success means submitted to the OS, not necessarily shown. Focus settings can suppress a banner. The browser workbench only records the call.

Notifications are immediate side effects. A notification in a task handler does not prove the Host has committed the staged result. This example says **calculation finished**, not **result saved**. Do not put clipboard content or secrets in notification text by default: the OS can display it on the lock screen and retain it in notification history.

## HTTP examples

The optional network slot `http-demo` has no fixed origin. Enter your local test service address during installation or in the plugin menu → Network access, for example `http://127.0.0.1:11434`. A slot without a configured, approved origin cannot make requests. Omitted paths/methods allow every supported path/method of that origin; add explicit lists to narrow the scope.

The Expanded Preview header has two manual examples:

- **HTTP JSON** uses the expanded card's method (GET / POST / PUT / PATCH / DELETE), editable path including query, and optional JSON body. The inline **Request JSON** button sends the same request. Results show the HTTP status and a bounded JSON excerpt; HTTP errors retain their status, invalid JSON is reported explicitly, and an empty response is displayed as `null`. The request is manual and cannot change the configured origin.
- **HTTP stream task** admits the `http-stream` background contribution, calls GET /events with Accept: text/event-stream, parses split UTF-8 / CRLF / multiline data, then stages an expanded result attachment. Closing the panel leaves the accepted task running; a failed or cancelled stream publishes no partial result.

For a public JSON test, configure origin `https://jsonplaceholder.typicode.com`, select **GET**, enter `/todos/1`, and click **Request JSON** (or the Host's **HTTP JSON** button). To test a JSON body, select **POST**, enter `/posts`, and provide `{"title":"demo","body":"hello","userId":1}`. No local test server or particular clipboard text is required. The form values live only in the current card session.

Both examples use `ctx.http.request`; neither automatically sends source clipboard content or credentials. The background SSE example still requires a service providing `/events`. The JSON form does not save credentials or provide an Authorization field. For a model request with a key and prompt, use the separate live example below. The native Host supplies generic HTTP bytes, permissions and cancellation. See SDK `docs/http.md` for the complete contract. The browser preview does not serve HTTP capabilities or real Workers.

网络授权在安装确认或插件设置中完成，首次请求不弹插件授权框。自定义地址只填写协议、主机和端口；路径限制另放在 paths 中。更换或撤销绑定会关闭旧请求并刷新插件会话。未声明 network 的旧插件仍可加载，但没有 HTTP 权限。

### Model SSE test

1. Reload/update the template and approve the new `model-api` slot in plugin network settings. Enter the model service origin only, such as `https://api.openai.com` or a local compatible service's scheme, host and port. This slot permits POST and is independent of `http-demo`.
2. Open **Template Expanded → OpenAI-compatible SSE test**. Enter the **full** Chat Completions URL (for example `https://api.openai.com/v1/chat/completions`), API key, your model identifier and a prompt. The URL's origin must match the approved model origin. For a compatible provider, use its complete endpoint without automatic path rewriting.
3. Click **SSE test**. The page sends `POST` with `{ model, messages: [{ role: "user", content: prompt }], stream: true }`, optional `Authorization: Bearer …`, and appends `choices[0].delta.content` as events arrive. **Cancel SSE** stops the request; partial text remains visible on cancellation or error. EOF before `[DONE]` is reported as incomplete.

This is a text-only [OpenAI Chat Completions streaming](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events) example, not Responses API or tool-call handling. The native Host handles HTTP; the template shares SSE framing with the background example. No model SDK or new Host API is needed.

The key is a password input, optional for local services, and stays only in the current card's memory. Key, prompt and output are not saved in settings, storage, attachments or logs; only the explicitly entered prompt is sent, never source clipboard content. This is a page-owned live request: closing/replacing the card cancels it, and reopening clears the key, model, prompt and output. The model service may charge for a manual request; this demo never invokes it automatically. Native HTTP deadlines still apply. Real provider acceptance is manual; automated tests use synthetic SSE without real keys or paid calls.

## Try rich-text copy

In the installed template, select a text history item and open the bounded capability gallery card. Under **System**, click **Copy rich-text sample**, then paste into TextEdit, Word or another rich-text editor: the heading, bold word and blue text should keep their styles. Clipbus records the same content as a plain-text row. Select that new row and click **Copy saved rich text** to test reading the persisted HTML/RTF and copying it again, including after restarting Clipbus or syncing to the other platform. The Runtime probe buttons offer the same operations. Browser preview is simulated; verify actual styles in the native app.
