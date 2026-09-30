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
 * Factory: alert Source → dispatch strategy.
 *
 * This is THE single place in the server that branches on Source for
 * dispatch purposes. Adding a new scheduled source =
 *   1. write its strategy file in this folder,
 *   2. add one case below.
 * Nothing else changes (OCP) — the dispatcher, heartbeat and repository
 * stay untouched.
 *
 * Webhook intentionally returns null: it is push-driven and never flows
 * through the heartbeat → dispatcher path.
 */

import type { DispatchStrategy } from "#shared/types/dispatchStrategy";
import { Source } from "#shared/types/source";

export const dispatcherFactory = {
    forSource(source: string | undefined | null): DispatchStrategy | null {
        switch (source) {
            case Source.Polling:
                return pollingStrategy;
            case Source.Monitoring:
                return monitoringStrategy;
            default:
                return null;
        }
    },
};
