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

// Predicate — turns a StatusMatch rule + an observed HTTP status into
// a fire/no-fire decision. No IO, no DOM, safe on both server and client.
//
// Used by:
//   - pollingDispatcher (server) → real evaluation on each probe.
//   - useStatusMatchLabel / editor (client) → live preview + validation.

import type { HttpRange, StatusMatch } from "../types/monitor";

/** Boundaries of the four HTTP status ranges we surface in the UI. */
const RANGE_BOUNDS: Record<HttpRange, [number, number]> = {
    "2xx": [200, 299],
    "3xx": [300, 399],
    "4xx": [400, 499],
    "5xx": [500, 599],
};

export function statusMatches(match: StatusMatch, status: number): boolean {
    if (!Number.isFinite(status)) return false;

    switch (match.kind) {
        case "codes":
            return match.codes.includes(status);
        case "range": {
            const [lo, hi] = RANGE_BOUNDS[match.range];
            return status >= lo && status <= hi;
        }
        case "not-ok":
            return status < 200 || status >= 300;
        case "no-http-response":
            return false;
    }
}

/** Machine-friendly one-liner used in server-side test verdicts
 *  ("HTTP 404 matches codes [404, 500]"). English-only — the polling
 *  evaluator's `reason` strings follow the same convention, so this
 *  keeps the AlertTestResult envelope consistent across sources.
 */
export function describeStatusMatch(match: StatusMatch): string {
    switch (match.kind) {
        case "codes":
            return `codes [${match.codes.join(", ")}]`;
        case "range":
            return `range ${match.range}`;
        case "not-ok":
            return "any non-2xx";

        case "no-http-response":
            return "no http response";
    }
}

/** True when the match rule is well-formed enough to evaluate. Editors
 *  use this to gate the "next" button on the wizard trigger step. */
export function isStatusMatchValid(match: StatusMatch | undefined): boolean {
    if (!match) return false;
    switch (match.kind) {
        case "codes":
            return (
                match.codes.length > 0 && match.codes.every((c) => c >= 100 && c <= 599)
            );
        case "range":
            return match.range in RANGE_BOUNDS;
        case "not-ok":
            return true;
        case "no-http-response":
            return true;
    }
}
