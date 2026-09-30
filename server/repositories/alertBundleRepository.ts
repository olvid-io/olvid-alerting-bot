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
 * Bundle data access — the middle layer of the alert aggregate.
 * A Bundle owns (name + format + custom_script) and has 1:N outputs;
 * output persistence is delegated one level down to alertOutputRepository
 * so this repo never touches the BundleOutput table directly.
 *
 * Boundary rules:
 *   · Writes accept a Prisma transaction client so parent (alertRepository)
 *     can bundle the whole alert+bundle+output creation into one atomic
 *     step via prisma.$transaction.
 *   · Read serialization (serializeBundle) is exported so alertRepository
 *     can compose the aggregate response without knowing about outputs.
 */

import {
    alertOutputRepository,
    serializeOutput,
    type PrismaTx,
} from "./alertOutputRepository";

// ── Shape helpers ────────────────────────────────────────────────────────

/** Strip an incoming Bundle wire object down to the DB fields we persist
 *  on the `Bundle` table itself (outputs are handled separately). */
function toBundleRow(bundle: any, alertId: number) {
    return {
        alertId,
        name: bundle?.name ?? null,
        formating: bundle?.formating ?? "Unformatted",
        custom_script: bundle?.custom_script ?? null,
        mailSubject: bundle?.mailSubject ?? null,
    };
}

/** DB row (with `outputs` include) → wire shape. */
export function serializeBundle(bundle: any) {
    const { outputs, ...rest } = bundle;
    return {
        ...rest,
        outputs: (outputs ?? []).map(serializeOutput),
    };
}

// ── Repository ────────────────────────────────────────────────────────────

export const alertBundleRepository = {
    /**
     * Create every bundle listed for an alert. Assumes the AlertTable row
     * already exists (this is a child-persister, not an aggregate root).
     * Delegates each bundle's outputs to alertOutputRepository so the
     * layering stays clean.
     *
     * Must run inside prisma.$transaction from the caller so the whole
     * alert+bundles+outputs graph commits or aborts together.
     */
    async createForAlert(
        tx: PrismaTx,
        alertId: number,
        bundles: unknown,
    ): Promise<void> {
        if (!Array.isArray(bundles) || bundles.length === 0) return;
        for (const bundle of bundles) {
            const created = await tx.bundle.create({
                data: toBundleRow(bundle, alertId),
            });
            await alertOutputRepository.createForBundle(
                tx,
                created.id,
                (bundle as any)?.outputs,
            );
        }
    },

    /**
     * Wipe every bundle of an alert (used by the "full overwrite" update
     * path). BundleOutput rows are cascaded away by the FK; no manual
     * cleanup needed at this layer.
     */
    async deleteAllForAlert(tx: PrismaTx, alertId: number): Promise<void> {
        await tx.bundle.deleteMany({ where: { alertId } });
    },
};
