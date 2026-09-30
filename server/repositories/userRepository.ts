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
 * User data access. All `prisma.user.*` calls flow through this module
 * so handlers stay declarative and the wire-facing shape is decided in
 * exactly one place.
 *
 * Read methods split by audience:
 *   - getAll()                     → client shape (User) — used by /api/users
 *   - getByLogin / getByEmail /
 *     getById / findFirstAdmin /
 *     countAdmins                  → raw Prisma row — server-internal
 *     (login needs passwordHash; delete needs the admin count; etc.)
 *
 * The client-shape mapping lives in server/utils/auth.ts (`toClientUser`) —
 * referenced here for `getAll` only; every other server-internal caller
 * applies it explicitly at the handler boundary.
 */

import type { Prisma, User as PrismaUser } from "@prisma/client";
import { prisma } from "../db/prisma";
import type { User, UserRole } from "#shared/types/user";
import { toClientUser } from "../utils/auth";

type Client = Prisma.TransactionClient | typeof prisma;

export interface CreateUserInput {
    login: string;
    email?: string | null;
    role: UserRole;
    passwordHash?: string | null;
    name?: string | null;
    activatedAt?: Date | null;
    /** Persist the user's Olvid discussion id when the admin invited via
     *  Olvid. Bigint on the wire is passed as string; caller converts. */
    olvidDiscussionId?: bigint | null;
}

export interface UpdateUserInput {
    passwordHash?: string;
    name?: string | null;
    activatedAt?: Date | null;
    email?: string | null;
    olvidDiscussionId?: bigint | null;
    /** The id of the last outbound invite DM. Set at invite time so the
     *  delete-user flow can revoke it; cleared once the user activates. */
    inviteOlvidMessageId?: bigint | null;
}

// Normalisation policy: logins and emails are compared case-insensitively.
// Store lowercase so the unique constraint catches "Alice" ≠ "alice"
// mismatches, and looking up either form finds the same row.
function normalise(s: string): string {
    return s.trim().toLowerCase();
}

export const userRepository = {
    /** Client-shape list. Sorted by id so the /users table is stable. */
    async getAll(): Promise<User[]> {
        const rows = await prisma.user.findMany({ orderBy: { id: "asc" } });
        return rows.map(toClientUser);
    },

    /** Sign-in lookup. `login` may be an email or a plain username — the
     *  DB column always holds the canonical identifier the user types. */
    async getByLogin(login: string): Promise<PrismaUser | null> {
        return prisma.user.findUnique({ where: { login: normalise(login) } });
    },

    /** Kept for callers that specifically address a row by its delivery
     *  email (invite reissue, admin-flow lookups). */
    async getByEmail(email: string): Promise<PrismaUser | null> {
        return prisma.user.findUnique({ where: { email: normalise(email) } });
    },

    /** Look up a user by the Olvid discussion bound at invite time.
     *  Used by the invite endpoint to reject double-bindings — two
     *  users pointing at the same Olvid discussion would collide on
     *  password-reset delivery (the DM would authenticate the other). */
    async getByOlvidDiscussionId(
        olvidDiscussionId: bigint,
    ): Promise<PrismaUser | null> {
        return prisma.user.findFirst({ where: { olvidDiscussionId } });
    },

    async getById(id: number, client: Client = prisma): Promise<PrismaUser | null> {
        return client.user.findUnique({ where: { id } });
    },

    /**
     * Activation writer used by accept-invite: sets the password hash and
     * (if not already set) stamps `activatedAt`. Accepts a Prisma
     * transaction client so the caller can compose it with the
     * token-consumption update atomically.
     */
    async activateWithHash(
        id: number,
        passwordHash: string,
        useOlvid: boolean,
        usePassword: boolean,
        client: Client = prisma,
    ): Promise<PrismaUser> {
        const current = await client.user.findUnique({ where: { id } });
        if (!current) {
            throw new Error(`activateWithHash: user ${id} not found`);
        }
        return client.user.update({
            where: { id },
            data: {
                passwordHash,
                olvidLogin: useOlvid,
                passwordLogin: usePassword,
                activatedAt: current.activatedAt ?? new Date(),
                // Invite is now consumed — clear the tracked message id so a
                // later delete-user flow doesn't try to revoke a message that
                // no longer represents a pending invitation.
                inviteOlvidMessageId: null,
            },
        });
    },

    /** First-run detection — the presence of any admin flips /setup off. */
    async findFirstAdmin(): Promise<PrismaUser | null> {
        return prisma.user.findFirst({ where: { role: "admin" } });
    },

    /** Guardrail for delete: refuse to remove the last admin. */
    async countAdmins(): Promise<number> {
        return prisma.user.count({ where: { role: "admin" } });
    },

    async create(input: CreateUserInput): Promise<PrismaUser> {
        return prisma.user.create({
            data: {
                login: normalise(input.login),
                email: input.email ? normalise(input.email) : null,
                role: input.role,
                passwordHash: input.passwordHash ?? null,
                name: input.name ?? null,
                activatedAt: input.activatedAt ?? null,
                olvidDiscussionId: input.olvidDiscussionId ?? null,
            },
        });
    },

    async update(id: number, patch: UpdateUserInput): Promise<PrismaUser> {
        const data: Record<string, unknown> = { ...patch };
        if (patch.email !== undefined) {
            data.email = patch.email ? normalise(patch.email) : null;
        }
        return prisma.user.update({ where: { id }, data });
    },

    /**
     * Password-reset writer. Unlike `activateWithHash`, does NOT touch
     * `activatedAt` — the caller is already an activated user picking a
     * new password, and re-stamping the field would misrepresent history.
     * Accepts a Prisma transaction client so `authRepository.resetPassword`
     * can compose it with token consumption atomically.
     */
    async setPasswordHash(
        id: number,
        passwordHash: string,
        client: Client = prisma,
    ): Promise<PrismaUser> {
        return client.user.update({
            where: { id },
            data: { passwordHash },
        });
    },

    async deleteById(id: number): Promise<void> {
        await prisma.user.delete({ where: { id } });
    },
};
