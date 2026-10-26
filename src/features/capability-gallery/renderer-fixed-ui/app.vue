<template>
  <main class="fixed-shell">
    <header class="fixed-shell__header">
      <p class="fixed-shell__eyebrow">Gallery · fixed 240 · {{ attachment.payload.inputKind }} item</p>
      <h1 class="fixed-shell__title">{{ attachment.card?.title ?? "Startup snapshot" }}</h1>
    </header>
    <section class="fixed-shell__panel">
      <p class="fixed-shell__section-label">ctx.renderer.context(contract).attachment</p>
      <pre class="fixed-shell__snapshot">{{ formatJSON(attachment.payload) }}</pre>
    </section>
    <section class="fixed-shell__panel">
      <p class="fixed-shell__section-label">env.theme · {{ env.theme.scheme }} · {{ env.locale }} (env.onChange)</p>
      <div class="fixed-shell__tokens">
        <span
          v-for="token in tokens"
          :key="token.name"
          class="fixed-shell__token"
          :title="`${token.name}: ${token.value}`"
          :style="{ backgroundColor: token.value }"
        />
      </div>
    </section>
    <p class="fixed-shell__footer">
      renderer.onButton: <strong>{{ lastButton || "press Ping" }}</strong>
    </p>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ctx } from "@clipbus/plugin-sdk/view";
import { stopOnUnmount, useCard } from "../../../shared/composables/useCard";
import { formatJSON } from "../../../shared/display";
import { galleryCards } from "../contracts";

const { attachment, env } = useCard(galleryCards.fixed);

const tokens = computed(() =>
  Object.entries(env.value.theme.tokens).map(([name, value]) => ({ name, value })),
);

// The listener form receives every Host-drawn button press with its id.
const lastButton = ref("");
stopOnUnmount(ctx.renderer.onButton((event) => {
  lastButton.value = `${event.id} @ ${new Date().toLocaleTimeString()}`;
}));
</script>

<style scoped>
.fixed-shell {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  color: var(--clipbus-text-primary, #0f172a);
  font-size: 11px;
}

.fixed-shell__header {
  display: grid;
  gap: 2px;
}

.fixed-shell__eyebrow {
  margin: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.fixed-shell__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--clipbus-text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fixed-shell__panel {
  display: grid;
  gap: 4px;
  padding: 4px 6px;
  border: 1px solid var(--clipbus-border, rgba(226, 232, 240, 0.9));
  border-radius: 6px;
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
  overflow: hidden;
}

.fixed-shell__section-label {
  margin: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.fixed-shell__snapshot {
  margin: 0;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 9.5px;
  line-height: 1.3;
  color: var(--clipbus-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 60px;
  overflow: auto;
}

.fixed-shell__tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.fixed-shell__token {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--clipbus-divider, rgba(148, 163, 184, 0.4));
}

.fixed-shell__footer {
  margin: auto 0 0;
  font-size: 10px;
  color: var(--clipbus-text-tertiary, #64748b);
}
</style>
