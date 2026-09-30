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
 * Authentication service for communication with repository and verify login function
 * for API requests (/api/auth/login/olvid).
 */

import { authRepository } from "#server/repositories/authRepository";
import type { User as PrismaUser } from "@prisma/client";
import { datatypes, OlvidClient } from "@olvid/bot-node";
import type { OlvidAuthIdentity } from "#shared/types/auth.ts";
import { authOlvidMessage } from "#server/utils/authMessages.ts";
import { AppLogManager } from "#shared/logManager.ts";

const logger = new AppLogManager("Authentication Service");

export const authService = {
    /**
     * Consume an invitation token and activate the owning user with the given
     * (already-hashed) password. Throws a 400 token_invalid on any token
     * failure (unknown / wrong purpose / expired / already used).
     */
    async acceptInvite(
        rawToken: string,
        passwordHash: string,
        useOlvid: boolean,
        usePassword: boolean,
    ): Promise<PrismaUser> {
        const user = await authRepository.acceptInvite(rawToken, passwordHash, useOlvid, usePassword);
        if (!user) {
            throw createError({ statusCode: 400, statusMessage: "token_invalid" });
        }
        logger.log(`User ${user.login} accepted the invitation.`)
        return user;
    },

    /**
     * Consume a password-reset token and set the owning user's password.
     * Same throw semantics as acceptInvite; differs only in that the
     * user is already activated (no activatedAt stamp).
     */
    async resetPassword(
        rawToken: string,
        passwordHash: string,
    ): Promise<PrismaUser> {
        const user = await authRepository.resetPassword(rawToken, passwordHash);
        if (!user) {
            throw createError({ statusCode: 400, statusMessage: "token_invalid" });
        }
        return user;
    },

    /**
     * Sends a message to specified discussion and wait for user reaction.
     * When reaction is received, edit message and return true.
     * If daemon is unreachable or if there is an error while reaching for reaction, sends false.
     *
     * Use its own OlvidClient instance to allow waiting for one and only one reaction.
     * @param discussionId
     * @param login
     * @return boolean
     */
    async reactionAuth(discussionId: bigint, login: string) {
        const client = new OlvidClient();

        try {
            await client.ping();
        } catch (error: any) {
            logger.error("Daemon unreachable :", error);
            return false;
        }

        try {
            const msg = await client.messageSend({
                discussionId: discussionId,
                body: authOlvidMessage(login)
            });

            if (msg.id === undefined) {
                logger.error("Error while sending message");
                return false;
            }

            // Creates notification handler
            client.onMessageReactionAdded({
                callback: async (_message, _promise) => {
                    logger.log(`User ${login} logged in`);
                },
                count: 1n, // Only handle the first reaction added on message
                messageIds: [msg.id], // Only reacts to login message
            });

            await client.waitForCallbacksEnd() // Wait for to be added
            await client.messageUpdateBody({
                messageId: msg.id,
                updatedBody: authOlvidMessageOK()
            });
            return true;
        } catch (error: any) {
            logger.error("Error while getting reaction", error);
            return false;
        }
    },

    // Unused but might be useful later
    /**
     * Fetch from repository discussion name and discussion photo data url of given discussion id.
     * @param discussionId
     */
    reactionIdentity(discussionId: bigint): OlvidAuthIdentity {
        const discussion = olvidDiscussionRepository.get(discussionId.toString());
        if (!discussion) return { photo: null, name: null };
        return { name: discussion.title, photo: discussion.photoDataUrl }
    }
};
