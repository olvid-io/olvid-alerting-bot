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

import { ref, computed } from "vue";
import { ConditionKind } from "#shared/types/condition.ts";
import { PollingFormat } from "#shared/types/polling.ts";
import { paramCleaner } from "#shared/condition/paramCleaner.ts";
import { getErrorMessage } from "~/utils/errors.ts";

/**
 * Polling-side state for FormatEditor: the parsed source tree (XML/JSON
 * fetched + parsed by the server's polling engine) plus the loader.
 */
export const useFormatEditorPolling = (
    getAlertParams: () => Record<string, any> | null | undefined,
) => {
    const { t } = useI18n();

    const parsedTree = ref<unknown>(null);
    const pollingLoading = ref(false);
    const pollingError = ref("");

    const rootEntries = computed<Array<[string, unknown]>>(() =>
        parsedTree.value && typeof parsedTree.value === "object"
            ? Object.entries(parsedTree.value as Record<string, unknown>)
            : [],
    );

    const watchedPaths = computed<string[]>(() => {
        const c = paramCleaner.migrateCondition(getAlertParams()?.condition);
        return c.kind === ConditionKind.Rule ? c.paths : [];
    });

    const retrievePolling = async () => {
        const params = getAlertParams() ?? {};
        const url = params.url;
        const format = params.format ?? PollingFormat.XML;
        if (!url) {
            pollingError.value = t("formatEditor.errors.noUrlPolling");
            return;
        }
        pollingLoading.value = true;
        pollingError.value = "";
        try {
            const res = await $fetch<{
                ok: boolean;
                parsed?: unknown;
                error?: string;
            }>("/api/poll/retrieve", { method: "POST", body: { url, format } });
            if (!res.ok) {
                pollingError.value =
                    res.error ?? t("formatEditor.errors.failedToRetrieveSource");
                parsedTree.value = null;
            } else {
                parsedTree.value = res.parsed;
            }
        } catch (e) {
            pollingError.value = getErrorMessage(
                e,
                t("conditionEditor.errors.networkError"),
            );
        } finally {
            pollingLoading.value = false;
        }
    };

    return {
        parsedTree,
        rootEntries,
        watchedPaths,
        pollingLoading,
        pollingError,
        retrievePolling,
    };
};
