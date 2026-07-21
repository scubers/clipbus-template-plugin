# Template Plugin

*English · [中文](./README_zh.md)*

> Read [GUIDE.md](./GUIDE.md) before writing a new plugin. Together with this project, it is the complete starter kit for developing Clipbus plugins.

`template-plugin/` is a **minimal yet full-featured** template project for third-party plugin authors and AI assistants. It demonstrates every extension point Clipbus currently offers: detector, attachment renderer (compact + expanded), auto-run action, and draft action. It depends on the independently published SDK package `@clipbus/plugin-sdk`.

This single project is all you need to build a production-ready Clipbus plugin — architecture, APIs, and field constraints all use code as the source of truth, with the docs kept in sync.

## Three must-read documents

| Document | Purpose |
|---|---|
| [GUIDE.md](./GUIDE.md) | Complete plugin development guide: quick start, architecture, manifest, the three entry-point types, input shapes, permission model, pitfall Q&A |
| `API.md` (published with [`@clipbus/plugin-sdk`](https://www.npmjs.com/package/@clipbus/plugin-sdk)) | The generated API source of truth for every capability, host event, and named wire type |
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
- Demonstrates: schema v4 `supportedInputKinds`, the distinction between original `sourceItem` and current `content`, and a UI-less result that can continue through the host cascade

The template also declares two sub-variants, `template-auto-action-text` / `template-auto-action-image`, to demonstrate the Plugin Pro gating behavior once you exceed the free quota (the manifest declares 4 actions in total, over the default quota of 3).

### draft action

- Files: `src/features/capability-gallery/runtime/draft-action.ts` + `src/features/capability-gallery/draft-action-ui/app.vue` (manifest id: `gallery-draft`)
- Demonstrates: `resolveSession` returning `initialDraft` + a buttons seed, `clipbus.action.input` exposing the sanitized current value, and `clipbus.action.complete(...)`. In the real host, successful `text`, `image`, and `path_reference` results are presented for confirmation and can be explicitly advanced by the user; `none` cannot advance. Completion itself never auto-advances.

### capability-gallery (full API reference)

- Directory: `src/features/capability-gallery/` (see [`src/features/capability-gallery/README.md`](./src/features/capability-gallery/README.md) for details)
- Role: a broad SDK capability reference, including current Action input topics, current-image materialization, and safe `path_reference` results
- Contains: 1 detector (×3 attachments) + 4 auto-run actions + 1 draft action + 3 attachment renderers + 4 WebViews (bounded main stage + fixed + auto + draft-action)
- Image display: renderers use `clipbus.asset.currentItemImageUrl()` for the original item; the draft Action uses `clipbus.asset.currentActionInputImageUrl()` for the current cascade value. Node-produced images still use `host.asset.registerImage()`.
- File output: `gallery-auto-path-reference` either reuses a current input entry by `inputIndex` or writes to `host.action.allocateOutputFilePath()` and returns an `allocated_file` result.
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
