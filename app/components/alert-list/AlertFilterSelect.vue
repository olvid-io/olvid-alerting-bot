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
 * Dropdown used to select filters in alert list page.
 * Uses type Option = { label:string; value:string } to pass select options.
 * @param options Dropdown non-default options with display label and internal value
 * @param defaultOption Supplementary option added in first pos which will be set on mount
 * Any selected option but default will change style.
 */

type Option = { label: string; value: string }

const props = defineProps<{
  options: Array<Option>,
  defaultOption: Option
}>();

const selectedValue = defineModel();

const labelColor = computed(() => {

  return (selectedValue.value !== props.defaultOption.value) ? "filter-text-value" : "filter-text-null";
})

onMounted(() => {
  selectedValue.value = props.defaultOption.value;
})

</script>

<template>
  <select v-model="selectedValue" class="filter-select" :class="labelColor">
    <option :value="defaultOption.value" selected>{{ defaultOption.label }}</option>
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>

<style scoped>

.filter-select {
  background-color: var(--color-bg-input);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  height: 32px;
  padding: var(--space-2);

  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s,
  box-shadow 0.15s,
  background-color 0.15s;
}

.filter-select:focus {
  outline: 1px solid var(--color-text-primary);
}

.filter-text-value {
  color: var(--color-accent-text);
  border-color: var(--color-accent);
}

</style>