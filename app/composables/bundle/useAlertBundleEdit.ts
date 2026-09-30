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

import { ref, computed, type Ref } from "vue";
import type { AlertModel } from "#shared/types/alert.ts";
import type { BundleModel } from "#shared/types/bundle.ts";
import { getErrorMessage } from "~/utils/errors.ts";

/**
 * Bundle-editor modal state + save path used by the view-mode alert page.
 *
 *   - `editingBundleIndex` / `editingBundle` — which row is being edited.
 *   - `openBundleEditor(i)` / `closeBundleEditor()` — dialog wiring.
 *   - `onSaveBundle({ index, bundle })` — patches the target bundle onto
 *     `form.bundles`, POSTs the alert through `saveAlert`, and refreshes
 *     the shared list on success. Create + delete stay wizard-only.
 *
 * Errors surface as a native alert() with translated copy, matching the
 * previous inline behavior.
 */
export const useAlertBundleEdit = (
    form: Ref<AlertModel>,
    saveAlert: (
        payload: unknown,
        opts: { isExisting: boolean },
    ) => Promise<unknown>,
    fetchAlerts: () => Promise<void>,
) => {
    const { t } = useI18n();

    const editingBundleIndex = ref<number | null>(null);
    const editingBundle = computed<BundleModel | null>(() =>
        editingBundleIndex.value !== null
            ? (form.value.bundles[editingBundleIndex.value] ?? null)
            : null,
    );

    const openBundleEditor = (index: number) => {
        editingBundleIndex.value = index;
    };
    const closeBundleEditor = () => {
        editingBundleIndex.value = null;
    };

    const onSaveBundle = async ({
                                    index,
                                    bundle,
                                }: {
        index: number | null;
        bundle: BundleModel;
    }) => {
        // View mode only edits existing bundles — create and delete is a
        // wizard-only flow and can't be reached from here.
        if (index === null || !form.value.id) return;
        const updated = form.value.bundles.map((b, i) =>
            i === index ? bundle : b,
        );
        const payload = {
            id: form.value.id,
            title: form.value.title,
            description: form.value.description,
            input: form.value.input,
            status: form.value.status,
            alertParams: form.value.alertParams ?? {},
            bundles: updated.map((b) => ({
                id: b.id,
                name: b.name,
                formating: b.formating,
                custom_script: b.custom_script,
                mailSubject: b.mailSubject,
                outputs: b.outputs,
            })),
        };
        try {
            await saveAlert(payload, { isExisting: true });
            await fetchAlerts();
            closeBundleEditor();
        } catch (error: unknown) {
            clientLogger.error("Error saving bundle :", error);
            alert(
                `${t("editor.errors.savingBundle")}\n\n${getErrorMessage(error, t("common.unknownError"))}`,
            );
        }
    };

    return {
        editingBundleIndex,
        editingBundle,
        openBundleEditor,
        closeBundleEditor,
        onSaveBundle,
    };
};
