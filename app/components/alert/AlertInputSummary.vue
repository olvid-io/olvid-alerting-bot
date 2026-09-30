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
import { computed, onMounted } from "vue";
import { Source } from "#shared/types/source.ts";
import { TriggerMode } from "#shared/types/triggerMode.ts";
import type { PollingParams } from "#shared/types/polling.ts";
import type { MonitorParams } from "#shared/types/monitor.ts";
import { ConditionKind, ConditionOperator } from "#shared/types/condition.ts";

/**
 * INPUT block in view mode. Renders the alert's source-side configuration:
 * - Webhook    → just the endpoint URL.
 * - Polling    → URL, format, interval, condition summary, trigger mode
 * - Monitoring → URL, interval, "Triggers on" summary, trigger mode
 */

const props = defineProps<{
  source?: string;
  alertParams?: AlertParams;
  webhookUrl?: string;
}>();

const {
  scheduleLabel,
  lastPolledAtLabel,
  statusMatchLabel,
  triggerModeLabel: triggerModeLabelFor,
} = useAlertLabels();

const isPolling = computed(() => props.source === Source.Polling);
const isMonitoring = computed(() => props.source === Source.Monitoring);
const isWebhook = computed(() => props.source === Source.Webhook);

/* Narrow AlertParams by the source discriminator which lives outside the union in `props.source`,
so we cast at read time. Cheap: same shape either way.
 */
const pollingParams = computed(() =>
    isPolling.value
        ? (props.alertParams as PollingParams | undefined)
        : undefined,
);
const monitorParams = computed(() =>
    isMonitoring.value
        ? (props.alertParams as MonitorParams | undefined)
        : undefined,
);

const pollingInterval = computed(
    () => scheduleLabel(props.alertParams?.schedule),
);

const triggerModeMeaningful = computed(() => {
  if (isPolling.value) {
    const c = pollingParams.value?.condition;
    return (
        c?.kind === ConditionKind.Rule && c.operator !== ConditionOperator.Changed
    );
  }
  // Monitoring: the trigger mode is always meaningful — matching is a
  // discrete boolean flip, so OneShot/WithRecovery both make sense.
  return isMonitoring.value;
});

const triggerModeLabel = computed(() =>
    triggerModeLabelFor(props.alertParams?.triggerMode ?? TriggerMode.EveryTime),
);

onMounted(() => {
  // Sanity check: the view should never be rendered with a source that doesn't match the alertParams type.
  if (isPolling.value && !pollingParams.value) {
    clientLogger.error("AlertInputSummary: Polling source but no PollingParams");
  } // TODO monitoring params aren't being loaded
  if (isMonitoring.value && !monitorParams.value) {
    clientLogger.error("AlertInputSummary: Monitoring source but no MonitorParams");
  }
});
</script>

<template>
  <div class="data-block">
    <h4 class="alert-section-label">{{ $t("editor.view.eyebrowConfiguration") }}</h4>

    <dl class="data-grid">
      <template v-if="isWebhook">
        <div v-if="webhookUrl" class="data-row">
          <dt class="data-label">{{ $t("editor.view.fields.endpoint") }}</dt>
          <dd class="data-value">
            <URLCopyBox :url="webhookUrl"/>
          </dd>
        </div>
      </template>

      <template v-else-if="isPolling">
        <div class="data-row">
          <dt class="data-label">{{ $t("editor.view.fields.url") }}</dt>
          <dd class="data-value">
            <URLCopyBox :url="pollingParams?.url || '——'"/>
          </dd>
        </div>
        <div class="data-row">
          <dt class="data-label">{{ $t("editor.view.fields.format") }}</dt>
          <dd class="data-value">
            {{ pollingParams?.format || "——" }}
          </dd>
        </div>
        <div class="data-row">
          <dt class="data-label">{{ $t("editor.view.fields.polling") }}</dt>
          <dd class="data-value" style="display:flex">
            <div v-if="pollingInterval.startsWith('#')" class="chip" :title="pollingInterval.slice(1)">
              <span class="chip-path">{{ pollingInterval.slice(1) }}</span>
            </div>
            <div v-else>
              {{ pollingInterval }}
            </div>
            <span class="dim">
              {{ $t("editor.schedule.lastPolledAt", { time: lastPolledAtLabel(alertParams?._lastPolledAt) }) }}
        
            </span>
          </dd>
        </div>
        <div class="data-row">
          <dt class="data-label">{{ $t("editor.view.fields.condition") }}</dt>
          <dd class="data-value">
            <AlertConditionSummary :condition="pollingParams?.condition"/>
          </dd>
        </div>
        <div v-if="triggerModeMeaningful" class="data-row">
          <dt class="data-label">{{ $t("editor.view.fields.trigger") }}</dt>
          <dd class="data-value">{{ triggerModeLabel }}</dd>
        </div>
      </template>

      <template v-else-if="isMonitoring">
        <div class="data-row">
          <dt class="data-label">{{ $t("editor.view.fields.url") }}</dt>
          <dd class="data-value">
            <URLCopyBox :url="monitorParams?.url || '——'"/>
          </dd>
        </div>
        <div class="data-row">
          <dt class="data-label">{{ $t("editor.view.fields.polling") }}</dt>
          <dd class="data-value">
            {{ pollingInterval }}
            <span class="dim">  {{
                $t("editor.schedule.lastPolledAt", { time: lastPolledAtLabel(alertParams?._lastPolledAt) })
              }}</span>
          </dd>
        </div>
        <div class="data-row">
          <dt class="data-label">{{ $t("monitorEditor.view.triggersOn") }}</dt>
          <dd class="data-value">
            {{ statusMatchLabel(monitorParams?.match) }}
          </dd>
        </div>
        <div v-if="triggerModeMeaningful" class="data-row">
          <dt class="data-label">{{ $t("editor.view.fields.trigger") }}</dt>
          <dd class="data-value">{{ triggerModeLabel }}</dd>
        </div>
      </template>
    </dl>
  </div>
</template>

<style scoped>
.data-block {
  margin-bottom: var(--space-8);
}

.data-block:last-child {
  margin-bottom: 0;
}

.data-grid {
  margin: 0;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--tw-shadow);
}

.data-row {
  display: flex;
  align-items: flex-start;
  flex-direction: row;
  gap: var(--space-5);
  padding-bottom: var(--space-4);
}

.data-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

/* Eyebrow-style column label. `line-height` matches `.data-value`'s
 * line-height so the two share a baseline on the first line of the
 * value — even when the value wraps to multiple lines (e.g. the
 * condition summary + its chip row). */
.data-label {
  flex: 0 0 90px;
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1.5;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.data-value {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  color: var(--color-text-primary);
  font-size: var(--text-base);
  line-height: 1.5;
}

.data-value .dim {
  color: var(--color-text-dim);
  margin-left: var(--space-2);
}
</style>
