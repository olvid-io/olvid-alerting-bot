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

import { computed, type ComputedRef } from "vue";
import { Formatting } from "#shared/types/bundle.ts";

/**
 * i18n-labelled format options for the bundle editor's `<Select>`.
 *
 * The list depends on the alert's source: polling alerts pick between
 * the parsed-source variants (`PollingDefault` / `PollingCustom`);
 * webhook + monitoring share the raw / simple / custom family. Kept in a
 * composable so BundleEditDialog stays render-only and useBundleEditor
 * stays translation-free (its state has no business owning UI copy).
 */
export const useBundleFormatOptions = (isPolling: ComputedRef<boolean>) => {
    const { t } = useI18n();

    const formatOptions = computed(() =>
        isPolling.value
            ? [
                {
                    value: Formatting.PollingDefault,
                    label: t("bundleRow.format.pollingDefault"),
                },
                {
                    value: Formatting.PollingCustom,
                    label: t("bundleRow.format.pollingCustom"),
                },
            ]
            : [
                {
                    value: Formatting.WebhookRaw,
                    label: t("bundleRow.format.unformatted"),
                },
                { value: Formatting.Simple, label: t("bundleRow.format.simple") },
                { value: Formatting.Custom, label: t("bundleRow.format.custom") },
            ],
    );

    return { formatOptions };
};
