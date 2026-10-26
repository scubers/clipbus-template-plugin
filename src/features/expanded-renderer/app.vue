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

const content = ref<HTMLElement | null>(null);
let stopAutoFit: (() => void) | null = null;

onMounted(() => {
  if (content.value !== null) {
    stopAutoFit = autoFit({ target: content.value });
  }
});

onUnmounted(() => {
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
