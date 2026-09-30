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
 * Admin-only: reissue an invite token for a user whose account was
 * created but never activated (passwordHash is still null). Refuses on
 * already-active accounts — those need a password-reset flow, not an
 * invite.
 *
 * Delivery follows the row's own shape:
 *   1. olvidDiscussionId set → DM the URL via the daemon (preferred:
 *      that's the channel the admin originally picked for this user).
 *   2. else email set + SMTP available → send the mail invite.
 *   3. else → mint the token and return the URL for the admin to copy.
 * The response always includes { user, inviteUrl, delivered } so the UI
 * can offer a "Copy link" affordance regardless of which branch fired.
 */

import { userRepository } from "#server/repositories/userRepository";
import {
    issueToken,
    readTargetUserId,
    requireAdmin,
    resolveOrigin,
    toClientUser,
} from "#server/utils/auth";
import {
    inviteEmail,
    inviteOlvidMessage,
} from "#server/utils/authMessages";
import { mailClient } from "#server/clients/mailClient";
import { olvidClient } from "#server/clients/olvidClient";
import type { InviteResponse } from "#shared/types/auth";
import { AppLogManager } from "#shared/logManager.ts";

const logger = new AppLogManager("Invite sending");

export default defineEventHandler(async (event): Promise<InviteResponse> => {
    const session = await requireAdmin(event);
    const id = readTargetUserId(event);
    const user = await userRepository.getById(id);
    if (!user) {
        throw createError({ statusCode: 404, statusMessage: "not_found" });
    }
    if (user.passwordHash) {
        throw createError({ statusCode: 400, statusMessage: "user_already_active" });
    }

    const token = await issueToken(user.id, "invite");
    const origin = resolveOrigin(event);
    const inviteUrl = `${origin}/invite?token=${encodeURIComponent(token)}`;
    const inviter = session.user.name ?? session.user.login;

    // Delivery channel follows the row's persisted contact preferences.
    // Echoed back on the response so the client can render the right
    // "Invitation sent via X" copy without re-deriving.
    let delivered = false;
    let mailed = false;
    let channel: "olvid" | "mail" | "link" = "link";
    let updatedUser = user;
    if (user.olvidDiscussionId != null) {
        channel = "olvid";
        // Revoke the previous invite DM (if any) so the invitee doesn't
        // end up with two competing links. Best-effort: if the daemon
        // can't delete it (already deleted, network hiccup), we still
        // send the new one — the old link will be dead once the new token
        // supersedes it in the DB.
        if (user.inviteOlvidMessageId != null) {
            await olvidClient.deleteOutboundMessage(user.inviteOlvidMessageId);
        }
        const { ok, messageId } = await olvidClient.sendMessageOne(
            user.olvidDiscussionId,
            inviteOlvidMessage(origin, token, inviter, user.login),
        );
        delivered = ok;
        if (messageId != null) {
            updatedUser = await userRepository.update(user.id, {
                inviteOlvidMessageId: messageId,
            });
        }
    } else if (user.email && mailClient.isAvailable()) {
        channel = "mail";
        const { subject, html } = inviteEmail(origin, token, inviter);
        delivered = await mailClient.send([user.email], subject, html);
        mailed = delivered;
    }

    logger.log(`Resent invitation for user ${user.login}`);

    return {
        user: toClientUser(updatedUser),
        inviteUrl,
        channel,
        delivered,
        mailed,
    };
});
