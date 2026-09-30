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

// Auth server-side helpers: guards, token issue/consume, session-user
// shaping. Every auth-adjacent endpoint imports from here so the
// wire-format for User and the token semantics stay in one place.

import { createHash, randomBytes } from "node:crypto";
import type { H3Event } from "h3";
import { verificationTokenRepository } from "../repositories/verificationTokenRepository";
import type { User, UserRole } from "#shared/types/user";

// ── Token semantics ─────────────────────────────────────────────────
// TTLs are policy, not code — surface them here so an operator can
// tweak them without hunting through call sites.
export const TOKEN_TTL = {
    invite: 7 * 24 * 60 * 60 * 1000, // 7 days
    email_verify: 24 * 60 * 60 * 1000, // 24 hours
    password_reset: 60 * 60 * 1000, // 1 hour
} as const;

export type TokenPurpose = keyof typeof TOKEN_TTL;

function sha256(input: string): string {
    return createHash("sha256").update(input).digest("hex");
}

// Issue a one-shot token. The raw string is returned once (to embed in
// the outgoing email URL) — only its sha256 is persisted, so a DB leak
// doesn't expose live tokens.
export async function issueToken(
    userId: number,
    purpose: TokenPurpose,
): Promise<string> {
    const raw = randomBytes(32).toString("base64url");
    await verificationTokenRepository.create({
        tokenHash: sha256(raw),
        userId,
        purpose,
        expiresAt: new Date(Date.now() + TOKEN_TTL[purpose]),
    });
    return raw;
}

/**
 * Validate a raw token against its expected purpose / expiry / one-shot
 * semantics. Set `consume: true` to atomically mark the token used
 * (race-safe: a concurrent consumer wins at most once); leave it false
 * for read-only peeks (e.g. invite-info surfaces the invitee's login
 * without burning the link).
 *
 * Returns the owning user's id on success, `null` on any failure
 * (unknown / wrong purpose / expired / already used). Callers decide
 * the HTTP status so we don't leak which reason.
 *
 * For atomic composition with another write (e.g. accept-invite, which
 * must activate the user in lockstep) use authRepository.acceptInvite
 * instead — the transaction belongs in the repository layer.
 */
export async function validateToken(
    rawToken: string,
    purpose: TokenPurpose,
    { consume }: { consume: boolean } = { consume: false },
): Promise<number | null> {
    const record = await verificationTokenRepository.findByHash(sha256(rawToken));
    if (!record) return null;
    if (record.purpose !== purpose) return null;
    if (record.usedAt) return null;
    if (record.expiresAt.getTime() < Date.now()) return null;
    if (!consume) return record.userId;

    const marked = await verificationTokenRepository.markUsedIfUnused(record.id);
    if (!marked) return null;
    return record.userId;
}

// Thin aliases so call sites read naturally.
export const consumeToken = (raw: string, purpose: TokenPurpose) =>
    validateToken(raw, purpose, { consume: true });
export const peekToken = (raw: string, purpose: TokenPurpose) =>
    validateToken(raw, purpose, { consume: false });

// ── Guards ──────────────────────────────────────────────────────────

export async function requireAdmin(event: H3Event) {
    const session = await requireUserSession(event);
    if (session.user.role !== "admin") {
        throw createError({ statusCode: 403, statusMessage: "Admin only" });
    }
    return session;
}

/**
 * Read + validate a positive integer from the `[id]` route param.
 * Throws 400 bad_id on anything that isn't a positive integer. Used
 * as a primitive by the domain-flavoured aliases below.
 */
function readIntRouteId(event: H3Event): number {
    const id = Number(getRouterParam(event, "id"));
    if (!Number.isInteger(id) || id <= 0) {
        throw createError({ statusCode: 400, statusMessage: "bad_id" });
    }
    return id;
}

/** Admin-user endpoints: /api/users/[id].{delete,patch}, resend-invite. */
export function readTargetUserId(event: H3Event): number {
    return readIntRouteId(event);
}

/** Alert-scoped endpoints: /api/alerts/[id]/logs, /subscriptions.* */
export function readTargetAlertId(event: H3Event): number {
    return readIntRouteId(event);
}

// ── Shaping ─────────────────────────────────────────────────────────
// Never leak passwordHash, updatedAt, or createdAt to the client.

type PrismaUserRow = {
    id: number;
    login: string;
    email: string | null;
    name: string | null;
    role: string;
    activatedAt: Date | null;
    olvidDiscussionId: bigint | null;
    olvidLogin: boolean;
    passwordLogin: boolean;
};

export function toClientUser(row: PrismaUserRow): User {
    return {
        id: row.id,
        login: row.login,
        email: row.email,
        name: row.name,
        role: row.role as UserRole,
        activated: row.activatedAt !== null,
        // Bigint → string at the wire boundary; JSON can't hold bigint.
        olvidDiscussionId:
            row.olvidDiscussionId !== null ? String(row.olvidDiscussionId) : null,
        useOlvid: row.olvidLogin,
        usePassword: row.passwordLogin
    };
}

// Build absolute URLs for outgoing email links. Prefers the configured
// runtimeConfig.public.baseUrl; falls back to the request's own origin.
export function resolveOrigin(event: H3Event): string {
    const configured = useRuntimeConfig(event).public.baseUrl;
    if (configured) return configured.replace(/\/+$/, "");
    const proto = getRequestProtocol(event);
    const host = getRequestHost(event);
    return `${proto}://${host}`;
}
