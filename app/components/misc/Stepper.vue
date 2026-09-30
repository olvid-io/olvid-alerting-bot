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
  StepperRoot,
  StepperItem,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "reka-ui";

defineProps<{
  modelValue: number;
  steps: { title: string; description?: string; disabled?: boolean }[];
}>();

defineEmits<{ (e: "update:modelValue", v: number): void }>();
</script>

<template>
  <!-- :linear="false" — non-sequential. Each step's per-item `disabled`
       flag is now the gate, so a complete alert in edit mode lets the
       user jump straight to step 3 without walking through 1 and 2. -->
  <StepperRoot
      :model-value="modelValue"
      :linear="false"
      class="stepper"
      @update:model-value="$emit('update:modelValue', $event ?? 1)"
  >
    <StepperItem
        v-for="(s, i) in steps"
        :key="i"
        :step="i + 1"
        :disabled="!!s.disabled"
        class="stepper-item"
    >
      <StepperTrigger class="stepper-trigger">
        <StepperIndicator class="stepper-indicator">
          <span class="indicator-num">{{ i + 1 }}</span>
          <svg class="indicator-check" viewBox="0 0 14 14" fill="none">
            <path
                d="M3 7.5L6 10.5L11 4.5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
          </svg>
        </StepperIndicator>
        <div class="stepper-text">
          <StepperTitle class="stepper-title">{{ s.title }}</StepperTitle>
          <span v-if="s.description" class="stepper-desc">{{
            s.description
          }}</span>
        </div>
      </StepperTrigger>
      <StepperSeparator v-if="i < steps.length - 1" class="stepper-separator"/>
    </StepperItem>
  </StepperRoot>
</template>

<style scoped>
/* Stepper visuals are bespoke (gradient indicators, animated separators).
 * Colors are sourced from design tokens so the whole thing themes correctly.
 * The few accent-on-transparent overlays use a CSS color-mix to derive a
 * soft tint from the accent token, instead of hard-coded rgba.
 */

.stepper {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  width: 100%;
}

.stepper-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex: 0 0 auto;
}

.stepper-trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  padding: var(--space-1) var(--space-4) var(--space-1) var(--space-1);
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
  transition: background-color 0.18s,
  border-color 0.18s;
}

.stepper-trigger:hover:not([data-disabled]) {
  background: color-mix(in srgb, var(--color-accent) 6%, transparent);
}

.stepper-trigger:disabled,
.stepper-trigger[data-disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}

.stepper-indicator {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-bg-card);
  border: 1.5px solid var(--color-border-default);
  color: var(--color-text-dim);
  font-size: var(--text-s);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.indicator-check {
  display: none;
  width: 12px;
  height: 12px;
  color: var(--color-text-on-accent);
}

/* Active — blue ring + bright label */
.stepper-item[data-state="active"] .stepper-indicator {
  background: linear-gradient(
      135deg,
      var(--color-accent),
      var(--color-accent-border)
  );
  border-color: #60a5fa;
  color: var(--color-text-on-accent);
  box-shadow: 0 0 1px 3px color-mix(in srgb, var(--color-accent) 18%, transparent),
  0 2px 4px color-mix(in srgb, var(--color-accent) 35%, transparent);
}

.stepper-item[data-state="active"] .stepper-trigger {
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 35%, transparent);
}

/* Completed — solid blue + check */
.stepper-item[data-state="completed"] .stepper-indicator {
  background: var(--color-accent-border);
  border-color: var(--color-accent-border);
  color: var(--color-text-on-accent);
}

.stepper-item[data-state="completed"] .indicator-num {
  display: none;
}

.stepper-item[data-state="completed"] .indicator-check {
  display: inline-block;
}

.stepper-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
  gap: 1px;
}

.stepper-title {
  font-size: var(--text-s);
  font-weight: 700;
  color: var(--color-text-dim);
  letter-spacing: 0.4px;
  text-transform: uppercase;
  margin: 0;
}

.stepper-desc {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
  letter-spacing: 0.1px;
}

.stepper-item[data-state="active"] .stepper-title {
  color: var(--color-text-primary);
}

.stepper-item[data-state="active"] .stepper-desc {
  color: var(--color-accent-text);
}

.stepper-item[data-state="completed"] .stepper-title {
  color: var(--color-text-secondary);
}

.stepper-item[data-state="completed"] .stepper-desc {
  color: var(--color-text-dim);
}

.stepper-separator {
  flex: 1 1 auto;
  height: 2px;
  border-radius: 1px;
  background: var(--color-border-subtle);
  margin: 0 var(--space-1);
  min-width: 18px;
  transition: background-color 0.2s;
}

.stepper-separator[data-state="completed"] {
  background: linear-gradient(
      90deg,
      var(--color-accent-border),
      var(--color-accent)
  );
}

[data-theme="light"] {
  /* Active — blue ring + bright label */

  .stepper-item[data-state="active"] .stepper-indicator {
    background: linear-gradient(
        135deg,
        #5ba4f8,
        #2b52d4
    );
    border-color: #9ccfff;
    color: var(--color-text-on-accent);
    box-shadow: 0 0 2px 3px color-mix(in srgb, white 18%, transparent),
    0 0 1px 2px color-mix(in srgb, white 55%, transparent);
  }

}
</style>
