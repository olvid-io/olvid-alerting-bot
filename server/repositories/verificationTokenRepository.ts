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

// Verification-token data access.

import type { Prisma, VerificationToken } from "@prisma/client";
import { prisma } from "../db/prisma";

type Client = Prisma.TransactionClient;
const use = (client?: Client): Client => client ?? prisma;

export interface CreateVerificationTokenInput {
    userId: number;
    purpose: string;
    tokenHash: string;
    expiresAt: Date;
}

export const verificationTokenRepository = {
    async create(
        input: CreateVerificationTokenInput,
        client?: Client,
    ): Promise<VerificationToken> {
        return use(client).verificationToken.create({ data: input });
    },

    async findByHash(
        tokenHash: string,
        client?: Client,
    ): Promise<VerificationToken | null> {
        return use(client).verificationToken.findUnique({ where: { tokenHash } });
    },

    async markUsedIfUnused(id: number, client?: Client): Promise<boolean> {
        const result = await use(client).verificationToken.updateMany({
            where: { id, usedAt: null },
            data: { usedAt: new Date() },
        });
        return result.count > 0;
    },

    /** Most recent token of a given purpose for a user — used by the
     *  resend-verification rate limit. */
    async findMostRecentByUser(
        userId: number,
        purpose: string,
        client?: Client,
    ): Promise<VerificationToken | null> {
        return use(client).verificationToken.findFirst({
            where: { userId, purpose },
            orderBy: { createdAt: "desc" },
        });
    },
};
