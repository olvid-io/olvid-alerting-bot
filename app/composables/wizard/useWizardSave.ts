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
import { AlertStatus, type AlertModel } from "#shared/types/alert.ts";
import { paramCleaner } from "#shared/condition/paramCleaner.ts";
import { getErrorData, getErrorMessage } from "~/utils/errors.ts";

/**
 * Wizard's save semantics and the actual save action.
 * *
 * Everything the wizard *does* on save lives here so AlertWizard stays
 * a layout + wiring file.
 */
export const useWizardSave = (opts: {
    form: Ref<AlertModel>;
    isPolling: ComputedRef<boolean>;
    isExisting: ComputedRef<boolean>;
    hasEmptyBundle: ComputedRef<boolean>;
    isPollingConfigComplete: ComputedRef<boolean>;
    isConditionComplete: ComputedRef<boolean>;
    saveAlert: (
        payload: unknown,
        o: { isExisting: boolean },
    ) => Promise<AlertModel | undefined>;
    takeSnapshot: () => void;
    allowNextLeave: () => void;
    fetchAlerts: () => Promise<void>;
}) => {
    const { t } = useI18n();

    const canSaveDraft = computed(() => !!opts.form.value.title);

    // Final status the alert SHOULD have after save (modulo the explicit
    // "save as draft" button which forces Draft).
    const wouldBeComplete = computed(
        () =>
            !!opts.form.value.title &&
            !!opts.form.value.input &&
            opts.isPollingConfigComplete.value &&
            opts.isConditionComplete.value &&
            opts.form.value.bundles.length > 0 &&
            !opts.hasEmptyBundle.value,
    );

    // Auto-status policy on save:
    //   - Incomplete (no title / no source / no bundles / an empty bundle)
    //     → Draft.
    //   - Existing Inactive stays Inactive — the AlertView toggle is the
    //     sole way to flip a runnable alert on/off after creation.
    //   - Everything else (new alert or existing draft that just became
    //     complete) → Active. The user configured bundles, they want it
    //     running.
    // The "save as draft" button in the footer bypasses this via forceDraft.
    const effectiveFinalStatus = computed<AlertStatus>(() => {
        if (!wouldBeComplete.value) return AlertStatus.Draft;
        if (
            opts.isExisting.value &&
            opts.form.value.status === AlertStatus.Inactive
        ) {
            return AlertStatus.Inactive;
        }
        return AlertStatus.Active;
    });

    const buildPayload = (status: AlertStatus) => {
        // Clean the polling condition + firing behavior for storage.
        let ap: Record<string, unknown> = {
            ...(opts.form.value.alertParams ?? {}),
        };

        if (opts.isPolling.value && ap.condition) {
            ap.condition = paramCleaner.compactCondition(ap.condition);
            ap = paramCleaner.cleanFiringBehaviour(ap as PollingParams);
        }
        return {
            id: opts.form.value.id,
            title: opts.form.value.title,
            description: opts.form.value.description,
            input: opts.form.value.input,
            status,
            alertParams: ap,
            bundles: opts.form.value.bundles.map((b) => ({
                id: b.id,
                name: b.name,
                formating: b.formating,
                custom_script: b.custom_script,
                mailSubject: b.mailSubject,
                outputs: b.outputs,
            })),
        };
    };

    const save = async (forceDraft: boolean, navigateAfter: boolean) => {
        if (!opts.form.value.title) {
            alert(t("wizard.validation.titleMandatory"));
            return;
        }
        const status = forceDraft ? AlertStatus.Draft : effectiveFinalStatus.value;
        try {
            const saved = await opts.saveAlert(buildPayload(status), {
                isExisting: opts.isExisting.value,
            });
            if (saved) {
                opts.form.value.id = saved.id ?? opts.form.value.id;
                opts.form.value.status = saved.status ?? opts.form.value.status;
                opts.form.value.token = saved.token ?? opts.form.value.token;
                const savedBundles = (saved.bundles ?? []) as Array<{ id?: number }>;
                opts.form.value.bundles = opts.form.value.bundles.map((b, i) => ({
                    ...b,
                    id: savedBundles[i]?.id ?? b.id,
                }));
                opts.takeSnapshot(); // clean baseline after a successful persist
            }
            await opts.fetchAlerts();
            if (navigateAfter && opts.form.value.id) {
                opts.allowNextLeave();
                await navigateTo("/alerts/" + opts.form.value.id);
            }
        } catch (error: unknown) {
            clientLogger.error("Error saving :", getErrorData(error) ?? error);
            alert(
                `${t("wizard.errors.saving")}\n\n${getErrorMessage(error, t("common.unknownError"))}`,
            );
        }
    };

    return { canSaveDraft, wouldBeComplete, effectiveFinalStatus, save };
};
