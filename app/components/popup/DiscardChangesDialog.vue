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
/*
  Wizard's "you have unsaved changes" prompt. Thin wrapper over
  ConfirmDialog:
    · cancel   →  "Continue editing"  (dismiss)
    · confirm  →  "Discard"           (throw away the work, danger)
    · #extra   →  "Save as draft" OR "Save alert" (only when the form is
                  savable). The label — and the emitted event — depend on
                  whether the alert is complete enough to save runnably:
                    - incomplete → `save-draft` (label: "Save as draft")
                    - complete   → `save-alert` (label: "Save alert")
                  Callers wire each event to the right save path so the
                  final status matches the button copy.
*/

defineProps<{
  open: boolean;
  canSaveDraft: boolean;
  wouldBeComplete: boolean;
  saving: boolean;
}>();

/*
defineEmits<{
  (e: "save-draft"): void;
  (e: "save-alert"): void;
  (e: "continue-editing"): void;
  (e: "discard"): void;
}>();
*/

defineEmits<{
  saveDraft: [],
  saveAlert: [],
  continueEditing: [],
  discard: []
}>();

</script>

<template>
  <ConfirmDialog
      :open="open"
      :title="$t('wizard.discardModal.title')"
      :message="$t('wizard.discardModal.message')"
      :confirm-label="$t('button.discard')"
      :cancel-label="$t('button.continueEditing')"
      variant="danger"
      @confirm="$emit('discard')"
      @cancel="$emit('continueEditing')"
  >
    <template v-if="canSaveDraft" #extra>
      <button
          v-if="wouldBeComplete"
          type="button"
          class="btn btn-primary"
          :disabled="saving"
          @click="$emit('saveAlert')"
      >
        {{ saving ? $t("common.saving") : $t("wizard.footer.saveAlert") }}
      </button>
      <button
          v-else
          type="button"
          class="btn btn-secondary"
          :disabled="saving"
          @click="$emit('saveDraft')"
      >
        {{ saving ? $t("common.saving") : $t("wizard.footer.saveAsDraft") }}
      </button>
    </template>
  </ConfirmDialog>
</template>
