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
import { computed, nextTick, ref } from "vue";
import { Source } from "#shared/types/source.ts";

const { t } = useI18n();

const labelFor = (s: string): string => {
  const key = `inputSourceSelector.labels.${s}`;
  const translated = t(key);
  return translated === key ? s : translated;
};

defineProps<{
  modelValue: Source | undefined;
  locked?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: Source | undefined];
}>();

const sourceOptions = computed(() =>
    Object.values(Source).map((s) => ({ value: s, label: labelFor(s) })),
);

// Emit the picked source; the Select gives us its raw string value.
function select(value: string) {
  emit("update:modelValue", value as Source);
}

// `defaultOpen` for the Select on remount — flipped on true when the
// admin clicks Change so the picker appears already expanded (no
// second click needed). Reset next tick so an initial mount without
// a prior selection still shows the picker closed.
const openOnRemount = ref(false);

function clear() {
  openOnRemount.value = true;
  emit("update:modelValue", undefined);
  nextTick(() => {
    openOnRemount.value = false;
  });
}
</script>

<template>
  <div class="selector">
    <div v-if="modelValue" class="selected-badge">
      <div class="selected-left">
        <span class="check">✔</span>
        <strong>{{ labelFor(modelValue) }}</strong>
      </div>
      <button type="button" class="btn-change" @click.stop="clear">
        {{ $t("inputSourceSelector.changeButton") }}
      </button>
    </div>
    <Select
        v-else
        :model-value="modelValue"
        :options="sourceOptions"
        :placeholder="$t('inputSourceSelector.searchPlaceholder')"
        size="sm"
        :default-open="openOnRemount"
        @update:model-value="select"
    />
  </div>
</template>

<style scoped>
.selector {
  width: 25%;
  position: relative;
  padding: 0 0 var(--space-4) 0;
}

.selected-badge {
  display: flex;
  justify-content: space-between;
  height: 30px;
  align-items: center;
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent-border);
  border-radius: var(--radius-md);
  padding: 0 var(--space-4);
  box-sizing: border-box;
}

.selected-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-accent-text);
  font-size: var(--text-base);
}

.check {
  color: var(--color-success);
  font-size: var(--text-m);
}

.btn-change {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: var(--text-m);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.btn-change:hover {
  color: var(--color-accent-text);
}
</style>
