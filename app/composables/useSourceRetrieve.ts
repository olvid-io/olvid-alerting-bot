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

import { ref, computed, onMounted, watch } from "vue";
import { PollingFormat } from "#shared/types/polling";
import { getErrorMessage } from "~/utils/errors";

/**
 * Fetches the current source snapshot for a polling alert and keeps it
 * in sync with `url` / `format`. Handles the initial mount fetch and
 * re-fetches whenever either input changes.
 *
 * @param urlGetter    Reactive getter for the URL (accessor pattern to
 *                     avoid needing to wrap the caller's ref).
 * @param formatGetter Reactive getter for the polling format.
 * @param onPayload    Callback fired after every retrieve — parent uses
 *                     it to bubble the parsed payload up to siblings
 *                     (e.g. the bundle preview).
 */
export const useSourceRetrieve = (
    urlGetter: () => string | undefined,
    formatGetter: () => string | undefined,
    onPayload?: (payload: unknown | null) => void,
) => {
    const { t } = useI18n();

    const loading = ref(false);
    const error = ref("");
    const parsed = ref<any>(null);
    const raw = ref("");
    const retrieved = computed(() => parsed.value !== null);

    /** Top-level keys of the parsed payload — surfaced so the picker can
     *  iterate them without redoing Object.entries every render. */
    const rootEntries = computed<Array<[string, any]>>(() => {
        if (!parsed.value) return [];
        return Object.entries(parsed.value);
    });

    async function retrieve() {
        const url = (urlGetter() ?? "").trim();
        const format = formatGetter() ?? PollingFormat.XML;
        if (!url) {
            error.value = t("conditionEditor.errors.noUrl");
            parsed.value = null;
            return;
        }
        loading.value = true;
        error.value = "";
        try {
            const res: any = await $fetch("/api/poll/retrieve", {
                method: "POST",
                body: { url, format },
            });
            if (!res.ok) {
                error.value = res.error ?? t("conditionEditor.errors.failedToRetrieve");
                parsed.value = null;
                raw.value = res.raw ?? "";
                onPayload?.(null);
            } else {
                parsed.value = res.parsed;
                raw.value = res.raw ?? "";
                onPayload?.(res.parsed);
            }
        } catch (e) {
            error.value = getErrorMessage(
                e,
                t("conditionEditor.errors.networkError"),
            );
            parsed.value = null;
        } finally {
            loading.value = false;
        }
    }

    onMounted(retrieve);
    watch([urlGetter, formatGetter], retrieve);

    return { loading, error, parsed, raw, retrieved, rootEntries, retrieve };
};
