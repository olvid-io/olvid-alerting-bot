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
import { computed, ref } from "vue";
import type { BundleModel } from "#shared/types/bundle.ts";
import type { AlertModel } from "#shared/types/alert.ts";

/**
 Step 3 (always last): the alert's bundles as a ROW list — the same
 AlertBundleRow the view mode uses, so the wizard and the detail page
 read identically. A dashed "+" row appends; clicking it (or a row's
 pencil) opens BundleEditDialog, the single bundle editor for the whole
 app.

 Bundles are only mutated through the dialog's `save`:
 - index === null → create → push.
 - index === n    → edit   → replace in place.
 Cancelling a create leaves the form untouched (no phantom empty
 bundle, unlike the old inline-card flow).
 */

const form = defineModel<AlertModel>({ required: true });

defineProps<{
  availableDiscussions: any[];
  discussionsLoading: boolean;
}>();

// ── Dialog state ──────────────────────────────────────────────────────────
// editingIndex null + open ⇒ create mode (dialog seeds its own blank).
const dialogOpen = ref(false);
const editingIndex = ref<number | null>(null);

const editingBundle = computed<BundleModel | null>(() =>
    editingIndex.value !== null
        ? (form.value.bundles[editingIndex.value] ?? null)
        : null,
);

const openCreate = () => {
  editingIndex.value = null;
  dialogOpen.value = true;
};
const openEdit = (index: number) => {
  editingIndex.value = index;
  dialogOpen.value = true;
};
const closeDialog = () => {
  dialogOpen.value = false;
  editingIndex.value = null;
};

const onSave = ({
                  index,
                  bundle,
                }: {
  index: number | null;
  bundle: BundleModel;
}) => {
  if (index === null) {
    form.value.bundles.push(bundle);
  } else {
    form.value.bundles[index] = bundle;
  }
  closeDialog();
};

const removeBundle = (index: number) => {
  form.value.bundles.splice(index, 1);
};

const hasEmptyBundle = computed(() =>
    form.value.bundles.some((b) => b.outputs.length === 0),
);
</script>

<template>
  <div>
    <p class="step-intro">
      <i18n-t keypath="wizard.bundleStep.intro" tag="span">
        <template #bundle
        ><strong>{{ $t("wizard.bundleStep.bundleWord") }}</strong></template
        >
      </i18n-t>
    </p>

    <div class="bundles-table">
      <AlertBundleRow
          v-for="(b, i) in form.bundles"
          :key="b.id ?? i"
          :bundle="b"
          :index="i"
          removable
          @edit="openEdit"
          @remove="removeBundle"
      />

      <!-- The "+" row — same silhouette as a bundle row, dashed border,
           mirrors the old +card affordance in row form. -->
      <button type="button" class="row-add" @click="openCreate">
        <span class="plus">+</span>
        <span>{{
            form.bundles.length === 0
                ? $t("wizard.bundleStep.startAdding")
                : $t("wizard.bundleStep.newBundle")
          }}</span>
      </button>
    </div>

    <p v-if="form.bundles.length > 0 && hasEmptyBundle" class="warn-hint">
      <i18n-t keypath="wizard.bundleStep.warnHint" tag="span">
        <template #draft
        ><strong>{{ $t("wizard.bundleStep.draftWord") }}</strong></template
        >
      </i18n-t>
    </p>

    <BundleEditDialog
        :open="dialogOpen"
        :bundle="editingBundle"
        :index="editingIndex"
        :alert-context="form"
        :alert-params="form.alertParams"
        :input-source="form.input"
        :available-discussions="availableDiscussions"
        :discussions-loading="discussionsLoading"
        @save="onSave"
        @cancel="closeDialog"
    />
  </div>
</template>

<style scoped>
.step-intro {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-base);
  line-height: 1.5;
}

.step-intro strong {
  color: var(--color-text-secondary);
}

/* Same column layout as the view-mode bundles table. */
.bundles-table {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

/* Dashed add-row — the row-shaped sibling of the old +card. */
.row-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: 1px dashed var(--color-border-default);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s,
  border-color 0.15s,
  color 0.15s;
}

.row-add:hover {
  background: var(--color-accent-soft);
  border-color: var(--color-accent-border);
  color: var(--color-text-primary);
}

.row-add .plus {
  font-size: var(--text-2xl);
  line-height: 1;
}

.warn-hint {
  margin: 0;
  padding: var(--space-3) var(--space-5);
  background: var(--color-warning-soft);
  border: 1px solid var(--color-warning-border);
  border-radius: var(--radius-lg);
  color: var(--color-warning-text);
  font-size: var(--text-m);
  line-height: 1.5;
}

.warn-hint strong {
  color: var(--color-warning-bright);
}
</style>
