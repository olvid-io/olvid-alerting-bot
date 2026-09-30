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
 * Dispatcher — takes ONE alert that's known to be due and runs it through
 * its source's dispatch strategy, then handles the common tail:
 *
 *   1. resolve   dispatcherFactory picks the strategy for alert.input
 *   2. execute   the strategy runs probe → evaluate → decide → notify
 *   3. persist   runtime-state patch is merged into alertParams
 *   4. log       the outcome is appended to the AlertLog timeline
 *
 * Steps 3-4 are identical for every source, which is why they live here
 * and not in the strategies (Strategy pattern: only the varying part is
 * delegated).
 *
 * The heartbeat task is just "who + when" (collect the due alerts, hand
 * them off). Errors are caught internally — callers only need to
 * `await dispatch(alert)` and never worry about crashing the caller
 * loop. `Promise.allSettled` on the caller side is still good hygiene.
 */

import type { AlertModel } from "#shared/types/alert";
import type { DispatchOutcome } from "#shared/types/dispatchStrategy";
import { getErrorMessage } from "~/utils/errors";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("Polling Dispatcher");

async function dispatch(alert: AlertModel): Promise<void> {
    const strategy = dispatcherFactory.forSource(alert.input);
    if (!strategy) {
        appLog.warn(
            `Alert #${alert.id} has no dispatch strategy for input "${alert.input}" — skipping`,
        );
        return;
    }

    // Stamp the attempt time up front so a crashed probe still counts as
    // "polled" — otherwise a failing alert would re-run on every tick.
    const startedAt = Date.now();
    let outcome: DispatchOutcome = { status: "success", error: null };
    let paramsPatch: Record<string, unknown> = {};

    try {
        const result = await strategy.execute(alert);
        outcome = result.outcome;
        paramsPatch = result.paramsPatch;
    } catch (error: unknown) {
        const msg = getErrorMessage(error, "Unexpected error during dispatch");
        appLog.error(`Alert #${alert.id} threw:`, msg);
        outcome = { status: "error", error: msg };
    } finally {
        // Persist + log are best-effort — a repository failure here should
        // never crash the heartbeat loop.
        if (alert.id != null) {
            await persistRuntimeState(alert, {
                _lastPolledAt: startedAt,
                ...paramsPatch,
            });
            await writeOutcomeLog(alert.id, outcome);

        }
    }
}

/** Merge the strategy's runtime-state patch into the alert's params. */
async function persistRuntimeState(
    alert: AlertModel,
    patch: Record<string, unknown>,
) {
    try {
        await alertRepository.updateAlertParams(alert.id as number, {
            ...(alert.alertParams ?? {}),
            ...patch,
        });
    } catch (error: unknown) {
        appLog.warn(
            `Alert #${alert.id} failed to persist runtime state :`,
            getErrorMessage(error, "unknown"),
        );
    }
}

async function writeOutcomeLog(alertId: number, outcome: DispatchOutcome) {
    // The AlertLog timeline is meant to surface real dispatch attempts —
    // successful or failed — plus pipeline errors (fetch / parse /
    // evaluate). Clean no-fire ticks (condition wasn't met, nothing sent)
    // would flood the UI with noise, so we skip them: a "success" outcome
    // with no details is exactly that shape (strategies set
    // `details: { stage: "dispatch", channels }` only when they actually
    // notified, and stamp a `stage` on every error path).
    if (outcome.status === "success" && !outcome.details) {
        return;
    }
    try {
        // Repository owns the DispatchOutcome → row decomposition: status,
        // error, and structured details all flow through one entry point so
        // dispatchers never need to know the DB column names.
        await alertLogRepository.insertOutcome(alertId, outcome);
    } catch (error: unknown) {
        appLog.warn(
            `Alert #${alertId} failed to write log :`,
            getErrorMessage(error, "unknown"),
        );
    }
}

export const pollingDispatcher = { dispatch };
