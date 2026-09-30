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
 Shared modal header: title on the left, close X on the right. Two
 variants:
 · plain  — transparent, sits flush inside the modal box. Used by
 forms where the body carries the visual weight.
 · filled — grey band with rounded top corners. Used by result /
 readout modals where the body content is scrollable and
 the header needs to visibly delimit the top edge.
 Emits `close` — the parent decides what "close" means (cancel,
 discard prompt, etc.).
 */

withDefaults(
    defineProps<{
      title?: string;
      variant?: "plain" | "filled";
      closeLabel?: string;
    }>(),
    { title: "", variant: "plain", closeLabel: "Close" },
);

defineEmits<{ (e: "close"): void }>();
</script>

<template>
  <div class="modal-head" :class="`modal-head--${variant}`">
    <div style="display:flex; flex-direction: row; align-items: center">
      <h4>{{ title }}</h4>
      <slot/>
    </div>

    <!-- Optional controls between the title and the close X. Kept
         collapsed when no consumer supplies content so the header stays
         tight for the common "title only" case. -->
    <div class="modal-head-actions">
      <slot name="actions"/>
    </div>
    <button
        type="button"
        class="modal-close"
        :title="closeLabel"
        :aria-label="closeLabel"
        @click="$emit('close')"
    >
      <LucideX :stroke-width="2"/>
    </button>
  </div>
</template>

<style scoped>
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-shrink: 0;
}

.modal-head h4 {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: var(--text-lg);
  color: var(--color-text-primary);
}

.modal-head--plain {
  padding: var(--space-5) var(--space-6) var(--space-3);
}

.modal-head--filled {
  padding: var(--space-4) var(--space-6);
  background: var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
}

.modal-head--filled h4 {
  font-weight: var(--font-weight-bold);
}

.modal-head-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.modal-head-actions:empty {
  display: none;
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  font-size: var(--text-lg);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background-color 0.15s,
  color 0.15s;
  flex-shrink: 0;
}

.modal-close:hover {
  background: var(--color-border-default);
  color: var(--color-text-primary);
}
</style>
