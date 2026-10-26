<template>
  <main class="shell attachment-shell">
    <section v-if="payload" class="preview-panel">
      <header class="preview-panel__header">
        <div class="preview-panel__heading">
          <p class="preview-panel__eyebrow">Attachment Preview</p>
          <h1 class="preview-panel__title">{{ payload.display.headline }}</h1>
        </div>
        <span class="preview-panel__kind">{{ payload.display.typeLabel }}</span>
      </header>

      <p class="preview-panel__summary">{{ payload.display.subheadline }}</p>

      <dl class="preview-panel__facts">
        <div
          v-for="fact in visibleFacts"
          :key="fact.label"
          class="preview-panel__fact"
        >
          <dt>{{ fact.label }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
      </dl>

      <p class="preview-panel__hint">
        {{ tagsHint }} Use the card buttons to copy the payload or the card context.
      </p>
    </section>

    <div v-else class="empty-state">
      <p class="empty-state__title">No preview payload</p>
      <p class="empty-state__body">This attachment does not carry a template preview payload.</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ctx } from "@clipbus/plugin-sdk/view";
import { useCard, useCardButton } from "../../shared/composables/useCard";
import { formatJSON, type DisplayFact } from "../../shared/display";
import { isPreviewPayload, previewAttachment } from "./payload";

// The startup snapshot, kept current by item.changed / env.changed.
const { item, attachment } = useCard(previewAttachment);

const payload = computed(() => (isPreviewPayload(attachment.value.payload) ? attachment.value.payload : null));

const visibleFacts = computed<DisplayFact[]>(() => {
  if (payload.value === null) {
    return [];
  }
  const digest = payload.value.sha256 ? `${payload.value.sha256.slice(0, 16)}…` : "not available";
  return [...payload.value.display.facts.slice(0, 2), { label: "SHA-256", value: digest }];
});

// Tags are live: they come from the item snapshot, not from the payload.
const tagsHint = computed(() => (item.value.tags.length > 0 ? `Tags: ${item.value.tags.join(", ")}.` : "No tags."));

// The buttons come from the manifest renderer (`buttons`); the Host draws them.
useCardButton("copy-payload", () => ctx.system.copyText({ text: formatJSON(attachment.value.payload) }));
useCardButton("copy-context", () =>
  ctx.system.copyText({ text: formatJSON({ item: item.value, attachment: attachment.value }) }),
);
</script>

<style scoped>
.attachment-shell {
  height: 100%;
  /* padding: 14px 16px 12px; */
  background: none;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 10px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.preview-panel__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;
}

.preview-panel__heading {
  flex: 1 1 auto;
  min-width: 0;
}

.preview-panel__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.preview-panel__title {
  margin: 4px 0 0;
  font-size: 17px;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--clipbus-text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-panel__kind {
  flex: 0 0 auto;
  max-width: 96px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-radius: 999px;
  padding: 5px 10px;
  background: var(--clipbus-surface-elevated, rgba(226, 232, 240, 0.88));
  color: var(--clipbus-text-secondary, #334155);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-panel__summary {
  margin: 0;
  color: var(--clipbus-text-secondary, #475569);
  font-size: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
}

.preview-panel__facts {
  display: grid;
  gap: 7px;
  margin: 0;
  min-height: 0;
}

.preview-panel__fact {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
  border: 1px solid var(--clipbus-border, rgba(226, 232, 240, 0.9));
}

.preview-panel__fact dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.preview-panel__fact dd {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--clipbus-text-primary, #0f172a);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-panel__hint {
  margin: 0;
  padding-top: 2px;
  color: var(--clipbus-text-tertiary, #64748b);
  font-size: 11px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.empty-state {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 16px;
  text-align: center;
}

.empty-state__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--clipbus-text-primary, #0f172a);
}

.empty-state__body {
  margin: 8px 0 0;
  color: var(--clipbus-text-tertiary, #64748b);
  font-size: 13px;
  line-height: 1.45;
}
</style>
