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
import type { BundleModel } from "#shared/types/bundle.ts";

/**
 * Bundle list in view mode. Bundle display is managed per row.
 * @param bundles Bundle array to display
 */

defineProps<{
  bundles: BundleModel[];
}>();

defineEmits<{ (e: "edit-bundle", index: number): void }>();
</script>

<template>
  <div class="data-block">
    <h4 class="alert-section-label">
      {{ $t("editor.view.eyebrowBundles") }}
    </h4>

    <div v-if="bundles.length === 0" class="bundles-hint">
      <i18n-t keypath="editor.view.noBundles" tag="span">
        <template #editAlert
        ><strong>{{ $t("editor.view.noBundlesEditAlert") }}</strong></template
        >
      </i18n-t>
    </div>

    <div v-else class="bundles-table">
      <AlertBundleRow
          v-for="(b, i) in bundles"
          :key="b.id ?? i"
          :bundle="b"
          :index="i"
          @edit="$emit('edit-bundle', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.data-block {
  margin-bottom: var(--space-8);
}

.data-block:last-child {
  margin-bottom: 0;
}

/* Demoted eyebrow — same treatment as AlertInputSummary so both
 * sections read as supporting copy under the main h2 alert title. */
.section-eyebrow {
  margin: 0 0 var(--space-3);
  margin-left: var(--radius-md);
  padding: 0;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--color-text-dim);
}

.bundles-hint {
  color: var(--color-text-dim);
  font-size: var(--text-m);
  font-style: italic;
  margin: var(--space-3) 0;
}

.bundles-table {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
