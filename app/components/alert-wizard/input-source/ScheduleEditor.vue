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
import { ref, computed, watch, onMounted } from "vue";
import {
  scheduler,
  DEFAULT_SCHEDULE,
  type ScheduleMode,
} from "#shared/polling/scheduler.ts";

/**
 Cron-backed polling schedule picker. Two modes:

 - basic    : human experssions serializes to cron via `scheduler.modeToCron`.
 - advanced : raw cron expression

 Mode-switch policy:
 - basic → advanced  : always allowed, advanced input pre-filled with the
 current cron.
 - advanced → basic  : ALWAYS resets to DEFAULT_SCHEDULE. Any custom cron
 the user had is dropped. (Documented behaviour;
 may add a confirm prompt later.)

 Initial mode on mount: derived from the incoming cron. If `cronToMode`
 classifies it as 'custom' (advanced pattern), start in advanced. Otherwise
 start in basic.
 */

const props = defineProps<{
  modelValue: string;
  mode: "basic" | "advanced";
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
  (e: "update:mode", v: "basic" | "advanced"): void;
}>();

// ── Mode initialisation ────────────────────────────────────────────────────
onMounted(() => {
  const m = scheduler.cronToMode(props.modelValue || DEFAULT_SCHEDULE);
  const detected = m.unit === "custom" ? "advanced" : "basic";
  if (detected !== props.mode) emit("update:mode", detected);
});

// Switch policy: dropping from Advanced back to Basic always resets the
// cron to DEFAULT_SCHEDULE. Watch the parent's mode prop so the policy
// fires regardless of where the toggle is rendered.
watch(
    () => props.mode,
    (next, prev) => {
      if (prev === "advanced" && next === "basic") {
        emit("update:modelValue", DEFAULT_SCHEDULE);
      }
    },
);

// ── Basic controls ─────────────────────────────────────────────────────────
type FriendlyUnit = "minutes" | "hours" | "daily";

const basicMode = computed<ScheduleMode>(() => {
  const m = scheduler.cronToMode(props.modelValue || DEFAULT_SCHEDULE);
  return m.unit === "custom" ? scheduler.cronToMode(DEFAULT_SCHEDULE) : m;
});

const basicUnit = computed<FriendlyUnit>(() => {
  const u = basicMode.value.unit;
  return u === "custom" ? "minutes" : u;
});
const isDaily = computed(() => basicUnit.value === "daily");

const basicValue = computed(() => {
  const m = basicMode.value;
  return m.unit === "minutes" || m.unit === "hours" ? m.value : 1;
});

const dailyAt = computed(() => {
  const m = basicMode.value;
  return m.unit === "daily" ? m.dailyAt : "08:00";
});

const emitFromMode = (m: ScheduleMode) =>
    emit("update:modelValue", scheduler.modeToCron(m));

const onValueInput = (raw: string) => {
  const unit = basicUnit.value;
  if (unit === "daily") return;
  const n = Math.max(1, Number(raw) || 1);
  emitFromMode({ unit, value: n });
};
const onDailyAtInput = (raw: string) =>
    emitFromMode({ unit: "daily", dailyAt: raw || "08:00" });

const { t } = useI18n();
const unitOptions = computed(() => [
  { value: "minutes", label: t("alertParamsEditor.units.minutes") },
  { value: "hours", label: t("alertParamsEditor.units.hours") },
  { value: "daily", label: t("alertParamsEditor.units.daily") },
]);

const onUnitChange = (unit: FriendlyUnit) => {
  if (unit === "daily") {
    emitFromMode({ unit: "daily", dailyAt: dailyAt.value });
    return;
  }
  const carry =
      basicUnit.value === "minutes" || basicUnit.value === "hours"
          ? basicValue.value
          : 1;
  emitFromMode({ unit, value: Math.max(1, carry) });
};

// ── Advanced controls ──────────────────────────────────────────────────────
// Local mirror so the user can type freely without us spamming the parent
// on every keystroke for invalid input. We emit only when the cron parses.
const advancedDraft = ref(props.modelValue || DEFAULT_SCHEDULE);
const advancedError = ref("");

watch(
    () => props.modelValue,
    (v) => {
      if (v !== advancedDraft.value) advancedDraft.value = v;
    },
);

const onAdvancedInput = (raw: string) => {
  advancedDraft.value = raw;
  try {
    scheduler.nextRun(raw); // parse-test; throws on invalid cron
    advancedError.value = "";
    emit("update:modelValue", raw);
  } catch (e) {
    advancedError.value =
        (e as Error).message || t("alertParamsEditor.cron.invalid");
  }
};
</script>

<template>
  <div class="schedule-editor">
    <!-- BASIC: minute / hour / daily controls. -->
    <div v-if="mode === 'basic'" class="interval-row">
      <template v-if="!isDaily">
        <span class="field-hint">{{
            $t("alertParamsEditor.interval.every")
          }}</span>
        <input
            type="number"
            :value="basicValue"
            min="1"
            class="field-input interval-number"
            @input="onValueInput(($event.target as HTMLInputElement).value)"
        >
      </template>

      <template v-else>
        <span class="interval-label">{{
            $t("alertParamsEditor.interval.at")
          }}</span>
        <input
            type="time"
            :value="dailyAt"
            class="field-input interval-time"
            @input="onDailyAtInput(($event.target as HTMLInputElement).value)"
        >
      </template>

      <Select
          :model-value="basicUnit"
          :options="unitOptions"
          size="sm"
          class="interval-unit"
          @update:model-value="onUnitChange($event as FriendlyUnit)"
      />
    </div>

    <!-- ADVANCED: raw cron input + 5-field hint + parse error inline. -->
    <div v-else class="advanced-row">
      <input
          type="text"
          :value="advancedDraft"
          class="field-input cron-input"
          :class="{ 'is-invalid': advancedError }"
          spellcheck="false"
          autocomplete="off"
          placeholder="* * * * *"
          @input="onAdvancedInput(($event.target as HTMLInputElement).value)"
      >
      <div class="cron-legend" aria-hidden="true">
        <span>{{ $t("alertParamsEditor.cron.legend.minute") }}</span
        ><span class="sep">·</span>
        <span>{{ $t("alertParamsEditor.cron.legend.hour") }}</span
        ><span class="sep">·</span>
        <span>{{ $t("alertParamsEditor.cron.legend.dayOfMonth") }}</span
        ><span class="sep">·</span>
        <span>{{ $t("alertParamsEditor.cron.legend.month") }}</span
        ><span class="sep">·</span>
        <span>{{ $t("alertParamsEditor.cron.legend.dayOfWeek") }}</span>
      </div>
      <p v-if="advancedError" class="cron-error">⚠ {{ advancedError }}</p>
    </div>
  </div>
</template>

<style scoped>
.schedule-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ── Basic row ──────────────────────────────────────────────────────────── */
.interval-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.interval-label {
  font-size: var(--text-base);
  color: var(--color-text-dim);
  white-space: nowrap;
  flex-shrink: 0;
}

.interval-number {
  width: 80px;
  flex-shrink: 0;
}

.interval-time {
  width: 110px;
  flex-shrink: 0;
  color-scheme: dark;
}

.interval-unit {
  flex: 1;
  max-width: 130px;
  cursor: pointer;
  appearance: auto;
}

/* ── Advanced row ───────────────────────────────────────────────────────── */
.advanced-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* `.cron-input` layers a monospace typeface on top of `.field-input`.
 * Border / focus ring / invalid state come from components/input.css. */
.cron-input {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  letter-spacing: 1px;
}

.cron-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-faint);
  letter-spacing: 0.3px;
  padding-left: var(--space-1);
}

.cron-legend .sep {
  opacity: 0.5;
}

.cron-error {
  margin: 0;
  font-size: var(--text-s);
  color: var(--color-danger-text);
}
</style>
