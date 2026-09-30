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

// Polling schedule — a cron expression that replaces the old
// `intervalSeconds` + `dailyAt` pair.
//
// Same shape as alertRepository / notifierService: one exported object
// (`scheduler`) groups the public methods. Types and constants stay as
// named exports since they're data, not service methods.
//
// Why cron: one field models every cadence the alert can have
//
// The wizard exposes the three friendly modes that cover the common cases (every N minutes, every N
// hours, daily at HH:MM) and serialises them through `modeToCron`. The reverse, `cronToMode`, classifies a
// stored cron back into one of those patterns. Anything outside those three patterns reads back as
// 'custom' — display-only, no editor for it (yet).
//
// Library: `@catbee/cron-parser` — `parse(cron).next() / .prev()`. Used
// server-side by the heartbeat dispatcher and client-side by
// `useScheduleLabel`.

import cronParser from "@catbee/cron-parser";

export type ScheduleMode =
    | { unit: "minutes"; value: number }
    | { unit: "hours"; value: number }
    | { unit: "daily"; dailyAt: string } // 'HH:MM'
    | { unit: "custom"; expression: string };

/** Sensible starting point for a freshly-created polling alert. Every 10 min.
 *  Also the fallback when the user toggles from Advanced back to Basic with a
 *  non-friendly cron (i.e. one that Basic mode can't represent). */
export const DEFAULT_SCHEDULE = "*/10 * * * *";

export const scheduler = {
    /** Serialize the wizard's friendly mode object into a cron expression. */
    modeToCron(mode: ScheduleMode): string {
        switch (mode.unit) {
            case "minutes":
                return mode.value === 1 ? "* * * * *" : `*/${mode.value} * * * *`;
            case "hours":
                return mode.value === 1 ? "0 * * * *" : `0 */${mode.value} * * *`;
            case "daily": {
                const [hh, mm] = mode.dailyAt.split(":").map((n) => parseInt(n, 10));
                return `${mm} ${hh} * * *`;
            }
            case "custom":
                return mode.expression;
        }
    },

    cronToMode(schedule: string): ScheduleMode {
        const trimmed = schedule.trim();
        if (trimmed === "* * * * *") return { unit: "minutes", value: 1 };
        const mMin = /^\*\/(\d+) \* \* \* \*$/.exec(trimmed);
        if (mMin) return { unit: "minutes", value: parseInt(mMin[1]!, 10) };
        if (trimmed === "0 * * * *") return { unit: "hours", value: 1 };
        const mHr = /^0 \*\/(\d+) \* \* \*$/.exec(trimmed);
        if (mHr) return { unit: "hours", value: parseInt(mHr[1]!, 10) };
        const mDay = /^(\d+) (\d+) \* \* \*$/.exec(trimmed);
        if (mDay) {
            const hh = mDay[2]!.padStart(2, "0");
            const mm = mDay[1]!.padStart(2, "0");
            return { unit: "daily", dailyAt: `${hh}:${mm}` };
        }
        return { unit: "custom", expression: trimmed };
    },

    /**
     * When is the next run for this schedule, given a starting point?
     * Defaults to "starting from now". Used by the dispatcher to decide if an
     * alert is due and to compute the next due time after a successful poll.
     */
    nextRun(schedule: string, after: Date = new Date()): Date {
        const interval = cronParser.parse(schedule, { currentDate: after });
        return interval.next().toDate();
    },

    /**
     * When did the most recent scheduled run occur, given a current moment?
     * `isDue(schedule, lastPolledAt)` uses this to decide if a poll has been
     * missed since the last attempt.
     */
    prevRun(schedule: string, before: Date = new Date()): Date {
        const interval = cronParser.parse(schedule, { currentDate: before });
        return interval.prev().toDate();
    },

    /**
     * Is this alert due to run RIGHT NOW?
     *
     * "Due" means: there has been at least one scheduled fire-time between
     * `lastPolledAt` (or, if never polled, epoch 0 — i.e. fire on next tick)
     * and now. Equivalent to: `prevRun(schedule) > lastPolledAt`.
     *
     * The dispatcher calls this on every active polling alert each minute
     * and polls the ones that return true.
     */
    isDue(
        schedule: string,
        lastPolledAt: number | undefined,
        now: Date = new Date(),
    ): boolean {
        const lastFireExpected = this.prevRun(schedule, now).getTime();
        return lastFireExpected > (lastPolledAt ?? 0);
    },
};
