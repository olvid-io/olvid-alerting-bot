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
import { ref, computed, toRef } from "vue";
import type { AlertModel } from "#shared/types/alert";
import { useDiscussions } from "~/composables/useDiscussions.ts";

/*

*/
/**
 * View-mode alert page. Layout + wiring only — every piece of behavior lives in a composable:
 *
 * useAlertBundleForm      → form + source flags
 * useAlertActions(form)   → openEdit / duplicate / toggleStatus / remove
 * useAlertViewDisplay     → inputTitle / truncatedDescription / webhookUrl
 * useAlertDuplicateDialog → duplicate confirm dialog + rename input
 * useAlertTestIntro       → test-runner intro dialog + localStorage flag
 * useAlertBundleEdit      → bundle-editor modal + save
 *
 * @param initialAlert Alert to display
 */

const props = withDefaults(
    defineProps<{
      initialAlert?: AlertModel | null;
    }>(),
    {
      initialAlert: null,
    },
);

const { fetchAlerts } = useAlertFetching();
const { availableDiscussions, discussionsLoading } = useDiscussions();
const { form, isExisting, isPolling, isMonitoring, isWebhook } = useAlertBundleForm(
    toRef(props, "initialAlert"),
);
const {
  saving,
  saveAlert,
  openEditAlert,
  duplicateAlert,
  toggleStatus,
  removeAlert,
} = useAlertActions(form);

const canActivate = computed(() => form.value.bundles.length > 0);
const canTest = computed(
    () => !!form.value.id && (isPolling.value || isMonitoring.value),
);

const { inputTitle, truncatedDescription, webhookUrl } = useAlertViewDisplay(
    form,
    isPolling,
    isMonitoring,
    isWebhook,
);

// ── Delete (trivial confirm ↔ action) ──────────────────────────────────────
const confirmingDelete = ref(false);
const onDelete = async () => {
  try {
    await removeAlert();
    confirmingDelete.value = false;
  } catch (error) {
    clientLogger.error("Error deleting:", error);
  }
};

// ── Status toggle wrapper ─────────────────────────────────────────────────
const onToggleStatus = async () => {
  try {
    await toggleStatus();
  } catch (error) {
    clientLogger.error("Error toggling:", error);
  }
};

// Back to list
const onBackToList = () => {
  navigateTo("/alerts/list")
}

// ── Duplicate + test-intro + bundle-edit dialogs ──────────────────────────
const {
  open: confirmingDuplicate,
  draftTitle: duplicateDraftTitle,
  inputRef: duplicateInputRef,
  openDialog: openDuplicate,
  cancel: cancelDuplicate,
  confirm: onDuplicate,
} = useAlertDuplicateDialog(form, duplicateAlert);

const {
  showingTestIntro,
  testIntroDontShowAgain,
  testRunnerRef,
  onTest,
  onTestIntroConfirm,
  cancelTestIntro,
} = useAlertTestIntro(canTest);

const {
  editingBundleIndex,
  editingBundle,
  openBundleEditor,
  closeBundleEditor,
  onSaveBundle,
} = useAlertBundleEdit(form, saveAlert, fetchAlerts);
</script>

<template>
  <div class="panel">
    <ConfirmDialog
        :open="confirmingDelete"
        :title="$t('wizard.deleteModal.title')"
        :message="$t('wizard.deleteModal.message')"
        :confirm-label="$t('button.delete')"
        :cancel-label="$t('button.cancel')"
        variant="danger"
        @confirm="onDelete"
        @cancel="confirmingDelete = false"
    />

    <ConfirmDialog
        :open="confirmingDuplicate"
        :title="$t('duplicateModal.title')"
        :message="$t('duplicateModal.message')"
        :confirm-label="saving ? $t('common.saving') : $t('duplicateModal.confirm')"
        :cancel-label="$t('button.cancel')"
        @confirm="onDuplicate"
        @cancel="cancelDuplicate"
    >
      <div class="field duplicate-field">
        <label class="field-label" for="duplicate-title-input">
          {{ $t("duplicateModal.titleLabel") }}
        </label>
        <input
            id="duplicate-title-input"
            ref="duplicateInputRef"
            v-model="duplicateDraftTitle"
            type="text"
            class="field-input"
            :placeholder="$t('duplicateModal.titlePlaceholder')"
            @keydown.enter.prevent="onDuplicate"
        >
      </div>
    </ConfirmDialog>

    <BundleEditDialog
        :open="editingBundleIndex !== null"
        :bundle="editingBundle"
        :index="editingBundleIndex"
        :alert-context="form"
        :alert-params="form.alertParams"
        :input-source="form.input"
        :available-discussions="availableDiscussions"
        :discussions-loading="discussionsLoading"
        :saving="saving"
        @save="onSaveBundle"
        @cancel="closeBundleEditor"
    />

    <AlertViewHeader
        :title="form.title"
        :description="truncatedDescription"
        :input-title="inputTitle"
        :bundle-count="form.bundles.length"
        :status="form.status"
        :is-existing="isExisting"
        :can-activate="canActivate"
        :can-test="canTest"
        @edit="openEditAlert"
        @test="onTest"
        @duplicate="openDuplicate"
        @delete="confirmingDelete = true"
        @update-status="onToggleStatus"
        @back="onBackToList"
    />

    <ConfirmDialog
        :open="showingTestIntro"
        size="default"
        :title="$t('testIntroDialog.title')"
        :message="$t('testIntroDialog.body')"
        :confirm-label="$t('testIntroDialog.confirm')"
        :cancel-label="$t('button.cancel')"
        @confirm="onTestIntroConfirm"
        @cancel="cancelTestIntro"
    >
      <label class="dont-show-again">
        <input v-model="testIntroDontShowAgain" type="checkbox">
        <span>{{ $t("testIntroDialog.dontShowAgain") }}</span>
      </label>
    </ConfirmDialog>
    <AlertTestRunner v-if="canTest" ref="testRunnerRef" :alert-id="form.id"/>

    <div class="panel-body">
      <div class="split">
        <div class="split-left">
          <AlertInputSummary
              :input-title="inputTitle"
              :source="form.input"
              :alert-params="form.alertParams"
              :webhook-url="webhookUrl"
          />

          <AlertBundleTable
              :bundles="form.bundles"
              @edit-bundle="openBundleEditor"
          />
        </div>
        <div class="split-right">
          <AlertLogs :alert-id="form.id"/>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Duplicate-alert rename field — inlined inside <ConfirmDialog>'s slot. */
.duplicate-field {
  margin-top: var(--space-3);
  margin-bottom: var(--space-5);
}

.duplicate-field .field-label {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
  font-size: var(--text-s);
}

/* Test-intro "don't show again" checkbox — inlined inside <ConfirmDialog>'s slot. */
.dont-show-again {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-3) 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-s);
  cursor: pointer;
  user-select: none;
}

.dont-show-again input {
  cursor: pointer;
}

.split {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-4);
  height: 100%;
  --sidebar-w: 200px;
  transition: grid-template-columns 0.18s ease;
}

.split-left,
.split-right {
  min-height: 0;
  height: 100%;
  overflow-y: auto;
}
</style>
