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
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

/**
 Single dropdown component. Two shapes, one API:
 · size="md" Use for form fields (Message Format, Polling
 Format, HTTP-range in status match).
 · size="sm" Use for dropdowns that live inline inside a row (condition operator + aggregation,
 schedule time-unit).
 */

type Option = { value: string; label: string };

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
      modelValue?: string;
      options: Option[];
      disabled?: boolean;
      placeholder?: string;
      size?: "md" | "sm";
      // Initial open state. Only read at mount
      defaultOpen?: boolean;
    }>(),
    {
      modelValue: '',
      disabled: false,
      placeholder: () => "",
      size: "md",
      defaultOpen: false,
    },
);

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
}>();

const isOpen = ref(props.defaultOpen);
const containerRef = ref<HTMLElement | null>(null);

const current = computed(() =>
    props.options.find((o) => o.value === props.modelValue),
);

const displayLabel = computed(
    () => current.value?.label ?? (props.placeholder || t("select.placeholder")),
);

function toggle() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function select(opt: Option) {
  emit("update:modelValue", opt.value);
  isOpen.value = false;
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", onClickOutside));
onBeforeUnmount(() => document.removeEventListener("click", onClickOutside));
</script>

<template>
  <div ref="containerRef" class="select-wrap" :class="[`size-${size}`]">
    <button
        type="button"
        class="select-trigger"
        :class="{ open: isOpen, disabled }"
        :disabled="disabled"
        :aria-haspopup="true"
        :aria-expanded="isOpen"
        @click="toggle"
    >
      <span
          class="select-label"
          :class="{ 'select-label--placeholder': !current }"
      >{{ displayLabel }}</span>
      <span class="select-chevron" :class="{ open: isOpen }" aria-hidden="true"
      >▾</span
      >
    </button>

    <div v-if="isOpen && !disabled" class="select-dropdown" role="listbox">
      <div
          v-for="opt in options"
          :key="opt.value"
          class="select-item"
          :class="{ selected: opt.value === modelValue }"
          role="option"
          :aria-selected="opt.value === modelValue"
          @mousedown.prevent="select(opt)"
      >
        {{ opt.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-wrap {
  position: relative;
}

.size-md {
  width: 100%;
}

.size-sm {
  display: inline-block;
  width: auto;
}

/* ── Trigger — shared base ─────────────────────────────────── */
.select-trigger {
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  height: 32px;

  font-family: inherit;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  transition: border-color 0.15s,
  box-shadow 0.15s,
  background-color 0.15s;
}

.select-trigger:focus-visible,
.select-trigger.open {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.select-trigger.disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background: var(--color-bg-card);
}

/* Size-specific trigger chrome. */
.size-md .select-trigger {
  width: 100%;
  box-sizing: border-box;
  padding: 9px var(--space-4);
  background: var(--color-bg-input);

}

/* sm — inline chip, but visually a sibling of .field-input: same
 * background and vertical rhythm so a Select and an <input> sitting
 * next to each other in a row line up. */
.size-sm .select-trigger {
  padding: var(--space-3) var(--space-3);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  line-height: 1;
}

.size-sm .select-trigger:hover:not(.open):not(.disabled) {
  border-color: var(--color-border-default);
}

.select-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Muted color when the trigger is showing the placeholder — matches
 * the treatment `<input>::placeholder` gets across the app. */
.select-label--placeholder {
  color: var(--color-text-dim);
}

.select-chevron {
  color: var(--color-text-dim);
  font-size: 12px;
  transition: transform 0.15s;
  flex-shrink: 0;
}

.select-chevron.open {
  transform: rotate(180deg);
}

/* ── Dropdown panell — shared, positioning is size-neutral ──── */
.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  min-width: 100%;
  width: max-content;

  max-height: 240px;
  overflow-y: auto;
  z-index: 200;
}

.size-md .select-dropdown {
  left: 0;
  right: 0;
}

.size-sm .select-dropdown {
  left: 0;

  padding: var(--space-1);
}

.select-item {
  font-family: inherit;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color 0.12s,
  color 0.12s;
}

.select-item:hover {
  background: var(--color-bg-card-soft);
  color: var(--color-text-primary);
}

.select-item.selected {
  background: var(--color-accent-soft);
  color: var(--color-accent-text);
}

.size-md .select-item {
  padding: 9px var(--space-4);
  font-size: var(--text-base);
  border-bottom: 1px solid var(--color-border-subtle);
}

.size-md .select-item:last-child {
  border-bottom: none;
}

.size-sm .select-item {
  padding: 6px var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-m);
  white-space: nowrap;
}
</style>
