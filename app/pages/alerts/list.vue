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
/**
 * Alert list page. Displays a table containing all alerts with basic information : status, title, source
 * (with url in case of polling / monitoring) and last activity log. Allows status toggling directly in the list.
 */
import { computed, onMounted, watch } from "vue";
import { Source } from "#shared/types/source.ts";
import { AlertStatus } from "#shared/types/alert.ts";
import AlertFilterSelect from "~/components/alert-list/AlertFilterSelect.vue";

definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();

useHead({
  title: t("pageTitle.alertList"),
})

const { alerts, fetchAlerts } = useAlertFetching();

const { user } = useUserSession();

const searchQuery = ref("");

/* Filters data
* An alert will appear in the list if and only if it matches selected criteria, respectively status, input and
* last log status. When set to DEFAULT_FILTER_STRING, filters allows all types of their corresponding attribute.
* Textual search via search bar will only allow alerts with matching substrings either in title or URL.
* Reset button set selects value to DEFAULT_FILTER_STRING and empty search bar.
* */
const { statusFilter, inputFilter, logFilter } = { statusFilter: ref(""), inputFilter: ref(""), logFilter: ref("") }
const { statusOptions, inputOptions, logOptions } = {
  statusOptions: computed(() =>
      Object.values(AlertStatus).map((s) => ({ value: s, label: t(`alertStatus.${s}`) }))
  ),
  inputOptions: computed(() =>
      Object.values(Source).map((s) => ({ value: s, label: t(`alertList.inputs.${s}`) }))
  ),
  logOptions: computed(() =>
      Object.values(LogStatus).map((s) => ({ value: s, label: t(`logStatus.${s}`) })))
}


const DEFAULT_FILTER_STRING: string = 'all';

// Filtered data list
const filteredAlerts = computed(() => {
  return alerts.value.filter(alert => {
    // Search query
    const query = searchQuery.value.toLowerCase();
    const url = alert.alertParams?.url ?? "";
    const queryCheck = alert.title.toLowerCase().includes(query) || (url.toLowerCase().includes(query));

    // Dropdown filters
    const statusCheck = statusFilter.value === DEFAULT_FILTER_STRING ? true : alert.status === statusFilter.value;
    const inputCheck = inputFilter.value === DEFAULT_FILTER_STRING ? true : alert.input === inputFilter.value;
    let logCheck = false;
    if (logFilter.value === DEFAULT_FILTER_STRING) { // If no filter set
      logCheck = true;
    } else if (alert.logs !== null && alert.logs !== undefined && alert.logs[0] !== undefined) {
      logCheck = alert.logs[0].status === logFilter.value;
    }

    return queryCheck && statusCheck && inputCheck && logCheck;
  });
})

// Filters reset : set select values to DEFAULT_FILTER_STRING, empty search bar
function resetFilters() {
  statusFilter.value = DEFAULT_FILTER_STRING;
  inputFilter.value = DEFAULT_FILTER_STRING;
  logFilter.value = DEFAULT_FILTER_STRING;
  searchQuery.value = "";
}

// Only fetch alerts if user is logged in
onMounted(() => {
  fetchAlerts();
});

// If user session changes, fetch again. In case of a logout (u === false), empty alert list.
watch(user, (u) => {
  if (u) {
    fetchAlerts();
  } else {
    alerts.value = [];
  }
});
</script>

<template>
  <Panel>
    <PanelHeader>
      <h2>{{ $t("alertList.title") }}</h2>
      <button type="button" class="btn btn-primary" @click="navigateTo('/alerts/new')">
        <LucidePlus class="plus" aria-hidden="true"/>
        {{ $t("alertList.addAlert") }}
      </button>
    </PanelHeader>

    <div class="table-filters">
      <input
          v-model="searchQuery"
          type="text"
          :placeholder="$t('alertList.filters.search')"
          class="table-search">

      <AlertFilterSelect
          v-model="statusFilter"
          :options="statusOptions"
          :default-option="{ label : $t('alertList.filters.status'), value : DEFAULT_FILTER_STRING }"
      />

      <AlertFilterSelect
          v-model="inputFilter"
          :options="inputOptions"
          :default-option="{ label : $t('alertList.filters.input'), value : DEFAULT_FILTER_STRING }"
      />

      <AlertFilterSelect
          v-model="logFilter"
          :options="logOptions"
          :default-option="{ label : $t('alertList.filters.logStatus'), value : DEFAULT_FILTER_STRING }"
      />

      <button class="btn btn-secondary filter-reset" @click="resetFilters">{{ $t("alertList.filters.reset") }}</button>


    </div>

    <table class="list-table">
      <thead>
      <tr>
        <th>{{ $t("alertList.table.status") }}</th>
        <th>{{ $t("alertList.table.title") }}</th>
        <th class="table-input-column">{{ $t("alertList.table.input") }}</th>
        <th>{{ $t("alertList.table.lastActivity") }}</th>
        <th/>
      </tr>
      </thead>
      <tbody v-if="alerts.length === 0">
      <tr>
        <td colspan="4" class="no-alert-label">{{ $t("alertList.noAlert") }}</td>
      </tr>
      </tbody>
      <tbody v-else-if="filteredAlerts.length === 0">
      <tr>
        <td colspan="4" class="no-alert-label">{{ $t("alertList.noAlertFiltered") }}</td>
      </tr>
      </tbody>
      <tbody v-else>
      <AlertListRow
          v-for="alert in filteredAlerts" :key="alert.id ?? alert.title" :linked-alert="alert"
          @edit="navigateTo(`/alerts/${alert.id}`);"
      />
      </tbody>
    </table>
  </Panel>
</template>

<style scoped>
.plus {
  width: 24px;
  height: 14px;
  stroke-width: 3;
  flex-shrink: 0;
}

/* Filters styling */
.table-filters {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-2);

}

.list-table th:nth-child(1) { /* Status column */
  width: 100px;
}

.list-table th:nth-child(3) { /* Input column */
  width: 500px;
}

.table-search {
  min-width: 400px;

  background-color: var(--color-bg-input);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  height: 32px;
  padding: var(--space-2);

  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s,
  box-shadow 0.15s,
  background-color 0.15s;
}

.table-search:focus {
  border: 1px solid var(--color-border-subtle);
  outline: 1px solid var(--color-text-primary);
}

.filter-reset {
  font-size: var(--text-base);
  padding: var(--space-2);
  margin-left: 20px;
}

.no-alert-label {
  color: var(--color-text-dim);
  font-style: italic;
  margin: var(--space-3) 0;
  text-align: center;
  font-size: var(--text-m);
}

</style>