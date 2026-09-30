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
 * Alerts CRUD mega-endpoint. Kept as a single file for now — see the
 * deferred plan item for splitting into file-based Nitro routes.
 * Error handling is delegated to toHttpError so every branch returns a
 * stable status/statusMessage contract instead of echoing Prisma stacks.
 */

import { toHttpError } from "#server/utils/httpError.ts";
import alertService from "#server/services/alertService.ts";

export default defineEventHandler(async (event) => {
    // Auth gate — throws 401 if the caller has no valid session cookie.
    // Applies to every method on this endpoint (GET/POST/PUT/PATCH/DELETE).
    await requireUserSession(event);

    const method = event.node.req.method;

    try {
        if (method === "GET") {
            return await alertRepository.getAll();
        }

        if (method === "POST") {
            const body = await readBody(event);
            const data = await alertService.createAlert(body);
            return { success: true, data };
        }

        if (method === "PUT") {
            const body = await readBody(event);
            const id = Number(body?.id);
            if (!Number.isInteger(id) || id <= 0) {
                throw createError({ statusCode: 400, statusMessage: "bad_id" });
            }
            const data = await alertService.updateAlert(id, body);
            return { success: true, data };
        }

        if (method === "PATCH") {
            const body = await readBody(event);
            const id = Number(body?.id);
            if (!Number.isInteger(id) || id <= 0) {
                throw createError({ statusCode: 400, statusMessage: "bad_id" });
            }
            const data = await alertService.setStatus(id, body.status);
            return { success: true, data };
        }

        if (method === "DELETE") {
            const body = await readBody(event);
            const id = Number(body?.id);
            if (!Number.isInteger(body?.id) || id <= 0) {
                throw createError({ statusCode: 400, statusMessage: "bad_id" });
            }
            await alertService.deleteAlert(body);
            return { success: true };
        }

        throw createError({ statusCode: 405, statusMessage: "method_not_allowed" });
    } catch (error) {
        throw toHttpError(error, `${method} /api/backend`);
    }
});
