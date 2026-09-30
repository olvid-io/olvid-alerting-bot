<!--
  - Olvid Alerting
  - Copyright © 2026 Olvid SAS
  -
  - Olvid Alerting is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License, version 3,
  - as published by the Free Software Foundation.
  -
  - Olvid Alerting is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with Olvid Alerting. If not, see <https://www.gnu.org/licenses/>.
  -->

<script setup lang="ts">
import { computed, ref } from "vue";
import { Source } from "#shared/types/source.ts";
import type { AlertParams } from "#shared/types/alert.ts";
import { BundleOutputType } from "#shared/types/bundle.ts";
import type { WebhookTemplateId } from "#shared/payloadTemplates";


/**
 * Smart container for the Handlebars script editor. Composes:
 *     - 5 composables for state / IO:
 *         useFormatEditorPayload   webhook side (jsonPayload, loaders, …)
 *         useFormatEditorPolling   polling side (parsedTree, retrieve, …)
 *         useFormatEditorMonitoring monitoring side (probe, retrieve, …)
 *         useFormatEditorPreview   derived render of the chat bubble
 *         useCursorInsert          textarea cursor helper (click-to-insert)
 *     - 4 dumb panels:
 *         ScriptPanel              Handlebars textarea + watched-paths chips
 *         PayloadPanel             XML tree / JSON tree / JSON textarea (mode-branched)
 *         PreviewPanel             rendered chat bubble / mail card
 *         LoadTemplate             teleported Load Template dropdown
 */

const props = withDefaults(
    defineProps<{
      open?: boolean;
      initialScript?: string;
      inputSource?: Source;
      alertParams?: AlertParams | null;
      alertId?: number | null;
      previewMode?: BundleOutputType;
      mailFrom?: string;
      mailSubject?: string;
    }>(),
    {
      open: false,
      initialScript: "",
      inputSource: Source.Webhook,
      alertParams: null,
      alertId: null,
      previewMode: BundleOutputType.Olvid,
      mailFrom: "",
      mailSubject: "",
    },
);

const emit = defineEmits(["save", "close"]);

const isPolling = computed(() => props.inputSource === Source.Polling);
const isMonitoring = computed(() => props.inputSource === Source.Monitoring);

const { t } = useI18n();
const formatHint = computed(() => {
  if (isPolling.value) return t("formatEditor.intro.polling");
  else if (isMonitoring.value) return t("formatEditor.intro.monitoring");
  else return t("formatEditor.intro.webhook");
});

// Seed from `initialScript` so re-opening the editor on a saved bundle shows
// the persisted Handlebars template. The editor is mounted fresh on every
// open (parent uses `v-if`), so reading the prop once at construction time
// is the right place — no watcher needed.
const scriptContent = ref(props.initialScript ?? "");

// ── Composables ────────────────────────────────────────────────────────────
// One state composable per source (polling / monitoring / webhook). Only
// the one matching the active source is used by PayloadPanel; the others
// idle. Cheap enough to instantiate all three unconditionally.
const payload = useFormatEditorPayload(() => props.alertId);
const polling = useFormatEditorPolling(() => props.alertParams);
const monitoring = useFormatEditorMonitoring(() => props.alertParams);
const preview = useFormatEditorPreview({
  scriptContent,
  isPolling,
  isMonitoring,
  parsedTree: polling.parsedTree,
  monitorProbe: monitoring.probe,
  jsonPayload: payload.jsonPayload,
});

// ScriptPanel exposes `textareaRef` via defineExpose so the cursor helper
// can target the real DOM element. The getter resolves it lazily, so it
// stays correct even if the panell re-mounts.
const scriptPanelRef = ref<{ textareaRef: HTMLTextAreaElement | null } | null>(
    null,
);
const cursor = useCursorInsert(
    () => scriptPanelRef.value?.textareaRef ?? null,
    () => scriptContent.value,
    (v) => {
      scriptContent.value = v;
    },
);

// ── Local UI state ─────────────────────────────────────────────────────────
const pickerMode = ref(false);
const loadOpen = ref(false);

const onSelectTemplate = (id: string) => {
  payload.loadLibraryPayload(id as WebhookTemplateId);
  loadOpen.value = false;
};
const onSelectLast = (type: "success" | "failed") => {
  payload.loadLastPayload(type);
  loadOpen.value = false;
};

const onSave = () => emit("save", scriptContent.value);
const onClose = () => emit("close");
</script>

<template>
  <Modal
      :open="open"
      size="editor"
      :close-on-backdrop="false"
      :aria-label="$t('formatEditor.title')"
      @close="onClose"
  >
    <ModalHead
        variant="filled"
        :title="$t('formatEditor.title')"
        :close-label="$t('formatEditor.buttons.closeTitle')"
        @close="onClose"
    >
      <div class="modal-head-actions">
        <HelpTooltip :message="formatHint"/>
      </div>


    </ModalHead>

    <div class="editor-body">
      <div class="code-column">

        <ScriptPanel
            ref="scriptPanelRef"
            v-model="scriptContent"
            :is-polling="isPolling"
            :watched-paths="polling.watchedPaths.value"
            :mode="previewMode"
            @select-path="cursor.onPathSelect"
        />

        <PayloadPanel
            :is-polling="isPolling"
            :is-monitoring="isMonitoring"
            :picker-mode="pickerMode"
            :format="isPolling ? (alertParams as PollingParams)!.format : PollingFormat.JSON"
            :polling-loading="polling.pollingLoading.value"
            :polling-error="polling.pollingError.value"
            :root-entries="polling.rootEntries.value"
            :monitor-loading="monitoring.monitorLoading.value"
            :monitor-error="monitoring.monitorError.value"
            :monitor-probe="monitoring.probe.value"
            :monitor-root-entries="monitoring.rootEntries.value"
            :json-payload="payload.jsonPayload.value"
            :json-root-entries="payload.jsonRootEntries.value"
            :last-payload-loading="payload.lastPayloadLoading.value"
            :last-payload-missing="payload.lastPayloadMissing.value"
            :load-open="loadOpen"
            @update:json-payload="payload.jsonPayload.value = $event"
            @select-path="cursor.onPathSelect"
            @retrieve="polling.retrievePolling"
            @retrieve-monitor="monitoring.retrieveMonitor"
            @toggle-load="loadOpen = !loadOpen"
            @toggle-picker="pickerMode = !pickerMode"
            @prettify="payload.formatJson"
            @clear="payload.clearPayloadPanel"
        />
      </div>

      <PreviewPanel
          :data="preview.previewData.value"
          :mode="previewMode"
          :mail-from="mailFrom"
          :mail-subject="mailSubject"
      />
    </div>

    <div class="editor-footer">
      <button type="button" class="btn btn-ghost" @click="onClose">
        {{ $t("formatEditor.buttons.cancel") }}
      </button>
      <button type="button" class="btn btn-primary" @click="onSave">
        {{ $t("formatEditor.buttons.save") }}
      </button>
    </div>

  </Modal>

  <LoadTemplate
      :open="loadOpen"
      @select-last="onSelectLast"
      @select-template="onSelectTemplate"
      @close="loadOpen = false"
  />
</template>

<style scoped>
/* All chrome (overlay, focus trap, teleport, size caps) is owned by
 * <Modal size="editor"> — this file only styles the panell layout inside
 * it. Three horizontal bands: the filled ModalHead at the top, the
 * two-column editor body in the middle, the button footer at the
 * bottom. Each band uses a slightly different surface token so the
 * eye reads the structure without needing heavy borders. */

.editor-body {
  display: grid;
  grid-template-columns: 2fr 1fr;
  background: var(--color-bg-panel);
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  border-top: 1px solid var(--color-border-subtle);
}

/* Left column — script + payload panels stacked vertically. Padding
 * matches the modal's outer rhythm (--space-7) so the panels sit
 * within a comfortable "IDE margin". Internal scroll so long payloads
 * never push the footer off-screen. */
.code-column {
  padding: var(--space-7);
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid var(--color-border-subtle);
  min-width: 0; /* let the grid column shrink so children can wrap */
}

/* Footer — mirrors the header's filled treatment so the frame looks
 * intentional (band-body-band), and gives the primary/secondary
 * buttons enough room to breathe. flex-shrink:0 keeps it visible even
 * when the body scrolls to its bounds. */
.editor-footer {
  padding: var(--space-4) var(--space-7);
  background: var(--color-bg-card-soft);
  border-top: 1px solid var(--color-border-subtle);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}
</style>
