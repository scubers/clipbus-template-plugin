# capability-gallery

`capability-gallery` is the template's **capability reference**. The three
sample features (`preview-renderer`, `expanded-renderer`, `auto-action`, plus
the `template-detector` that feeds them) are the minimal "this is what a real
plugin looks like" starting point; this directory puts every capability of
plugin protocol V2 in one place you can click and watch, including the ones a
real plugin rarely needs.

If you are new to writing plugins, read the sample features first.

## Directory layout

```text
capability-gallery/
├── README.md                 — this file (capability matrix, how to run)
├── contracts.ts              — shared by runtime and pages: defineAttachment for the
│                               three cards and the counter, defineMessage for
│                               runtimeProbe / renderSwatch / fail
├── runtime/                  — Node only
│   ├── detector.ts             gallery-detector: three cards per item, written every run
│   ├── actions.ts              gallery-auto-text / -image / -none: one per result kind
│   ├── messages.ts             message handlers registered in definePlugin({ messages })
│   ├── probes.ts               one demo call per runtime ctx method
│   ├── swatch.ts               writes PNGs into the plugin cache via ctx.plugin.path
│   └── solid-png.ts            zero-dependency solid-color PNG encoder
├── renderer-fixed-ui/        — height { min: 240, max: 240 }
├── renderer-auto-ui/         — height { max: 800 }, sized by autoFit()
└── renderer-bounded-ui/      — height { min: 120, max: 480 } — the main stage
    ├── catalog.ts              one button per page-side capability + the runtime probes
    ├── log.ts                  log entries and error description
    └── components/             CapabilityBoard, EventMonitor, ImagePanel,
                                TextInputProbe, LogPanel
```

## Page side (`ctx` from `@clipbus/plugin-sdk/view`)

| Capability | Where |
|---|---|
| `ctx.item.get` / `getContent` / `getAttachments` | bounded · Item reads |
| `ctx.item.setAttachments` | bounded · Item writes (counter + 1, clear); `galleryCounter.set(ctx, …)` |
| `ctx.item.setSearchExtension` | bounded · Item writes (note, clear) |
| `ctx.item.addTags` / `removeTags` / `setTags` / `setPinned` | bounded · Item writes |
| `ctx.system.copyText` / `openUrl` / `openPath` / `reveal` | bounded · System (plus a refused `file:` URL) |
| `ctx.renderer.update` — `title`, `tint`, `buttons`, `height`, `null` | bounded · Card appearance; card buttons Expand / Compact / AutoFit |
| `ctx.renderer.context(contract)` | every page through `useCard`; bounded · Startup snapshot |
| `ctx.runtime.call` / `contract.call` | bounded · Messages and Runtime probes; ImagePanel; expanded sample (Analyze) |
| `ctx.env.get` / `ctx.settings.get` | bounded · Startup snapshot, env and settings |
| `ctx.log.write` and `ctx.log.debug/info/warn/error` | bounded · Plugin log |
| `ctx.plugin` / `ctx.capabilities.has` | bounded · Startup snapshot; auto page shows `ctx.plugin` |
| `ctx.asset.itemImageUrl()` / `ctx.asset.fileUrl(path)` | bounded · ImagePanel |
| `ctx.item.onChange` (`item.changed`) | every page through `useCard`; auto page counts them; bounded · EventMonitor |
| `ctx.env.onChange` (`env.changed`) | every page through `useCard`; fixed page shows the live theme tokens |
| `ctx.renderer.onButton(id, fn)` / `onButton(fn)` | bounded and the samples use the id form; fixed page uses the listener form |
| `autoFit()` (`@clipbus/plugin-sdk/dom`) | auto page; bounded · AutoFit card button; expanded sample |
| `reportInputState()` (`/dom`) | installed in every `main.ts`; bounded · Text input shows what it reports |
| `forwardConsole()` (`/dom`) | installed in every `main.ts`; bounded · Plugin log → console.log |

## Runtime side (`ctx` in a handler)

The bounded page's **Runtime probes** section calls `runtimeProbe.call({ probe })`;
the handler runs one runtime ctx method inside that message call
(`runtime/probes.ts`). Writes are staged and committed when the handler
returns; `ctx.system.*` side effects run at once.

| Capability | Where |
|---|---|
| `ctx.item.*` (all nine methods) | probes; detectors write attachments and search entries |
| `ctx.input.imagePath()` | probe; `gallery-auto-image`; the template detector and Analyze |
| `ctx.system.*` | probes (openPath / reveal on a swatch); `gallery-auto-none` copies a note |
| `ctx.env.get` / `ctx.settings.get` | probes |
| `ctx.log.write` and level helpers | probes; `gallery-auto-text` |
| `ctx.plugin.id` / `version` / `dirs` / `path(rel)` | probe; `swatch.ts` writes `cache/swatches/*.png` |
| `ctx.capabilities.has` | probe |
| `result.text` / `result.image` / `result.none` | `gallery-auto-text` / `-image` / `-none` |
| A handler error with its own name and data | `gallery.fail`; the page shows it as `GalleryDemoError (plugin handler)` |

## Notes

- **Interactive writes vs detection output.** The detector replaces its own
  output on every run; writes from a page or a message handler belong to the
  plugin and survive re-detection. The counter therefore has its own type
  (`plugin.template.full.gallery.counter`), and that type has no renderer, so it
  never shows as a card. Page writes leave records on the item: use the
  *clear* buttons to remove the counter and the note.
- **Card appearance is data.** `renderer.update({ title, tint, buttons })` is
  written back to the attachment card and outlives the page; `null` returns to
  the attachment card, then the manifest default. The gallery detector writes
  its entries without `card`, so what a page wrote back survives
  re-detection. `height` only lasts for the current display.
- **setTags replaces every tag**, the user's included; the demos read the tags
  first and keep them.
- **openPath / reveal take an existing absolute path.** Pages only know
  plugin-relative paths, so the runtime draws a swatch and returns its
  absolute path for these two calls. Asset URLs always take the
  plugin-relative path (`cache/...`).
- **Errors.** A Host error carries a contract name (`PluginInvalidRequest`,
  `PluginHandlerNotFound`, …); an error a handler threw keeps its own name and
  arrives as a `PluginRemoteError`. The log tells them apart with
  `instanceof PluginRemoteError`, which holds whichever SDK entry point
  (`@clipbus/plugin-sdk` or `/view`) the call went through.
- **Stable payloads.** Detection runs on every copy. The gallery detector's
  payloads depend only on the content, so a repeated copy changes nothing and
  sends no `item.changed`.
- **Three cards per item is intentional excess.** A real plugin writes one
  attachment per real intent; the gallery writes three to show the three
  height policies side by side.
- **The Plugin Pro quota appears naturally.** Six Actions and five renderers
  exceed the free-tier quotas (three each); on a free-tier Host the entries
  beyond them are locked.

## How to run

1. `npm run dev` opens the preview workbench; pick a *Gallery* scenario. The
   workbench answers messages with stubs (`src/preview/scenarios`).
2. For the real runtime, `npm run build`, then add the project in Clipbus →
   Settings → Plugins → Add Plugin → Local Development Plugin.
3. Copy any text or image. Three gallery cards appear on the item; the bounded
   one is the main stage: click buttons and watch the log and the Host events.
4. The Action menu lists *Gallery Auto (text / image / none)*, one per result
   kind.
