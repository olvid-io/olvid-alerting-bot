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
 * Scheduled-source heartbeat. Fires every minute via Nitro's
 * scheduled-tasks system in `nuxt.config.ts` nitro.scheduledTasks`.
 *
 * Responsibility:
 *   - heartbeat (this file)  → who + when. Reads all active scheduled
 *                              alerts (Polling + Monitoring), filters by
 *                              cron dueness, hands each due alert off to
 *                              the dispatcher.
 *   - pollingDispatcher      → how. Runs the source-specific probe,
 *                              decides fire/no-fire, notifies, persists
 *                              runtime state, writes the log.
 */

import { defineTask } from "nitropack/runtime";
import type { AlertModel } from "#shared/types/alert.ts";
import { scheduler } from "#shared/polling/scheduler.ts";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("Heartbeat");

/** Both PollingParams and MonitorParams carry a cron `schedule` string
 *  and a `_lastPolledAt` epoch — the only two fields the heartbeat
 *  actually reads. */
type ScheduledParams = { schedule?: string; _lastPolledAt?: number };


export default defineTask({
    meta: {
        name: "heartbeat", // must match the key in nuxt.config's scheduledTasks
        description: "Heartbeat — dispatches every scheduled alert that's due",
    },
    async run() {
        const due = await collectDueAlerts();
        appLog.log(`${due.length} alert(s) due`);
        const results = await Promise.allSettled(
            due.map((alert) => pollingDispatcher.dispatch(alert)),
        );
        appLog.groupEnd()
        return { result: { polled: results.length } };
    },
});

/**
 * Active scheduled alerts (Polling + Monitoring) whose cron has ticked
 * at least once since their last recorded polll
 */
async function collectDueAlerts(): Promise<AlertModel[]> {
    const alerts = await alertRepository.getActiveScheduled();
    return alerts.filter((a: AlertModel) => {
        const p = a.alertParams as ScheduledParams | undefined;
        if (!p?.schedule) return false;
        return scheduler.isDue(p.schedule, p._lastPolledAt);
    });
}
