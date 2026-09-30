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
 * Client-side abstraction over the /api/backend endpoints.
 */

export const alertService = {
    // 1. Get every saved alert (with its bundles).
    async getAll() {
        return $fetch("/api/alerts/withLog");
    },

    // 2. Create a new alert.
    async saveAlert(form: object): Promise<unknown> {
        return await $fetch("/api/alerts/action", {
            method: "POST",
            body: form,
        });
    },

    // 3. Update an existing alert (fields + bundles).
    async updateAlert(form: object): Promise<unknown> {
        return await $fetch("/api/alerts/action", {
            method: "PUT",
            body: form,
        });
    },

    // 4. Toggle / set the status (active | inactive). The server refuses to
    //    activate an alert that has no bundles.
    async setStatus(id: number, status: string): Promise<unknown> {
        return await $fetch("/api/alerts/action", {
            method: "PATCH",
            body: { id, status },
        });
    },

    // 5. Delete an alert (cascades its bundles).
    async delete(alertId: number): Promise<unknown> {
        return await $fetch("/api/alerts/action", {
            method: "DELETE",
            body: { id: alertId },
        });
    },

    // 6. Available Olvid discussions for the selectors.
    async getDiscussionList() {
        return await $fetch("/api/discussions");
    },

    // 7. Get every saved alert (with its bundles).
    // Unused since getAll default behavior has been changed to use withLog api route instead
    async getAllWithLastLog() {
        return await $fetch("/api/alerts/withLog");
    },
};
