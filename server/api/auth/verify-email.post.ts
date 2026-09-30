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

// Consumes an email_verify token and marks the user's email as verified.
// One-shot; the token cannot be replayed.

import { z } from "zod";
import { userRepository } from "#server/repositories/userRepository";
import { consumeToken } from "#server/utils/auth";

const bodySchema = z.object({ token: z.string().min(1) });

export default defineEventHandler(async (event) => {
    const { token } = await readValidatedBody(event, bodySchema.parse);
    const userId = await consumeToken(token, "email_verify");
    if (!userId) {
        throw createError({ statusCode: 400, statusMessage: "token_invalid" });
    }
    await userRepository.update(userId, { activatedAt: new Date() });
    return { ok: true };
});
