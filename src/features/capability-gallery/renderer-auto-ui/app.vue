<template>
  <main class="auto-shell">
    <div ref="content" class="auto-shell__content">
      <header class="auto-shell__header">
        <p class="auto-shell__eyebrow">Gallery · height { max: 800 }</p>
        <h1 class="auto-shell__title">Content drives the card height</h1>
        <p class="auto-shell__subtitle">
          <code>autoFit()</code> from <code>@clipbus/plugin-sdk/dom</code> measures this content and sends
          <code>ctx.renderer.update({ height })</code>; the Host keeps the height inside the manifest range
          (80 by default, up to 800).
        </p>
      </header>

      <section class="auto-shell__panel">
        <p class="auto-shell__section-label">ctx.plugin</p>
        <pre class="auto-shell__snapshot">{{ formatJSON(plugin) }}</pre>
      </section>

      <section class="auto-shell__panel">
        <p class="auto-shell__section-label">item · ctx.item.onChange × {{ itemChanges }}</p>
        <pre class="auto-shell__snapshot">{{ formatJSON(item) }}</pre>
      </section>

      <section class="auto-shell__panel">
        <p class="auto-shell__section-label">growable content</p>
        <ol class="auto-shell__list">
          <li v-for="(line, index) in lines" :key="index">{{ line }}</li>
        </ol>
        <div class="auto-shell__buttons">
          <button class="auto-shell__button" type="button" @click="appendLine">Append line</button>
          <button class="auto-shell__button" type="button" :disabled="lines.length <= 1" @click="removeLine">
            Remove line
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { ctx } from "@clipbus/plugin-sdk/view";
import { autoFit } from "@clipbus/plugin-sdk/dom";
import { useCard } from "../../../shared/composables/useCard";
import { formatJSON } from "../../../shared/display";
import { galleryCards } from "../contracts";

const { item } = useCard(galleryCards.auto);
const plugin = ctx.plugin;

const itemChanges = ref(0);
watch(item, () => {
  itemChanges.value += 1;
});

const lines = ref<string[]>(["Initial line — append lines and watch the card grow, remove them and watch it shrink."]);

function appendLine(): void {
  lines.value = [...lines.value, `line @ ${new Date().toLocaleTimeString()}`];
}

function removeLine(): void {
  lines.value = lines.value.slice(0, -1);
}

// Measure the content-sized inner layer (no height: 100%) so the height
// follows both growth and shrink. The outer shell scrolls once the Host caps
// the height.
const content = ref<HTMLElement | null>(null);
let stopAutoFit: (() => void) | null = null;

onMounted(() => {
  if (content.value !== null) {
    stopAutoFit = autoFit({ target: content.value });
  }
});

onUnmounted(() => {
  stopAutoFit?.();
  stopAutoFit = null;
});
</script>

<style scoped>
.auto-shell {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.auto-shell__content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--clipbus-text-primary, #0f172a);
  font-size: 12px;
}

.auto-shell__header {
  display: grid;
  gap: 4px;
}

.auto-shell__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.auto-shell__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--clipbus-text-primary, #0f172a);
}

.auto-shell__subtitle {
  margin: 0;
  font-size: 11px;
  color: var(--clipbus-text-secondary, #475569);
}

.auto-shell__subtitle code {
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
}

.auto-shell__panel {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--clipbus-border, rgba(226, 232, 240, 0.9));
  border-radius: 8px;
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
}

.auto-shell__section-label {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.auto-shell__snapshot {
  margin: 0;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  line-height: 1.4;
  color: var(--clipbus-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
}

.auto-shell__list {
  margin: 0;
  padding-left: 18px;
  font-size: 11px;
  color: var(--clipbus-text-primary, #0f172a);
}

.auto-shell__list li {
  margin-bottom: 2px;
}

.auto-shell__buttons {
  display: flex;
  gap: 6px;
}

.auto-shell__button {
  appearance: none;
  border: 1px solid var(--clipbus-border, rgba(148, 163, 184, 0.5));
  background: var(--clipbus-surface-elevated, #f1f5f9);
  color: var(--clipbus-text-primary, #0f172a);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.auto-shell__button:disabled {
  opacity: 0.5;
  cursor: default;
}

.auto-shell__button:focus-visible {
  outline: 2px solid var(--clipbus-accent, #2563EB);
  outline-offset: 2px;
}
</style>
