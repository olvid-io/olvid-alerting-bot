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

import type { DiscussionModel } from "#shared/types/discussion";
import { alertService } from "~/utils/alertService";

/**
 * Discussion fetcher, similarly to useAlertFetching.
 * Fetches discussions in a global ref with useState shared between components.
 * - availableDiscussions : useState to DiscussionModel array containing discussions
 * - discussions : global ref to boolean value, true while fetching is ongoing
 * - fetchDiscussions : async function fetching discussions from database
 */
export const useDiscussions = () => {
    const availableDiscussions = useState<DiscussionModel[]>(
        "discussions",
        () => [],
    );
    const discussionsLoading = useState<boolean>(
        "discussionsLoading",
        () => true,
    );

    const fetchDiscussions = async () => {
        discussionsLoading.value = true;
        try {
            availableDiscussions.value =
                (await alertService.getDiscussionList()) || [];
        } catch (e) {
            // Same reasoning as fetchAlerts — clear on any failure so the audience
            // picker doesn't offer stale Olvid contacts after a session ends.
            availableDiscussions.value = [];
            clientLogger.error("Failed to load discussions :", e);
        } finally {
            discussionsLoading.value = false;
        }
    };

    return {
        availableDiscussions,
        discussionsLoading,
        fetchDiscussions
    }

};