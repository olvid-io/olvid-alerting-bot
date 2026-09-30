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

import { ref, watch, type Ref } from "vue";
import type { AlertModel } from "#shared/types/alert.ts";

/**
 * Confirm-and-rename dialog for the "duplicate alert" flow. Owns:
 *   - `open`         — dialog visibility.
 *   - `draftTitle`   — the new alert's title (v-model on the rename input).
 *   - `inputRef`     — template ref so we can focus + select on open.
 *   - `openDialog` / `cancel` / `confirm` — the trio the ConfirmDialog wires.
 *
 * Side effects (save + navigation) are delegated to `duplicateAlert`, so
 * this composable stays UI-flow only. Errors surface as a native
 * alert() with translated copy, matching the previous inline behavior.
 */
export const useAlertDuplicateDialog = (
    alert: Ref<AlertModel>,
    duplicateAlert: (newTitle: string) => Promise<unknown>,
) => {
    const { t } = useI18n();

    const open = ref(false);
    const draftTitle = ref("");
    const inputRef = ref<HTMLInputElement | null>(null);

    // Reseed the rename input every time the dialog opens so a previous
    // edit doesn't leak into the next attempt.
    watch(open, (isOpen) => {
        if (!isOpen) return;
        const base = (alert.value.title ?? "").trim() || t("common.untitled");
        draftTitle.value = base + t("duplicateModal.copySuffix");
        requestAnimationFrame(() => {
            inputRef.value?.focus();
            inputRef.value?.select();
        });
    });

    const openDialog = () => {
        open.value = true;
    };
    const cancel = () => {
        open.value = false;
    };
    const confirm = async () => {
        try {
            await duplicateAlert(draftTitle.value);
            open.value = false;
        } catch (error: unknown) {
            clientLogger.error("Error duplicating alert:", error);
            /*
            clientLogger.error(
              `${t("editor.errors.duplicating")}\n\n${getErrorMessage(error, t("common.unknownError"))}`,
            );
            */
        }
    };

    return { open, draftTitle, inputRef, openDialog, cancel, confirm };
};
