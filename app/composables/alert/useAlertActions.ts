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

import { ref, type Ref } from "vue";
import { AlertStatus, type AlertModel } from "#shared/types/alert.ts";
import { alertService } from "~/utils/alertService.ts";


/**
 * Alert-scoped write actions.
 *
 * Two layers on one object :
 * - Primitives : no binding with provided alert (can be used independently)
 * - Bound flows : require binding with an alert
 *
 * @param alert optional : if not provided, bound flows methods won't be wired
 */

// TODO : change to remove "any"
export const useAlertActions = (alert?: Ref<AlertModel>) => {
    const saving = ref(false);

    const saveAlert = async (payload: any, opts: { isExisting: boolean }) => {
        saving.value = true;
        try {
            const res: any = opts.isExisting
                ? await alertService.updateAlert(payload)
                : await alertService.saveAlert(payload);
            return res?.data as AlertModel | undefined;
        } finally {
            saving.value = false;
        }
        clientLogger.log("Alert saved successfully.");
    };

    const deleteAlert = async (id: number) => {
        clientLogger.log("Alert deleted");
        return alertService.delete(id);
    };

    const setStatus = async (id: number, status: AlertStatus) => {
        const res: any = await alertService.setStatus(id, status);
        return (res?.data?.status ?? status) as AlertStatus;
    };

    // ── Bound flows ─────────────────────────────────────────────────────────
    // These read the current alert from `form`. Callers that don't bind a
    // form (e.g. the wizard) shouldn't be reaching for them — they throw so
    // the mistake is visible instead of silently a no-op.
    const requireAlert = (): Ref<AlertModel> => {
        if (!alert) {
            throw new Error(
                "useAlertActions: bound-flow requested without a `form` ref",
            );
        }
        return alert;
    };

    /** Runtime-state keys the engine stamps onto alertParams during polling
     *  or monitoring. A duplicated alert must NOT inherit them — the copy
     *  should evaluate from a clean baseline on its first tick. Kept next
     *  to `duplicateAlert` because it's the only caller. */
    const RUNTIME_PARAM_KEYS = new Set([
        "_lastFired",
        "_lastPolledAt",
        "_lastHash",
        "_baseline",
        "_lastStatus"
    ]);

    /**
     * Resets timestamps and instance-specific parameters to have a clean copy.
     * @param params params to reset
     */
    const cleanAlertParamsForCopy = (params: any): any => {
        if (!params || typeof params !== "object") return params ?? {};
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(params)) {
            if (!RUNTIME_PARAM_KEYS.has(k)) cleaned[k] = v;
        }
        return cleaned;
    };

    const openEditAlert = () => {
        const f = requireAlert();
        if (!f.value.id) return;
        return navigateTo(`/alerts/${f.value.id}?edit=1`);
    };

    const duplicateAlert = async (newTitle: string) => {
        const f = requireAlert();
        const trimmed = newTitle.trim();
        if (!trimmed || !f.value.id) return null;

        const { fetchAlerts } = useAlertFetching();
        const payload = {
            id: null,
            token: null,
            title: trimmed,
            description: f.value.description ?? "",
            input: f.value.input,
            status: f.value.status === AlertStatus.Draft ? AlertStatus.Draft : AlertStatus.Inactive,
            alertParams: cleanAlertParamsForCopy(f.value.alertParams),
            bundles: f.value.bundles.map((b) => ({
                // No `id` — the DB assigns a fresh one for each cloned bundle.
                name: b.name,
                formating: b.formating,
                custom_script: b.custom_script,
                mailSubject: b.mailSubject,
                outputs: b.outputs,
            })),
        };

        const saved = await saveAlert(payload, { isExisting: false });
        await fetchAlerts();
        if (saved?.id) await navigateTo(`/alerts/${saved.id}`);

        clientLogger.log(`Alert ${trimmed} duplicated`)

        return saved;
    };

    const toggleStatus = async () => {
        const f = requireAlert();
        if (!f.value.id) return;
        if ((f.value.bundles?.length ?? 0) === 0) return;

        const next =
            f.value.status === AlertStatus.Active
                ? AlertStatus.Inactive
                : AlertStatus.Active;

        const newStatus = await setStatus(f.value.id, next);
        // Optimistic mutation of both the local form and the shared alerts
        // list so the header doesn't flash. Mutating the alerts entry in
        // place (rather than replacing the row) avoids re-evaluating the
        // page's `alert` computed and cascading through `fillFrom`.
        f.value.status = newStatus;
        const { alerts } = useAlertFetching();
        const idx = alerts.value.findIndex((a) => a.id === f.value.id);
        if (idx >= 0 && alerts.value[idx]) {
            alerts.value[idx].status = newStatus;
        }
    };

    const removeAlert = async () => {
        const f = requireAlert();
        if (!f.value.id) return;
        const { fetchAlerts } = useAlertFetching();
        await deleteAlert(f.value.id);
        await fetchAlerts();
        await navigateTo("/");

        clientLogger.log(`Alert deleted`)
    };

    return {
        saving,
        // primitives
        saveAlert,
        deleteAlert,
        setStatus,
        // bound flows
        openEditAlert,
        duplicateAlert,
        toggleStatus,
        removeAlert,
    };
};
