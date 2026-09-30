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
import type { MonitorParams } from "#shared/types/monitor.ts";

/*
  Step 1 params editor for Monitoring alerts. Slimmer than
  TriggerParamsEditor (which handles Polling): only URL + Schedule, no
  format selector — Monitoring never parses a response body.

  The ScheduleEditor + ScheduleModeToggle are reused verbatim from
  input-source/; the cron infrastructure is shared with Polling.
*/

const props = defineProps<{
  modelValue: Partial<MonitorParams>;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: Partial<MonitorParams>): void;
}>();

const p = computed(() => props.modelValue ?? {});

function set<K extends keyof MonitorParams>(key: K, value: MonitorParams[K]) {
  emit("update:modelValue", { ...p.value, [key]: value });
}

// Local UI state for the schedule mode pill. ScheduleEditor emits
// `update:mode` when the incoming cron doesn't fit basic mode.
const scheduleMode = ref<"basic" | "advanced">("basic");
</script>

<template>
  <div class="wcard">
    <div class="wcard-head">
      {{ $t("wizard.fieldLabels.monitorConfiguration") }}
    </div>
    <div class="wcard-body">
      <!-- URL -->
      <div class="wcard-row">
        <label class="wcard-label">
          {{ $t("monitorEditor.url.label") }}
          <span class="field-required">*</span>
        </label>
        <input
            type="url"
            :value="p.url ?? ''"
            :placeholder="$t('monitorEditor.url.placeholder')"
            class="field-input"
            @input="set('url', ($event.target as HTMLInputElement).value)"
        >
        <span class="field-hint">{{ $t("monitorEditor.url.hint") }}</span>
      </div>

      <!-- Schedule — same widget as polling; label + mode toggle on one row. -->
      <div class="wcard-row">
        <label class="wcard-label">
          {{ $t("monitorEditor.interval.label") }}
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
