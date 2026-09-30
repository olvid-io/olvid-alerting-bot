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

import { z } from "zod";
import { userRepository } from "#server/repositories/userRepository.ts";
import { toClientUser } from "#server/utils/auth.ts";
import { authService } from "#server/services/authService.ts";

const bodySchema = z.object({
    login: z.string().trim().min(1),
});

/**
 * /api/auth/login/olvid
 * API route for olvid-based login. Parse user login and send message to attached Olvid discussion.
 * Requires olvid login to be activated for this user.
 * @return { user } User session for client.
 */
export default defineEventHandler(async (event) => {
    const { login } = await readValidatedBody(event, bodySchema.parse);

    const user = await userRepository.getByLogin(login);

    if (!user) throw createError({ statusCode: 401, statusMessage: "errorInvalidCredentials" });

    if (!user.activatedAt) {
        throw createError({ statusCode: 403, statusMessage: "errorNotActivated" });
    }

    if (!user.olvidLogin) {
        throw createError({ statusCode: 403, statusMessage: "errorOlvidNotAuthorized" });
    }

    if (!updaterIsOn()) {
        throw createError({ statusCode: 503, statusMessage: "errorDaemon" });
    }

    // Awaiting for reaction : if false, an error occured.
    if (user.olvidDiscussionId === null || !await authService.reactionAuth(user.olvidDiscussionId, user.login)) {
        throw createError({ statusCode: 403, statusMessage: "errorReaction" });
    }

    await setUserSession(event, { user: toClientUser(user) });
    return { user: toClientUser(user) };
});