<template>
  <main ref="container" class="shell gallery-shell">
    <header class="gallery-header">
      <h1 class="gallery-header__title">Capability Gallery (bounded 120-480)</h1>
      <p class="gallery-header__hint">
        Use the host button strip for window / autoFit controls
        (registered via <code>clipbus.attachmentRenderer.setButtons</code>).
      </p>
    </header>

    <TopicMonitor />

    <CapabilityBoard :sections="boundedSections" :on-invoke="handleInvoke" />

    <RuntimeBridgePanel :sections="allSections" :on-invoke="handleInvoke" />

    <ImagePanel @log="pushEntry" />

    <TextInputProbe @log="pushEntry" />

    <LogPanel :entries="entries" />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { clipbus } from "@clipbus/plugin-sdk/ui";
import { autoFit } from "@clipbus/plugin-sdk/dom";
import { galleryCapabilitySections } from "./catalog";
import type { CapabilityButton } from "./catalog";
import LogPanel from "./components/LogPanel.vue";
import TopicMonitor from "./components/TopicMonitor.vue";
import CapabilityBoard from "./components/CapabilityBoard.vue";
import RuntimeBridgePanel from "./components/RuntimeBridgePanel.vue";
import TextInputProbe from "./components/TextInputProbe.vue";
import ImagePanel from "./components/ImagePanel.vue";

interface LogEntry {
  ts: string;
  api: string;
  args?: unknown;
  result?: unknown;
  error?: { message: string };
}

const MAX_ENTRIES = 50;

const entries = ref<LogEntry[]>([]);
const autoFitOn = ref<boolean>(false);
const container = ref<HTMLElement | null>(null);

let disconnectAutoFit: (() => void) | null = null;
let unsubHostInvoke: (() => void) | null = null;
let unsubInfoPanelAction: (() => void) | null = null;
let unsubInfoPanelClose: (() => void) | null = null;

// Module-level ref for the most-recent panelID (shared with catalog.ts via import side-effect).
// We track it here too so onAction can call clipboard.copyText when buttonID === 'copy'.
let _lastPanelID: string | null = null;

const allSections = galleryCapabilitySections;

const boundedSections = computed(() =>
  galleryCapabilitySections.filter((s) => s.id !== "runtime-bridge")
);

function pushEntry(entry: LogEntry): void {
  entries.value = [entry, ...entries.value].slice(0, MAX_ENTRIES);
}

async function handleInvoke(button: CapabilityButton): Promise<void> {
  const ts = new Date().toISOString();
  try {
    const result = await button.invoke();
    // Track the most recent panelID so the onAction handler can use it.
    if (result && typeof result === "object" && "panelID" in result) {
      _lastPanelID = (result as { panelID: string }).panelID;
    }
    pushEntry({ ts, api: button.apiSignature, result });
  } catch (err) {
    pushEntry({
      ts,
      api: button.apiSignature,
      error: { message: err instanceof Error ? err.message : String(err) },
    });
  }
}

function autofitButtonTitle(): string {
  return autoFitOn.value ? "AutoFit: ON" : "AutoFit: OFF";
}

async function refreshHostStrip(): Promise<void> {
  await clipbus.attachmentRenderer.setButtons({
    buttons: [
      { id: "expand", title: "Expand", isEnabled: true },
      { id: "compact", title: "Compact", isEnabled: true },
      { id: "reset-height", title: "Reset Height", isEnabled: true },
      { id: "autofit-toggle", title: autofitButtonTitle(), isEnabled: true },
    ],
  });
}

async function handleHostInvoke(detail: { buttonID?: string } | null | undefined): Promise<void> {
  const buttonID = detail?.buttonID;
  const ts = new Date().toISOString();

  if (buttonID === "expand") {
    await clipbus.window.setHeight({ height: 480 });
    pushEntry({ ts, api: "clipbus.window.setHeight({ height })", args: { height: 480 }, result: "host-invoked" });
    return;
  }
  if (buttonID === "compact") {
    await clipbus.window.setHeight({ height: 120 });
    pushEntry({ ts, api: "clipbus.window.setHeight({ height })", args: { height: 120 }, result: "host-invoked" });
    return;
  }
  if (buttonID === "reset-height") {
    await clipbus.window.autoFit();
    pushEntry({ ts, api: "clipbus.window.autoFit()", args: {}, result: "host-invoked" });
    return;
  }
  if (buttonID === "autofit-toggle") {
    autoFitOn.value = !autoFitOn.value;
    if (autoFitOn.value) {
      const target = container.value;
      if (target) {
        disconnectAutoFit?.();
        disconnectAutoFit = autoFit({ min: 120, max: 480, target });
      }
    } else {
      disconnectAutoFit?.();
      disconnectAutoFit = null;
    }
    await refreshHostStrip();
    pushEntry({
      ts,
      api: "autoFit (DOM helper)",
      args: { enabled: autoFitOn.value },
      result: "host-invoked",
    });
  }
}

onMounted(async () => {
  await refreshHostStrip();
  unsubHostInvoke = clipbus.attachmentRenderer.onHostInvoke.on(handleHostInvoke);

  unsubInfoPanelAction = clipbus.infoPanel.onAction.on((payload) => {
    const ts = new Date().toISOString();
    if (payload.buttonID === "copy") {
      // Pure-notification model: the plugin handles its own side effect.
      clipbus.clipboard.copyText({ text: `[infoPanel] panelID=${payload.panelID} copied @ ${ts}` });
      pushEntry({ ts, api: "clipbus.infoPanel.onAction", result: { ...payload, sideEffect: "clipboard.copyText" } });
    } else {
      pushEntry({ ts, api: "clipbus.infoPanel.onAction", result: payload });
    }
  });

  unsubInfoPanelClose = clipbus.infoPanel.onClose.on((payload) => {
    const ts = new Date().toISOString();
    if (_lastPanelID === payload.panelID) {
      _lastPanelID = null;
    }
    pushEntry({ ts, api: "clipbus.infoPanel.onClose", result: payload });
  });
});

onUnmounted(() => {
  unsubHostInvoke?.();
  unsubHostInvoke = null;
  unsubInfoPanelAction?.();
  unsubInfoPanelAction = null;
  unsubInfoPanelClose?.();
  unsubInfoPanelClose = null;
  disconnectAutoFit?.();
  disconnectAutoFit = null;
});
</script>

<style scoped>
.gallery-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: none;
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
