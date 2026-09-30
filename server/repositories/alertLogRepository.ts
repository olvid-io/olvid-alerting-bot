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
 * AlertLog persistence — one row per poll / webhook event.
 *
 * The DB stores { status, error, details } where `details` is a JSON
 * blob carrying the structured DispatchDetails ({ stage, channels }).
 * Callers should prefer `insertOutcome(alertId, outcome)` when they
 * already hold a DispatchOutcome — it decomposes the outcome for the
 * repository so downstream code doesn't touch the DB shape directly.
 *
 * The 200-row cap per alertId is enforced right here on insert so it
 * can never drift out of shape: the row is created, then anything past
 * the cap is deleted in the same request.
 */

import {
    LogStatus,
    type LogStatus as LogStatusT,
} from "#shared/types/statusLog";
import type {
    DispatchDetails,
    DispatchOutcome,
} from "#shared/types/dispatchStrategy";
import { prisma } from "../db/prisma";

/** Hard cap per alertId. See the schema comment for rationale. */
const MAX_LOGS_PER_ALERT = 200;

/** Prisma → wire shape. Coerces the Date to an ISO string, and re-shapes
 *  the JSON `details` column into the typed DispatchDetails object the
 *  client expects (or null when the row carries no structured detail). */
function serialize(row: {
    id: number;
    alertId: number;
    status: string;
    error: string | null;
    details: unknown;
    createdAt: Date;
}) {
    return {
        id: row.id,
        alertId: row.alertId,
        status: row.status as LogStatusT,
        error: row.error,
        details: (row.details ?? null) as DispatchDetails | null,
        createdAt: row.createdAt.toISOString(),
    };
}

async function pruneOverflow(alertId: number) {
    const total = await prisma.alertLog.count({ where: { alertId } });
    if (total <= MAX_LOGS_PER_ALERT) return;
    const overflow = total - MAX_LOGS_PER_ALERT;
    const oldest = await prisma.alertLog.findMany({
        where: { alertId },
        orderBy: { createdAt: "asc" },
        take: overflow,
        select: { id: true },
    });
    await prisma.alertLog.deleteMany({
        where: { id: { in: oldest.map((r) => r.id) } },
    });
}

export const alertLogRepository = {
    /**
     * Low-level append. Callers with an already-shaped DispatchOutcome
     * should prefer `insertOutcome` — it keeps the details/error
     * decomposition in one place.
     */
    async insert(
        alertId: number,
        status: LogStatusT,
        error: string | null = null,
        details: DispatchDetails | null = null,
    ) {

        const inserted = await prisma.alertLog.create({
            data: {
                alertId,
                status,
                error,
                // @ts-expect-error : Prisma's Json column accepts undefined but not our typed null
                // shape; coerce to an explicit JSON null so a "no details" row
                // reads back as null instead of the sentinel
                details: details ?? undefined,
            },
        });
        await pruneOverflow(alertId);
        return serialize(inserted);
    },

    /**
     * Preferred entry point for dispatchers + the webhook handler. Takes
     * a DispatchOutcome and pulls the three persisted pieces out of it —
     * callers never touch the DB column names.
     */
    insertOutcome(alertId: number, outcome: DispatchOutcome) {
        return alertLogRepository.insert(
            alertId,
            outcome.status,
            outcome.error,
            outcome.details ?? null,
        );
    },

    /**
     * Latest first, capped at `limit` (defaults to the 200-row hard cap
     * so the caller doesn't have to remember it). Powers the right-side
     * logs panel in AlertView.
     */
    async getForAlert(alertId: number, limit: number = MAX_LOGS_PER_ALERT) {
        const rows = await prisma.alertLog.findMany({
            where: { alertId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
        return rows.map(serialize);
    },

    /** Convenience shortcuts so callers don't have to import LogStatus. */
    logSuccess: (alertId: number, details: DispatchDetails | null = null) =>
        alertLogRepository.insert(alertId, LogStatus.Success, null, details),
    logWarning: (
        alertId: number,
        error: string,
        details: DispatchDetails | null = null,
    ) => alertLogRepository.insert(alertId, LogStatus.Warning, error, details),
    logError: (
        alertId: number,
        error: string,
        details: DispatchDetails | null = null,
    ) => alertLogRepository.insert(alertId, LogStatus.Error, error, details),
};
