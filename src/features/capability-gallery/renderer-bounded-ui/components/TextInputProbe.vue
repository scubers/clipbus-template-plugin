<template>
  <section class="text-input-probe">
    <p class="text-input-probe__title">Text input</p>
    <label class="text-input-probe__label" for="probe-input">
      reportInputState() from <code>@clipbus/plugin-sdk/dom</code> (installed in main.ts) tells the Host when a
      text field has focus or an input method is composing, so Host shortcuts give way while you type.
    </label>
    <input
      id="probe-input"
      v-model="inputValue"
      class="text-input-probe__input"
      type="text"
      placeholder="Type here; the badges show what the helper reports"
      @focus="focused = true"
      @blur="onBlur"
      @compositionstart="composing = true"
      @compositionend="composing = false"
    />
    <div class="text-input-probe__status">
      <span
        class="text-input-probe__badge"
        :class="focused ? 'text-input-probe__badge--focused' : 'text-input-probe__badge--blurred'"
      >{{ focused ? "focused" : "blurred" }}</span>
      <span v-if="composing" class="text-input-probe__badge text-input-probe__badge--composing">composing</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";

const inputValue = ref("");
const focused = ref(false);
const composing = ref(false);

function onBlur(): void {
  focused.value = false;
  composing.value = false;
}
</script>

<style scoped>
.text-input-probe {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: var(--clipbus-surface, #ffffff);
  border: 1px solid var(--clipbus-border, rgba(148, 163, 184, 0.3));
}

.text-input-probe__title {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.text-input-probe__label {
  font-size: 11px;
  color: var(--clipbus-text-secondary, #475569);
  line-height: 1.4;
}

.text-input-probe__label code {
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
}

.text-input-probe__input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--clipbus-border, rgba(148, 163, 184, 0.3));
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.88));
  padding: 8px 10px;
  font-size: 12px;
  color: var(--clipbus-text-primary, #0f172a);
  outline: none;
}

.text-input-probe__input:focus {
  border-color: var(--clipbus-accent, #0f172a);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.text-input-probe__status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.text-input-probe__badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.text-input-probe__badge--focused {
  background: rgba(37, 99, 235, 0.12);
  color: var(--clipbus-accent, #2563EB);
  border: 1px solid rgba(37, 99, 235, 0.3);
}

.text-input-probe__badge--blurred {
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
  color: var(--clipbus-text-tertiary, #64748b);
  border: 1px solid var(--clipbus-border, rgba(226, 232, 240, 0.9));
}

.text-input-probe__badge--composing {
  background: rgba(234, 179, 8, 0.12);
  color: #92400e;
  border: 1px solid rgba(234, 179, 8, 0.3);
}
</style>
