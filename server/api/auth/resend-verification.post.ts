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
 * Reissues an email_verify token for an unverified account. Best-effort
 * rate limit: refuse if the last token for this user was issued < 60 s
 * ago. Always returns { ok: true } even when the email doesn't exist —
 * don't leak account presence via timing/response.
 */

import { z } from "zod";
import { userRepository } from "#server/repositories/userRepository";
import { verificationTokenRepository } from "#server/repositories/verificationTokenRepository";
import { issueToken, resolveOrigin } from "#server/utils/auth";
import { verifyEmail as verifyEmailTemplate } from "#server/utils/authMessages";
import { mailClient } from "#server/clients/mailClient";
import { readBodyOr400 } from "#server/utils/httpError";

const bodySchema = z.object({ email: z.email() });

export default defineEventHandler(async (event) => {
    const { email } = await readBodyOr400(event, bodySchema);

    const user = await userRepository.getByEmail(email);
    if (!user || user.activatedAt) return { ok: true };

    const recent = await verificationTokenRepository.findMostRecentByUser(
        user.id,
        "email_verify",
    );
    if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
        return { ok: true };
    }

    const token = await issueToken(user.id, "email_verify");
    const { subject, html } = verifyEmailTemplate(resolveOrigin(event), token);
    await mailClient.send([user.email!], subject, html);
    return { ok: true };
});
