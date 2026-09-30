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
import type { AlertStatus } from "#shared/types/alert.ts";

/**
 * Alert view header, with alert title, input source, and description, back button, toggle menu, edit button and
 * contextual menu.
 * @param title
 * @param description
 * @param inputTitle
 * @param status
 * @param isExisting
 * @param canActivate
 * @param canTest Optional, enables the "Test now" item in the overflow menu (polling alerts).
 */

defineProps<{
  title: string;
  description?: string;
  inputTitle?: string;
  status: AlertStatus;
  isExisting: boolean;
  canActivate: boolean;
  canTest?: boolean;
}>();

/*
defineEmits<{
  (e: "edit"): void;
  (e: "test"): void;
  (e: "duplicate"): void;
  (e: "manage-access"): void;
  (e: "move-to-project"): void;
  (e: "delete"): void;
  (e: "update:status"): void;
  (e: "back"): void;
}>();
 */
defineEmits<{
  edit: [],
  test: [],
  duplicate: [],
  manageAccess: [],
  moveToProject: [],
  delete: [],
  updateStatus: [],
  back: []
}>()

</script>

<template>
  <div class="panel-head view-head">
    <div class="head-main">
      <button
          type="button"
          class="btn btn-ghost btn-sm"
          @click="$emit('back')"
      >
        <LucideArrowLeft/>
        {{ $t("button.back") }}
      </button>
      <h2 class="view-title">
        <span class="title-text">{{ title || $t("common.untitled") }}</span>
        <span v-if="inputTitle" class="meta-tag">{{ inputTitle }}</span>
      </h2>
      <div class="head-actions">
        <StatusToggle
            v-if="isExisting"
            :status="status"
            :can-activate="canActivate"
            :display-label="true"
            @update:state="$emit('updateStatus')"

        />
        <button
            type="button"
            class="btn btn-primary btn-sm"
            @click="$emit('edit')"
        >
          {{ $t("editor.header.editAlert") }}
        </button>

        <!--
          @manage-access="$emit('manage-access')"
          @move-to-project="$emit('move-to-project')"
          -->
        <AlertActionsMenu
            :can-test="canTest"
            @test="$emit('test')"
            @duplicate="$emit('duplicate')"
            @delete="$emit('delete')"
        />
      </div>
    </div>

    <p v-if="description" class="view-subtitle">{{ description }}</p>
  </div>
</template>

<style scoped>
.view-head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-6);
}

.head-main {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-4);
  padding-left: var(--space-2);
  min-width: 0;
}

.head-actions {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-3) 0 0;
  margin-left: auto;
  flex-shrink: 0;
  gap: var(--space-4);
}

.view-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.3;
  flex: 1;
  min-width: 0;
}

.title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-subtitle {
  margin: 0;
  font-size: var(--text-m);
  font-weight: 400;
  font-style: italic;
  color: var(--color-text-dim);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: var(--space-1);
}

.meta-tag {
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent-border);
  color: var(--color-accent-text);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.3px;
  padding: 2px var(--space-3);
  border-radius: var(--radius-sm);
  margin-top: 3px;
}

.btn-ghost {
  padding: 0 var(--space-1);
  height: 30px;
}
</style>
