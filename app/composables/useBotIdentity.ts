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

import { botIdentityService } from "~/utils/botIdentityService.ts";
import { daemonService } from "~/utils/daemonService.ts";

/**
 * Bot identity composable used to fetch bot display name and profile picture.
 * Uses useState to share data if multiples sources refer to this composable.
 */
export const useBotIdentity = () => {
    const { t } = useI18n();
    const displayName = useState<string | null>("botIdentityDisplayName", () => t("topNav.nameAlt"));
    const photoDataUrl = useState<string | null>("botIdentityPhotoDataUrl", () => null);
    const identityConnected = useState<boolean>("botIdentityConnected", () => false);
    const identityLoading = useState<boolean>("botIdentityLoading", () => false);

    const fetchBotIdentity = async () => {
        identityLoading.value = true;
        try {
            const identity: Identity = await botIdentityService.getIdentity();
            displayName.value = identity.displayName;
            photoDataUrl.value = identity.photoDataUrl;
        } catch (error) {
            photoDataUrl.value = null;
            displayName.value = t("topNav.nameAlt");
            clientLogger.error(`Error fetching bot identity : ${error}`);
        } finally {
            identityLoading.value = false;
            identityConnected.value = await daemonService.testDaemon();
        }
    }

    return {
        displayName,
        photoDataUrl,
        identityLoading,
        identityConnected,
        fetchBotIdentity
    }
}