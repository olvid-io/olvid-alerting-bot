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
 * Payload lookup for the FormatEditor.
 *
 * Two modes:
 *   ?type=success&alertId=...  → most recent SUCCESSFUL payload for this
 *                                alert (webhook body or parsed poll).
 *   ?type=failed&alertId=...   → most recent FAILURE for this alert, for
 *                                admin debugging. Separate from `success`,
 *                                so a recovery doesn't erase the trail.
 *
 * Library examples are NOT served from here — the front-end imports them
 * directly from `#shared/payloadTemplates` via `getWebhookSample()`. No
 * HTTP roundtrip needed because the library is dev-defined static data.
 */

export default defineEventHandler(async (event) => {
    await requireUserSession(event);

    const query = getQuery(event);
    const type = query.type as string;

    if (type !== "success" && type !== "failed") {
        throw createError({
            statusCode: 400,
            statusMessage: `Unsupported ?type=${type ?? "<missing>"}. Use 'success' or 'failed'.`,
        });
    }

    const alertId = Number(query.alertId);
    if (!Number.isFinite(alertId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing or invalid ?alertId=",
        });
    }

    if (type === "success") {
        const row = await alertPayloadRepository.getLastAlertPayload(alertId);
        return {
            payload: row?.payload ?? null,
            receivedAt: row?.receivedAt ?? null,
        };
    }

    const row = await alertPayloadRepository.getLastFailedPayload(alertId);
    return {
        raw: row?.raw ?? null,
        parsed: row?.parsed ?? null,
        error: row?.error ?? null,
        stage: row?.stage ?? null,
        failedAt: row?.failedAt ?? null,
    };
});
