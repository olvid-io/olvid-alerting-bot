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
 * First-run only: create the first admin as an invited user.
 *
 * Rather than reading a password at /setup, the operator picks a
 * delivery channel (mail / olvid / link) and the server sends an
 * invite URL through it, exactly like the admin-invite flow used for
 * every subsequent user. The operator opens that URL, sets their
 * password, and is signed in — one activation path across the whole
 * product.
 *
 * Hard gates before anything is created:
 *   1. `ADMIN_KEY` env must be set (503) — a missing key means the
 *      operator hasn't authorised initial setup.
 *   2. Submitted adminKey must match, constant-time (401).
 *   3. No admin may already exist (409). Setup is one-shot.
 *   4. Channel prerequisites match (email + SMTP for mail, discussion
 *      id for olvid).
 */

import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { userRepository } from "#server/repositories/userRepository";
import { issueToken, resolveOrigin, toClientUser } from "#server/utils/auth";
import {
    inviteEmail,
    inviteOlvidMessage,
} from "#server/utils/authMessages";
import { mailClient } from "#server/clients/mailClient";
import { olvidClient } from "#server/clients/olvidClient";
import { readBodyOr400, toHttpError } from "#server/utils/httpError";
import type { SetupForm, SetupResponse } from "#shared/types/auth";

const bodySchema = z.object({
    adminKey: z.string().min(1),
    login: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    channel: z.enum(["mail", "link", "olvid"]),
    email: z.email().optional(),
    olvidDiscussionId: z.string().regex(/^\d+$/).optional(),
}) satisfies z.ZodType<SetupForm>;

function secretsMatch(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
}

export default defineEventHandler(async (event): Promise<SetupResponse> => {
    const expected = process.env.ADMIN_KEY;
    if (!expected) {
        throw createError({
            statusCode: 503,
            statusMessage: "admin_key_not_configured",
        });
    }

    const body = await readBodyOr400(event, bodySchema);

    if (!secretsMatch(body.adminKey, expected)) {
        throw createError({ statusCode: 401, statusMessage: "invalid_admin_key" });
    }
    if (await userRepository.findFirstAdmin()) {
        throw createError({
            statusCode: 409,
            statusMessage: "setup_already_complete",
        });
    }

    // ── Channel-specific precondition checks (same as /users/invite) ──
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

    try {
        const login = body.login;
        const email = body.email ?? null;
        const olvidDiscussionId =
            body.channel === "olvid" ? BigInt(body.olvidDiscussionId!) : null;

        // Setup is one-shot — no user rows exist yet, so no collision to
        // check. Skip the /users/invite-style getByLogin/Email/Olvid dance.
        const user = await userRepository.create({
            login,
            email,
            role: "admin",
            name: body.name ?? null,
            olvidDiscussionId,
        });

        const token = await issueToken(user.id, "invite");
        const origin = resolveOrigin(event);
        const inviteUrl = `${origin}/invite?token=${encodeURIComponent(token)}`;
        const inviter = user.name ?? user.login;

        const delivery = await deliver(body.channel, {
            email,
            olvidDiscussionId,
            token,
            origin,
            inviter,
            login: user.login,
        });

        // Persist the outbound Olvid message id so a later re-run or admin
        // deletion can revoke the pending DM. Mirrors the invite endpoint.
        if (delivery.olvidMessageId != null) {
            await userRepository.update(user.id, {
                inviteOlvidMessageId: delivery.olvidMessageId,
            });
        }

        // Fire-and-forget the client-shape user in case a future caller
        // wants it — for now we only return what the UI needs.
        void toClientUser(user);

        return {
            inviteUrl,
            channel: body.channel,
            delivered: delivery.delivered,
        };
    } catch (error) {
        throw toHttpError(error, "POST /api/auth/setup");
    }
});

// ── Delivery strategies ─────────────────────────────────────────────
// Copy of the /users/invite dispatcher. Kept local rather than
// factored out because there are exactly two call sites and a shared
// helper would need to be parameterized by too many things (token
// purpose, template selection, message-id tracking) to stay simple.

interface Delivery {
    delivered: boolean;
    olvidMessageId?: bigint;
}

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
            return { delivered: false };
    }
}

async function deliverByMail(ctx: DeliveryContext): Promise<Delivery> {
    if (!ctx.email) return { delivered: false };
    const { subject, html } = inviteEmail(ctx.origin, ctx.token, ctx.inviter);
    const delivered = await mailClient.send([ctx.email], subject, html);
    return { delivered };
}

async function deliverByOlvid(ctx: DeliveryContext): Promise<Delivery> {
    if (ctx.olvidDiscussionId == null) return { delivered: false };
    const body = inviteOlvidMessage(
        ctx.origin,
        ctx.token,
        ctx.inviter,
        ctx.login,
    );
    const { ok, messageId } = await olvidClient.sendMessageOne(
        ctx.olvidDiscussionId,
        body,
    );
    return { delivered: ok, olvidMessageId: messageId };
}
