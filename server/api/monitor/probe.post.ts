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
 * Monitor probe endpoint — hit a URL once and return the same shape the
 * runtime dispatcher hands to the notifier. Used by the format editor so
 * what the user sees at design time (`useFormatEditorMonitoring`) matches
 * what their Handlebars template receives at fire time.
 *
 * No condition evaluation, no persistence — pure side-effect-free probe.
 * 4xx / 5xx are LEGITIMATE outcomes here, same as in the dispatcher.
 */

import { MONITOR_BODY_PREVIEW_MAX } from "~~/server/services/dispatchers/monitoringStrategy";
import type { MonitorProbePayload } from "#shared/types/monitor";
import { getErrorMessage } from "~/utils/errors";

type ProbeResponse =
    | { ok: true; probe: MonitorProbePayload }
    | { ok: false; error: string };

export default defineEventHandler(async (event): Promise<ProbeResponse> => {
    await requireUserSession(event);

    const body = await readBody<{ url?: string }>(event);
    const url = (body?.url ?? "").trim();
    if (!url) {
        return { ok: false, error: "URL is required" };
    }

    const t0 = Date.now();
    try {
        const res = await fetch(url, { method: "GET" });
        let bodyPreview: string;
        try {
            const text = await res.text();
            bodyPreview = text.slice(0, MONITOR_BODY_PREVIEW_MAX);
        } catch {
            bodyPreview = "";
        }

        return {
            ok: true,

            probe: {
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
            },
        };
    } catch (error: unknown) {
        return { ok: false, error: getErrorMessage(error, "Fetch failed") };
    }
});
