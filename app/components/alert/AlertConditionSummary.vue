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

/**
 * Renders condition configuration in input summary in alert view-mode.
 * @param condition Condition to display
 */

const props = defineProps<{
  condition: PollingCondition | undefined;
}>();

const { conditionSummary } = useConditionSummary();
const summary = computed(() => conditionSummary(props.condition));
</script>

<template>
  <div>
    <p class="condition-text">{{ summary.headline }}</p>
    <div v-if="summary.paths.length > 0" class="path-list">
      <div class="chip" :title="summary.paths[0]">
        <span class="chip-path">{{ summary.paths[0] }}</span>
      </div>
      <div v-if="summary.paths.length > 1" class="chip">
        <span class="chip-path">+{{ summary.paths.length - 1 }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.condition-text {
  margin: 0 0 var(--space-2);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  line-height: 1.5;
}

.path-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  color: var(--color-text-dim);
}

</style>
