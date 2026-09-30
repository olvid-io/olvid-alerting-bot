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
 * GET /api/alerts/:id/logs → most-recent-first, capped at 200 (the same
 * cap the writer enforces). Consumed by useAlertLogs on the client side.
 * */


export default defineEventHandler(async (event) => {
    await requireUserSession(event);

    const raw = getRouterParam(event, "id");
    const id = Number(raw);
    if (!id || Number.isNaN(id)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid alert id" });
    }
    return await alertLogRepository.getForAlert(id);
});
