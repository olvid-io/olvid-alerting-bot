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
 * Admin-only field update for a user row. Currently only `name` is
 * editable — admins routinely need to correct a typo or fill in a
 * display name after an invite went out. Login/role/email changes
 * are deliberately out of scope: those affect authentication and
 * belong in a separate flow.
 *
 * Guardrails:
 *   - Refuses to edit another admin's name. Admins should own their
 *     own identity metadata; the admin themselves changes it via the
 *     future self-service settings page (not built yet).
 *   - Refuses to edit self through this endpoint for the same reason.
 *   - name may be an empty string to clear it (persisted as null).
 */

import { z } from "zod";
import { userRepository } from "#server/repositories/userRepository";
import {
    readTargetUserId,
    requireAdmin,
    toClientUser,
} from "#server/utils/auth";
import { readBodyOr400, toHttpError } from "#server/utils/httpError";

const bodySchema = z.object({
    name: z.string().trim().max(120).nullable(),
});

export default defineEventHandler(async (event) => {
    const session = await requireAdmin(event);
    const id = readTargetUserId(event);
    if (id === session.user.id) {
        throw createError({ statusCode: 400, statusMessage: "cannot_edit_self" });
    }

    const target = await userRepository.getById(id);
    if (!target) {
        throw createError({ statusCode: 404, statusMessage: "not_found" });
    }
    if (target.role === "admin") {
        throw createError({ statusCode: 400, statusMessage: "cannot_edit_admin" });
    }

    const { name } = await readBodyOr400(event, bodySchema);
    try {
        const updated = await userRepository.update(id, {
            name: name && name.length > 0 ? name : null,
        });
        return toClientUser(updated);
    } catch (error) {
        throw toHttpError(error, `PATCH /api/users/${id}`);
    }
});
