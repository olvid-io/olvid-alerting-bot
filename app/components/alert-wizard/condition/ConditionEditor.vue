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
import { ref } from "vue";
import { ConditionKind, type PollingCondition } from "#shared/types/condition.ts";

/**
 Orchestrator for the polling condition editor. Pure wiring — no
 business logic in this file. Composables and sub-components each own
 one concern:

 · ConditionKindPicker  → radio between "no condition" and "rule".
 · WatchedFieldsPanel   → chips + inline "type a path" + picker button.
 · SourcePickerModal    → tree picker of the retrieved snapshot.
 · ConditionRuleRow     → aggregation + operator + value.
 · VerdictStrip (ui/)   → compact "would fire?" one-liner.
 · VerdictBreakdown     → per-path breakdown list (sibling of the strip).

 · useConditionForm       → owns the CONDITION model + every mutation.
 · useSourceRetrieve      → fetches + parses the source snapshot.
 · useConditionVerdict    → computes { ok, label, breakdown } for preview.

 */

const props = defineProps<{
  modelValue?: PollingCondition;
  url?: string;
  format?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: PollingCondition): void;
  (e: "update:payload", v: any): void;
}>();

// ── Source retrieval (fetch + parse, auto on mount + url/format change) ──
const { loading, error, parsed, retrieved, rootEntries, retrieve } =
    useSourceRetrieve(
        () => props.url,
        () => props.format,
        (payload) => emit("update:payload", payload),
    );

// ── Condition form (state + mutations) ────────────────────────────────────
const {
  current,
  kind,
  paths,
  operator,
  literal,
  aggregation,
  effectivePaths,
  patchRule,
  setKind,
  addPath,
  removePath,
  toggleTreePath,
} = useConditionForm(
    () => props.modelValue,
    () => parsed.value,
    (next) => emit("update:modelValue", next),
);

// ── Verdict preview (evaluate + summarise) ────────────────────────────────
const { summary } = useConditionVerdict(
    () => current.value,
    () => parsed.value,
    () => retrieved.value,
    () => effectivePaths.value,
);

// ── Picker modal state ────────────────────────────────────────────────────
const isPickerOpen = ref(false);

const { t } = useI18n();
</script>

<template>
  <div class="cond-editor">
    <ConditionKindPicker :model-value="kind" @update:model-value="setKind"/>

    <div v-if="kind === ConditionKind.Rule" class="wcard">
      <div class="wcard-head">
        {{ $t("conditionEditor.panel.title") }}
      </div>
      <div class="wcard-body">
        <WatchedFieldsPanel
            :paths="paths"
            :effective-count="effectivePaths.length"
            :parsed="parsed"
            @add-path="addPath"
            @remove-path="removePath"
            @open-picker="isPickerOpen = true"
        />

        <ConditionRuleRow
            :aggregation="aggregation"
            :operator="operator"
            :value="literal"
            @patch="patchRule"
        />
      </div>
    </div>

    <SourcePickerModal
        :open="isPickerOpen"
        :url="props.url"
        :format="props.format"
        :loading="loading"
        :error="error"
        :retrieved="retrieved"
        :root-entries="rootEntries"
        :effective-paths="effectivePaths"
        @close="isPickerOpen = false"
        @refresh="retrieve"
        @select="toggleTreePath"
    />

    <VerdictStrip :ok="summary.ok" :label="summary.label"/>
    <VerdictBreakdown
        v-if="kind === ConditionKind.Rule && summary.breakdown"
        :verdicts="summary.breakdown"
        :title="t('editor.testModal.perFieldBreakdown')"
    />
  </div>
</template>

<style scoped>
.cond-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Card chrome delegated to the shared .wcard classes. */
/* Per-path breakdown styles now live inside condition/VerdictBreakdown.vue. */
</style>
