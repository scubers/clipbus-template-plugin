<template>
  <main class="shell expanded-shell">
    <!-- autoFit() measures this content-sized wrapper, so the card follows both growth and shrink. -->
    <div ref="content">
      <section v-if="payload" class="expanded-panel">
        <!-- The accent strip reads the theme token in script (env.changed keeps it live);
             plain CSS would use var(--clipbus-accent), which the Host sets on :root. -->
        <div class="expanded-panel__accent" :style="{ backgroundColor: env.theme.tokens.accent }" aria-hidden="true" />

        <header class="expanded-panel__header">
          <p class="expanded-panel__eyebrow">Expanded Preview</p>
          <h1 class="expanded-panel__title">{{ payload.display.headline }}</h1>
          <p class="expanded-panel__subtitle">{{ payload.display.subheadline }}</p>
        </header>

        <dl class="expanded-panel__facts">
          <div v-for="fact in payload.display.facts" :key="fact.label" class="expanded-panel__fact">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>

        <section v-if="payload.excerpt" class="expanded-panel__extended">
          <p class="expanded-panel__section-label">Excerpt</p>
          <p class="expanded-panel__excerpt">{{ payload.excerpt }}</p>
        </section>

        <section class="expanded-panel__extended">
          <p class="expanded-panel__section-label">Item (live)</p>
          <div class="expanded-panel__meta-row">
            <span class="expanded-panel__meta-key">Source</span>
            <span class="expanded-panel__meta-value">{{ item.sourceApp ?? "Unknown" }}</span>
            <span class="expanded-panel__meta-key">Pinned</span>
            <span class="expanded-panel__meta-value">{{ item.pinned ? "yes" : "no" }}</span>
          </div>
          <div v-if="item.tags.length" class="expanded-panel__chips">
            <span v-for="tag in item.tags" :key="tag" class="expanded-panel__chip">{{ tag }}</span>
          </div>
        </section>

        <section v-if="analyzing || analysis || analysisError" class="expanded-panel__extended">
          <p class="expanded-panel__section-label">Analysis (plugin runtime)</p>
          <p v-if="analyzing" class="expanded-panel__hint">Analyzing…</p>
          <p v-else-if="analysisError" class="expanded-panel__error">{{ analysisError }}</p>
          <dl v-else-if="analysis" class="expanded-panel__facts">
            <div v-for="fact in analysisFacts" :key="fact.label" class="expanded-panel__fact">
              <dt>{{ fact.label }}</dt>
              <dd>{{ fact.value }}</dd>
            </div>
          </dl>
        </section>

        <section v-if="backgroundSupported || backgroundError" class="expanded-panel__extended">
          <p class="expanded-panel__section-label">Background digest</p>
          <p class="expanded-panel__hint">
            {{ backgroundStatus }}
            <span v-if="backgroundTask?.outcome"> · {{ backgroundTask.outcome.reason }}</span>
          </p>
          <p v-if="backgroundError" class="expanded-panel__error">{{ backgroundError }}</p>
          <p v-if="item.kind !== 'text'" class="expanded-panel__hint">Select a text item to run this local digest example.</p>
          <p v-if="payload.localDigest" class="expanded-panel__hint">
            {{ payload.localDigest.rounds }} rounds · {{ payload.localDigest.sha256 }}
          </p>
          <p class="expanded-panel__hint">Closing the card leaves accepted work running. Reopen to query it.</p>
        </section>

        <section v-if="httpSupported" class="expanded-panel__extended">
          <p class="expanded-panel__section-label">HTTP examples</p>
          <p class="expanded-panel__hint">Origin: {{ httpOrigin ?? "Configure the HTTP demo origin in plugin network settings." }}</p>
          <form class="http-form" @submit.prevent="runHttpJson">
            <div class="http-form__request">
              <label>
                Method
                <select v-model="httpMethod" :disabled="requestingJson">
                  <option v-for="method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']" :key="method">{{ method }}</option>
                </select>
              </label>
              <label class="http-form__path">
                Path (including query)
                <input v-model="httpPath" :disabled="requestingJson" placeholder="/todos/1" spellcheck="false">
              </label>
            </div>
            <label v-if="httpMethod !== 'GET'">
              JSON body (optional)
              <textarea v-model="httpBody" :disabled="requestingJson" rows="3" placeholder='{"title":"demo"}' spellcheck="false" />
            </label>
            <button type="submit" :disabled="requestingJson || !httpOrigin">{{ requestingJson ? "Requesting…" : "Request JSON" }}</button>
          </form>
          <p v-if="httpStatus" class="expanded-panel__hint">HTTP {{ httpStatus }}</p>
          <pre v-if="httpReply" class="expanded-panel__debug-body">{{ httpReply }}</pre>
          <p v-if="payload.httpResult" class="expanded-panel__hint">
            {{ payload.httpResult.events }} SSE events · {{ payload.httpResult.lastEvent }}
          </p>
          <p v-if="httpError" class="expanded-panel__error">{{ httpError }}</p>
        </section>

        <ModelStreamDemo v-if="httpSupported" />

        <section v-if="showDebug" class="expanded-panel__debug">
          <p class="expanded-panel__section-label">Debug payload</p>
          <pre class="expanded-panel__debug-body">{{ debugBlock }}</pre>
        </section>

        <p class="expanded-panel__hint">
          Analyze asks the plugin runtime through a typed message. The card height follows the
          content through autoFit(); the Host keeps it inside the manifest range (120–480).
        </p>
      </section>

      <div v-else class="empty-state">
        <p class="empty-state__title">No expanded payload</p>
        <p class="empty-state__body">This attachment does not carry a template expanded payload.</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { autoFit } from "@clipbus/plugin-sdk/dom";
import { ctx } from "@clipbus/plugin-sdk/view";
import type { PluginTaskSnapshot } from "@clipbus/plugin-sdk";
import { BACKGROUND_ROUNDS, LOCAL_DIGEST_TASK } from "../background-work/contracts";
import { requestJsonDemo } from "../http-work/json";
import ModelStreamDemo from "../http-work/ModelStreamDemo.vue";
import { useCard, useCardButton } from "../../shared/composables/useCard";
import { formatByteCount, formatJSON, type DisplayFact } from "../../shared/display";
import { analyzeItem, type ItemAnalysis } from "./messages";
import { expandedAttachment, isExpandedPayload } from "./payload";

const { item, attachment, env } = useCard(expandedAttachment);

const payload = computed(() => (isExpandedPayload(attachment.value.payload) ? attachment.value.payload : null));

const showDebug = ref(false);
const analyzing = ref(false);
const analysis = ref<ItemAnalysis | null>(null);
const analysisError = ref<string | null>(null);

const analysisFacts = computed<DisplayFact[]>(() => {
  const result = analysis.value;
  if (result === null) {
    return [];
  }
  if (result.contentKind === "image") {
    return [
      { label: "File", value: result.fileBytes === undefined ? "not available" : formatByteCount(result.fileBytes) },
      { label: "SHA-256", value: result.sha256 ? `${result.sha256.slice(0, 16)}…` : "not available" },
    ];
  }
  return [
    { label: "Words", value: String(result.words ?? 0) },
    { label: "Lines", value: String(result.lines ?? 0) },
    { label: "Top", value: (result.topWords ?? []).map((entry) => `${entry.word} ×${entry.count}`).join(", ") || "—" },
  ];
});

const debugBlock = computed(() => formatJSON({ attachment: attachment.value, analysis: analysis.value }));

async function runAnalysis(): Promise<void> {
  analyzing.value = true;
  analysisError.value = null;
  try {
    analysis.value = await analyzeItem.call();
  } catch (error) {
    // A Host error carries a contract name (PluginTimeout, …); an error the
    // handler threw keeps its own name.
    analysisError.value = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } finally {
    analyzing.value = false;
  }
}

// Manifest buttons; the Host draws them and sends renderer.button.
useCardButton("analyze", runAnalysis);
useCardButton("toggle-debug", () => {
  showDebug.value = !showDebug.value;
});

const backgroundSupported = ctx.capabilities.has("tasks.enqueue");
const httpSupported = ctx.capabilities.has("http.start");
const httpOrigin = ctx.plugin.network("http-demo");
const httpMethod = ref("GET");
const httpPath = ref("/todos/1");
const httpBody = ref("");
const httpReply = ref("");
const httpError = ref<string | null>(null);
const httpStatus = ref<number | null>(null);
const requestingJson = ref(false);
async function runHttpJson(): Promise<void> {
  if (requestingJson.value) return;
  httpError.value = null;
  httpReply.value = "";
  httpStatus.value = null;
  if (!httpSupported || !httpOrigin) {
    httpError.value = "Configure the HTTP demo origin in plugin network settings.";
    return;
  }
  requestingJson.value = true;
  try {
    const response = await requestJsonDemo(ctx.http, {
      origin: httpOrigin, path: httpPath.value, method: httpMethod.value, body: httpBody.value,
    });
    httpStatus.value = response.status;
    httpReply.value = response.body;
    if (response.status >= 300) httpError.value = `Request returned HTTP ${response.status}.`;
  } catch (error) { httpError.value = error instanceof Error ? error.message : String(error); }
  finally { requestingJson.value = false; }
}
useCardButton("http-json", runHttpJson);
useCardButton("http-stream", async () => {
  httpError.value = null;
  try {
    if (!httpSupported || !backgroundSupported || item.value.kind !== "text") throw new Error("Select a text item on a Host with HTTP and task support.");
    const accepted = await ctx.tasks.enqueue({ id: "http-stream", policy: "replace" });
    httpReply.value = "SSE task accepted: " + accepted.taskId + ". Close the panel; reopen the result after completion.";
  } catch (error) { httpError.value = error instanceof Error ? error.message : String(error); }
});
const backgroundTask = ref<PluginTaskSnapshot | null>(null);
const backgroundError = ref<string | null>(null);
const backgroundAction = ref<"start" | "cancel" | null>(null);
const backgroundStatus = computed(() => {
  if (backgroundAction.value === "start") return "Submitting task…";
  if (backgroundAction.value === "cancel") return "Cancelling task…";
  return backgroundTask.value?.state ?? "No current task";
});
let mounted = false;
let refreshingTask = false;
let refreshRequested = false;
let taskTimer: ReturnType<typeof setTimeout> | undefined;

async function refreshBackground(): Promise<void> {
  refreshRequested = true;
  clearTimeout(taskTimer);
  if (refreshingTask || !mounted) return;
  refreshingTask = true;
  try {
    do {
      refreshRequested = false;
      const snapshot = await ctx.tasks.get({ id: LOCAL_DIGEST_TASK });
      if (mounted) backgroundTask.value = snapshot;
    } while (mounted && refreshRequested);
  } catch (error) {
    if (mounted) backgroundError.value = error instanceof Error ? error.message : String(error);
  } finally {
    refreshingTask = false;
    if (mounted && backgroundTask.value && ["queued", "running", "stopping"].includes(backgroundTask.value.state)) {
      taskTimer = setTimeout(() => { void refreshBackground(); }, 1000);
    }
  }
}

useCardButton("start-background", async () => {
  if (backgroundAction.value !== null) return;
  backgroundError.value = null;
  backgroundAction.value = "start";
  try {
    if (!backgroundSupported) throw new Error("This Host does not support background tasks.");
    if (item.value.kind !== "text") throw new Error("Select a text item to start the local digest task.");
    await ctx.tasks.enqueue({ id: LOCAL_DIGEST_TASK, data: { rounds: BACKGROUND_ROUNDS }, policy: "replace" });
    await refreshBackground();
  } catch (error) {
    backgroundError.value = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } finally {
    backgroundAction.value = null;
  }
});
useCardButton("cancel-background", async () => {
  if (backgroundAction.value !== null) return;
  backgroundError.value = null;
  const current = backgroundTask.value;
  if (!current || !["queued", "running", "stopping"].includes(current.state)) {
    backgroundError.value = "There is no active task to cancel.";
    return;
  }
  backgroundAction.value = "cancel";
  try {
    await ctx.tasks.cancel({ taskId: current.taskId });
    await refreshBackground();
  } catch (error) {
    backgroundError.value = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } finally {
    backgroundAction.value = null;
  }
});

useCardButton("notify-demo", async () => {
  backgroundError.value = null;
  if (!ctx.capabilities.has("system.notify")) {
    backgroundError.value = "This Host does not support system notifications.";
    return;
  }
  try {
    await ctx.system.notify({
      title: "Template notification",
      body: "This is a plain-text notification from the template plugin.",
    });
  } catch (error) {
    backgroundError.value = error instanceof Error ? error.message : String(error);
  }
});

const content = ref<HTMLElement | null>(null);
let stopAutoFit: (() => void) | null = null;

onMounted(() => {
  mounted = true;
  if (backgroundSupported && item.value.kind === "text") void refreshBackground();
  if (content.value !== null) {
    stopAutoFit = autoFit({ target: content.value });
  }
});

onUnmounted(() => {
  mounted = false;
  clearTimeout(taskTimer);
  stopAutoFit?.();
  stopAutoFit = null;
});
</script>

<style scoped>
.expanded-shell {
  height: 100%;
  overflow-y: auto;
  background: none;
}

.expanded-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding-left: 22px;
}

.expanded-panel__accent {
  position: absolute;
  top: 0;
  left: 6px;
  bottom: 0;
  width: 4px;
  border-radius: 999px;
}

.expanded-panel__header {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.expanded-panel__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.expanded-panel__title {
  margin: 0;
  font-size: 17px;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--clipbus-text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expanded-panel__subtitle {
  margin: 0;
  color: var(--clipbus-text-secondary, #475569);
  font-size: 12px;
  line-height: 1.4;
}

.expanded-panel__facts {
  display: grid;
  gap: 6px;
  margin: 0;
}

.expanded-panel__fact {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: baseline;
  gap: 8px;
  margin: 0;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
  border: 1px solid var(--clipbus-border, rgba(226, 232, 240, 0.9));
}

.expanded-panel__fact dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.expanded-panel__fact dd {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--clipbus-text-primary, #0f172a);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expanded-panel__extended {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--clipbus-surface-elevated, rgba(248, 250, 252, 0.78));
  border: 1px solid var(--clipbus-border, rgba(226, 232, 240, 0.9));
}

.expanded-panel__section-label {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--clipbus-text-tertiary, #64748b);
}

.expanded-panel__meta-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
}

.expanded-panel__meta-key {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 10px;
  color: var(--clipbus-text-tertiary, #64748b);
}

.expanded-panel__meta-value {
  color: var(--clipbus-text-primary, #0f172a);
  font-weight: 600;
}

.expanded-panel__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.expanded-panel__chip {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--clipbus-accent, #2563EB);
  color: var(--clipbus-accent-contrast, #ffffff);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.expanded-panel__debug {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px dashed var(--clipbus-border, rgba(148, 163, 184, 0.5));
  background: var(--clipbus-surface, transparent);
}

.expanded-panel__debug-body {
  margin: 0;
  font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  line-height: 1.4;
  color: var(--clipbus-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 220px;
  overflow: auto;
}

.expanded-panel__excerpt {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--clipbus-text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-word;
}

.expanded-panel__error {
  margin: 0;
  font-size: 11px;
  color: var(--clipbus-danger, #dc2626);
}

.expanded-panel__hint {
  margin: 0;
  color: var(--clipbus-text-tertiary, #64748b);
  font-size: 11px;
  line-height: 1.4;
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
  color: var(--clipbus-text-secondary, #475569);
  font-size: 13px;
  line-height: 1.45;
}
</style>
