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

import type { AlertModel } from "#shared/types/alert.ts";
import { alertService } from "~/utils/alertService.ts";

/**
 * Alerts fetcher shared across all components (used in AppSidebar and list page).
 * Fetches all alerts and store them in a global ref with useState shared between components.
 * - alerts : global ref containing an array of AlertModels corresponding to all app alerts
 * - alertsLoading : global ref to boolean value, true while fetching is ongoing
 * - fetchAlerts : async function retrieving alerts from database
 */
export const useAlertFetching = () => {
    const alerts = useState<AlertModel[]>("alerts", () => []);
    const alertsLoading = useState<boolean>("alertsLoading", () => false);

    const fetchAlerts = async () => {
        alertsLoading.value = true;
        try {
            const result = await alertService.getAll();
            alerts.value = Array.isArray(result) ? result : [];
        } catch (e) {
            // Any failure (401 after logout, network drop, backend crash) wipes the
            // cached list — otherwise the sidebar would keep showing stale entries
            // that the user is no longer authorized to see.
            alerts.value = [];
            clientLogger.error("Error loading alerts :", e);
        } finally {
            alertsLoading.value = false;
        }
    };

    return {
        alerts,
        alertsLoading,
        fetchAlerts
    };
};
