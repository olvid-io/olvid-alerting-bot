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

// Browser-side wrapper around the unified `run this alert once`
// endpoint. Keeps $fetch and URL knowledge out of components.
//
// Components call `testService.testAlert(id)` and get back an
// AlertTestResult — no knowledge of polling vs monitoring, no URL,
// no HTTP verb.

import type { AlertTestResult } from "#shared/types/testResult";

export const testService = {
    async testAlert(alertId: number): Promise<AlertTestResult> {
        return await $fetch<AlertTestResult>(`/api/alerts/${alertId}/test`, {
            method: "POST",
        });
    },
};
