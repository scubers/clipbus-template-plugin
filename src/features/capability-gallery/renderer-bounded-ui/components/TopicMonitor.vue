<template>
  <section class="topic-monitor">
    <p class="topic-monitor__title">Topic Monitor</p>
    <details
      v-for="topic in topics"
      :key="topic.name"
      class="topic-monitor__item"
    >
      <summary class="topic-monitor__summary">
        <span class="topic-monitor__name">{{ topic.name }}</span>
        <span v-if="topic.updatedAt" class="topic-monitor__updated">
          updated {{ topic.updatedAt }}
        </span>
      </summary>
      <pre class="topic-monitor__body">{{ topic.serialized }}</pre>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { clipbus } from "@clipbus/plugin-sdk/ui";
import { useTopicRef } from "../../../../shared/composables/useTopicRef";

interface TopicState {
  serialized: string;
  updatedAt: string;
}

const pluginContext = useTopicRef(clipbus.pluginContext);
const item = useTopicRef(clipbus.item);
const attachment = useTopicRef(clipbus.item.attachment);
const theme = useTopicRef(clipbus.theme);

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "undefined";
}

function nowShort(): string {
  return new Date().toLocaleTimeString();
}

// Per-topic state keyed by display name. We dedupe re-emits with the same
// payload (e.g. the host re-broadcasting an unchanged theme snapshot) so the
// "updated" timestamp and the JSON body do not flicker.
const state = reactive<Record<string, TopicState>>({
  "clipbus.pluginContext": { serialized: serialize(pluginContext.value), updatedAt: "" },
  "clipbus.item": { serialized: serialize(item.value), updatedAt: "" },
  "clipbus.item.attachment": { serialized: serialize(attachment.value), updatedAt: "" },
  "clipbus.theme": { serialized: serialize(theme.value), updatedAt: "" },
});

function trackTopic(name: string, valueRef: Readonly<{ value: unknown }>): void {
  watch(valueRef, (next) => {
    const nextSerialized = serialize(next);
    if (nextSerialized === state[name].serialized) return;
    state[name] = { serialized: nextSerialized, updatedAt: nowShort() };
  });
}

trackTopic("clipbus.pluginContext", pluginContext);
trackTopic("clipbus.item", item);
trackTopic("clipbus.item.attachment", attachment);
trackTopic("clipbus.theme", theme);

// clipbus.item.search topic was removed in plugin-api-shrink — search terms are
// no longer injected to attachment renderers; Node detectors handle filtering.
const topics = computed(() => [
  { name: "clipbus.pluginContext", ...state["clipbus.pluginContext"] },
  { name: "clipbus.item", ...state["clipbus.item"] },
  { name: "clipbus.item.attachment", ...state["clipbus.item.attachment"] },
  { name: "clipbus.theme", ...state["clipbus.theme"] },
]);
</script>

<style scoped>
.topic-monitor {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  background: var(--clipbus-surface, #ffffff);
  border: 1px solid var(--clipbus-border, rgba(148, 163, 184, 0.3));
}

.topic-monitor__title {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.topic-monitor__item {
  border: 1px solid var(--clipbus-border, rgba(226, 232, 240, 0.9));
  border-radius: 8px;
  overflow: hidden;
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
}

.topic-monitor__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.topic-monitor__summary::-webkit-details-marker {
  display: none;
}

.topic-monitor__name {
  font-size: 11px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-weight: 700;
  color: var(--clipbus-text-primary, #0f172a);
  flex: 1;
}

.topic-monitor__updated {
  font-size: 10px;
  color: var(--clipbus-text-tertiary, #64748b);
  white-space: nowrap;
}

.topic-monitor__body {
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
