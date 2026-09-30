/*
 * Olvid Alerting
 * Copyright © 2026 Olvid SAS
 *
 * Olvid Alerting is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * Olvid Alerting is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Olvid Alerting. If not, see <https://www.gnu.org/licenses/>.
 */

import { ref, watch, onMounted, onBeforeUnmount, type Ref } from "vue";
import type { AlertLog } from "#shared/types/statusLog.ts";

/**
 * Fetches the AlertLog rows for a given alert and refreshes them every
 * minute so the panel stays in step with the heartbeat writer. Also owns
 * the "expanded row" state so parent components don't need to track it.
 *
 * Takes the alert id as a reactive input — the AlertView container mounts
 * this once and passes a ref that changes when the URL changes, so the
 * composable re-fetches automatically without needing remount.
 *
 * Auto-refresh uses `setInterval`, cleared on unmount. Skipped when the
 * alertId is null (unsaved alert / initial render).
 */
export const useAlertLogs = (alertId: Ref<number | null | undefined>) => {
    const logs = ref<AlertLog[]>([]);
    const isLoading = ref(false);
    const expandedIds = ref<Set<number>>(new Set());

    const fetchLogs = async () => {
        const id = alertId.value;
        if (!id) {
            logs.value = [];
            return;
        }
        isLoading.value = true;
        try {
            logs.value = await $fetch<AlertLog[]>(`/api/alerts/${id}/logs`);
        } catch (e) {
            clientLogger.error("Fetch failed :", e);
        } finally {
            isLoading.value = false;
        }
    };

    const toggleExpanded = (logId: number) => {
        const next = new Set(expandedIds.value);
        if (next.has(logId)) next.delete(logId);
        else next.add(logId);
        expandedIds.value = next;
    };

    // Refresh cadence matches the heartbeat's 1-minute tick. If the panell
    // becomes visible mid-tick, the initial fetch already covers whatever
    // happened before mount — no need to poll faster.
    const REFRESH_INTERVAL_MS = 60_000;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
        if (timer) return;
        timer = setInterval(fetchLogs, REFRESH_INTERVAL_MS);
    };
    const stop = () => {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
    };

    onMounted(() => {
        fetchLogs();
        start();
    });
    onBeforeUnmount(stop);

    // React to the alertId changing (route switch inside the SPA).
    watch(alertId, () => {
        expandedIds.value = new Set();
        fetchLogs();
    });

    return {
        logs,
        isLoading,
        expandedIds,
        toggleExpanded,
        refresh: fetchLogs,
    };
};
