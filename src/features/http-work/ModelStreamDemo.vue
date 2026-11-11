<template>
  <section class="http-form model-demo">
    <h2>OpenAI-compatible SSE test</h2>
    <p v-if="!origin">Configure the model service origin in the plugin's network settings first.</p>
    <p v-else>Approved origin: {{ origin }}</p>
    <form class="http-form" @submit.prevent="run">
      <label>
        API URL (full Chat Completions endpoint)
        <input v-model="url" type="url" :disabled="running" required placeholder="https://api.openai.com/v1/chat/completions" spellcheck="false">
      </label>
      <div class="http-form__request">
        <label class="http-form__path">
          API key (optional for local services)
          <input v-model="apiKey" type="password" :disabled="running" autocomplete="off" spellcheck="false">
        </label>
        <label class="http-form__path">
          Model
          <input v-model="model" :disabled="running" required placeholder="your-model" spellcheck="false">
        </label>
      </div>
      <label>
        Prompt
        <textarea v-model="prompt" :disabled="running" required rows="3" placeholder="Say hello in one sentence." />
      </label>
      <div class="http-form__request">
        <button type="submit" :disabled="running || !origin">{{ running ? "Streaming…" : "SSE test" }}</button>
        <button type="button" :disabled="!running || status === 'Cancelling…'" @click="cancel">Cancel SSE</button>
      </div>
    </form>
    <p role="status">{{ status }}</p>
    <p v-if="error" class="model-demo__error" role="alert">{{ error }}</p>
    <pre v-if="output" aria-label="Model response">{{ output }}</pre>
    <p>Fields and results are not saved. Closing this card cancels this request.</p>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import { ctx } from "@clipbus/plugin-sdk/view";
import { MODEL_PERMISSION, streamModel } from "./model";
import "./form.css";

const origin = ctx.plugin.network(MODEL_PERMISSION);
const url = ref(origin ? new URL("/v1/chat/completions", origin).href : "");
const apiKey = ref("");
const model = ref("");
const prompt = ref("");
const output = ref("");
const error = ref<string | null>(null);
const status = ref("Ready");
const running = ref(false);
let controller: AbortController | undefined;

async function run(): Promise<void> {
  if (running.value) return;
  output.value = "";
  error.value = null;
  if (!origin) { error.value = "Configure the model service origin in plugin network settings."; return; }
  const request = new AbortController();
  controller = request;
  running.value = true;
  status.value = "Connecting…";
  try {
    await streamModel(ctx.http, {
      origin, url: url.value, apiKey: apiKey.value, model: model.value, prompt: prompt.value, signal: request.signal,
    }, text => { output.value += text; status.value = "Streaming…"; });
    status.value = "Completed";
  } catch (failure) {
    status.value = request.signal.aborted ? "Cancelled" : "Failed";
    if (!request.signal.aborted) error.value = failure instanceof Error ? failure.message : "Model request failed.";
  } finally {
    running.value = false;
    controller = undefined;
  }
}

function cancel(): void {
  if (!controller) return;
  status.value = "Cancelling…";
  controller.abort();
}

onUnmounted(() => { controller?.abort(); apiKey.value = ""; });
</script>

<style scoped>
.model-demo h2,
.model-demo p {
  margin: 0;
  font-size: inherit;
}

.model-demo__error {
  color: var(--clipbus-danger, #dc2626);
}

.model-demo pre {
  margin: 0;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: inherit;
  color: var(--clipbus-text-primary, #0f172a);
}
</style>
