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

import { ref, watch, nextTick } from "vue";
import { expandPath, hasWildcard } from "#shared/condition/pathExpand";

/**
 * State + validation for the inline "type a watched path" input inside
 * WatchedFieldsPanel. Wraps the toggle-open / editing-buffer / commit /
 * cancel dance and validates new entries against the retrieved snapshot
 * (when one is available).
 *
 * @param existing  Reactive getter for the current chip list (used to
 *                  dedupe silently — repeated paste doesn't error).
 * @param parsed    Reactive getter for the retrieved snapshot (used to
 *                  validate that the typed path resolves against real
 *                  data; skipped when no snapshot is available yet).
 * @param onAdd     Called with the accepted path on a successful commit.
 */
export const useWatchedPathInput = (
    existing: () => string[],
    parsed: () => any,
    onAdd: (path: string) => void,
) => {
    const { t } = useI18n();

    const isAdding = ref(false);
    const newPath = ref("");
    const addError = ref("");
    const inputRef = ref<HTMLInputElement | null>(null);

    // Typing clears any pending error so the input doesn't look stuck.
    watch(newPath, () => {
        if (addError.value) addError.value = "";
    });

    async function startAdding() {
        isAdding.value = true;
        newPath.value = "";
        addError.value = "";
        await nextTick();
        inputRef.value?.focus();
    }

    function commitAdd() {
        const v = newPath.value.trim();
        if (!v) {
            // Empty commit closes the input without touching the chip list —
            // the user changed their mind mid-typing.
            isAdding.value = false;
            addError.value = "";
            return;
        }
        if (existing().includes(v)) {
            // Silent dedupe. Keeps the input open so the user can paste another
            // variant right away.
            newPath.value = "";
            addError.value = "";
            return;
        }

        // Validate against the retrieved snapshot when available. Wildcards
        // are stored VERBATIM (not expanded into many chips): the server-side
        // evaluator re-expands them on every poll, so a pattern like
        // `..temperatura.maxima` automatically picks up new array entries.
        const p = parsed();
        if (p !== null) {
            const expanded = expandPath(v, p);
            if (expanded.length === 0) {
                addError.value = hasWildcard(v)
                    ? t("conditionEditor.validation.patternNoMatch", { value: v })
                    : t("conditionEditor.validation.pathNotInSource", { value: v });
                return;
            }
        }

        onAdd(v);
        newPath.value = "";
        addError.value = "";
    }

    function cancelAdd() {
        isAdding.value = false;
        newPath.value = "";
        addError.value = "";
    }

    return {
        isAdding,
        newPath,
        addError,
        inputRef,
        startAdding,
        commitAdd,
        cancelAdd,
    };
};
