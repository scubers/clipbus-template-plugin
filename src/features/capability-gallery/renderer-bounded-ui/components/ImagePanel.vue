<template>
  <section class="image-panel">
    <p class="image-panel__title">Images</p>

    <div class="image-panel__row">
      <p class="image-panel__label">Card item image (<code>ctx.asset.itemImageUrl()</code>)</p>
      <img v-if="isImageItem" :src="itemImageUrl" alt="Card item image" class="image-panel__img" />
      <p v-else class="image-panel__placeholder">Not an image item: the Host answers this URL with 404.</p>
    </div>

    <div class="image-panel__row">
      <button type="button" class="image-panel__btn" @click="drawSwatch">
        <span class="image-panel__btn-label">Draw a swatch in Node</span>
        <code class="image-panel__btn-sig">renderSwatch.call() → ctx.asset.fileUrl(path)</code>
      </button>
      <img v-if="swatchUrl" :src="swatchUrl" alt="Swatch drawn by the plugin runtime" class="image-panel__img" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ctx } from "@clipbus/plugin-sdk/view";
import { renderSwatch } from "../../contracts";
import { describeError, timestamp, type LogEntry } from "../log";

const props = defineProps<{ itemKind: "text" | "image" }>();

const emit = defineEmits<{
  log: [entry: LogEntry];
}>();

// Asset URLs are built locally from the contract convention; the Host serves
// them to this card only.
const isImageItem = computed(() => props.itemKind === "image");
const itemImageUrl = ctx.asset.itemImageUrl();
const swatchUrl = ref<string | null>(null);

// The runtime writes the PNG into the plugin cache and answers with a
// plugin-relative path (cache/...); the page turns that path into a URL.
async function drawSwatch(): Promise<void> {
  const api = "renderSwatch.call({})";
  try {
    const swatch = await renderSwatch.call({});
    swatchUrl.value = ctx.asset.fileUrl(swatch.path);
    emit("log", { ts: timestamp(), api, result: { ...swatch, url: swatchUrl.value } });
  } catch (error) {
    emit("log", { ts: timestamp(), api, error: describeError(error) });
  }
}
</script>

<style scoped>
.image-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: var(--clipbus-surface, #ffffff);
  border: 1px solid var(--clipbus-border, rgba(148, 163, 184, 0.3));
}

.image-panel__title {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.image-panel__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-panel__label {
  margin: 0;
  font-size: 11px;
  color: var(--clipbus-text-secondary, #475569);
  line-height: 1.4;
}

.image-panel__label code {
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  color: var(--clipbus-text-primary, #0f172a);
}

.image-panel__placeholder {
  margin: 0;
  font-size: 11px;
  font-style: italic;
  color: var(--clipbus-text-tertiary, #64748b);
}

.image-panel__img {
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid var(--clipbus-border, rgba(226, 232, 240, 0.9));
  align-self: flex-start;
}

.image-panel__btn {
  appearance: none;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--clipbus-border, rgba(148, 163, 184, 0.3));
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
  color: var(--clipbus-text-primary, #0f172a);
  cursor: pointer;
  text-align: left;
}

.image-panel__btn:focus-visible {
  outline: 2px solid var(--clipbus-accent, #2563EB);
  outline-offset: 2px;
}

.image-panel__btn:active {
  opacity: 0.7;
}

.image-panel__btn-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--clipbus-text-primary, #0f172a);
}

.image-panel__btn-sig {
  font-size: 9px;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  color: var(--clipbus-text-tertiary, #64748b);
}
</style>
