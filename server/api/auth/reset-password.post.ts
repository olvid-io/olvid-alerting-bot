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
 * Consume a password-reset token and set the owning user's password.
 * Same ordering rationale as accept-invite: hash BEFORE opening the
 * transaction so argon2's CPU work doesn't sit inside a DB tx. The
 * service then atomically consumes the token and rewrites the hash
 * — if the DB write fails, the token stays unused so the user can
 * retry with the same link.
 *
 * On success we set a fresh session cookie, matching accept-invite,
 * so the user lands logged in without needing to re-type credentials.
 */

import { z } from "zod";
import { authService } from "#server/services/authService";
import { toClientUser } from "#server/utils/auth";
import { readBodyOr400 } from "#server/utils/httpError";
import {
    PASSWORD_MIN_LEN,
    type ResetPasswordForm,
} from "#shared/types/auth";

const bodySchema = z.object({
    token: z.string().min(1),
    password: z.string().min(PASSWORD_MIN_LEN),
}) satisfies z.ZodType<ResetPasswordForm>;

export default defineEventHandler(async (event) => {
    const { token, password } = await readBodyOr400(event, bodySchema);
    const passwordHash = await hashPassword(password);
    const updated = await authService.resetPassword(token, passwordHash);
    await setUserSession(event, { user: toClientUser(updated) });
    return { user: toClientUser(updated) };
});
