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
 * Peek at an invite token WITHOUT consuming it. Used by the
 * accept-invite page to show the invitee which account they're
 * activating (login + optional name), so they see e.g. "Set a
 * password to activate your account with login alice".
 *
 * The token is only marked used by POST /api/auth/accept-invite
 * after they submit their password. Returning 400 on invalid /
 * expired / already-used tokens lets the page render an error
 * state without leaking why.
 */

import { z } from "zod";
import { userRepository } from "#server/repositories/userRepository";
import { peekToken } from "#server/utils/auth";
import type { InviteAcceptIdentity } from "#shared/types/auth.ts";

const querySchema = z.object({ token: z.string().min(1) });

export default defineEventHandler(async (event): Promise<InviteAcceptIdentity> => {
    const { token } = await getValidatedQuery(event, querySchema.parse);
    const userId = await peekToken(token, "invite");
    if (!userId) {
        throw createError({ statusCode: 400, statusMessage: "token_invalid" });
    }
    const user = await userRepository.getById(userId);
    if (!user) {
        throw createError({ statusCode: 400, statusMessage: "token_invalid" });
    }

    const model = user.olvidDiscussionId ?
        olvidDiscussionRepository.get(user.olvidDiscussionId.toString()) : null;
    const photo = model?.photoDataUrl ?? null;
    const name = model?.title ?? null;

    return { login: user.login, name: name, photo: photo, hasOlvid: user.olvidDiscussionId !== null };
});
