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
import { AlertStatus } from "#shared/types/alert.ts";

/** One-way prop + one event. The parent owns the status; a click here just
 * asks for a flip. Previously wired via defineModel("status") which forced
 * callers to expose a writable ref even when the flip is a server round-
 * trip anyway — the `update:state` event was already the real write path.
 */
const props = defineProps<{
  status: AlertStatus;
  canActivate: boolean;
  displayLabel: boolean;
}>();

const emit = defineEmits<{ (e: "update:state"): void }>();

const { t } = useI18n();

const label = computed(() => {
  if (props.status === AlertStatus.Active) return t("alertStatus.active");
  if (props.status === AlertStatus.Inactive) return t("alertStatus.inactive");
  return t("alertStatus.draft");
});

const toggleStatus = () => emit("update:state");
</script>
<template>
  <div class="toggle-wrap">
    <span v-if="displayLabel" class="toggle-label">{{ label }}</span>
    <button
        type="button"
        class="toggle"
        :class="{ on: status === AlertStatus.Active }"
        :disabled="!canActivate"
        @click="toggleStatus"
    >
      <span class="knob"/>
    </button>
  </div>
</template>
<style scoped>
.toggle-label {
  font-size: var(--text-m);
  color: var(--color-text-muted);
  font-weight: 600;
  min-width: 54px;
  text-align: right;
  margin-right: 10px;
}
</style>
