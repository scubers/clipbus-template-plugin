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
│                               runtimeProbe / runtimeLimit / renderSwatch / fail
├── runtime/                  — Node only
│   ├── detector.ts             gallery-detector: three cards per item, written every run
│   ├── actions.ts              gallery-auto-text / -image / -none: one per result kind
│   ├── messages.ts             message handlers registered in definePlugin({ messages })
│   ├── probes.ts               one demo call per runtime ctx method
│   ├── limits.ts               things the runtime may not do, each answering how it ended
│   ├── swatch.ts               writes PNGs into the plugin cache via ctx.plugin.path
│   └── solid-png.ts            zero-dependency solid-color PNG encoder
├── renderer-fixed-ui/        — height { min: 240, max: 240 }
├── renderer-auto-ui/         — height { max: 800 }, sized by autoFit()
└── renderer-bounded-ui/      — height { min: 120, max: 480 } — the main stage
    ├── catalog.ts              one button per page-side capability, the runtime probes and the limits
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
| `ctx.system.copyText` / `openUrl` / `reveal` | bounded · System (plus a refused `file:` URL) |
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
| `ctx.system.*` | probes (copyText, reveal on a swatch); `gallery-auto-none` copies a note |
| `ctx.env.get` / `ctx.settings.get` | probes |
| `ctx.log.write` and level helpers | probes; `gallery-auto-text` |
| `ctx.plugin.id` / `version` / `dirs` / `path(rel)` | probe; `swatch.ts` writes `cache/swatches/*.png` |
| `ctx.plugin.folder(id)` | `plugin.folder` probe: exports a swatch into the `exports` folder the user chose (manifest `permissions.folders`) and reveals it |
| `ctx.capabilities.has` | probe |
| `result.text` / `result.image` / `result.none` | `gallery-auto-text` / `-image` / `-none` |
| A handler error with its own name and data | `gallery.fail`; the page shows it as `GalleryDemoError (plugin handler)` |

## Limits (expected to fail)

The bounded page's **Limits** section shows what a plugin cannot do and the error
it gets. Use it as the counterpart of the capability buttons above: in Clipbus
every one of these fails.

| Button | Tries | In Clipbus |
|---|---|---|
| page: fetch | `fetch("https://clipbus.app/")` from the card page | fails (`TypeError`): card pages have no network |
| page: remote `<img>` | an image from an http(s) address | does not load; package files and `ctx.asset` images do |
| runtime: network | `fetch` from the runtime | refused (DNS or connection error): the runtime has no network |
| runtime: startProgram | `child_process.spawnSync` | refused (`ERR_ACCESS_DENIED`): the runtime cannot start other programs |
| runtime: readHome | list the home folder | refused (`EPERM`): only the plugin's own directories and the folders the user chose |
| runtime: writePackage | write a file into `package/` | refused (`EPERM`): the package is read-only |
| runtime: revealOutside | `ctx.system.reveal` on the home folder | refused (`PluginResourceRejected`): reveal takes paths inside the plugin or a chosen folder |

Runtime buttons answer `{ limit, attempt, outcome, error }` instead of throwing,
so the log shows how the attempt ended. Outside Clipbus (the preview workbench,
`npm test`) nothing enforces these limits, so the same buttons may succeed
there; the template's tests check the reporting with the refusals stubbed.
The positive side is next to them: `plugin.path` and `system.reveal` write and
show files in `cache/`, and `plugin.folder` exports into the folder the user
chose.

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
- **Only the plugin's own directories and the folders the user chose.** The
  runtime has no network and cannot start other programs; it reads its package,
  writes `data/` and `cache/`, and reaches a folder of the user's only through a
  `permissions.folders` slot. The `plugin.folder` probe answers `granted: false`
  until a folder is chosen for `exports`.
- **reveal takes a file inside the plugin.** The runtime draws a swatch into
  `cache/` and both sides hand over its plugin-relative path; asset URLs take
  the same path. `openUrl` is for card pages only and takes `http`, `https`
  or `mailto` URLs.
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
