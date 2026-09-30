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
import { computed } from "vue";
import { Source } from "#shared/types/source.ts";
import type { AlertModel } from "#shared/types/alert.ts";
import { TriggerMode } from "#shared/types/triggerMode.ts";
import type { PollingParams } from "#shared/types/polling.ts";
import type { MonitorParams } from "#shared/types/monitor.ts";
import { ConditionKind, ConditionOperator } from "#shared/types/condition.ts";

/**
 Step 2: source-specific trigger configuration. Uniform layout for
 both source types:

 · Polling    → ConditionEditor  (watch paths + rule row)
 · Monitoring → StatusMatchEditor (status match kind + kind-body)
 · FiringBehaviorPanel (shared)   → trigger mode + datapoints mockup

 The FiringBehaviorPanel is source-agnostic — it renders identically
 for polling and monitoring, so the user sees the same "firing
 behavior" block at the bottom of the step regardless of source.
 Only the `variant` prop changes the hint wording.

 Webhook alerts skip this step entirely (useWizardSteps handles it).
 */

const form = defineModel<AlertModel>({ required: true });

const isPolling = computed(() => form.value.input === Source.Polling);
const isMonitoring = computed(() => form.value.input === Source.Monitoring);

const condition = computed({
  get: () => (form.value.alertParams as PollingParams | undefined)?.condition,
  set: (v) => {
    if (!form.value.alertParams || !v) return;
    form.value.alertParams = { ...form.value.alertParams, condition: v };
  },
});

// Firing-behavior visibility gates:
//
//   showFiringBehavior — whole panell. Hidden when the condition is
//     kind=None: an every-poll alert has nothing to modulate, so
//     neither trigger mode nor datapoints make sense there.
//     Monitoring always shows the panell (no None option there).
//
//   showTriggerMode — the trigger-mode row inside the panell. Also
//     hidden when operator=Changed: each change IS itself a discrete
//     event, so the mode is redundant. Datapoints stays visible in
//     that case ("fire after N consecutive changes" is still valid).
const showFiringBehavior = computed(() => {
  if (isMonitoring.value) return true;
  if (isPolling.value) {
    const c = condition.value;
    return (
        c?.kind === ConditionKind.Rule && c.operator !== ConditionOperator.Changed
    );
  }
  return false;
});
const showTriggerMode = computed(() => {
  if (isMonitoring.value) return true;
  if (isPolling.value) {
    const c = condition.value;
    return (
        c?.kind === ConditionKind.Rule && c.operator !== ConditionOperator.Changed
    );
  }
  return false;
});

// FiringBehaviorPanel bindings — read/write alertParams.{triggerMode,
// datapointsN, datapointsM} for whichever source is active.
const paramsFor = () =>
    form.value.alertParams as PollingParams | MonitorParams | undefined;

const triggerModeModel = computed<TriggerMode>({
  get: () => paramsFor()?.triggerMode ?? TriggerMode.EveryTime,
  set: (v) => {
    if (!form.value.alertParams) return;
    form.value.alertParams = { ...form.value.alertParams, triggerMode: v };
  },
});
const datapointsNModel = computed<number>({
  get: () => paramsFor()?.datapointsN ?? 1,
  set: (v) => {
    if (!form.value.alertParams) return;
    form.value.alertParams = { ...form.value.alertParams, datapointsN: v };
  },
});
const datapointsMModel = computed<number>({
  get: () => paramsFor()?.datapointsM ?? 1,
  set: (v) => {
    if (!form.value.alertParams) return;
    form.value.alertParams = { ...form.value.alertParams, datapointsM: v };
  },
});

const behaviorVariant = computed<"polling" | "monitoring">(() =>
    isMonitoring.value ? "monitoring" : "polling",
);
</script>

<template>
  <div class="step-trigger">
    <!-- Source-specific: WHAT counts as a match. -->
    <template v-if="isPolling">
      <ConditionEditor
          :model-value="condition"
          :url="(form.alertParams as PollingParams | undefined)?.url"
          :format="(form.alertParams as PollingParams | undefined)?.format"
          @update:model-value="condition = $event"
      />
    </template>
    <template v-else-if="isMonitoring">
      <StatusMatchEditor v-model="form"/>
    </template>

    <!-- Source-agnostic: WHEN a match actually notifies. Same panell
         for both polling and monitoring — variant only affects hint copy.
         Hidden entirely when the polling condition is kind=None (every-poll
         alerts have nothing to modulate). -->
    <FiringBehaviorPanel
        v-if="showFiringBehavior"
        v-model:trigger-mode="triggerModeModel"
        v-model:datapoints-n="datapointsNModel"
        v-model:datapoints-m="datapointsMModel"
        :variant="behaviorVariant"
        :show-trigger-mode="showTriggerMode"
    />
  </div>
</template>

<style scoped>
.step-trigger {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
</style>
