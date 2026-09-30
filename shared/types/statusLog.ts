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

// Defines one row of the AlertLog table
// Shows status of an alert dispatch run, timestamp with optional details
import type { DispatchDetails } from "./dispatchStrategy";

export const LogStatus = {
    Success: "success",
    Warning: "warning",
    Error: "error",
} as const;
export type LogStatus = (typeof LogStatus)[keyof typeof LogStatus];

export type AlertLog = {
    id: number;
    alertId: number;
    status: LogStatus;
    error?: string;
    details?: DispatchDetails;
    createdAt: string;
};
