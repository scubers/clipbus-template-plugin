// The bounded page's capability board: one button per page-side capability,
// plus the runtime probes that run the same capabilities inside a message
// call. Each button logs what it sent and what came back (or the error).
//
// Page writes (item.set*, tags, pin) commit at once and come back as
// item.changed. They are interactive writes owned by the plugin, not by a
// detector, so re-detection leaves them alone.

import { ctx } from "@clipbus/plugin-sdk/view";
import type { PluginMethodName } from "@clipbus/plugin-sdk";
import {
  failOnPurpose,
  GALLERY_COUNTER_KEY,
  GALLERY_NOTE_SCOPE,
  galleryCounter,
  LIMIT_URL,
  renderSwatch,
  RUNTIME_LIMITS,
  RUNTIME_PROBES,
  runtimeLimit,
  runtimeProbe,
} from "../contracts";

export interface CapabilityButton {
  id: string;
  label: string;
  /** What the button calls, shown under the label and in the log. */
  signature: string;
  invoke(): Promise<unknown>;
}

export interface CapabilitySection {
  id: string;
  title: string;
  description: string;
  buttons: CapabilityButton[];
}

const PAGE_TAG = "gallery-page";
const CHECKED_CAPABILITIES: PluginMethodName[] = ["renderer.update", "runtime.call", "input.imagePath"];

async function bumpCounter() {
  const [stored] = (await galleryCounter.get(ctx, { key: GALLERY_COUNTER_KEY })).filter((attachment) => attachment.own);
  const payload = { count: (stored?.payload.count ?? 0) + 1, writer: "page" as const };
  await galleryCounter.set(ctx, [{ key: GALLERY_COUNTER_KEY, payload }]);
  return payload;
}

/** system.reveal needs a file inside the plugin: let the runtime draw a swatch. */
async function swatchPath(): Promise<string> {
  return (await renderSwatch.call({ color: "#0ea5e9" })).path;
}

/** Resolves when the image loads, rejects when it cannot. */
function loadImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(`loaded ${image.naturalWidth}×${image.naturalHeight}`);
    image.onerror = () => reject(new Error(`could not load ${src}`));
    image.src = src;
  });
}

function button(id: string, label: string, signature: string, invoke: () => Promise<unknown>): CapabilityButton {
  return { id, label, signature, invoke };
}

export const capabilitySections: CapabilitySection[] = [
  {
    id: "item-read",
    title: "Item reads",
    description: "ctx.item reads the card item only; getAttachments returns every matching attachment, own marks this plugin's.",
    buttons: [
      button("item-get", "get()", "ctx.item.get()", () => ctx.item.get()),
      button("item-getContent", "getContent()", "ctx.item.getContent()", () => ctx.item.getContent()),
      button("item-getAttachments", "getAttachments()", "ctx.item.getAttachments({ type?, key? })", () => ctx.item.getAttachments()),
    ],
  },
  {
    id: "item-write",
    title: "Item writes",
    description: "Commit at once and come back as item.changed. The counter type has no renderer, so it never shows as a card.",
    buttons: [
      button("item-setAttachments", "setAttachments(counter + 1)", "galleryCounter.set(ctx, entries)", bumpCounter),
      button("item-setAttachments-clear", "setAttachments([])", "galleryCounter.set(ctx, [])", () => galleryCounter.set(ctx, [])),
      button("item-setSearchExtension", "setSearchExtension(note)", "ctx.item.setSearchExtension({ scope, entries })", () =>
        ctx.item.setSearchExtension({
          scope: GALLERY_NOTE_SCOPE,
          entries: [{ key: "page", text: "gallery note written by the page", label: "Gallery" }],
        })),
      button("item-setSearchExtension-clear", "setSearchExtension([])", "ctx.item.setSearchExtension({ scope, entries: [] })", () =>
        ctx.item.setSearchExtension({ scope: GALLERY_NOTE_SCOPE, entries: [] })),
      button("item-addTags", `addTags(${PAGE_TAG})`, "ctx.item.addTags({ tags })", () => ctx.item.addTags({ tags: [PAGE_TAG] })),
      button("item-removeTags", `removeTags(${PAGE_TAG})`, "ctx.item.removeTags({ tags })", () => ctx.item.removeTags({ tags: [PAGE_TAG] })),
      button("item-setTags", "setTags(keep user tags)", "ctx.item.setTags({ tags })", async () => {
        // setTags replaces every tag, including the user's: keep theirs.
        const { tags } = await ctx.item.get();
        return ctx.item.setTags({ tags: [...tags.filter((tag) => tag !== PAGE_TAG), PAGE_TAG] });
      }),
      button("item-setPinned", "setPinned(toggle)", "ctx.item.setPinned({ pinned })", async () => {
        const { pinned } = await ctx.item.get();
        return ctx.item.setPinned({ pinned: !pinned });
      }),
    ],
  },
  {
    id: "system",
    title: "System",
    description: "Side effects run at once. openUrl is for card pages and takes http, https or mailto; reveal takes a file inside the plugin, so the runtime draws a swatch for it.",
    buttons: [
      button("system-copyText", "copyText", "ctx.system.copyText({ text })", () =>
        ctx.system.copyText({ text: `Gallery demo @ ${new Date().toLocaleTimeString()}` })),
      button("system-openUrl", "openUrl", "ctx.system.openUrl({ url })", () => ctx.system.openUrl({ url: "https://clipbus.app/" })),
      button("system-reveal", "reveal(swatch)", "ctx.system.reveal({ path })", async () => ctx.system.reveal({ path: await swatchPath() })),
      button("system-openUrl-refused", "openUrl(file:)", "rejected: scheme not allowed", () => ctx.system.openUrl({ url: "file:///etc/hosts" })),
    ],
  },
  {
    id: "card",
    title: "Card appearance",
    description: "renderer.update: title, tint and buttons are written back to the attachment card; height lasts for this display; null returns to the default.",
    buttons: [
      button("renderer-title", "title", "ctx.renderer.update({ title })", () =>
        ctx.renderer.update({ title: `Renamed @ ${new Date().toLocaleTimeString()}` })),
      button("renderer-tint", "tint", "ctx.renderer.update({ tint })", () => ctx.renderer.update({ tint: "#7C3AED" })),
      button("renderer-reset", "title + tint → default", "ctx.renderer.update({ title: null, tint: null })", () =>
        ctx.renderer.update({ title: null, tint: null })),
      button("renderer-height-480", "height 480", "ctx.renderer.update({ height })", () => ctx.renderer.update({ height: 480 })),
      button("renderer-height-120", "height 120", "ctx.renderer.update({ height })", () => ctx.renderer.update({ height: 120 })),
      button("renderer-height-null", "height → default", "ctx.renderer.update({ height: null })", () => ctx.renderer.update({ height: null })),
      button("renderer-invalid", "tint: \"red\"", "rejected: PluginInvalidRequest", () => ctx.renderer.update({ tint: "red" })),
    ],
  },
  {
    id: "env",
    title: "Startup snapshot, env and settings",
    description: "The snapshot and plugin identity are local; env.get and settings.get ask the Host. capabilities.has tells which methods the Host serves to this page.",
    buttons: [
      button("renderer-context", "renderer.context()", "ctx.renderer.context(contract)", async () => ctx.renderer.context()),
      button("plugin", "plugin", "ctx.plugin", async () => ctx.plugin),
      button("capabilities", "capabilities.has", "ctx.capabilities.has(name)", async () =>
        Object.fromEntries(CHECKED_CAPABILITIES.map((name) => [name, ctx.capabilities.has(name)]))),
      button("env-get", "env.get()", "ctx.env.get()", () => ctx.env.get()),
      button("settings-get", "settings.get()", "ctx.settings.get()", () => ctx.settings.get()),
    ],
  },
  {
    id: "log",
    title: "Plugin log",
    description: "Writes go to the plugin's own log file. forwardConsole() in main.ts also sends console output there.",
    buttons: [
      button("log-write", "log.write", "ctx.log.write({ level, message })", () =>
        ctx.log.write({ level: "info", message: "[gallery] log.write from the page" })),
      button("log-info", "log.info", "ctx.log.info(...args)", async () => ctx.log.info("[gallery] info", { from: "page" })),
      button("log-warn", "log.warn", "ctx.log.warn(...args)", async () => ctx.log.warn("[gallery] warn", 42)),
      button("log-error", "log.error", "ctx.log.error(...args)", async () => ctx.log.error("[gallery] error", new Error("demo"))),
      button("console-log", "console.log", "console.log (forwardConsole)", async () => console.log("[gallery] console.log, forwarded")),
    ],
  },
  {
    id: "messages",
    title: "Messages",
    description: "contract.call() sends a typed message to the plugin runtime. A handler error keeps its own name; a missing handler is PluginHandlerNotFound.",
    buttons: [
      button("message-swatch", "renderSwatch", "renderSwatch.call({ color? })", () => renderSwatch.call({})),
      button("message-fail", "fail on purpose", "failOnPurpose.call({ reason })", () => failOnPurpose.call({ reason: "demo" })),
      button("message-missing", "unknown message", "ctx.runtime.call({ name, data })", () =>
        ctx.runtime.call({ name: "gallery.missing", data: null })),
    ],
  },
  {
    id: "limits",
    title: "Limits (expected to fail)",
    description: "What a plugin cannot do. Card pages and the runtime have no network; the runtime cannot start other programs and reaches only its own directories and the folders the user chose. Page buttons fail with the error a page gets; runtime buttons answer how the attempt ended.",
    buttons: [
      button("limit-page-fetch", "page: fetch", `fetch("${LIMIT_URL}")`, () => fetch(LIMIT_URL)),
      button("limit-page-image", "page: remote <img>", `<img src="${LIMIT_URL}favicon.ico">`, () => loadImage(`${LIMIT_URL}favicon.ico`)),
      ...RUNTIME_LIMITS.map((limit) =>
        button(`limit-${limit}`, `runtime: ${limit}`, `runtimeLimit.call({ limit: "${limit}" })`, () => runtimeLimit.call({ limit }))),
    ],
  },
  {
    id: "runtime",
    title: "Runtime probes",
    description: "runtimeProbe.call({ probe }): the runtime ctx runs one method inside a message call; writes commit when the handler returns.",
    buttons: RUNTIME_PROBES.map((probe) =>
      button(`probe-${probe}`, probe, `runtime: ctx.${probe}`, () => runtimeProbe.call({ probe }))),
  },
];
