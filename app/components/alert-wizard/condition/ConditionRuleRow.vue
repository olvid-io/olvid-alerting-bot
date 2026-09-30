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
import {
  type ConditionOperator,
  type ConditionAggregation,
  inputTypeForOperator,
} from "#shared/types/condition.ts";

/**
 "Trigger — [aggregation] [operator] [value]" row of the polling
 ConditionEditor.
 - Aggregation options
 - Operator options
 - Value input is shown only when the operator needs one; its input
 type (number / text) also depends on the operator.

 Owns no state — every change is emitted through a single
 `patch` event that carries a partial PollingCondition.
 */

const props = defineProps<{
  aggregation: ConditionAggregation;
  operator: ConditionOperator;
  value: string;
}>();

const emit = defineEmits<{
  (
      e: "patch",
      v: Partial<{
        aggregation: ConditionAggregation;
        operator: ConditionOperator;
        value: string;
      }>,
  ): void;
}>();


// Pass getters to keep reactivity.
const { aggregationOptions, operatorOptions, needsValue, inputError } =
    useConditionOptions(
        () => props.operator,
        () => props.value,
    );

</script>

<template>
  <div class="rule-row inline">
    <span class="rule-label">{{ $t("conditionEditor.trigger.label") }}</span>

    <!-- Aggregation — options from the factory so new aggregators
         appear here without touching this file. -->
    <Select
        :model-value="aggregation"
        :options="aggregationOptions"
        size="sm"
        class="rule-select agg"
        @update:model-value="
        emit('patch', { aggregation: $event as ConditionAggregation })
      "
    />

    <!-- Operator — fixed enum, labels via i18n. -->
    <Select
        :model-value="operator"
        :options="operatorOptions"
        size="sm"
        class="rule-select op"
        @update:model-value="
        emit('patch', { operator: $event as ConditionOperator })
      "
    />

    <input
        v-if="needsValue"
        :type="inputTypeForOperator(operator)"
        class="field-input rule-input"
        :class="{ 'is-invalid': inputError }"
        :value="value"
        :placeholder="$t('conditionEditor.value.placeholder')"
        @input="
        emit('patch', {
          value: ($event.target as HTMLInputElement).value,
        })
      "
    >
  </div>
</template>

<style scoped>
/* Reads left-to-right
 *   TRIGGER WHEN  [agg]  [operator]  [value]
 * All three controls share the same 32px height + border so they
 * compose visually as one continuous control, not three loose widgets. */
.rule-row.inline {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.rule-label {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--color-text-dim);
  flex-shrink: 0;
}

.rule-input {
  min-width: 120px;
  flex: 1 1 120px;
}
</style>
