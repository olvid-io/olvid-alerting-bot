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

import { computed, type ComputedRef, type Ref } from "vue";
import type { AlertModel } from "#shared/types/alert.ts";

/**
 * Pure view-mode derivations off an alert form. No mutations, no side
 * effects — just translated / truncated / composed strings that AlertView
 * used to compute inline. Splitting them out lets AlertView be almost
 * template-only.
 */
export const useAlertViewDisplay = (
    form: Ref<AlertModel>,
    isPolling: ComputedRef<boolean>,
    isMonitoring: ComputedRef<boolean>,
    isWebhook: ComputedRef<boolean>,
) => {
    const { t } = useI18n();

    const inputTitle = computed(() => {
        if (isPolling.value) return t("editor.view.inputTitle.polling");
        if (isMonitoring.value) return t("editor.view.inputTitle.monitoring");
        if (isWebhook.value) return t("editor.view.inputTitle.webhook");
        return form.value.input
            ? t("editor.view.inputTitle.generic", { input: form.value.input })
            : undefined;
    });

    const DESCRIPTION_MAX = 100;
    const truncatedDescription = computed(() => {
        const d = (form.value.description ?? "").trim();
        if (d.length <= DESCRIPTION_MAX) return d;
        return d.slice(0, DESCRIPTION_MAX).trimEnd() + "…";
    });

    const webhookUrl = computed(() => {
        if (!form.value.token) return "";
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        return `${origin}/api/webhooks/${form.value.token}`;
    });

    return { inputTitle, truncatedDescription, webhookUrl };
};
