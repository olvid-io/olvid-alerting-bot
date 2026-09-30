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

import type { Ref } from "vue";
import type { AlertModel } from "#shared/types/alert.ts";
import type { RouteLocationNormalized } from "#vue-router";

/**
 * Wizard's back-to-list + discard flow.
 */
export const useWizardLeave = (opts: {
    form: Ref<AlertModel>;
    save: (forceDraft: boolean, navigateAfter: boolean) => Promise<void>;
    isDirty: Ref<boolean>;
    showDiscardPrompt: Ref<boolean>;
    pendingLeave: Ref<RouteLocationNormalized | null>;
    allowNextLeave: () => void;
}) => {
    const finishLeave = (defaultTarget: string) => {
        opts.showDiscardPrompt.value = false;
        const target = opts.pendingLeave.value;
        opts.pendingLeave.value = null;
        opts.allowNextLeave();
        return navigateTo(target ?? defaultTarget);
    };

    const onBackToList = () => {
        if (opts.isDirty.value) {
            opts.showDiscardPrompt.value = true;
        } else {
            const url = opts.form.value.id ?? "list";
            navigateTo("/alerts/" + url);
        }
    };

    const onDiscard = () => finishLeave("/");

    const onSaveDraftAndLeave = async () => {
        await opts.save(true, false);
        if (!opts.form.value.id) return; // save failed — keep the prompt up
        await finishLeave("/alerts/" + opts.form.value.id);
    };

    // Discard prompt's primary action when the alert is complete: save it
    // runnably (goes through the normal auto-status policy) and leave.
    const onSaveAlertAndLeave = async () => {
        await opts.save(false, false);
        if (!opts.form.value.id) return;
        await finishLeave("/alerts/" + opts.form.value.id);
    };

    return {
        onBackToList,
        onDiscard,
        onSaveDraftAndLeave,
        onSaveAlertAndLeave,
    };
};
