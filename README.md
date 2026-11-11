# Template Plugin

*English · [中文](./README_zh.md)*

> Read [GUIDE.md](./GUIDE.md) before writing a new plugin. Together with this project, it is the complete starter kit for developing Clipbus plugins.

`template-plugin/` is a **minimal yet full-featured** template project for third-party plugin authors and AI assistants. It is written for plugin protocol V2 (manifest `schemaVersion` 6) and the matching SDK package `@clipbus/plugin-sdk`, and shows every extension point: detectors, card pages (renderers) and Actions, plus typed messages between a card page and the plugin runtime.

> **Install hook:** when the manifest declares `install`, Clipbus asks for confirmation before running it. Clipbus provides its verified npm command or CLI through `CLIPBUS_PLUGIN_NPM_PATH`: this template runs JavaScript CLI files with the current Node process and executes other host-provided npm executables or shims directly. It never falls back to an `npm` found on PATH. See [GUIDE.md](./GUIDE.md) for details.

## Must-read documents

| Document | Purpose |
|---|---|
| [GUIDE.md](./GUIDE.md) | Scaffold workflow: quick start, preview, debugging in Clipbus, build, verify, tests |
| `node_modules/@clipbus/plugin-sdk/docs/README.md` | Documentation map of the installed SDK: architecture, manifest, entry points, ctx, pitfalls |
| `node_modules/@clipbus/plugin-sdk/API.md` | Generated reference of every method, event, entry, type and limit |

> The SDK docs and `API.md` ship with the SDK package and always match the installed version. Refresh them with `npm update @clipbus/plugin-sdk`; never edit them by hand.

## How a V2 plugin is put together

| Part | Runs in | Written with | In this template |
|---|---|---|---|
| detector | plugin runtime (Node) | `definePlugin({ detectors })`; writes through `ctx.item.*`, returns nothing | `features/template-detector`, `capability-gallery/runtime/detector.ts` |
| card page (renderer) | WebView | `ctx` from `@clipbus/plugin-sdk/view`; no runtime entry | `features/*/app.vue` |
| Action | plugin runtime | `definePlugin({ actions })`; returns `result.text / image / none` | `features/auto-action`, `capability-gallery/runtime/actions.ts` |
| message | plugin runtime | `defineMessage<Req, Resp>(name)`: the page calls `.call(data)`, the runtime registers `.handle(fn)` | `features/expanded-renderer/messages.ts`, `capability-gallery/contracts.ts` |

Contracts that both sides use — attachment payload types (`defineAttachment<T>`) and messages (`defineMessage<Req, Resp>`) — come from the root entry `@clipbus/plugin-sdk` and live in files the runtime and the pages both import (`payload.ts`, `messages.ts`, `contracts.ts`). Node-only code (file access, hashing) stays in runtime files.

## Project structure

```text
template-plugin/
├── manifest.json                       ← schemaVersion 6: detectors, renderers, actions
├── package.json                        ← depends on @clipbus/plugin-sdk
├── scripts/
│   ├── build-runtime.mjs               ← src/plugin.ts → runtime.nodeEntry (dist/plugin.cjs)
│   ├── build-ui.mjs                    ← one page per manifest renderer (PAGE_SOURCES)
│   ├── verify-build.mjs                ← checks the built runtime and pages
│   └── install.mjs                     ← manifest install hook
├── src/
│   ├── plugin.ts                       ← definePlugin: detectors, actions, messages
│   ├── features/
│   │   ├── template-detector/          ← detector for the two sample cards
│   │   ├── preview-renderer/           ← fixed-height card page + its attachment contract
│   │   ├── expanded-renderer/          ← adaptive-height card page + Analyze message
│   │   ├── auto-action/                ← Actions (no UI)
│   │   └── capability-gallery/         ← every V2 capability, clickable
│   ├── shared/
│   │   ├── composables/useCard.ts      ← startup snapshot + item/env events as Vue refs
│   │   ├── display.ts                  ← content → display info (runtime and pages)
│   │   ├── digest.ts                   ← SHA-256 of text or image file (runtime only)
│   │   └── base.css
│   └── preview/                        ← preview workbench (dev only; @clipbus/plugin-sdk/preview)
│       ├── preview-host/
│       └── scenarios/
└── tests/                              ← `npm test` runs tests/**/*.test.cjs against dist/
    ├── support/                        ← loads dist/plugin.cjs, fake Host ctx, PNG reader
    ├── runtime/                        ← detectors, Actions, message handlers
    └── integration/                    ← install hook
```

Inside the Clipbus monorepo the project also carries `scripts/export.mjs`, `tests/export.test.cjs` and `tests/integration/bridge.test.cjs` (the built runtime in the Node bridge the Hosts embed). They are monorepo-only and are left out of the standalone template.

## Capabilities demonstrated

### detector — `template-detector`

- File: `src/features/template-detector/detector.ts`; `inputKinds`: `text`, `image`
- Writes through `ctx`: the preview attachment with a card title (`Text · 3 lines`), the expanded attachment, a search extension entry, and a `json` tag on text that parses as JSON. The handler returns nothing.
- On `recopy`, the Host replaces only this detector owner's explicitly written attachment `type` and search `scope` groups. Unmentioned groups remain; an empty `entries` list clears the specified group, and writing nothing preserves the stored output. Unchanged group writes are skipped.
- A full detection round (`copy`, `edit` or `manual`) clears previous Detector-owned attachments and search extensions before dispatch. A failed handler does not restore that cleared output. Action, renderer and task outputs have separate owners and survive this cleanup.
- The handler's attachment and search-extension writes commit together in one Core transaction. Tags, pinning and other side effects are outside that transaction; a later tag or pin failure does not undo the artifact batch.
- Detection runs after every copy. `trigger` tells why: `copy`, `recopy` (Core matched an existing item), `edit` or `manual`. On `recopy` this detector tries to reuse its stored output, hashing the content only if that output is missing.
- Image items carry metadata only; the detector reads the file through `ctx.input.imagePath()`.

### card page, fixed height — `template-renderer`

- Files: `src/features/preview-renderer/{payload.ts,app.vue}`; manifest `height: { min: 260, max: 260 }`, `tint`, default `buttons`
- `useCard(previewAttachment)` reads the startup snapshot (`ctx.renderer.context`) and follows `item.changed` / `env.changed`; the buttons arrive through `ctx.renderer.onButton` and copy with `ctx.system.copyText`.
- The card title comes from the attachment card the detector wrote; it overrides the manifest title.
- **Convention:** pages do not draw the outer background, border, radius or shadow; the Host and the preview draw the card shell. Theme tokens are also available as `--clipbus-*` CSS variables.

### card page, adaptive height — `template-expanded-renderer`

- Files: `src/features/expanded-renderer/{payload.ts,messages.ts,analyze.ts,app.vue}`; manifest `height: { min: 120, max: 480 }`
- `autoFit()` from `@clipbus/plugin-sdk/dom` measures the content and calls `ctx.renderer.update({ height })`; the Host keeps the height in the manifest range.
- **Analyze** sends the typed message `analyzeItem.call()`; the runtime handler reads the full content (`ctx.item.getContent()`, `ctx.input.imagePath()`) and answers.
- The accent strip follows the `accent` theme token through `env.changed`.

### Actions — `src/features/auto-action/action.ts`

- `template-auto-action` (text, image), `-text`, `-image`: describe the input as a `result.text(...)`. `item` is the item the Flow started from; `content` is the current cascaded value. The image variant reads the file through `ctx.input.imagePath()`.
- With the gallery Actions the manifest declares 6 Actions and 5 renderers, above the free-tier quotas (3 each), so a free-tier Host shows the Plugin Pro gating.

### capability-gallery

- Directory: `src/features/capability-gallery/` — see its [README](./src/features/capability-gallery/README.md) for the capability matrix.
- 1 detector (three cards) + 3 Actions (one per result kind) + 3 card pages (fixed, auto, bounded) + 3 messages.
- The bounded page calls every page-side method and shows every Host event; its runtime probes run the runtime-side methods inside a message call. Node-drawn images are written to `cache/…` and shown with `ctx.asset.fileUrl(path)`.

## Getting-started checklist

Change these first so the manifest and the code stay in step:

1. `manifest.json` — `plugin.id`, titles, `renderers[].attachmentType` (must start with `<plugin.id>.`), `page`, `height`, `tint`, `buttons`, `inputKinds`, and `writes` (every attachment type and search scope the plugin writes)
2. `src/plugin.ts` — detector and Action keys must equal the manifest ids
3. `src/features/<feature>/payload.ts` / `messages.ts` — attachment and message contracts shared by runtime and page
4. detector / Action / message handlers — runtime code
5. `src/features/<feature>/{app.vue,main.ts,index.html}` — the card page, plus its line in `PAGE_SOURCES` in `scripts/build-ui.mjs`
6. `src/preview/scenarios/` — preview scenarios for the new cards

Usually **no need to change**: `src/shared/`, `scripts/install.mjs`, `scripts/build-runtime.mjs`, `scripts/verify-build.mjs`.

## Common commands

```sh
npm install       # install dependencies (including @clipbus/plugin-sdk)
npm run dev       # preview workbench for the card pages (@clipbus/plugin-sdk/preview)
npm run build     # typecheck + lint + build to dist/ + verify the build
npm test          # tests/**/*.test.cjs against the built dist/
npm run verify    # manifest validation, build, runtime manifest validation, then tests
```

For the scaffold workflow in detail, see [GUIDE.md](./GUIDE.md).

## Short sound example

Enable the template in Clipbus, copy text or an image, then click **Play sound** in the first preview card's header (`template-renderer`). The gallery's **System → Play sound** button and Runtime probe play the selected bundled reference: `sounds/copied.wav`, `sounds/copied.mp3` or `sounds/copied.aiff`. Browser preview only records calls and makes no sound.

The first preview card and **System** section include a **Format** selector (WAV / MP3 / AIFF, initially WAV) and a **Volume** slider (0–100%, default 100%). Card pages remember and share both choices in this plugin’s localStorage; the sound Runtime probe receives the gallery’s current format and volume. The shared helper also accepts explicit volume and format arguments, `playCopiedSound(ctx, 50, "mp3")`, for a detector or other Runtime caller.

All three entries share `playCopiedSound(ctx)` in [`src/shared/sound.ts`](src/shared/sound.ts), returning `started`, `busy` or `unsupported`. A busy slot is skipped without retrying or aborting a detector's other work; resource and other errors still propagate. See the SDK `docs/files.md` for Host formats and limits.

Hosts supporting the expanded sound contract also accept MP3 and PCM16 AIFF on macOS and Windows. For a quieter bundled sound, call `ctx.system.playSound({ path: "package/sounds/copied.wav", volume: 50 })`; the optional volume is an integer percentage from 0 to 100 (default 100). The same short-duration and app-wide rate limits apply. WAV stays the default for compatibility with older Hosts. All three files are included in standalone exports; see [sounds/README.md](sounds/README.md) for the references and conversion commands.

### Opt in to playback after copy

The template does not play automatically. To play on copy / recopy, import the helper in `src/plugin.ts` and add this member to its existing `detectors`:

```ts
import { playCopiedSound } from "./shared/sound";

// Inside definePlugin({ detectors: { ... } }):
"copy-sound": async ({ trigger }, ctx) => {
  if (trigger === "copy" || trigger === "recopy") {
    await playCopiedSound(ctx);
  }
},
```

Add its matching declaration to the manifest's `detectors` array:

```json
{ "id": "copy-sound", "title": "Copy sound", "inputKinds": ["text", "image"] }
```

This separate detector writes no attachments and leaves other detectors' outputs alone; edit/manual triggers stay silent. Plugins compete for one app-wide sound slot without a fixed winner. A delayed request may play after cooldown, so rate limiting does not deduplicate a copy event.

## Default configuration example

`settings.defaults.json` declares `actionTitle`, consumed by `template-auto-action` through the existing read-only settings API. Clipbus imports missing keys after a successful install/update; saved user values survive upgrades. See [GUIDE.md](./GUIDE.md#try-the-default-configuration) for a runnable check and the SDK's `docs/manifest.md` for the contract. Older Hosts ignore the file and the Action keeps its local fallback.

Background tasks: [local CPU example, separate entry, query/cancel and shared modules](GUIDE.md#background-tasks).

The template also demonstrates system notifications from the Worker and the **Notify demo** card button; see [the notification guide](GUIDE.md#system-notifications).

HTTP: configure the **HTTP demo** network slot during installation or later in plugin network settings. The expanded card lets you choose a method, path (including query) and optional JSON body, then displays the HTTP status and JSON response. **HTTP JSON** uses the same form; **HTTP stream task** admits a background SSE reader for GET /events. Neither automatically sends clipboard content or credentials. See [HTTP examples](GUIDE.md#http-examples).

Model SSE: the expanded card also has an **OpenAI-compatible SSE test**. Authorize its separate model origin, enter the full Chat Completions URL, API key, model and prompt, then click **SSE test** to see text arrive live. The key is masked and kept only in this card's memory. **Cancel SSE** or closing the card stops the request. See [model SSE test](GUIDE.md#model-sse-test).

网络示例：安装时或“网络授权”设置中填写服务 origin，JSON 与后台 SSE 示例仅在手动点击后请求；paths / methods 省略表示该 origin 下全部路径与受支持方法。

Rich-text example: the bounded capability gallery provides **Copy rich-text sample** and **Copy saved rich text**. Paste into a rich-text editor to verify native HTML/RTF output, then select the captured row to test a persisted round trip. See [the guide](GUIDE.md#try-rich-text-copy).
