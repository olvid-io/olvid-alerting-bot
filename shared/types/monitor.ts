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

// Monitoring-specific alert configuration. Stored as the JSON `alertParams`
// column on AlertTable when `input === Source.Monitoring`.
//
// Semantically parallel to PollingParams (same cron cadence, same trigger
// mode, same bundles + notifier + log pipeline), but the "condition" is
// a match on the HTTP response STATUS CODE rather than a rule over a
// parsed body. There is no `format` field — no body parsing happens.
//
// `_`-prefixed keys are runtime state managed by the dispatcher (last
// observed status, last-fired flag for edge detection, last-poll
// timestamp). They survive serialization but the UI ignores them.

import type { TriggerMode } from "./triggerMode";

export type StatusMatch =
    | { kind: "codes"; codes: number[] }
    | { kind: "range"; range: HttpRange }
    | { kind: "not-ok" } | { kind: "no-http-response" };

export type HttpRange = "2xx" | "3xx" | "4xx" | "5xx";

export type MonitorParams = {
    url: string;
    /** Cron expression describing the probing cadence */
    schedule: string;
    /** Monitor only parameter */
    match: StatusMatch;

    triggerMode?: TriggerMode;
    /** Fire after `datapointsN` of the last `datapointsM` evaluations
     *  match. Default 1/1 (fire immediately). */
    datapointsN?: number;
    datapointsM?: number;
    _lastFired?: boolean;
    _lastStatus?: number;
    _lastPolledAt?: number;
};

/** Shape of the payload returned by /api/monitor/probe.*/
export type MonitorProbePayload = {
    status: number;
    statusText: string;
    ok: boolean;

    url: string;
    body?: string;

    latencyMs: number;
    redirected: boolean;
    type: ResponseType;

    contentType?: string | null;
    contentLength?: number | null;
    headers?: Record<string, string>;
} | {
    errorText: string;
    latencyMs: number;
};
