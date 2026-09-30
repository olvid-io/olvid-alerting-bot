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

import { onMounted, watch } from "vue";

/**
 * Sidebar collapsed state management. Used by AppSidebar (row content adjustment) and layout (grid width).
 * Stored in localStorage to survive reload.
 *
 * Choice rendering is made after hydration in onMounted to avoid server side (whose default value is false)
 * rendering overriding localStorage parameter (if set to true).
 */
const STORAGE_KEY = "alerting:sidebar-collapsed";

export const useSidebarCollapseState = () => {
    // useState gives SSR-safe shared state across the app. Default is
    // expanded. The server emits HTML with this default; the client
    // hydrates with the same default; THEN we read storage and update.
    const collapsed = useState<boolean>(
        "alerting-sidebar-collapsed",
        () => false,
    );

    onMounted(() => {
        try {
            // localStorage reading before
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved !== null) collapsed.value = saved === "1";
        } catch {
            /* storage blocked — keep default */
        }
    });

    // Persist on every change. The first client-side mutation post-hydration
    // is the read above; subsequent writes come from user toggles.
    watch(collapsed, (v) => {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
        } catch {
            /* swallow — UX still works in-memory for the session */
        }
    });

    const toggle = () => {
        collapsed.value = !collapsed.value;
    };
    const expand = () => {
        collapsed.value = false;
    };

    return { collapsed, toggle, expand };
};
