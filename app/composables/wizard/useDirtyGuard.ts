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

import { ref, computed, onMounted, onBeforeUnmount, type Ref } from "vue";
import {
    onBeforeRouteLeave,
    onBeforeRouteUpdate,
    type RouteLocationNormalized,
} from "vue-router";

/**
 * Unsaved-changes guard for AlertWizard.
 *
 * Snapshots the form on mount, intercepts ANY in-app navigation away from
 * the page while dirty, and warns on tab-close / hard refresh. The consumer
 * decides what to do when blocked (typically: show a "Discard / Save draft /
 * Continue editing" prompt).
 */
export const useDirtyGuard = <T>(formRef: Ref<T>) => {
    const snapshot = ref("");
    const pendingLeave = ref<RouteLocationNormalized | null>(null);
    const bypass = ref(false);
    const showDiscardPrompt = ref(false);

    const isDirty = computed(
        () => JSON.stringify(formRef.value) !== snapshot.value,
    );
    const takeSnapshot = () => {
        snapshot.value = JSON.stringify(formRef.value);
    };
    const allowNextLeave = () => {
        bypass.value = true;
    };

    // onBeforeRouteLeave fires when the route definition changes;.
    const guardNavigation = (to: RouteLocationNormalized) => {
        if (bypass.value) {
            bypass.value = false;
            return true;
        }
        if (!isDirty.value) return true;
        pendingLeave.value = to;
        showDiscardPrompt.value = true;
        return false;
    };
    onBeforeRouteLeave(guardNavigation);
    onBeforeRouteUpdate(guardNavigation);

    // Browser-level: tab close, hard refresh, address-bar nav.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
        if (isDirty.value) e.preventDefault();
    };

    onMounted(() => {
        window.addEventListener("beforeunload", onBeforeUnload);
        takeSnapshot();
    });
    onBeforeUnmount(() =>
        window.removeEventListener("beforeunload", onBeforeUnload),
    );

    const dismissPrompt = () => {
        showDiscardPrompt.value = false;
        pendingLeave.value = null;
    };

    return {
        isDirty,
        showDiscardPrompt,
        pendingLeave,
        takeSnapshot,
        allowNextLeave,
        dismissPrompt,
    };
};
