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
import { ref, computed } from "vue";
import { Source } from "#shared/types/source.ts";
import { PollingFormat } from "#shared/types/polling.ts";

/** The alert's source IS the only type discriminator — `triggerType` here
 *
 *
 * receives `form.input` (a Source value) from the wizard. No separate
 * `source` prop: it would be the same string.
 * */

const props = defineProps<{
  triggerType: string;
  modelValue: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: Record<string, any>): void;
}>();

const p = computed(() => props.modelValue ?? {});

function set(key: string, value: any) {
  emit("update:modelValue", { ...p.value, [key]: value });
}

const isPolling = computed(() => props.triggerType === Source.Polling);

const FORMATS = Object.values(PollingFormat);
const formatOptions = computed(() =>
    FORMATS.map((f) => ({ value: f, label: f.toUpperCase() })),
);
const selectedFormat = computed(
    () => (p.value.format as PollingFormat) ?? PollingFormat.XML,
);

// Local UI state for the schedule mode pill. ScheduleEditor seeds itself
// from the incoming cron on mount (emits `update:mode` if the cron is
// 'custom' and we need to flip to advanced); we just have to hold the ref.
const scheduleMode = ref<"basic" | "advanced">("basic");
</script>

<template>
  <div v-if="isPolling" class="wcard">
    <div class="wcard-head">
      {{ $t("wizard.fieldLabels.pollingConfiguration") }}
    </div>
    <!-- URL -->

    <div class="wcard-body">
      <div class="wcard-row">
        <label class="wcard-label"
        >{{ $t("alertParamsEditor.url.label") }}
          <span class="field-required">*</span></label
        >
        <input
            type="url"
            :value="p.url ?? ''"
            :placeholder="$t('alertParamsEditor.url.placeholder')"
            class="field-input"
            @input="set('url', ($event.target as HTMLInputElement).value)"
        >
        <span class="field-hint">{{ $t("alertParamsEditor.url.hint") }}</span>
      </div>

      <!-- Format -->
      <div class="wcard-row">
        <label class="wcard-label"
        >{{ $t("alertParamsEditor.format.label") }}
          <span class="field-required">*</span></label
        >
        <Select
            :model-value="selectedFormat"
            :options="formatOptions"
            size="md"
            @update:model-value="set('format', $event)"
        />
        <span class="field-hint">{{
            $t("alertParamsEditor.format.hint")
          }}</span>
      </div>

      <!-- Schedule. Field-head puts the label on the left and the
         Basic/Advanced pill on the right — visually anchored to the same
         row so the toggle reads as "controls how this field is edited". -->
      <div class="wcard-row">
        <label class="wcard-label">
          {{ $t("alertParamsEditor.interval.label") }}
          <span class="field-required">*</span>
          <ScheduleModeToggle v-model="scheduleMode"/>
        </label>
        <ScheduleEditor
            :model-value="p.schedule ?? ''"
            :mode="scheduleMode"
            @update:model-value="set('schedule', $event)"
            @update:mode="scheduleMode = $event"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Card chrome from the shared .wcard class; local rules just handle
 * the inner layout since this card has no wcard-head. */
.params-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-6);
}
</style>
