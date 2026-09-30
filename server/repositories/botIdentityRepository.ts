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

import type { Identity } from "~~/shared/types/identity.ts";
import { photoToDataUrl } from "#server/utils/photo.ts";

/**
 * Identity cache filled on updater startup to display bot's displayName and photo.
 */

let botIdentityName: (string | null) = null;
let botIdentityPhoto: (Uint8Array | null) = null;

export const botIdentityRepository = {

    // Bot identity management
    setIdentity(displayName: string, photo: Uint8Array | null): void {
        botIdentityName = displayName;
        if (photo) botIdentityPhoto = photo;
    },

    getIdentity(): Identity {
        return {
            displayName: botIdentityName,
            photoDataUrl: botIdentityPhoto ? photoToDataUrl(botIdentityPhoto) : null,
        };
    }
}