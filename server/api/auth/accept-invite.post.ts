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
 * Consumes an invite token, sets the user's password, activates the
 * account (the link travelled through their inbox or clipboard), and
 * logs them in. Name / login / role are locked in by the admin at
 * invite time — the invited user only chooses their password.
 *
 * Password hashing runs BEFORE authService.acceptInvite so argon2's
 * CPU work doesn't sit inside a DB transaction. The service then
 * consumes the token and activates the user atomically — if the DB
 * write fails, the token stays unused and the invitee can retry.
 */

import { z } from "zod";
import { authService } from "#server/services/authService";
import { toClientUser } from "#server/utils/auth";
import { readBodyOr400 } from "#server/utils/httpError";
import type { AcceptInviteForm } from "#shared/types/auth";

const bodySchema = z.object({
    token: z.string().min(1),
    password: z.string(),
    useOlvid: z.boolean().default(false),
    usePassword: z.boolean().default(false),
}) satisfies z.ZodType<AcceptInviteForm>;

export default defineEventHandler(async (event) => {
    const { token, password, useOlvid, usePassword } = await readBodyOr400(event, bodySchema);

    if (usePassword && password.length < 8) {
        throw createError({ statusCode: 400, statusMessage: "invalid_password" })
    }

    if (!useOlvid && !usePassword) {
        throw createError({ statusCode: 400, statusMessage: "no_authentication_method_chosen" })
    }

    const passwordHash = usePassword ? await hashPassword(password) : "";
    const updated = await authService.acceptInvite(token, passwordHash, useOlvid, usePassword);


    await setUserSession(event, { user: toClientUser(updated) });
    return { user: toClientUser(updated) };
});
