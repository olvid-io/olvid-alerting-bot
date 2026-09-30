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

import { LogStatus } from "#imports";
import { AlertStatus } from "#shared/types/alert";
import { summariseChannels } from "#shared/types/dispatchStrategy";
import type { DispatchDetails, DispatchOutcome } from "#shared/types/dispatchStrategy";
import { getErrorMessage } from "~/utils/errors";
import { AppLogManager } from "#shared/logManager.ts";

/**
 * Webhook receiver. One log row per incoming request. The row's status
 * follows the same "success | warning | error" enum used by polling +
 * monitoring — labelled SENT / PARTIAL / FAILED in the UI — so admins
 * see a homogenous timeline across sources.
 */

const appLog = new AppLogManager("Webhook");

async function safeLogOutcome(alertId: number, outcome: DispatchOutcome) {
    try {
        await alertLogRepository.insertOutcome(alertId, outcome);
    } catch (e) {
        appLog.warn(
            `Alert #${alertId} failed to write log:`,
            getErrorMessage(e),
        );
    }
}

// Small helpers to keep the request handler focused on flow. `stageFail`
// covers the "no dispatch happened, we know exactly where it broke" case.
// `dispatchOutcome` promotes the notifier's per-channel report to the
// timeline enum (success → success, mixed → warning, all-fail → error).
function stageFail(
    stage: DispatchDetails["stage"],
    error: string,
): DispatchOutcome {
    return { status: "error", error, details: { stage } };
}

export default defineEventHandler(async (event) => {
    const method = event.node.req.method;

    if (method != "POST") {
        throw createError({
            statusCode: 400,
            statusMessage: "Woops, you're not a webhook are you?",
        });
    }

    const token = getRouterParam(event, "token");

    if (!token) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing webhook token",
        });
    }

    const alert = await alertRepository.getByToken(token);

    if (!alert) {
        throw createError({ statusCode: 404, statusMessage: "Webhook not found" });
    }

    // Read the body defensively. If the client posted non-JSON, readBody can
    // throw — capture the raw text so admins can see what came in even when we
    // can't parse it. `payload` stays `unknown` — the formatter strategies
    // narrow / validate at their own boundary.
    let payload: unknown;
    let rawBody: string | null = null;
    try {
        payload = await readBody(event);
    } catch (parseErr: any) {
        try {
            rawBody = (await readRawBody(event, "utf-8")) ?? null;
        } catch {
            /* body already consumed */
        }
        const msg = parseErr?.message ?? "Failed to read request body";
        await alertPayloadRepository.upsertLastFailedPayload(alert.id, {
            raw: rawBody,
            error: msg,
            stage: "parse",
        });
        await safeLogOutcome(alert.id, stageFail("parse", `Invalid body: ${msg}`));
        throw createError({ statusCode: 400, statusMessage: "Invalid body" });
    }

    appLog.log(
        `Token ${token} — alert #${alert.id} with ${alert.bundles.length} bundle(s)`,
    );

    // Inactive alerts still accept the webhook (so the sender doesn't retry
    // in vain) but we log a warning so the operator sees the mismatch in
    // the timeline.
    if (alert.status !== AlertStatus.Active) {
        await safeLogOutcome(alert.id, {
            status: LogStatus.Warning,
            error: `Alert is ${alert.status} — webhook received but not dispatched`,
            details: { stage: "dispatch" },
        });
        return { status: "ignored", message: `Alert is ${alert.status}` };
    }

    try {
        const channels = await notifierService.processAlert(alert, payload);
        // Persist the body as this alert's last-received payload. Keyed by alert
        // id, so two webhook alerts with the same source no longer overwrite each
        // other's history.
        await alertPayloadRepository.upsertLastAlertPayload(alert.id, payload);

        // Promote to partial/failed when any channel silently failed —
        // symmetric with the polling + monitoring dispatchers.
        const status =
            channels.length > 0 ? summariseChannels(channels) : "success";
        const anyChannelError = channels.find((c) => !c.ok)?.error ?? null;
        const outcome = {
            status,
            error: status === "success" ? null : anyChannelError,
            details:
                channels.length > 0 ? { stage: "dispatch" as const, channels } : undefined,
        };
        await safeLogOutcome(alert.id, outcome);
    } catch (error: any) {
        const msg = error?.message ?? "Unknown error during processAlert";
        appLog.error("❌ Unexpected error:", msg);
        // Persist the failure for admin debugging. The body did parse, so we
        // have a structured `parsed` value; `raw` is left null since we'd have
        // to re-serialize (which would lose info for non-JSON bodies anyway).
        try {
            await alertPayloadRepository.upsertLastFailedPayload(alert.id, {
                parsed: payload ?? null,
                error: msg,
                stage: "process",
            });
        } catch (persistErr: any) {
            appLog.error(
                "❌ Failure-persist failed too:",
                persistErr?.message,
            );
        }
        const outcome = stageFail("dispatch", msg);
        await safeLogOutcome(alert.id, outcome);

        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }

    return { status: "success", message: "Webhook accepted and processed" };
});
