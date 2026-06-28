<template>
  <main class="auto-shell">
    <div ref="container" class="auto-shell__content">
      <header class="auto-shell__header">
        <p class="auto-shell__eyebrow">Gallery · height="auto"</p>
        <h1 class="auto-shell__title">Content drives container</h1>
        <p class="auto-shell__subtitle">
          Sizes to content via <code>autoFit</code> (<code>@clipbus/plugin-sdk/dom</code>),
          which posts <code>clipbus.window.setHeight</code> as content grows.
        </p>
      </header>

      <section class="auto-shell__panel">
        <p class="auto-shell__section-label">pluginContext</p>
        <pre class="auto-shell__snapshot">{{ formatJSON(pluginContextSnapshot) }}</pre>
      </section>

      <section class="auto-shell__panel">
        <p class="auto-shell__section-label">item</p>
        <pre class="auto-shell__snapshot">{{ formatJSON(itemSnapshot) }}</pre>
      </section>

      <section class="auto-shell__growable">
        <p class="auto-shell__section-label">growable content</p>
        <ol class="auto-shell__list">
          <li v-for="line in growLines" :key="line">{{ line }}</li>
        </ol>
        <button class="auto-shell__button" type="button" @click="appendLine">Append line</button>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { clipbus } from "@clipbus/plugin-sdk/ui";
import { autoFit } from "@clipbus/plugin-sdk/dom";
import { useTopicRef } from "../../../shared/composables/useTopicRef";

const pluginContext = useTopicRef(clipbus.pluginContext);
const itemTopic = useTopicRef(clipbus.item);

const pluginContextSnapshot = computed(() => pluginContext.value ?? null);
const itemSnapshot = computed(() => itemTopic.value ?? null);

// height="auto" is plugin-driven: the host has NO content-sizing of its own.
// Native resolves auto → bounded(80, 800) and only ever honours window.setHeight,
// so this renderer MUST drive its own height — observe the content-sized inner
// layer (.auto-shell__content; no height:100%, so scrollHeight tracks both growth
// AND shrink) and let the SDK autoFit helper post window.setHeight. The outer
// .auto-shell is a scroll frame so content past the 800 ceiling scrolls instead
// of clipping. Bounds mirror native auto → bounded(
// defaultBoundedMin 80, ceiling 800); kept in sync by a unit test.
const container = ref<HTMLElement | null>(null);
let disconnectAutoFit: (() => void) | null = null;

const growLines = ref<string[]>([
  "Initial line — observe the host shell grow as new lines are appended.",
]);

function appendLine(): void {
  growLines.value = [...growLines.value, `line @ ${new Date().toLocaleTimeString()}`];
}

function formatJSON(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

onMounted(() => {
  const target = container.value;
  if (target) {
    disconnectAutoFit = autoFit({ min: 80, max: 800, target });
  }
});

onUnmounted(() => {
  if (typeof disconnectAutoFit === "function") {
    disconnectAutoFit();
    disconnectAutoFit = null;
  }
});
</script>

<style scoped>
.auto-shell {
  /* Scroll frame: fills the host body (whose height autoFit drives via
     setHeight). At the 800 ceiling the host clips, so the shell scrolls
     internally — same contract as the fixed/bounded renderers + native's
     clip-at-cap rule (plugins self-scroll past the cap). */
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Content layer — autoFit observes THIS (content-sized, no height:100%), so
   scrollHeight tracks both growth and shrink. */
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

.auto-shell__panel,
.auto-shell__growable {
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
  align-self: flex-start;
}

.auto-shell__button:focus-visible {
  outline: 2px solid var(--clipbus-accent, #2563EB);
  outline-offset: 2px;
}
</style>
