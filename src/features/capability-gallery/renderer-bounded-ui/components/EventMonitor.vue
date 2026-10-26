<template>
  <section class="event-monitor">
    <p class="event-monitor__title">Host events</p>
    <details v-for="event in events" :key="event.name" class="event-monitor__item">
      <summary class="event-monitor__summary">
        <span class="event-monitor__name">{{ event.name }}</span>
        <span class="event-monitor__count">× {{ event.count }}</span>
        <span v-if="event.at" class="event-monitor__updated">last {{ event.at }}</span>
      </summary>
      <pre class="event-monitor__body">{{ event.body }}</pre>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { ctx } from "@clipbus/plugin-sdk/view";
import type { PluginEnv, PluginItemSnapshot, PluginRendererButtonEvent } from "@clipbus/plugin-sdk";
import { stopOnUnmount } from "../../../../shared/composables/useCard";
import { formatJSON } from "../../../../shared/display";
import { timestamp } from "../log";

const props = defineProps<{
  item: PluginItemSnapshot;
  env: PluginEnv;
}>();

interface EventState {
  count: number;
  at: string;
  last: unknown;
}

const state = reactive<Record<string, EventState>>({
  "item.changed": { count: 0, at: "", last: props.item },
  "env.changed": { count: 0, at: "", last: props.env },
  "renderer.button": { count: 0, at: "", last: null },
});

function record(name: string, data: unknown): void {
  const entry = state[name];
  entry.count += 1;
  entry.at = timestamp();
  entry.last = data;
}

// useCard (in app.vue) subscribes to item.onChange and env.onChange and passes
// each new snapshot down; renderer.onButton is subscribed here directly.
watch(() => props.item, (item) => record("item.changed", item));
watch(() => props.env, (env) => record("env.changed", env));
stopOnUnmount(ctx.renderer.onButton((event: PluginRendererButtonEvent) => record("renderer.button", event)));

const events = computed(() =>
  Object.entries(state).map(([name, entry]) => ({ name, count: entry.count, at: entry.at, body: formatJSON(entry.last) })),
);
</script>

<style scoped>
.event-monitor {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  background: var(--clipbus-surface, #ffffff);
  border: 1px solid var(--clipbus-border, rgba(148, 163, 184, 0.3));
}

.event-monitor__title {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.event-monitor__item {
  border: 1px solid var(--clipbus-border, rgba(226, 232, 240, 0.9));
  border-radius: 8px;
  overflow: hidden;
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
}

.event-monitor__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.event-monitor__summary::-webkit-details-marker {
  display: none;
}

.event-monitor__name {
  font-size: 11px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-weight: 700;
  color: var(--clipbus-text-primary, #0f172a);
  flex: 1;
}

.event-monitor__count,
.event-monitor__updated {
  font-size: 10px;
  color: var(--clipbus-text-tertiary, #64748b);
  white-space: nowrap;
}

.event-monitor__body {
  margin: 0;
  padding: 6px 10px 8px;
  font-size: 10px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  line-height: 1.4;
  color: var(--clipbus-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow-y: auto;
  border-top: 1px solid var(--clipbus-border, rgba(226, 232, 240, 0.9));
}
</style>
