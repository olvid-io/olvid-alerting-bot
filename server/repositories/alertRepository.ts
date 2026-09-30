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
 * Alert data access — the aggregate-root repository. PURE persistence,
 * no business rules.
 *
 * The alert aggregate spans three tables:
 *   AlertTable ──1:N── Bundle ──1:N── BundleOutput
 *
 * Each level has its own repo file:
 *   · alertRepository        (this file)        → AlertTable
 *   · alertBundleRepository  (sibling)          → Bundle
 *   . alertPayloadRepository  (sibling)
 *   · alertOutputRepository  (grand-sibling)    → BundleOutput
 */

import { AlertStatus } from "#shared/types/alert";
import { Source } from "#shared/types/source";
import { prisma } from "#server/db/prisma";
import type { BundleModel } from "~~/shared/types/bundle";
import {
    alertBundleRepository,
    serializeBundle,
} from "./alertBundleRepository";

// ── Serializer ──────────────────────────────────────────────────────────
// The aggregate's read-side transformation. Delegates each bundle to
// alertBundleRepository.serializeBundle (which in turn delegates outputs
// to alertOutputRepository.serializeOutput) so no layer knows about the
// deeper shapes.

function serializeAlert(alert: any) {
    return {
        ...alert,
        bundles: (alert.bundles ?? []).map(serializeBundle),
    };
}

/** Nested include shape used by every read so the full aggregate is hydrated in one query. */
const ALERT_INCLUDE = {
    bundles: { include: { outputs: true } },
} as const;

// ── Repository ────────────────────────────────────────────────────────────

export const alertRepository = {
    // ── Reads ────────────────────────────────────────────────────────────────

    async getAll() {
        const rows = await prisma.alertTable.findMany({
            orderBy: { createdAt: "desc" },
            include: ALERT_INCLUDE,
        });
        return rows.map(serializeAlert);
    },

    /**
     * All active alerts whose input drives a scheduled probe (Polling or
     * Monitoring). Webhook alerts are excluded — they're push-driven and
     * the heartbeat has no work to do for them.
     */
    async getActiveScheduled() {
        const rows = await prisma.alertTable.findMany({
            where: {
                status: AlertStatus.Active,
                input: { in: [Source.Polling, Source.Monitoring] },
            },
            include: ALERT_INCLUDE,
        });
        return rows.map(serializeAlert);
    },

    /** Returns the corresponding alert row with alert_id = id in database */
    async getById(id: number) {
        const row = await prisma.alertTable.findUnique({
            where: { id },
            include: ALERT_INCLUDE,
        });
        if (!row) return null;
        return serializeAlert(row);
    },

    /** Used by the webhook endpoint. Same include chain as every other read. */
    async getByToken(token: string) {
        const row = await prisma.alertTable.findUnique({
            where: { token },
            include: ALERT_INCLUDE,
        });
        return row ? serializeAlert(row) : null;
    },

    async getAllWithLastLog() {
        const rows = await prisma.alertTable.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                logs: {
                    orderBy: {
                        createdAt: "desc"
                    },
                    take: 1
                },
                bundles: {
                    include: {
                        outputs: true
                    }
                }
            },
        });
        return rows.map(serializeAlert);
    },

    // ── Mutations (bare — no domain rules) ──────────────────────────────────

    /**
     * Atomically create an alert + its bundles + each bundle's outputs.
     * The three layers of the aggregate all commit or all abort. Child
     * writes go through alertBundleRepository (which in turn hands off
     * outputs to alertOutputRepository); this file only touches AlertTable.
     */
    async create(data: {
        title: string;
        description?: string | null;
        input: Source;
        status: AlertStatus;
        alertParams?: any;
        bundles?: BundleModel[];
    }) {
        return await prisma.$transaction(async (tx) => {
            const row = await tx.alertTable.create({
                data: {
                    title: data.title,
                    description: data.description ?? null,
                    input: data.input,
                    alertParams: data.alertParams ?? null,
                    status: data.status,
                },
            });
            await alertBundleRepository.createForAlert(tx, row.id, data.bundles);

            // Re-fetch with the full include so the returned aggregate matches
            // getById's shape. Costs one extra round-trip inside the transaction
            // but keeps callers oblivious to Prisma's write-response semantics.
            const full = await tx.alertTable.findUnique({
                where: { id: row.id },
                include: ALERT_INCLUDE,
            });
            return serializeAlert(full);
        });
    },

    /**
     * Full overwrite — replaces every bundle (and their outputs, via
     * cascade) with the incoming list. Same atomicity contract as create.
     */
    async update(
        id: number,
        data: {
            title: string;
            description?: string | null;
            input: Source;
            status: AlertStatus;
            alertParams?: any;
            bundles?: any[];
        },
    ) {
        return await prisma.$transaction(async (tx) => {
            await tx.alertTable.update({
                where: { id },
                data: {
                    title: data.title,
                    description: data.description ?? null,
                    input: data.input,
                    alertParams: data.alertParams ?? null,
                    status: data.status,
                },
            });

            // Bundle replacement is INTENTIONAL: it only fires when the caller
            // explicitly restates the bundle list. Previously the delete ran
            // unconditionally and `createForAlert` bailed on undefined /
            // empty — so any PUT that didn't restate bundles wiped them.
            // Symptoms: changing a top-level field (title, condition, params,
            // status) via any endpoint that omitted bundles nuked the alert's
            // outputs on save.
            if (Array.isArray(data.bundles)) {
                await alertBundleRepository.deleteAllForAlert(tx, id);
                await alertBundleRepository.createForAlert(tx, id, data.bundles);
            }

            const full = await tx.alertTable.findUnique({
                where: { id },
                include: ALERT_INCLUDE,
            });
            return serializeAlert(full);
        });
    },

    /** Status-only update. No activation rules — caller has already decided. */
    async setStatusRaw(id: number, status: AlertStatus) {
        const updated = await prisma.alertTable.update({
            where: { id },
            data: { status },
            include: ALERT_INCLUDE,
        });
        return serializeAlert(updated);
    },

    async delete(id: number) {
        return await prisma.alertTable.delete({ where: { id } });
    },

    /** Persist runtime polling state (_lastSeenId, _lastHash, _baseline, …) without
     *  touching anything else. Used by the polling engine, not by the user. */
    async updateAlertParams(id: number, params: Record<string, any>) {
        await prisma.alertTable.update({
            where: { id },
            data: { alertParams: params },
        });
    },

    // Last-payload sidecar tables live in `alertPayloadRepository` — this
    // aggregate only touches the alert graph itself.
};
