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
 * Multi-purpose confirm dialog.
 * @param open
 * @param title
 * @param message
 * @param confirmLabel
 * @param cancelLabel
 * @param variant "primary"
 */

withDefaults(
    defineProps<{
      open: boolean;
      title: string;
      message?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      variant?: "primary" | "danger";
      /** Passed through to <Modal>. Compact by default because prompts
       *  are short-copy widgets; callers with richer bodies can widen. */
      size?: "compact" | "default" | "wide";
    }>(),
    {
      message: "",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
      variant: "primary",
      size: "compact",
    },
);

defineEmits<{
  confirm: [],
  cancel: []
}>();
</script>

<template>
  <Modal :open="open" :size="size" @close="$emit('cancel')">
    <h4>{{ title }}</h4>
    <p v-if="message">{{ message }}</p>

    <!-- Rich body — for prompts that need more than a message: a rename
         input, a checkbox, a small form. Callers with plain copy just
         pass `message` and skip the slot. -->
    <slot/>

    <div class="overlay-actions">
      <!-- Optional third action (e.g. "Save as draft"). Renders on the
           left; the flexbox `space-between` on .overlay-actions keeps
           cancel/confirm right-aligned. If the slot is empty, the
           wrapper stays but produces nothing — flexbox collapses it. -->
      <div class="dialog-extra">
        <slot name="extra"/>
      </div>

      <div class="dialog-primary-actions">
        <button type="button" class="btn btn-ghost" @click="$emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button
            type="button"
            class="btn"
            :class="variant === 'danger' ? 'btn-danger' : 'btn-primary'"
            @click="$emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.dialog-extra {
  display: flex;
  gap: var(--space-3);
}

.dialog-primary-actions {
  display: flex;
  gap: var(--space-3);
}
</style>
