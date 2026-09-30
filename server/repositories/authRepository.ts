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

// Cross-aggregate atomic operations for the auth flow. Individual
// repositories (user, verificationToken) own single-table writes; this
// module owns the compositions that MUST commit in one transaction.
// Keeping the `prisma.$transaction` call inside a repository means
// no service or endpoint needs to import prisma directly.
//
// The two token-consuming flows (accept-invite, reset-password) share
// a common shape: validate token, mark used, apply the user-side
// side-effect. The private `consumeAndApply` helper generalises that;
// each public method just declares what the side-effect is.

import { createHash } from "node:crypto";
import type { Prisma, User as PrismaUser } from "@prisma/client";
import { prisma } from "../db/prisma";
import { verificationTokenRepository } from "./verificationTokenRepository";
import { userRepository } from "./userRepository";

type PrismaTx = Prisma.TransactionClient;

function sha256(input: string): string {
    return createHash("sha256").update(input).digest("hex");
}

/**
 * Validate + consume a token of the given purpose, then run the
 * caller's user-facing side-effect inside the same transaction. When
 * anything goes wrong (unknown / wrong purpose / expired / already
 * used) returns null and the transaction rolls back cleanly.
 */
async function consumeAndApply(
    rawToken: string,
    purpose: string,
    apply: (tx: PrismaTx, userId: number) => Promise<PrismaUser>,
): Promise<PrismaUser | null> {
    return prisma.$transaction(async (tx) => {
        const record = await verificationTokenRepository.findByHash(
            sha256(rawToken),
            tx,
        );
        if (!record) return null;
        if (record.purpose !== purpose) return null;
        if (record.usedAt) return null;
        if (record.expiresAt.getTime() < Date.now()) return null;

        const marked = await verificationTokenRepository.markUsedIfUnused(
            record.id,
            tx,
        );
        if (!marked) return null;

        return apply(tx, record.userId);
    });
}

export const authRepository = {
    /**
     * Consume an invite token and activate the owning user with the
     * given (already-hashed) password, atomically. Returns null when
     * the token is invalid — callers translate that to a 400 at the
     * endpoint boundary.
     */
    async acceptInvite(
        rawToken: string,
        passwordHash: string,
        useOlvid: boolean,
        usePassword: boolean,
    ): Promise<PrismaUser | null> {
        return consumeAndApply(rawToken, "invite", (tx, userId) =>
            userRepository.activateWithHash(userId, passwordHash, useOlvid, usePassword, tx),
        );
    },

    /**
     * Consume a password-reset token and set the owning user's password
     * hash, atomically. Does NOT stamp `activatedAt` — the user is
     * already activated, and re-stamping the field would misrepresent
     * history. Returns null when the token is invalid.
     */
    async resetPassword(
        rawToken: string,
        passwordHash: string,
    ): Promise<PrismaUser | null> {
        return consumeAndApply(rawToken, "password_reset", (tx, userId) =>
            userRepository.setPasswordHash(userId, passwordHash, tx),
        );
    },
};
