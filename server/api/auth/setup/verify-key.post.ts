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
 * Step-1 gate for the /setup UI: validates the admin key WITHOUT
 * creating any user. Same constant-time compare + same one-shot
 * guard as the main /setup endpoint, so the two-step client flow can
 * give immediate feedback ("wrong key") before the operator fills in
 * the invite fields.
 *
 * Even if a malicious client skips this call entirely and goes
 * straight to POST /api/auth/setup, that endpoint re-validates the
 * admin key — this route is UX polish, not a security boundary.
 */

import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { userRepository } from "#server/repositories/userRepository";

const bodySchema = z.object({
    adminKey: z.string().min(1),
});

function secretsMatch(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
}

export default defineEventHandler(async (event) => {
    const expected = process.env.ADMIN_KEY;
    if (!expected) {
        throw createError({
            statusCode: 503,
            statusMessage: "admin_key_not_configured",
        });
    }

    const body = await readValidatedBody(event, bodySchema.parse);

    if (!secretsMatch(body.adminKey, expected)) {
        throw createError({ statusCode: 401, statusMessage: "invalid_admin_key" });
    }
    if (await userRepository.findFirstAdmin()) {
        throw createError({
            statusCode: 409,
            statusMessage: "setup_already_complete",
        });
    }

    return { ok: true };
});
