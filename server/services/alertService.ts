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

/**
 * Domain service for alerts.
 *
 * What lives here:
 *   - Status computation rules (draft / inactive / active).
 *   - "Can't activate an alert that has no bundles" rule.
 *   - Any future cross-cutting rule (e.g. validation, audit logging).
 *
 * What does NOT live here:
 *   - Raw Prisma calls         → alertRepository
 *   - HTTP / route handling    → server/api/*
 *   - Sending messages         → server/services/notifierService (rename of alertManager)
 *
 * The service orchestrates: it computes the right status, validates the
 * inputs at the domain level, and delegates persistence to the repository.
 * Testable without a database — pass a stubbed `alertRepository` in tests.
 */

import { AlertStatus } from "#shared/types/alert";
import { alertRepository } from "../repositories/alertRepository";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("Auth Service");

// ── Status rules ────────────────────────────────────────────────────────────
//
// Rules (single source of truth):
//   - draft    : caller explicitly wants draft, OR no `input` selected.
//   - active   : caller wants active AND alert has ≥1 bundle.
//   - inactive : everything else with an `input`.
//
// The caller's intent comes from `requested` (the status value in the
// incoming payload). We map their intent against the constraints.
function computeStatus(
    input: any,
    bundleCount: number,
    requested?: string,
): AlertStatus {
    if (requested === AlertStatus.Draft) return AlertStatus.Draft;
    if (!input) return AlertStatus.Draft;
    if (requested === AlertStatus.Active && bundleCount > 0)
        return AlertStatus.Active;
    return AlertStatus.Inactive;
}

// ── Public API (drop-in surface for callers migrating off bdManager) ────────

const alertService = {
    /**
     * Create an alert with the right status (per `computeStatus`).
     * Persistence is delegated to the repository.
     */
    async createAlert(data: any) {
        const bundleCount = Array.isArray(data.bundles) ? data.bundles.length : 0;
        const status = computeStatus(data.input, bundleCount, data.status);
        try {
            const repositoryReturn = await alertRepository.create({ ...data, status });
            appLog.log(`Alert #${data.id} : ${data.title} created successfully.`);
            return repositoryReturn;
        } catch (error: any) {
            appLog.error(`Alert #${data.id} : ${data.title} creation failed :`, error);
        }

    },

    /**
     * Full update — recomputes status from the new input + bundle count.
     */
    async updateAlert(id: number, data: any) {
        const bundleCount = Array.isArray(data.bundles) ? data.bundles.length : 0;
        const status = computeStatus(data.input, bundleCount, data.status);
        try {
            const repositoryReturn = await alertRepository.update(id, { ...data, status });
            appLog.log(`Alert #${data.id} : ${data.title} updated successfully.`);
            return repositoryReturn;
        } catch (error: any) {
            appLog.error(`Alert #${data.id} : ${data.title} update failed :`, error);
        }
    },

    /**
     * Status toggle (active ↔ inactive). Refuses to activate an alert that
     * has no bundles — that would be an alert that fires into the void.
     * Returns null if the alert doesn't exist.
     */
    async setStatus(id: number, requested: string) {
        const existing = await alertRepository.getById(id);
        if (!existing) return null;

        let finalStatus = requested as AlertStatus;
        if (
            requested === AlertStatus.Active &&
            (existing.bundles?.length ?? 0) === 0
        ) {
            // Can't activate without a destination — fall back to inactive silently.
            finalStatus = AlertStatus.Inactive;
        }

        return await alertRepository.setStatusRaw(id, finalStatus);
    },


    /**
     * Alert deletion. id validity is ensured by API endpoint.
     */
    async deleteAlert(data: any) {
        try {
            await alertRepository.delete(data.id);
            appLog.log(`Alert #${data.id} deleted successfully.`);
        } catch (error: any) {
            appLog.error(`Alert #${data.id} delete failed :`, error);
        }
    }
};
export default alertService;
