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
import { toRef, computed } from "vue";
import { LogStatus, type AlertLog } from "#shared/types/statusLog.ts";

/**
 * Log list of the most recent logs in alert view-mode (capped at 200).
 * Displays status, timestamp and status label (SENT, PARTIAL or FAILED depending on status).
 * Warning and Error logs have an expendable container to display error details.
 *
 * @param alertId Id of the alert to display the logs of
 */

const props = defineProps<{
  alertId: number | null;
}>();

const { t } = useI18n();

const { logs, isLoading, expandedIds, toggleExpanded } = useAlertLogs(
    toRef(props, "alertId"),
);
const hasLogs = computed(() => logs.value.length > 0);


/* Filters data
* If a status filter is "on", logs with corresponding status will appear in log lists.
* If it is "off", they won't appear. By default, all filters are on.
* */
const { successFilter, warningFilter, errorFilter } = {
  successFilter: ref(false),
  warningFilter: ref(false),
  errorFilter: ref(false)
}

const filteredLogs = computed(() => {
  return logs.value.filter((log) => {
    const allOff = !successFilter.value && !warningFilter.value && !errorFilter.value;

    const matchSuccess = log.status === LogStatus.Success && successFilter.value;
    const matchWarning = log.status === LogStatus.Warning && warningFilter.value;
    const matchError = log.status === LogStatus.Error && errorFilter.value;

    return allOff || matchSuccess || matchWarning || matchError;
  });
})

// Set filter button class to clicked if corresponding status filter is on
const activatedClass = (state: boolean) => {
  return state ? "logs-filter-button-clicked" : null;
}

// Only warning / error rows carry expandable details
function isExpandable(log: AlertLog): boolean {
  return log.status !== LogStatus.Success;
}

function isExpanded(log: AlertLog): boolean {
  return expandedIds.value.has(log.id)
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ` +
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  );
}

function stateLabel(status: string): string {
  switch (status) {
    case LogStatus.Success:
      return t("alertLog.status.sent");
    case LogStatus.Warning:
      return t("alertLog.status.partial");
    case LogStatus.Error:
      return t("alertLog.status.failed");
    default:
      return status;
  }
}
</script>

<template>
  <div class="alert-logs">
    <h4 class="alert-section-label">{{ $t("alertLog.title") }}</h4>

    <div class="logs-list-container">
      <div class="logs-filter-container">
        <button
            class="logs-filter-button"
            :class="activatedClass(successFilter)"
            @click="successFilter = !successFilter"
        >
          {{ $t("logStatus.success") }}
        </button>
        <button
            class="logs-filter-button"
            :class="activatedClass(warningFilter)"
            @click="warningFilter = !warningFilter"
        >
          {{ $t("logStatus.warning") }}
        </button>
        <button
            class="logs-filter-button"
            :class="activatedClass(errorFilter)"
            @click="errorFilter = !errorFilter"
        >
          {{ $t("logStatus.error") }}
        </button>
      </div>


      <div v-if="!hasLogs && !isLoading" class="logs-empty">
        {{ $t("alertLog.empty") }}
      </div>
      <div v-else-if="!hasLogs && isLoading" class="logs-empty">
        {{ $t("common.loadingEllipsis") }}
      </div>

      <ol v-else class="logs-list">
        <li
            v-for="log in filteredLogs"
            :key="log.id"
            class="log-row"
            :class="[
          `log-${log.status}`,
          { 'is-expanded': isExpanded(log) },
        ]"
        >
          <button
              v-if="isExpandable(log)"
              type="button"
              class="log-chevron"
              :aria-expanded="expandedIds.has(log.id)"
              :title="
            isExpanded(log)
              ? $t('alertLog.hideDetails')
              : $t('alertLog.showDetails')
          "
              @click="toggleExpanded(log.id)"
          >
            <span class="chevron-icon"> ▸ </span>
          </button>
          <span v-else class="log-chevron-placeholder"/>

          <span class="log-dot" :class="`dot-${log.status}`"/>
          <time class="log-time" :datetime="log.createdAt">{{
            formatTimestamp(log.createdAt)
            }}
          </time>
          <span class="log-state">{{ stateLabel(log.status) }}</span>

          <div
              v-if="isExpanded(log)"
              class="log-details"
              role="region"
          >
            <!-- Stage line — only shown when known. Gives immediate context
                 ("this failed at fetch") without decoding the message. -->
            <p v-if="log.details?.stage" class="log-detail-line">
              <span class="log-detail-key">{{ $t("alertLog.detail.stage") }}:</span>
              <span class="log-detail-value">
              {{ $t(`alertLog.stage.${log.details.stage}`) }}
            </span>
            </p>

            <!-- Top-level error — when the run bailed before dispatch or
                 the notifier threw. -->
            <pre v-if="log.error" class="log-error">{{ log.error }}</pre>

            <!-- Per-channel table — one row per output channel exercised
                 in the bundle fan-out. -->
            <table
                v-if="log.details?.channels?.length"
                class="channel-table"
                :aria-label="$t('alertLog.channelsAria')"
            >
              <thead>
              <tr>
                <th>{{ $t("alertLog.channelTable.channel") }}</th>
                <th>{{ $t("alertLog.channelTable.recipients") }}</th>
                <th>{{ $t("alertLog.channelTable.outcome") }}</th>
                <th>{{ $t("alertLog.channelTable.error") }}</th>
              </tr>
              </thead>
              <tbody>
              <tr
                  v-for="(ch, i) in log.details.channels"
                  :key="i"
                  :class="ch.ok ? 'channel-ok' : 'channel-fail'"
              >
                <td>{{ $t(`alertLog.channel.${ch.channel}`) }}</td>
                <td class="tabular">{{ ch.recipients }}</td>
                <td>
                  {{
                  ch.ok
                  ? $t("alertLog.channelTable.ok")
                  : $t("alertLog.channelTable.fail")
                  }}
                </td>
                <td class="channel-error">{{ ch.error ?? "" }}</td>
              </tr>
              </tbody>
            </table>

            <p v-if="!log.error && !log.details?.channels?.length" class="log-detail-line">
              {{ $t("alertLog.noAdditionalDetail") }}
            </p>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.alert-logs {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ── Per-channel table ─────────────────────────────────────────────────── */
.channel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
}

.channel-table th,
.channel-table td {
  padding: 4px var(--space-2);
  text-align: left;
  border-bottom: 1px solid var(--color-border-subtle);
}

.channel-table th {
  color: var(--color-text-muted);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 10px;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.channel-ok td {
  color: var(--color-text-secondary);
}

.channel-fail td {
  color: var(--color-danger-text, var(--color-danger));
}

.channel-error {
  font-family: var(--font-mono) monospace;
  word-break: break-word;
}
</style>
