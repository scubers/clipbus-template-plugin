<template>
  <div class="sound-controls">
    <label class="sound-format">
      <span>Format</span>
      <select v-model="format">
        <option v-for="choice in SOUND_FORMATS" :key="choice" :value="choice">{{ choice.toUpperCase() }}</option>
      </select>
    </label>
    <label class="sound-volume">
      <span>Volume</span>
      <input v-model.number="volume" aria-label="Sound volume" type="range" min="0" :max="PLUGIN_SOUND_LIMITS.fullVolume" step="1">
      <output>{{ volume }}%</output>
    </label>
  </div>
</template>

<script setup lang="ts">
import { PLUGIN_SOUND_LIMITS } from "@clipbus/plugin-sdk";
import { SOUND_FORMATS, type SoundFormat } from "./sound";

const volume = defineModel<number>("volume", { required: true });
const format = defineModel<SoundFormat>("format", { required: true });
</script>

<style scoped>
.sound-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  color: var(--clipbus-text-secondary, #475569);
  font-size: 11px;
}

.sound-format,
.sound-volume {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sound-format select {
  color: var(--clipbus-text-primary, #0f172a);
  background: var(--clipbus-surface, #ffffff);
  border: 1px solid var(--clipbus-border, #cbd5e1);
  border-radius: 5px;
  padding: 2px 4px;
  font: inherit;
}

.sound-volume {
  flex: 1;
  min-width: 160px;
}

.sound-volume input {
  flex: 1;
  min-width: 60px;
  margin: 0;
  accent-color: var(--clipbus-accent, #0f766e);
}

.sound-volume input:focus-visible,
.sound-format select:focus-visible {
  outline: 2px solid var(--clipbus-accent, #0f766e);
  outline-offset: 3px;
}

.sound-volume output {
  min-width: 4ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
