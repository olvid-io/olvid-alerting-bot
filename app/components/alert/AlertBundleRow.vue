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
import { computed } from "vue";
import { type BundleModel, BundleOutputType } from "#shared/types/bundle.ts";
import {
  olvidIdsOf,
  mailAddressesOf,
  bundleKind,
} from "~/composables/bundle/useAlertBundleForm.ts";
import { LucideTrash2 } from "@lucide/vue";
import { useDiscussions } from "~/composables/useDiscussions.ts"

/**
 * One row in the view-mode bundle table or in wizard row.
 * @param bundle Bundle to display
 * @param index Bundle index in list
 * @param removable Wizard rows can be removed; view-mode rows can't.
 */
const t = useI18n().t;

const props = withDefaults(
    defineProps<{
      bundle: BundleModel;
      index: number;
      removable?: boolean;
    }>(),
    { removable: false },
);

defineEmits<{
  edit: [index: number]
  remove: [index: number]
}>();

const { formatLabel } = useAlertLabels();
const { bundleStatus } = useBundleStatus();

const status = computed(() => bundleStatus(props.bundle));
const hasWarning = computed(() => status.value.kind !== "ready");
const displayName = computed(
    () => props.bundle.name || t("bundleRow.untitled"),
);

/* Row summary reads only the active kind's items — bundles are now homogeneous (one channel per bundle).
`bundleKind()` picks the right list; the count and the "first two names" follow. */
const { availableDiscussions } = useDiscussions();

const kind = computed(() => bundleKind(props.bundle.outputs));

const destNames = computed<string[]>(() => {
  if (kind.value === BundleOutputType.Olvid) {
    const titleFor = (id: string) =>
        availableDiscussions.value?.find((d) => d.id === id)?.title ?? `#${id}`;
    return olvidIdsOf(props.bundle.outputs).map(titleFor);
  }
  if (kind.value === BundleOutputType.Mail) {
    return mailAddressesOf(props.bundle.outputs);
  }
  return [];
});
const destCount = computed(() => destNames.value.length);

const destSummary = computed(() => {
  const count = destCount.value;
  if (count === 0) return t("bundleRow.noDestinations");
  const firstTwoNames = destNames.value.slice(0, 2).join(", ");
  if (count <= 2) return firstTwoNames;
  const remaining = count - 2;
  if (remaining === 1) {
    return t(`bundleRow.destSummary.PlusOne`, { firstTwoNames });
  }
  return t(`bundleRow.destSummary.Plural`, { firstTwoNames, remaining });
});
</script>

<template>
  <div class="bundle-row" :class="{ 'has-warning': hasWarning }">
    <div class="row-main">
      <span class="row-title" :title="displayName">{{ displayName }}</span>
      <span class="row-meta">
        <span class="meta-format">{{ formatLabel(bundle.formating) }}</span>
        <span class="meta-sep" aria-hidden="true">·</span>
        <span class="meta-dest" :class="{ 'meta-warn': destCount === 0 }">{{
          destSummary
        }}</span>
        <template v-if="hasWarning && destCount > 0">
          <span class="meta-sep" aria-hidden="true">·</span>
          <span class="meta-warn">{{ status.label }}</span>
        </template>
      </span>
    </div>

    <div class="row-actions">
      <button
          type="button"
          class="row-edit"
          :title="t('bundleRow.editTooltip')"
          @click="$emit('edit', index)"
      >
        <LucideSquarePen :stroke-width="2"/>
      </button>
      <button
          v-if="removable"
          type="button"
          class="row-edit row-remove"
          :title="t('bundleRow.removeTooltip')"
          @click="$emit('remove', index)"
      >
        <LucideTrash2/>
      </button>
    </div>
  </div>
</template>

<style scoped>
.bundle-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  transition: background-color 0.15s,
  border-color 0.15s;
}

.bundle-row:hover {
  background: var(--color-bg-card-soft);
  border-color: var(--color-border-default);
}

.row-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-s);
  color: var(--color-text-dim);
  min-width: 0;
}

.meta-format {
  color: var(--color-text-secondary);
}

.meta-dest {
  font-variant-numeric: tabular-nums;
}

.meta-sep {
  color: var(--color-text-faint);
}

.meta-warn {
  color: var(--color-warning-text);
  font-weight: 500;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.row-edit {
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  width: 30px;
  height: 30px;
  font-size: var(--text-xl);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s,
  color 0.15s;
}

.row-edit:hover {
  background: var(--color-border-subtle);
  color: var(--color-text-primary);
}

.row-remove:hover {
  background: color-mix(in srgb, var(--color-danger, #ef4444) 12%, transparent);
  color: var(--color-danger-text, #b91c1c);
}
</style>
