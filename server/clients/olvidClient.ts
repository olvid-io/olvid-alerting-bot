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
 * This is specifically the Olvid messaging daemon.
 *
 * Responsibilities:
 *   - Send a message to one or more Olvid discussions.
 *   - List the available discussions (for the destination selector).
 */

import type { datatypes } from "@olvid/bot-node";
import { OlvidClientWrapper } from "#server/utils/olvidClientWrapper.ts";
import { AppLogManager } from "#shared/logManager.ts";

type MessageId = datatypes.MessageId;

/** Every message the bot sends is OUTBOUND from its own perspective —
 *  the SDK enum value is 2. Kept as a named constant so consumers
 *  don't hardcode magic numbers when reconstructing MessageId shapes
 *  from a persisted bigint id. */
const OUTBOUND: datatypes.MessageId["type"] = 2;

const logger = new AppLogManager("Olvid Client");

export const olvidClient = {
    async sendMessage(discussions: bigint[], message: string) {

        let allOk = true;
        await Promise.allSettled(discussions.map((discussionId) =>
                OlvidClientWrapper.client.messageSend({
                    discussionId: discussionId,
                    body: message,
                }).then(() => {
                    logger.info(`Message sent to discussion ${discussionId}`);
                }).catch((error: any) => {
                    allOk = false;
                    logger.error(
                        `Failed to send to discussion ${discussionId} :`,
                        error?.message ?? error,
                    );
                })
            )
        );

        return allOk;
    },

    /**
     * Send a single message and return its outbound id so the caller
     * can track it (delete / edit later). Separate from `sendMessage`
     * because most callers (notifier fan-out) don't need the id and
     * would pay for the extra wiring; the invite flow does.
     *
     * Return shape:
     *   { ok: true, messageId }   — daemon accepted and produced an id
     *   { ok: true, messageId: undefined }
     *                              — daemon accepted but returned no id
     *                                (shouldn't happen; treat as success)
     *   { ok: false }              — send failed (caught + logged)
     */
    async sendMessageOne(
        discussionId: bigint,
        body: string,
    ): Promise<{ ok: boolean; messageId?: bigint }> {
        try {
            const sent = await OlvidClientWrapper.client.messageSend({ discussionId, body });
            logger.info(
                `Message sent to discussion ${discussionId}`,
            );
            return { ok: true, messageId: sent.id?.id };
        } catch (error: unknown) {
            logger.error(
                "An error occurred while sending a message:",
                error,
            );
            return { ok: false };
        }
    },

    /**
     * Revoke a previously-sent outbound message. `deleteEverywhere: true`
     * removes it from the invitee's inbox too — the whole point when
     * cancelling a pending invitation. Returns a boolean so the caller
     * (delete-user flow) can log the outcome without cascading failure.
     */
    async deleteOutboundMessage(id: bigint): Promise<boolean> {
        try {
            // @ts-expect-error Mismatch error due to how datatypes are built in OlvidClient
            const messageId: MessageId = { type: OUTBOUND, id: id }
            await OlvidClientWrapper.client.messageDelete({
                messageId: messageId,
                deleteEverywhere: true,
            });
            logger.info(`Message ${id} deleted`);
            return true;
        } catch (error: unknown) {
            logger.error(
                `Failed to delete message ${id}:`,
                error,
            );
            return false;
        }
    },

    // Olvid's MessageId is a composite { type: INBOUND|OUTBOUND, id: bigint }.
    async editMessage(messageId: MessageId, newBody: string) {
        try {
            await OlvidClientWrapper.client.messageUpdateBody({ messageId, updatedBody: newBody });
            logger.info(`Message edited :`, messageId.id);
            return true;
        } catch (error: unknown) {
            logger.error(
                "An error occurred while editing a message:",
                error,
            );
            return false;
        }
    },

    async reactToMessage(messageId: MessageId) {
        try {
            await OlvidClientWrapper.client.messageReact({ messageId: messageId, reaction: "🆗" });
            logger.log(`[Olvid] Message edited :`, messageId.id);
            return true;
        } catch (error: unknown) {
            logger.error(
                "[Olvid] An error occurred while reacting to a message:",
                error,
            );
            return false;
        }
    },

    async getDiscussions(): Promise<datatypes.Discussion[]> {
        try {
            const discussions = OlvidClientWrapper.client.discussionList();
            const arrayDiscussions = [];

            try {
                for await (const discussion of discussions) {
                    if (!discussion || !discussion.id) continue;
                    arrayDiscussions.push(discussion);
                }
            } catch (error: unknown) {
                logger.warn("⚠️ Async request ended abruptly :", error);
            }

            return arrayDiscussions;
        } catch (error: unknown) {
            logger.error(
                "A critical error occurred while getting discussions",
                error,
            );
            // Empty array on fatal failure — frontend keeps working with no destinations.
            return [];
        }
    },

    async getDiscussionPhoto(discussionId: bigint) {
        try {
            return await OlvidClientWrapper.client.discussionDownloadPhoto({ discussionId });
        } catch (error: unknown) {
            logger.error(
                "A critical error occurred while getting discussion photo",
                error,
            );
            return null;
        }
    },


    /* Bot identity management
    * Is read-only for now
    * */
    async getBotIdentity() {
        try {
            const displayName = (await (OlvidClientWrapper.client.identityGet())).displayName;
            const photo = await OlvidClientWrapper.client.identityDownloadPhoto()
            return { displayName: displayName, photo: photo };
        } catch (error: unknown) {
            logger.error(
                "A critical error occurred while getting bot identity",
                error,
            );
            return null;
        }
    }
};
