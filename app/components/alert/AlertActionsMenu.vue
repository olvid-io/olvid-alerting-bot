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
import { ref, onMounted, onBeforeUnmount } from "vue";

/**
 * Overflow menu (⋮) for alert actions in alert view
 * - duplicate
 * - test now (if the alert is polling / monitoring)
 * - manage access TODO Not implemented yet, hidden
 * - move to project TODO Not implemented yet, hidden
 * - delete
 */

withDefaults(
    defineProps<{
      canTest?: boolean;
    }>(),
    { canTest: false },
);

defineEmits<{
  test: [],
  duplicate: [],
  delete: []
}>();

const { t } = useI18n();

const open = ref(false);
const wrapRef = ref<HTMLElement | null>(null);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

// Click-outside — same pattern the header used, kept here now that the menu owns its state.
function onClickOutside(e: MouseEvent) {
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener("click", onClickOutside));
onBeforeUnmount(() => document.removeEventListener("click", onClickOutside));
</script>

<template>
  <div ref="wrapRef" class="options-wrap">
    <button
        type="button"
        class="btn btn-ghost btn-sm"
        :class="{ open }"
        :title="t('alertActions.moreActions')"
        :aria-label="t('alertActions.moreActions')"
        @click="toggle"
    >
      <LucideEllipsisVertical class="options-icon"/>
    </button>

    <div v-if="open" class="options-dropdown" role="menu">
      <button
          v-if="canTest"
          type="button"
          class="options-item"
          role="menuitem"
          @click="
          close();
          $emit('test');
        "
      >
        {{ t("alertActions.testNow") }}
        <LucidePlay/>
      </button>

      <button
          type="button"
          class="options-item"
          role="menuitem"
          @click="
          close();
          $emit('duplicate');
        "
      >
        {{ t("alertActions.duplicate") }}
        <LucideCopy/>
      </button>

      <!-- Placeholder actions for features not yet wired. They emit so a
           future parent can hook them up without touching this file. -->
      <!--
      <button
        type="button"
        class="options-item"
        role="menuitem"
        @click="
          close();
          $emit('manage-access');
        "
      >
        {{ t("alertActions.manageAccess") }}
        <LucideUserCog />  
      </button>

      <button
        type="button"
        class="options-item"
        role="menuitem"
        @click="
          close();
          $emit('move-to-project');
        "
      >
        {{ t("alertActions.moveToProject") }}
        <LucideArrowLeftRight />  
      </button>
      -->

      <div class="options-separator"/>

      <button
          type="button"
          class="options-item danger"
          role="menuitem"
          @click="
          close();
          $emit('delete');
        "
      >
        {{ t("button.delete") }}
        <LucideTrash2/>
      </button>
    </div>
  </div>
</template>

<style scoped>
.options-icon {
  font-size: 14px;
}

.options-wrap {
  position: relative;
}

.options-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 200px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-1);
  display: flex;
  flex-direction: column;
  z-index: 200;
}

.options-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  width: 100%;
  padding: 8px var(--space-3);
  text-align: left;
  font-family: var(--font-sans);
  font-size: var(--text-m);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color 0.15s,
  color 0.15s;
}

.options-item:hover {
  background: var(--color-bg-card-soft);
  color: var(--color-text-primary);
}

.options-item.danger {
  color: var(--color-danger);
}

.options-item.danger:hover {
  background: var(--color-danger-soft);
}

.options-separator {
  height: 1px;
  margin: var(--space-1) 0;
  background: var(--color-border-subtle);
}
</style>
