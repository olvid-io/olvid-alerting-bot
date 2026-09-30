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

// Contract for a source-specific dispatch strategy (Strategy pattern).
//
// Each alert Source that runs on the heartbeat (Polling, Monitoring, …)
// ships one object implementing this interface. The dispatcher stays
// source-agnostic: it asks the factory for the right strategy, runs
// `execute`, then handles the COMMON tail itself (persist runtime state
// + append the outcome to the AlertLog).
//
// Split rationale: "how the fire/no-fire boolean is produced" varies per
// source; "what happens around it" (state persistence, logging, error
// containment) does not. The strategy owns only the varying part.

import type { AlertModel } from "./alert";
import type { BundleOutputType } from "./bundle"

// Per-channel dispatch summary. One entry per output channel actually
// exercised in a bundle (Olvid discussion, mail recipient list, …).
// The notifier collects one of these per channel and passes the whole
// array up to the strategy so the alert log can render exactly what
// succeeded and what didn't. Client boundary — safe to serialize as-is.

export interface ChannelReport {
    channel: BundleOutputType;
    ok: boolean;
    /** Number of recipients attempted for this channel on this bundle. */
    recipients: number;
    /** Short human-readable error line — present iff `ok === false`. */
    error?: string;
}

/**
 * Where in the pipeline the run terminated. Populated when the pipeline
 * threw before dispatch (fetch / parse / evaluate) or when dispatch
 * itself surfaced a per-channel failure summary.
 */
export type DispatchStage = "fetch" | "parse" | "evaluate" | "dispatch";

export interface DispatchDetails {
    stage?: DispatchStage;
    channels?: ChannelReport[];
}

export type DispatchOutcome = {
    status: "success" | "warning" | "error";
    error: string | null;
    details?: DispatchDetails;
};

export type DispatchResult = {
    outcome: DispatchOutcome;
    /** Runtime-state fields to merge into `alertParams` (e.g. `_lastFired`,
     *  `_baseline`, `_lastStatus`). The dispatcher stamps `_lastPolledAt`
     *  itself, so strategies never need to. */
    paramsPatch: Record<string, unknown>;
};

/**
 * Reduce a set of channel reports to the log status enum. Encapsulates
 * the promotion rule in one place so every dispatcher / webhook handler
 * agrees on what "partial" means.
 */
export function summariseChannels(
    reports: ChannelReport[],
): "success" | "warning" | "error" {
    if (reports.length === 0) return "success";
    const anyOk = reports.some((r) => r.ok);
    const anyFail = reports.some((r) => !r.ok);
    if (anyOk && anyFail) return "warning";
    if (anyFail) return "error";
    return "success";
}

export interface DispatchStrategy {
    /** Run the source-specific probe → evaluate → decide → notify chain.
     *  Should only throw on truly unexpected errors — anticipated failures
     *  (network down, bad config) are reported through `outcome`. */
    execute(alert: AlertModel): Promise<DispatchResult>;
}
