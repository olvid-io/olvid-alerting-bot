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
 * Admin-only user invitation. `login` (username) is always the identifier
 * and is chosen by the admin — the invited user cannot pick their own.
 * `channel` picks the delivery path (mail / link / olvid); the URL shape
 * is identical across channels, so the invitee's acceptance flow doesn't
 * depend on how they received the URL — knowing the token is enough.
 *
 * Response always includes { user, inviteUrl, delivered, mailed } so the
 * /users modal can offer a "Copy link" affordance in either path. The
 * legacy `mailed` alias is kept in the response so consumers that still
 * read the old field name keep working.
 */

import { z } from "zod";
import { userRepository } from "#server/repositories/userRepository";
import {
    issueToken,
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
import { readBodyOr400, toHttpError } from "#server/utils/httpError";
import type { InviteResponse, InviteUserForm } from "#shared/types/auth";
import { AppLogManager } from "#shared/logManager.ts";

const logger = new AppLogManager("Invite sending");

const bodySchema = z.object({
    login: z.string().trim().min(1),
    email: z.email().optional(),
    name: z.string().trim().min(1).optional(),
    role: z.enum(["admin", "user"]),
    channel: z.enum(["mail", "link", "olvid"]),
    // BigInt-shaped id arrives as a string over the wire; we validate the
    // shape here and coerce to bigint at the persistence boundary.
    olvidDiscussionId: z.string().regex(/^\d+$/).optional(),
}) satisfies z.ZodType<InviteUserForm>;

/** Delivery contract per channel. Returned by the picked deliverer so
 *  the endpoint can build a homogenous InviteResponse regardless of
 *  which channel was chosen. `olvidMessageId` is populated only on the
 *  Olvid path when the daemon returned a tracked id — persisted on the
 *  user row so the delete-user flow can revoke the pending DM later. */
interface Delivery {
    delivered: boolean;
    olvidDiscussionId: bigint | null;
    olvidMessageId?: bigint;
}

export default defineEventHandler(async (event): Promise<InviteResponse> => {
    const session = await requireAdmin(event);
    const body = await readBodyOr400(event, bodySchema);

    // ── Channel-specific precondition checks ──────────────────────────
    if (body.channel === "mail") {
        if (!body.email) {
            throw createError({ statusCode: 400, statusMessage: "email_required" });
        }
        if (!mailClient.isAvailable()) {
            throw createError({
                statusCode: 400,
                statusMessage: "mail_not_configured",
            });
        }
    } else if (body.channel === "olvid") {
        if (!body.olvidDiscussionId) {
            throw createError({
                statusCode: 400,
                statusMessage: "olvid_discussion_required",
            });
        }
    }

    const login = body.login;
    const email = body.email ?? null;
    const olvidDiscussionId =
        body.channel === "olvid" ? BigInt(body.olvidDiscussionId!) : null;

    try {
        // Collision policy: refuse to reuse ANY identifier already tied to
        // an existing user row, whether that row is registered or still
        // pending accept. This is stricter than the old "reuse pending row"
        // behaviour on purpose:
        //   - Reissuing an invite to an already-invited person belongs to
        //     `resend-invite.post.ts` — the admin should find the row in
        //     the users table and click "Resend".
        //   - Two rows sharing an email or an olvidDiscussionId break
        //     password-reset delivery (the reset URL DM would authenticate
        //     the wrong user).
        //   - A login collision means someone else is already using that
        //     name; the invitee needs a distinct one.
        const [byLogin, byEmail, byOlvid] = await Promise.all([
            userRepository.getByLogin(login),
            email ? userRepository.getByEmail(email) : Promise.resolve(null),
            olvidDiscussionId != null
                ? userRepository.getByOlvidDiscussionId(olvidDiscussionId)
                : Promise.resolve(null),
        ]);
        if (byLogin) {
            throw createError({ statusCode: 409, statusMessage: "login_in_use" });
        }
        if (byEmail) {
            throw createError({ statusCode: 409, statusMessage: "email_in_use" });
        }
        if (byOlvid) {
            throw createError({ statusCode: 409, statusMessage: "olvid_in_use" });
        }

        let user = await userRepository.create({
            login,
            email,
            role: body.role,
            name: body.name ?? null,
            olvidDiscussionId,
        });

        const token = await issueToken(user.id, "invite");
        const origin = resolveOrigin(event);
        const inviteUrl = `${origin}/invite?token=${encodeURIComponent(token)}`;
        const inviter = session.user.name ?? session.user.login;

        const delivery = await deliver(body.channel, {
            email,
            olvidDiscussionId,
            token,
            origin,
            inviter,
            login: user.login,
        });

        // Track the outbound Olvid message id so the delete-user flow can
        // revoke the pending DM later. Best-effort — if the update fails
        // (repository error) the invite still went out; we just can't
        // clean up the message on delete.
        if (delivery.olvidMessageId != null) {
            user = await userRepository.update(user.id, {
                inviteOlvidMessageId: delivery.olvidMessageId,
            });
        }

        logger.log(`Invitation for user ${user.login} sent successfully.`);


        return {
            user: toClientUser(user),
            inviteUrl,
            channel: body.channel,
            delivered: delivery.delivered,
            mailed: body.channel === "mail" && delivery.delivered,
        };
    } catch (error) {
        throw toHttpError(error, "POST /api/users/invite");
    }
});

// ── Delivery strategies ─────────────────────────────────────────────
// One function per channel; the top-level handler dispatches by
// `channel`. Kept as top-level helpers rather than a class so each is
// individually testable and adding a fourth channel (Slack, Discord…)
// is a one-function addition plus a case in the switch.

interface DeliveryContext {
    email: string | null;
    olvidDiscussionId: bigint | null;
    token: string;
    origin: string;
    inviter: string;
    login: string;
}

async function deliver(
    channel: "mail" | "link" | "olvid",
    ctx: DeliveryContext,
): Promise<Delivery> {
    switch (channel) {
        case "mail":
            return deliverByMail(ctx);
        case "olvid":
            return deliverByOlvid(ctx);
        case "link":
            // No side effect — the admin copies the URL out of the response.
            return { delivered: false, olvidDiscussionId: null };
    }
}

async function deliverByMail(ctx: DeliveryContext): Promise<Delivery> {
    if (!ctx.email) return { delivered: false, olvidDiscussionId: null };
    const { subject, html } = inviteEmail(ctx.origin, ctx.token, ctx.inviter);
    const delivered = await mailClient.send([ctx.email], subject, html);
    return { delivered, olvidDiscussionId: null };
}

async function deliverByOlvid(ctx: DeliveryContext): Promise<Delivery> {
    if (ctx.olvidDiscussionId == null) {
        return { delivered: false, olvidDiscussionId: null };
    }
    const body = inviteOlvidMessage(
        ctx.origin,
        ctx.token,
        ctx.inviter,
        ctx.login,
    );
    // Use the single-target send so we capture the outbound message id —
    // needed later by the delete-user flow to revoke the pending DM.
    const { ok, messageId } = await olvidClient.sendMessageOne(
        ctx.olvidDiscussionId,
        body,
    );
    return {
        delivered: ok,
        olvidDiscussionId: ctx.olvidDiscussionId,
        olvidMessageId: messageId,
    };
}
