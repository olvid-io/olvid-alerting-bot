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

// Polling orchestrator. Two entry points so far, both side-effect-free with
// respect to alert state (no bundle firing):
//
//   retrieve(url, format) — just fetch + parse. Used by the wizard's
//     "Retrieve" button to populate the click-to-select tree.
//
//   test(alert)           — fetch + parse + evaluate the alert's saved
//     condition against its stored baseline. Used by the "Run test poll"
//     button in the alert view.
//
// When the scheduled-cycles engine is added later, it will reuse retrieve()
// + the evaluator, and add the missing pieces (baseline persistence + bundle
// firing via notifierService.processAlert).

import { getParser } from "./parsers";
import { evaluate } from "./conditions/evaluator";
import type { RunResult } from "./types";
import type { PollingParams } from "#shared/types/polling";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("Polling Engine");

// Structural shape of an alert row as this engine reads it — we only need
// the id (to key persisted payloads) and the polymorphic `alertParams`
// blob narrowed to PollingParams at the call site.
interface PollableAlert {
    id?: number | null;
    alertParams?: PollingParams;
}

async function fetchText(url: string): Promise<string> {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status} : ${res.statusText}`);
    return await res.text();
}

export const pollingEngine = {
    async retrieve(url: string, format: string): Promise<RunResult> {
        if (!url) return { ok: false, url: "", format, error: "URL is required" };
        if (!format)
            return { ok: false, url, format: "", error: "Format is required" };

        const parser = getParser(format);
        if (!parser)
            return {
                ok: false,
                url,
                format,
                error: `No parser available for format "${format}"`,
            };

        let raw;
        try {
            raw = await fetchText(url);
        } catch (e: any) {
            appLog.error(`Fetch failed for url ${url} :`, e.message);
            return { ok: false, url, format, error: e?.message ?? "Fetch error" };
        }

        try {
            const { parsed, error } = parser.parse({ raw });
            return { ok: !error, url, format, raw, parsed, error };
        } catch (e: any) {
            appLog.error(
                "Parse threw despite internal try/catch :",
                e,
            );
            return {
                ok: false,
                url,
                format,
                raw,
                error: e?.message ?? "Parse error",
            };
        }
    },

    async test(alert: PollableAlert): Promise<RunResult> {
        // alertParams is the new name (post-refactor); fall back to alertParams
        // for any in-flight legacy alert that hasn't been re-saved yet.
        const params = (alert?.alertParams ?? {}) as PollingParams;
        const url = params.url;
        const format = params.format;
        const r = await this.retrieve(url, format);

        // Persist BOTH outcomes (success vs failure) keyed by alert id. Failures
        // go into a separate table so a subsequent success doesn't erase the
        // diagnostic trail — admins always see the last failure even if the
        // alert is currently healthy.
        //
        // `r.raw === undefined` ⇒ fetch never produced bytes (network/HTTP),
        // `r.raw !== undefined && !r.parsed` ⇒ bytes arrived but parsing broke.
        if (alert?.id != null) {
            if (!r.ok) {
                try {
                    await alertPayloadRepository.upsertLastFailedPayload(alert.id, {
                        raw: r.raw ?? null,
                        parsed: r.parsed ?? null,
                        error: r.error ?? "Unknown error",
                        stage: r.raw === undefined ? "fetch" : "parse",
                    });
                } catch (e: any) {
                    appLog.error(
                        "Failed to persist failure :",
                        e?.message ?? e,
                    );
                }
                return r;
            }

            // TODO Last alert payload isn't currently being handled for non-webhook
            if (r.parsed !== undefined) {
                try {
                    await alertPayloadRepository.upsertLastAlertPayload(
                        alert.id,
                        r.parsed,
                    );
                } catch (e: any) {
                    appLog.error(
                        "Failed to persist last payload :",
                        e?.message ?? e,
                    );
                }
            }
        } else if (!r.ok) {
            return r;
        }

        const baseline = params._baseline; // present once the live engine has run
        const condResult = evaluate(params.condition, r.parsed, baseline);
        return { ...r, condition: condResult };
    },
};
