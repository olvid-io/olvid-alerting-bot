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
import { BundleOutputType } from "#shared/types/bundle.ts";

/**
 * Bundle type selector (Olvid / Email)
 * @param modelValue BundleOutputType
 */

defineProps<{
  modelValue: BundleOutputType | null;
  mailEnabled: boolean;
}>();

defineEmits<{
  (e: "update:modelValue", val: BundleOutputType): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div
      class="btn-pill-group"
      role="radiogroup"
      :aria-label="t('bundleKind.groupLabel')"
  >
    <!-- Olvid -->
    <button
        type="button"
        class="btn-pill"
        :class="{ active: modelValue === BundleOutputType.Olvid }"
        @click="$emit('update:modelValue', BundleOutputType.Olvid)"
    >
      <span class="tile-media" aria-hidden="true">
        <OlvidLogo/>
      </span>

      <span class="tile-label">
        {{ t("bundleKind.olvid") }}
      </span>
    </button>

    <!-- Mail -->
    <button
        v-if="mailEnabled"
        type="button"
        class="btn-pill"
        :class="{ active: modelValue === BundleOutputType.Mail }"
        @click="$emit('update:modelValue', BundleOutputType.Mail)"
    >
      <span class="tile-media" aria-hidden="true">
        <LucideMail :stroke-width="2"/>
      </span>

      <span>{{ t("bundleKind.mail") }}</span>
    </button>
  </div>
</template>

<style scoped>
/* ---------- Shared media container ---------- */

.tile-media {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: var(--color-text-faint);
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  .btn-pill.active & {
    color: var(--color-accent);
  }

  .btn-pill:hover:not(.active) & {
    color: var(--color-accent);
  }
}
</style>
