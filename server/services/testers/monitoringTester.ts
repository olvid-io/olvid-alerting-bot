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

// Monitoring flavour of "test this alert once". Mirrors what
// monitoringStrategy.execute does at runtime — probe URL, capture
// status/body/latency, evaluate the status-match rule — but skips
// firePolicy, persistence, and bundle firing. Returns the shared
// AlertTestResult envelope so the UI is source-agnostic.

import type { AlertModel } from "#shared/types/alert";
import { getMonitorParams } from "#shared/types/alert";
import type { AlertTestResult } from "#shared/types/testResult";
import type { MonitorProbePayload } from "#shared/types/monitor";
import { statusMatches, describeStatusMatch } from "#shared/polling/matcher";
import { getErrorMessage } from "~/utils/errors";
import { MONITOR_BODY_PREVIEW_MAX } from "../dispatchers/monitoringStrategy";
import { formatBundleMessages } from "./formatBundles";

export const monitoringTester = {
    async test(alert: AlertModel): Promise<AlertTestResult> {
        const params = getMonitorParams(alert);
        if (!params) {
            return {
                error: "Alert has no monitor params",
                bundleMessages: [],
            };
        }

        // Probe. 4xx/5xx are legitimate outcomes — only network errors
        // bail through the catch. Same policy as the runtime dispatcher.
        const t0 = Date.now();
        let res: Response;
        let bodyPreview: string;
        try {
            res = await fetch(params.url, { method: "GET" });
            try {
                const text = await res.text();
                bodyPreview = text.slice(0, MONITOR_BODY_PREVIEW_MAX);
            } catch {
                bodyPreview = "";
            }
        } catch (error: unknown) {
            return {
                error: getErrorMessage(error, "Fetch failed"),
                bundleMessages: [],
            };
        }

        const payload: MonitorProbePayload = {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            url: res.url,
            body: bodyPreview,
            latencyMs: Date.now() - t0,
            redirected: res.redirected,
            type: res.type,
            contentType: res.headers.get("content-type"),
            contentLength: res.headers.get("content-length")
                ? Number(res.headers.get("content-length"))
                : null,
        };

        const fired = statusMatches(params.match, res.status);
        const matchLabel = describeStatusMatch(params.match);
        const reason = fired
            ? `HTTP ${res.status} matches ${matchLabel}`
            : `HTTP ${res.status} does not match ${matchLabel}`;

        return {
            error: null,
            parsed: payload,
            condition: { fired, reason },
            bundleMessages: formatBundleMessages(alert, payload),
        };
    },
};
