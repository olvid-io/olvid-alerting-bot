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
import { ConditionKind } from "#shared/types/condition.ts";

/**
 Pill-radio pair that flips a polling condition between "fire every
 poll" (None) and "match a rule" (Rule). Owns no state; parent
 re-emits every pick through v-model.
 */

defineProps<{
  modelValue: ConditionKind;
}>();

defineEmits<{ (e: "update:modelValue", v: ConditionKind): void }>();
</script>

<template>
  <div class="btn-pill-group">
    <button
        type="button"
        class="btn-pill"
        :class="{ active: modelValue === ConditionKind.None }"
        @click="$emit('update:modelValue', ConditionKind.None)"
    >
      <input type="radio" :checked="modelValue === ConditionKind.None">
      <span>{{ $t("conditionEditor.mode.none") }}</span>
    </button>
    <button
        type="button"
        class="btn-pill"
        :class="{ active: modelValue === ConditionKind.Rule }"
        @click="$emit('update:modelValue', ConditionKind.Rule)"
    >
      <input type="radio" :checked="modelValue === ConditionKind.Rule">
      <span>{{ $t("conditionEditor.mode.rule") }}</span>
    </button>
  </div>
</template>
