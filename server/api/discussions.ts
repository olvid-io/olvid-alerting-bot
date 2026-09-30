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
 * List every Olvid discussion the daemon knows about. Reads from the
 * in-process cache (olvidDiscussionRepository) seeded and kept live by
 * server/plugins/olvid-updater.ts, so this handler never talks to the
 * daemon on the request path.
 */

import type { DiscussionModel } from "#shared/types/discussion";

export default defineEventHandler(
    async (event): Promise<DiscussionModel[]> => {
        await requireUserSession(event);
        return olvidDiscussionRepository.listModels();
    },
);
