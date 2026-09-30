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
definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "Alerte",
})

const route = ref(useRoute());
const { alerts, alertsLoading, fetchAlerts } = useAlertFetching();

// Fetch on hard-refresh if the layout hasn't populated the list yet.
onMounted(() => {
  if (alerts.value.length === 0 && !alertsLoading.value) fetchAlerts();
});

const alert = computed(
    () =>
        alerts.value.find((a) => a.id === Number(route.value.params.id)) ?? null,
);

// Explicit edit request via query (?edit=1) puts a non-draft alert into the
// wizard for full reconfiguration. Drafts always open in the wizard.
const isEditing = computed(() => route.value.query.edit === "1");


</script>
<template>
  <div v-if="alertsLoading || !alert" class="loading-panel">
    <span v-if="alertsLoading">{{ $t("alertPage.loading") }}</span>
    <span v-else>{{ $t("alertPage.notFound") }}</span>
  </div>
  <AlertWizard
      v-else-if="isEditing"
      :key="`wizard-${alert.id?.toString()}`"
      :initial-alert="alert"
  />
  <AlertView
      v-else
      :key="`view-${alert.id?.toString()}`"
      :initial-alert="alert"
  />
</template>

<style scoped>
.loading-panel {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border-subtle);
  border-radius: var(--radius-xl);
  color: var(--color-text-faint);
  font-size: 14px;
}
</style>
