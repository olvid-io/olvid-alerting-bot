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
import type { CredentialsForm } from "#shared/types/auth.ts";

const bodySchema = z.object({
    login: z.string().trim().min(1),
    password: z.string().min(1),
}) satisfies z.ZodType<CredentialsForm>;


/**
 * /api/auth/login/password
 * API route for password-based login. Parse user login and password and compare with database values.
 * Requires password login to be activated for this user.
 * @return { user } User session for client.
 */
export default defineEventHandler(async (event) => {
    const { login, password } = await readValidatedBody(event, bodySchema.parse);

    const user = await userRepository.getByLogin(login);
    const invalid = () =>
        createError({ statusCode: 401, statusMessage: "errorInvalidCredentials" });

    if (!user || !user.passwordHash) throw invalid();

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) throw invalid();

    if (!user.activatedAt) {
        throw createError({ statusCode: 403, statusMessage: "errorNotActivated" });
    }

    if (!user.passwordLogin) {
        throw createError({ statusCode: 403, statusMessage: "errorPasswordNotAuthorized" });
    }

    await setUserSession(event, { user: toClientUser(user) });
    return { user: toClientUser(user) };
});
