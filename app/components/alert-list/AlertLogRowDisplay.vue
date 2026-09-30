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
/**
 * Log information viewer in alert list. Renders status and timestamp,
 * as well as error info in tooltip window in case of warning or failure.
 * @param log : AlertLog to display
 * */

import { LogStatus } from "#shared/types/statusLog.ts";

const props = defineProps<{
  log: AlertLog;
}>();

const { formatTimestamp, stateLabel } = useAlertLogsFormat();

const hasLogPopup = computed(() => {
  return props.log.status !== LogStatus.Success
})

</script>

<template>
  <div class="log-container">
    <div class="log-dot" :class="`dot-${log.status}`">
      <div v-if="hasLogPopup" class="log-tooltip" :class="`tooltip-${log.status}`">
        <span v-if="log.details !== undefined"><span class="log-stage">{{ $t("alertLog.detail.stage") }}</span> : {{$t(`alertLog.stage.${log.details.stage}`) }}</span>
        <span>{{ log.error }}</span>
      </div>
    </div>

    <time class="log-time" :datetime="log.createdAt">{{
      formatTimestamp(log.createdAt)
      }}
    </time>
    <span class="log-state">{{ stateLabel(log.status) }}</span>
  </div>
</template>

<style scoped>
.log-container {
  display: flex;
  justify-content: left;
  align-items: center;
  gap: var(--space-2);
}

/* Error tooltip
Hidden when status is success
*/
.log-tooltip {
  position: absolute;
  visibility: hidden;

  display: flex;
  flex-direction: column;

  font-family: var(--font-mono);
  font-size: var(--text-s);

  padding: var(--space-3);
  background-color: var(--color-bg-input);
  border: 1px solid var(--color-bg-input);
  border-radius: var(--radius-sm);

  margin-top: 15px;
}

.log-stage {
  color: var(--color-text-muted);
}

.tooltip-warning {
  border-color: var(--color-warning);
}

.tooltip-error {
  border-color: var(--color-danger);
}

.log-dot:hover .log-tooltip {
  visibility: visible;
}
</style>