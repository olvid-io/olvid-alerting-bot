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

// One envelope for "run this alert once without side effects" — both
// Polling and Monitoring sources return this shape, and the UI reads
// only this shape. Adding a new source means writing a new tester that
// produces `AlertTestResult`; the endpoint and the UI don't change.
//
// Reused from elsewhere:
//   · `Verdict` (shared/types/condition) — one row of the per-field
//     breakdown. Polling produces many; monitoring produces none.
//
// Diagnostic-only: the tester never dispatches, so there is no
// `ChannelReport` / `DispatchOutcome` here — those describe a real
// send. Keep the two type trees separate.

import type { Verdict } from "./condition";

/** The verdict half of the envelope — did this run fire, and why. */
export type ConditionOutcome = {
    fired: boolean;
    /** Human-readable reason. Absent when the outcome carries none
     *  (e.g. condition kind=None fires every time). */
    reason?: string;
    /** Per-field expansion. Empty / absent for monitoring (no field tree). */
    verdicts?: Verdict[];
};

/** One bundle's rendered message + metadata for the "messages per
 *  bundle" section of the result modal. */
export type BundleMessageResult = {
    index: number;
    /** `null` for bundles that only exist in-memory (unsaved). */
    bundleId: number | null;
    formating: string;
    discussionCount: number;
    /** Empty string when `error` is set. */
    message: string;
    /** Handlebars / formatter failure isolated to this bundle. `null`
     *  when the bundle rendered successfully. */
    error: string | null;
};

/**
 * `parsed` is `unknown` at the type level: polling ships the parser
 * output tree, monitoring ships a MonitorProbePayload. The UI treats
 * it as opaque JSON (rendered via JSON.stringify) for the debug drawer.
 *
 * `error: null` is the sole success signal — no separate `ok` boolean.
 */
export type AlertTestResult = {
    /** Top-level failure reason. `null` on success. When set, the rest
     *  of the envelope may be partial (parsed/condition absent when the
     *  run failed before reaching them). */
    error: string | null;
    /** Raw parsed source / probe payload. Absent when the run failed
     *  before parsing. */
    parsed?: unknown;
    /** Condition verdict. Absent when the run failed before evaluation. */
    condition?: ConditionOutcome;
    bundleMessages: BundleMessageResult[];
};
