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
import { toRef } from "vue";
import type { AlertModel, AlertParams } from "#shared/types/alert.ts";
import { BundleOutputType, type BundleModel } from "#shared/types/bundle.ts";
import type { DiscussionModel } from "#shared/types/discussion.ts";
import type { Source } from "#shared/types/source.ts";
import { useBundleEditor } from "~/composables/bundle/useBundleEditor.ts";

/**
 * Bundle editor modal. Layout + wiring only — every piece of state or
 * logic is owned by a composable:
 *
 * useBundleEditor         → draft, isDirty, discard prompt, kind/format
 * bindings, saveScript, …
 * useBundleFormatOptions  → i18n-labelled Format select options.
 */

const props = defineProps<{
  open: boolean;
  bundle: BundleModel | null; // null with open=true ⇒ create mode
  index: number | null; //      null               ⇒ create mode
  alertContext: AlertModel;
  alertParams?: AlertParams;
  // Nullable to match `AlertModel.input` on the wire. `useBundleEditor`
  // already treats an undefined source as "not polling" — the picker in
  // the modal will show the webhook / mail-family formats, which is the
  // right default when a caller opens the dialog before a source is set.
  inputSource?: Source;
  availableDiscussions: DiscussionModel[];
  discussionsLoading: boolean;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: "save", payload: { index: number | null; bundle: BundleModel }): void;
  (e: "cancel"): void;
}>();

const { t } = useI18n();

const {
  draft,
  isDirty,
  confirmDiscard,
  isEditorOpen,
  isPolling,
  kind,
  isCustomFormat,
  bundleName,
  mailSubject,
  discussions,
  mailAddresses,
  formating,
  onKindChange,
  onFormatChange,
  saveScript,
} = useBundleEditor({
  open: toRef(props, "open"),
  bundle: toRef(props, "bundle"),
  alertContext: toRef(props, "alertContext"),
  inputSource: toRef(props, "inputSource"),
  availableDiscussions: toRef(props, "availableDiscussions"),
});

const { formatOptions } = useBundleFormatOptions(isPolling);

const { data: authConfig } = await useAuthConfig();
const mailEnabled = computed(() => authConfig.value?.mailEnabled ?? false);

const requestClose = () => {
  if (isDirty.value) {
    confirmDiscard.value = true;
    return;
  }
  emit("cancel");
};

const onSave = () => {
  if (!draft.value) return;
  emit("save", { index: props.index, bundle: draft.value });
};
</script>

<template>

  <Modal
      :open="open"
      size="full"
      :close-on-backdrop="false"
      @close="requestClose"
  >
    <div class="bundle-edit-modal">
      <FormatEditor
          v-if="draft"
          :open="isEditorOpen"
          :initial-script="draft.custom_script || ''"
          :input-source="inputSource"
          :alert-params="alertParams ?? alertContext?.alertParams"
          :alert-id="alertContext?.id ?? null"
          :preview-mode="kind ?? BundleOutputType.Olvid"
          :mail-subject="mailSubject"
          @save="saveScript"
          @close="isEditorOpen = false"
      />

      <ModalHead
          :close-label="t('editor.bundleModal.closeTitle')"
          @close="requestClose"
      />

      <div v-if="draft" class="modal-body">
        <!-- Title — optional; rows fall back to "Untitled bundle". -->
        <div class="field">
          <label class="field-label">{{ t("editor.bundleModal.titleLabel") }}</label>
          <input
              v-model="bundleName"
              type="text"
              class="field-input"
              :placeholder="
              t('editor.bundleModal.namePlaceholder', {
                n: (index ?? alertContext.bundles.length) + 1,
              })
            "
          >
        </div>

        <!-- Channel picker — one bundle, one kind. -->
        <div class="field">
          <label class="field-label">{{ $t("bundleKind.fieldLabel") }}</label>
          <BundleKindPicker
              :model-value="kind"
              :mail-enabled="mailEnabled"
              @update:model-value="onKindChange"
          />
        </div>

        <!-- Recipients — the picker above decides which one renders.
             Empty bundles show a soft hint asking the user to pick first. -->
        <span v-if="kind === null" class="hint">
          {{ $t("bundleKind.pickPrompt") }}
        </span>

        <div v-else-if="kind === BundleOutputType.Olvid" class="field">
          <label class="field-label">{{
            $t("bundleRow.fields.discussions")
            }}</label>
          <DiscussionSelector
              v-model="discussions"
              :available="availableDiscussions"
              :is-loading="discussionsLoading"
          />
        </div>

        <div v-else-if="kind === BundleOutputType.Mail" class="field">
          <label class="field-label">{{
            $t("bundleRow.fields.emailRecipients")
            }}</label>
          <EmailRecipientSelector v-model="mailAddresses"/>
        </div>

        <div v-if="kind === BundleOutputType.Mail" class="field">
          <label class="field-label">{{ $t("bundleRow.fields.mailSubject") }} </label>
          <input
              v-model="mailSubject"
              type="text"
              class="field-input"
              :placeholder="alertContext?.title ?? ''"
          >
        </div>
        <!-- Format + optional custom-script editor + preview. -->
        <div class="field">
          <label class="field-label">{{ $t("bundleRow.fields.format") }}</label>
          <div class="format-row">
            <Select
                v-model="formating"
                :options="formatOptions"
                class="format-select"
                @update:model-value="onFormatChange"
            />
            <button
                v-if="isCustomFormat"
                type="button"
                class="btn btn-secondary btn-sm"
                @click="isEditorOpen = true"
            >
              <LucidePencil/>
              {{ $t("bundleRow.scriptButton") }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="confirmDiscard" class="modal-foot discard-foot">
        <span class="discard-msg">{{
            t("editor.bundleModal.discardWarning")
          }}</span>
        <button
            type="button"
            class="btn btn-ghost"
            @click="confirmDiscard = false"
        >
          {{ t("editor.bundleModal.keepEditingButton") }}
        </button>
        <button type="button" class="btn btn-danger" @click="emit('cancel')">
          {{ t("editor.bundleModal.discardButton") }}
        </button>
      </div>
      <div v-else class="modal-foot">
        <button type="button" class="btn btn-ghost" @click="requestClose">
          {{ t("editor.bundleModal.cancelButton") }}
        </button>
        <button
            type="button"
            class="btn btn-primary btn-sm"
            :disabled="saving"
            @click="onSave"
        >
          {{
          saving
          ? t("editor.bundleModal.savingButton")
          : t("editor.bundleModal.saveButton")
          }}
        </button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
/* Sizing (96vw × 92vh, capped at 1600px) is provided by
 * <Modal size="full"> — see overlay-box--full in overlay.css. This
 * wrapper only owns the flex layout of head/body/foot. */
.bundle-edit-modal {
  width: 100%;
  height: 100%;
  display: flex;
  padding: 0 var(--space-4);
  flex-direction: column;
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-4) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.field-hint {
  padding: var(--space-4) var(--space-5);
  background: var(--color-bg-input);
  border: 1px dashed var(--color-border-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: var(--text-base);
  font-style: italic;
  text-align: center;
}

.format-row {
  display: flex;
  gap: var(--space-3);
}

.format-select {
  flex: 1;
}

.modal-foot {
  align-self: center;
  width: 105%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
}

.modal-foot.discard-foot {
  background: var(--color-warning-soft);
}

.discard-msg {
  flex: 1;
  color: var(--color-warning-text);
  font-size: var(--text-m);
  font-weight: 600;
}
</style>
