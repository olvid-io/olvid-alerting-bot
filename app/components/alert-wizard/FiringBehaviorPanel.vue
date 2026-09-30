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
import type { TriggerMode } from "#shared/types/triggerMode.ts";

/**
 * "Firing behavior" panel
 * Two rows: trigger mode + datapoints (fire after N of last M matches).
 * Vmodels -> the parent binds them onto alertParams.
 */

const triggerMode = defineModel<TriggerMode>("triggerMode", { required: true });
const datapointsN = defineModel<number>("datapointsN", { required: true });
const datapointsM = defineModel<number>("datapointsM", { required: true });

withDefaults(
    defineProps<{
      variant: "polling" | "monitoring";
      showTriggerMode?: boolean;
    }>(),
    { showTriggerMode: true },
);

// Clamp so the sentence never reads "3 of 2". 1..10 keeps the UI sane;
// the real max is enforced by the runtime once datapoints history is wired.
function onNInput(e: Event) {
  const v = Math.max(
      1,
      Math.min(10, Number((e.target as HTMLInputElement).value) || 1),
  );
  datapointsN.value = Math.min(v, datapointsM.value);
}

function onMInput(e: Event) {
  const v = Math.max(
      1,
      Math.min(50, Number((e.target as HTMLInputElement).value) || 1),
  );
  datapointsM.value = v;
  if (datapointsN.value > v) datapointsN.value = v;
}
</script>

<template>
  <div class="wcard">
    <div class="wcard-head">{{ $t("wizard.firingBehavior.title") }}</div>
    <div class="wcard-body">
      <div v-if="showTriggerMode" class="wcard-row">
        <span class="wcard-label">{{
            $t("wizard.firingBehavior.triggerModeLabel")
          }}</span>
        <TriggerModePicker v-model="triggerMode" :variant="variant"/>
      </div>

      <div class="wcard-row">
        <span class="wcard-label">{{
            $t("wizard.firingBehavior.datapointsLabel")
          }}</span>
        <div class="datapoints">
          <i18n-t
              keypath="wizard.firingBehavior.datapointsSentence"
              tag="p"
              class="datapoints-sentence"
          >
            <template #n>
              <input
                  type="number"
                  min="1"
                  max="10"
                  class="dp-input"
                  :value="datapointsN"
                  @input="onNInput"
              >
            </template>
            <template #m>
              <input
                  type="number"
                  min="1"
                  max="50"
                  class="dp-input"
                  :value="datapointsM"
                  @input="onMInput"
              >
            </template>
          </i18n-t>
          <p class="datapoints-hint">
            {{ $t("wizard.firingBehavior.datapointsHint") }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.datapoints {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.datapoints-sentence {
  margin: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  color: var(--color-text-primary);
  font-size: var(--text-m);
}

.dp-input {
  width: 56px;
  padding: 4px var(--space-2);
  text-align: center;
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: var(--text-m);
  font-weight: 600;
}

.dp-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.datapoints-hint {
  margin: 0;
  color: var(--color-text-dim);
  font-size: var(--text-s);
  line-height: 1.5;
}
</style>
