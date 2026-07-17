# Template Plugin

*English · [中文](./README_zh.md)*

> Read [GUIDE.md](./GUIDE.md) before writing a new plugin. Together with this project, it is the complete starter kit for developing Clipbus plugins.

`template-plugin/` is a **minimal yet full-featured** template project for third-party plugin authors and AI assistants. It demonstrates every extension point Clipbus currently offers: detector, attachment renderer (compact + expanded), auto-run action, and draft action. It depends on the independently published SDK package `@clipbus/plugin-sdk`.

This single project is all you need to build a production-ready Clipbus plugin — architecture, APIs, and field constraints all use code as the source of truth, with the docs kept in sync.

## Three must-read documents

| Document | Purpose |
|---|---|
| [GUIDE.md](./GUIDE.md) | Complete plugin development guide: quick start, architecture, manifest, the three entry-point types, input shapes, permission model, pitfall Q&A |
| `API.md` (published with [`@clipbus/plugin-sdk`](https://www.npmjs.com/package/@clipbus/plugin-sdk)) | The API source of truth, auto-generated from `protocol/plugin/src/catalog.ts`: precise signatures for 26 capabilities, 7 host events, and 22 named types |
| `SPECIFICATION.md` (published with [`@clipbus/plugin-sdk`](https://www.npmjs.com/package/@clipbus/plugin-sdk)) | SDK shape rules (Topic / OptionalTopic / Stream / Verb), naming conventions, and the PR process for extending capabilities |

> The `API.md` inside the SDK package is a **mirror file**. It is synced automatically by codegen when you run `cd protocol/plugin && npm run codegen` — the docs never drift from the catalog.

## Project structure

```text
template-plugin/
├── manifest.json
├── package.json                        ← depends on @clipbus/plugin-sdk (standalone npm package)
├── scripts/
│   ├── build-runtime.mjs
│   ├── build-ui.mjs
│   └── verify-build.mjs
├── src/
│   ├── features/                       ← one folder per capability
│   │   ├── preview-renderer/           ← detector + compact renderer + Vue app
│   │   ├── expanded-renderer/          ← detector + adaptive-height renderer + Vue app
│   │   ├── auto-action/                ← auto-run action (no UI)
│   │   └── capability-gallery/         ← full-capability SDK demo reference (includes a draft action)
│   ├── shared/                         ← thin shared layer across features
│   │   ├── display.ts
│   │   └── debug.ts
│   ├── preview/                        ← local preview workbench (dev-only; uses @clipbus/plugin-sdk/preview)
│   │   ├── scenarios/
│   │   └── preview-host/
│   └── plugin.ts                       ← definePlugin entry
└── tests/runtime/
    └── templateCapabilities.test.cjs
```

## Capabilities demonstrated

### detector

- Files: `src/features/preview-renderer/detector.ts` + `src/features/expanded-renderer/detector.ts`
- Input: `text`, `image`, `path_reference` (all three kinds covered)
- Output: `plugin.template.full.preview` and `plugin.template.full.expanded` attachments
- Demonstrates: using the strongly-typed `PluginContentEnvelope` / `PluginClipboardItem` to handle all three input kinds, mapping them uniformly into an artifact

### attachment renderer (compact, fixed height)

- Files: `src/features/preview-renderer/renderer.ts` + `src/features/preview-renderer/app.vue`
- Demonstrates: `resolveAttachment()`, `clipbus.attachmentRenderer.onHostInvoke`, fixed `height: 320`, theme adaptation across 12 theme tokens
- **Convention**: the component does not self-draw outer background / border / border-radius / box-shadow — the host (and preview harness) provide the card shell uniformly

### attachment renderer (expanded, adaptive height + theme events)

- Files: `src/features/expanded-renderer/renderer.ts` + `src/features/expanded-renderer/app.vue`
- Demonstrates: manifest `height: { min: 120, max: 480 }` + `clipbus.window.autoFit()` + `clipbus.theme.on()` driving the accent-bar color

### auto-run action

- File: `src/features/auto-action/action.ts`
- Demonstrates: a UI-less action with a fully self-contained runtime, returning execution contexts in the `actionResult.text(...)` / `actionResult.none(...)` shapes

The template also declares two sub-variants, `template-auto-action-text` / `template-auto-action-image`, to demonstrate the Plugin Pro gating behavior once you exceed the free quota (the manifest declares 4 actions in total, over the default quota of 3).

### draft action

- Files: `src/features/capability-gallery/runtime/draft-action.ts` + `src/features/capability-gallery/draft-action-ui/app.vue` (manifest id: `gallery-draft`)
- Demonstrates: `resolveSession` returning `initialDraft` + a buttons seed → the UI manages its own form state → submitting via `clipbus.action.complete(...)`

### capability-gallery (full API reference)

- Directory: `src/features/capability-gallery/` (see [`src/features/capability-gallery/README.md`](./src/features/capability-gallery/README.md) for details)
- Role: a "full SDK capability demo" feature that complements the four minimal samples above — covering 25 of the 26 capabilities (only `asset.pathReferenceImageUrl` is not demonstrated separately), 7 host events, 4 permissions, 3 height shapes, 3 actionResult shapes, and 3 item kinds
- Contains: 1 detector (×3 attachments) + 3 auto-run actions + 1 draft action + 3 attachment renderers + 4 WebViews (bounded main stage + fixed + auto + draft-action); all 3 attachment renderers are wired in the preview scenarios (`gallery-fixed-240`, `gallery-auto`, `gallery-bounded-120-480`)
- Image display: the bounded renderer and the draft action use `clipbus.asset.currentItemImageUrl()` to obtain a `clipbus-asset://` URL and show the current item's image in an `<img>`, and use `host.asset.registerImage()` to display a solid-color image produced by Node (see [GUIDE.md](./GUIDE.md) §6.6)
- Use case: a clickable reference for third-party plugin authors wondering "what exactly can this SDK do?"

## Getting-started customization checklist

Change these first, to keep the manifest and runtime from drifting apart:

1. `manifest.json` — `plugin.id`, `title`, `attachmentType`, capability list
2. `src/plugin.ts` — the registered handler keys must match the manifest `id` exactly
3. `src/features/<feature>/payload.ts` (data type definitions)
4. `src/features/<feature>/detector.ts` (detector logic)
5. `src/features/<feature>/renderer.ts` (renderer runtime logic)
6. `src/features/<feature>/action.ts` (action logic)
7. `src/features/<feature>/app.vue` (the corresponding UI entry)

Usually **no need to change**:

- `@clipbus/plugin-sdk` — the standalone SDK package; to extend capabilities see the package's `SPECIFICATION.md` ([`@clipbus/plugin-sdk`](https://www.npmjs.com/package/@clipbus/plugin-sdk))
- `src/shared/` — shared utilities
- `scripts/build-runtime.mjs` / `scripts/build-ui.mjs`

## Three common commands

```sh
npm install       # install dependencies (including @clipbus/plugin-sdk)
npm run dev       # start the Vite preview workbench (harness from @clipbus/plugin-sdk/preview)
npm test          # run the integration tests under tests/
npm run build     # production build to dist/
```

For full documentation, field specifications, API reference, and the permission model, see [GUIDE.md](./GUIDE.md).
