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
import type { PollingParams } from "#shared/types/polling.ts";
import type { MonitorParams } from "#shared/types/monitor.ts";

/**
 Step 1: source picker + inline configuration per source.
 - Polling    → URL + format + schedule (TriggerParamsEditor).
 - Monitoring → URL + schedule (MonitorParamsEditor — no format).
 - Webhook    → info card inline (no per-alert config).

 Takes the wizard's `form` as a v-model so the source-binding setter
 (which seeds the right params shape on pick, clears them on webhook)
 writes through to the parent without ceremony.
 */

const form = defineModel<AlertModel>({ required: true });

const selectedSource = useSourceBinding(form);
const isPolling = computed(() => form.value.input === Source.Polling);
const isMonitoring = computed(() => form.value.input === Source.Monitoring);
const isWebhook = computed(() => form.value.input === Source.Webhook);

// Localised label for the source hint line (matches what the selector shows).
const { t } = useI18n();
const inputSourceHint = computed(() => {
  return t("wizard.communicationHint");
});
const sourceLabel = computed(() => {
  if (!form.value.input) return "";
  const key = `inputSourceSelector.labels.${form.value.input}`;
  const translated = t(key);
  return translated === key ? form.value.input : translated;
});

function setAlertParams(value: PollingParams | MonitorParams) {
  form.value.alertParams = value;
}
</script>

<template>
  <div class="step-general">
    <!-- Title / description / source are the "what is this alert?" fields -->
    <div class="wcard">
      <div class="wcard-head">
        {{ $t("wizard.fieldLabels.generalInfo") }}
      </div>
      <div class="wcard-body">
        <div class="wcard-row">
          <label class="wcard-label">
            {{ $t("wizard.fieldLabels.title") }}
            <span class="field-required">*</span>
          </label>
          <input
              v-model="form.title"
              type="text"
              class="field-input"
              :placeholder="$t('common.untitledAlert')"
          >
        </div>

        <div class="wcard-row">
          <label class="wcard-label">
            {{ $t("wizard.fieldLabels.description") }}
          </label>
          <input
              v-model="form.description"
              type="text"
              class="field-input"
              :placeholder="$t('common.descriptionPlaceholder')"
          >
        </div>

        <div class="wcard-row">
          <label class="wcard-label">
            {{ $t("wizard.fieldLabels.inputSource") }}
            <span class="field-required">*</span>
            <HelpTooltip :message="inputSourceHint"/>
          </label>
          <InputSourceSelector v-model="selectedSource"/>
        </div>
      </div>
    </div>

    <!-- Polling sources expose URL / format / timing inline. -->
    <div v-if="isPolling" class="field">
      <TriggerParamsEditor
          :trigger-type="form.input ?? ''"
          :model-value="form.alertParams ?? {}"
          @update:model-value="setAlertParams($event as PollingParams)"
      />
    </div>

    <!-- Monitoring sources expose URL + timing only (no body parsing). -->
    <div v-if="isMonitoring" class="field">
      <MonitorParamsEditor
          :model-value="(form.alertParams ?? {}) as Partial<MonitorParams>"
          @update:model-value="setAlertParams($event as MonitorParams)"
      />
    </div>

    <!-- Webhook source: info card inline here (no separate Trigger step). -->
    <template v-if="isWebhook">
      <div class="info-box">
        <span class="info-icon">ℹ</span>
        <div>
          <p class="info-title">{{ $t("wizard.webhookInfo.title") }}</p>
          <p class="info-text">
            <strong>{{ sourceLabel }}</strong
            >{{ $t("wizard.webhookInfo.body") }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.step-general {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.field-hint strong {
  color: var(--color-accent-text);
  font-weight: 600;
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-6);
}

.info-icon {
  color: var(--color-accent-text);
  font-size: var(--text-2xl);
  line-height: 1;
  flex-shrink: 0;
  margin-top: 1px;
}

.info-title {
  margin: 0 0 var(--space-1);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  font-weight: 600;
}

.info-text {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-m);
  line-height: 1.4;
}
</style>
