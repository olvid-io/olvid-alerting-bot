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
 * Olvid daemon listener.
 * startUpdater() is called on startup by a Nitro plugin. Runs init() then
 * setup listeners for events and stays active until daemon crash.
 * Restart updater automatically if daemon crashes or is not available at startup.
 * Try again delay is configurable with UPDATER_TRY_AGAIN_DELAY env variable.
 */

import { datatypes } from "@olvid/bot-node";
import { OlvidClientWrapper } from "#server/utils/olvidClientWrapper.ts";
import { olvidClient } from "./olvidClient";
import { AppLogManager } from "#shared/logManager.ts";
import { botIdentityRepository } from "#server/repositories/botIdentityRepository.ts";
import { welcomeMessage } from "#server/utils/authMessages.ts";

const appLog = new AppLogManager("Olvid Updater");
const appLogOlvid = new AppLogManager("Olvid");

const UPDATER_TRY_AGAIN_DELAY = Number.parseInt(process.env.UPDATER_TRY_AGAIN_DELAY ?? "2000");

function toModel(d: datatypes.Discussion): DiscussionModel {
    const isGroup = d.identifier?.case === "groupId";
    return {
        id: String(d.id),
        title: d.title + (isGroup ? " (group)" : ""),
        kind: isGroup ? "group" : "contact",
        // Photo lives in the parallel `photosById` map. listModels() inlines
        // it as a data URL on read — the row itself carries no bytes.
        photoDataUrl: null,
    };
}


export async function init(): Promise<boolean> {
    OlvidClientWrapper.newInstance()
    const active = await OlvidClientWrapper.testConnection()
    if (!active) return false;

    const discussions = await olvidClient.getDiscussions();
    for (const discussion of discussions) {
        if (!discussion || !discussion.id) continue;
        try {
            const photo = await olvidClient.getDiscussionPhoto(discussion.id);
            olvidDiscussionRepository.add(toModel(discussion), photo);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            appLog.warn(
                `⚠️ Init failed for discussion ${discussion.id}: ${msg}`,
            );
        }
    }


    const identity = await olvidClient.getBotIdentity();
    if (identity) {
        botIdentityRepository.setIdentity(identity.displayName, identity.photo);
    } else {
        appLog.warn(`⚠️ Failed to fetch bot identity details`)
    }

    return true;
}

/** Guard against a second start in dev-HMR reloads (Nitro plugins can
 *  re-run on server hot-reload; the underlying subscription would
 *  otherwise leak on the daemon side). */
type updaterState = "stopped" | "starting" | "started";
let state: updaterState = "stopped";

/**
 * Updater startup.
 * Calls init() once then initialize updaters for events.
 * Called once on startup by nitro plugin, then restarts automatically with setTimeout() on crash.
 */
export async function startUpdater(): Promise<void> {
    if (state !== "stopped") {
        appLog.warn("Already running — skipping second start");
        return;
    }
    state = "starting";
    appLog.log("Trying to start updater...");

    // Seed the cache before wiring listeners. If we did it the other way
    // around, events arriving during init() would race against a partial
    // snapshot — updateTitle() would silently no-op on unknown ids.
    const clientActive = await init();
    if (!clientActive) {
        state = "stopped";
        appLog.warn(`Failed to start updater. Retrying connection in ${UPDATER_TRY_AGAIN_DELAY}ms.`)
        setTimeout(startUpdater, UPDATER_TRY_AGAIN_DELAY);
        return;
    }

    appLog.log("Updater started. Listening for events.")
    appLog.info(
        `Cache seeded: ${olvidDiscussionRepository.size().discussions} discussions, ${olvidDiscussionRepository.size().photos} photos`,
    );


    state = "started";


    OlvidClientWrapper.client.onDiscussionNew({
        callback: async (discussion: datatypes.Discussion) => {
            appLogOlvid.log(`New discussion: ${discussion.id}`);

            // Try to load photo now, if it fails — the photo will resurface via onXxxPhotoUpdated.
            let photo = null
            try {
                photo = await olvidClient.getDiscussionPhoto(discussion.id);
            } catch {
                appLogOlvid.error("Failed to fetch discussion photo")
            }
            olvidDiscussionRepository.add(toModel(discussion), photo);

            // Welcome message
            if (discussion.identifier.case === "contactId") {
                await olvidClient.sendMessageOne(discussion.id, welcomeMessage());
            }
        },
    });

    OlvidClientWrapper.client.onDiscussionTitleUpdated({
        callback: (discussion: datatypes.Discussion, previousTitle: string) => {
            appLogOlvid.log(
                `✅ Title ${discussion.id}: "${previousTitle}" → "${discussion.title}"`,
            );
            olvidDiscussionRepository.updateTitle(discussion.id.toString(), discussion.title);
        },
    });

    OlvidClientWrapper.client.onGroupDeleted({
        callback: (group: datatypes.Group) => {
            appLogOlvid.log(`✅ Group deleted: ${group.id}`);
            olvidDiscussionRepository.remove(group.id.toString());
        },
    });

    OlvidClientWrapper.client.onContactPhotoUpdated({
        callback: async (contact: datatypes.Contact) => {
            appLogOlvid.log(`✅ Contact photo updated: ${contact.id}`);
            try {
                const photo = await olvidClient.getDiscussionPhoto(contact.id);
                if (photo) olvidDiscussionRepository.updatePhoto(contact.id.toString(), photo);
            } catch {
                /* silent — cache keeps the previous photo */
            }
        },
    });

    OlvidClientWrapper.client.onGroupPhotoUpdated({
        callback: async (group: datatypes.Group) => {
            appLogOlvid.log(`✅ Group photo updated: ${group.id}`);
            try {
                const photo = await olvidClient.getDiscussionPhoto(group.id);
                if (photo) olvidDiscussionRepository.updatePhoto(group.id.toString(), photo);
            } catch {
                /* silent — cache keeps the previous photo */
            }
        },
    });


    // runForever() never resolves under normal operation. If it does
    // (daemon disconnect, terminal error), flag is reset and connection is retried
    try {
        await OlvidClientWrapper.runForever();
    } finally {
        state = "stopped";
        appLog.info(`Updater disconnected. Retrying connection in ${UPDATER_TRY_AGAIN_DELAY}ms.`)
        setTimeout(startUpdater, UPDATER_TRY_AGAIN_DELAY);
    }
}

export function updaterIsOn(): boolean {
    return state === "started";
}
