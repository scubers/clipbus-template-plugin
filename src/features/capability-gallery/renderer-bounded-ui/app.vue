<template>
  <main class="shell gallery-shell">
    <div ref="content" class="gallery-content">
      <header class="gallery-header">
        <h1 class="gallery-header__title">Capability Gallery (bounded 120–480)</h1>
        <p class="gallery-header__hint">
          Every page-side capability, plus runtime probes that run the same capabilities in Node. The card buttons
          (manifest <code>buttons</code>) resize the card through <code>ctx.renderer.update({ height })</code> or switch
          on <code>autoFit()</code>.
        </p>
      </header>

      <EventMonitor :item="item" :env="env" />

      <CapabilityBoard :sections="capabilitySections" :on-invoke="invoke" />

      <ImagePanel :item-kind="item.kind" @log="pushEntry" />

      <TextInputProbe />

      <LogPanel :entries="entries" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { ctx } from "@clipbus/plugin-sdk/view";
import { autoFit } from "@clipbus/plugin-sdk/dom";
import type { PluginButton } from "@clipbus/plugin-sdk";
import { useCard, useCardButton } from "../../../shared/composables/useCard";
import { galleryCards } from "../contracts";
import { capabilitySections, type CapabilityButton } from "./catalog";
import { describeError, timestamp, type LogEntry } from "./log";
import CapabilityBoard from "./components/CapabilityBoard.vue";
import EventMonitor from "./components/EventMonitor.vue";
import ImagePanel from "./components/ImagePanel.vue";
import LogPanel from "./components/LogPanel.vue";
import TextInputProbe from "./components/TextInputProbe.vue";

const MAX_ENTRIES = 50;

const { item, env, attachment } = useCard(galleryCards.bounded);
const entries = ref<LogEntry[]>([]);

function pushEntry(entry: LogEntry): void {
  entries.value = [entry, ...entries.value].slice(0, MAX_ENTRIES);
}

async function invoke(button: CapabilityButton): Promise<void> {
  try {
    pushEntry({ ts: timestamp(), api: button.signature, result: (await button.invoke()) ?? "ok" });
  } catch (error) {
    pushEntry({ ts: timestamp(), api: button.signature, error: describeError(error) });
  }
}

async function logged(api: string, args: unknown, call: () => Promise<unknown>): Promise<void> {
  try {
    await call();
    pushEntry({ ts: timestamp(), api, args, result: "ok" });
  } catch (error) {
    pushEntry({ ts: timestamp(), api, args, error: describeError(error) });
  }
}

// ── Card buttons ──────────────────────────────────────────────────────────────
// The manifest gives the default buttons. Relabelling one with
// renderer.update({ buttons }) writes the list back to the attachment card, so
// it outlives this page; `buttons: null` returns to the manifest default.

const content = ref<HTMLElement | null>(null);
const autoFitOn = ref(false);
let stopAutoFit: (() => void) | null = null;

const BUTTONS_WITH_AUTOFIT_ON: PluginButton[] = [
  { id: "expand", title: "Expand" },
  { id: "compact", title: "Compact" },
  { id: "autofit", title: "AutoFit: on" },
];

function setAutoFit(on: boolean): Promise<void> {
  autoFitOn.value = on;
  stopAutoFit?.();
  stopAutoFit = on && content.value !== null ? autoFit({ target: content.value }) : null;
  const buttons = on ? BUTTONS_WITH_AUTOFIT_ON : null;
  return logged("ctx.renderer.update({ buttons })", { buttons }, () => ctx.renderer.update({ buttons }));
}

async function setHeight(height: number): Promise<void> {
  if (autoFitOn.value) {
    await setAutoFit(false);
  }
  await logged("ctx.renderer.update({ height })", { height }, () => ctx.renderer.update({ height }));
}

useCardButton("expand", () => setHeight(480));
useCardButton("compact", () => setHeight(120));
useCardButton("autofit", () => setAutoFit(!autoFitOn.value));

onMounted(() => {
  // AutoFit starts off; if a previous display left "AutoFit: on" in the card,
  // reset the buttons to the manifest default.
  if (attachment.value.card?.buttons !== undefined) {
    void logged("ctx.renderer.update({ buttons: null })", { buttons: null }, () => ctx.renderer.update({ buttons: null }));
  }
});

onUnmounted(() => {
  stopAutoFit?.();
  stopAutoFit = null;
});
</script>

<style scoped>
.gallery-shell {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: none;
}

.gallery-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gallery-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gallery-header__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--clipbus-text-primary, #0f172a);
  line-height: 1.2;
}

.gallery-header__hint {
  margin: 0;
  font-size: 11px;
  color: var(--clipbus-text-tertiary, #64748b);
  line-height: 1.4;
}

.gallery-header__hint code {
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
}
</style>
