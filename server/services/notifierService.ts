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
 * Notifier — turns a fired alert into one or more outbound messages.
 *
 * Renamed from the misleading `alertManager`: this module doesn't "manage"
 * alerts (CRUD, status, lifecycle — that's alertService / alertRepository).
 * It does ONE thing: given an alert that just fired + the triggering
 * payload, format each of its bundles and dispatch through the right
 * channel strategy.
 *
 * Entry points:
 *   - processAlert(alert, payload, kind?) — top of the chain (webhook
 *                                           handler, polling engine).
 *   - processBundle(alert, bundle, payload, kind?) — fires a single bundle.
 *   - formatMessage(alert, bundle, payload, kind?) — builds the string for
 *     one bundle (also reused by the "test poll" endpoint to preview).
 *
 * On FireKind, alert is the default. The polling engine
 * passes 'recovery' when the WithRecovery trigger mode detects a falling
 * edge (condition was true on the last poll, now false). For recovery the
 * message body gets a "✓ RECOVERED:" prefix; channel-specific headers
 * (mail subject, etc.) each strategy decides on its own.
 */

import { AlertStatus, type AlertModel } from "#shared/types/alert";
import type { BundleModel, BundleOutput } from "#shared/types/bundle";
import type { ChannelReport } from "#shared/types/dispatchStrategy";
import { channelFactory } from "./channels/channelFactory";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("Notifier Service");

export type FireKind = "alert" | "recovery";

// The notifier consumes the shared wire types verbatim — no shadow types.
// `id` is nullable on the AlertModel but the notifier only runs after persistence
// (webhook handler, polling dispatcher), so we runtime-guard on entry and
// tell TS the narrowed shape via `FiredAlert` / `FiredBundle`.
export type FiredBundle = BundleModel & { id: number };
export type FiredAlert = AlertModel & {
    id: number;
    bundles: FiredBundle[];
};

const RECOVERY_PREFIX = "✓ RECOVERED:";

export const notifierService = {
    async getDiscussionList() {
        return await olvidClient.getDiscussions();
    },

    // Entry point for an incoming alert: webhook or polling tick). The alert is
    // resolved by token / id and carries its bundles. Each bundle is one
    // output (audience + format). Returns the flattened ChannelReport list
    // aggregated across every bundle so the caller (webhook handler /
    // dispatcher) can record what actually happened per channel.
    async processAlert(
        alert: AlertModel,
        payload: unknown,
        kind: FireKind = "alert",
    ): Promise<ChannelReport[]> {
        // Prevent running the notifier on un-persisted alerts
        if (alert.id == null) {
            appLog.warn(
                "ProcessAlert called with an non-saved alert (id=null)",
            );
            return [];
        }

        appLog.log(
            `⚙️ Processing alert #${alert.id}: ${alert.title}${kind === "recovery" ? " (recovery)" : ""}`,
        );

        if (alert.status !== AlertStatus.Active) {
            appLog.log(
                `The alert is not active (status: ${alert.status}) — skipping`,
            );
            return [];
        }

        const bundles: FiredBundle[] = alert.bundles.filter(
            (b): b is FiredBundle => b.id != null,
        );
        if (bundles.length === 0) {
            appLog.warn(`⚠️ Alert #${alert.id} is active but has no bundles`);
            return [];
        }

        const firedAlert: FiredAlert = { ...alert, id: alert.id, bundles };

        // Fire every bundle in parallel. `allSettled` keeps each bundle's
        // reports independent — a synchronous throw inside one `processBundle`
        // (e.g. an unexpected format-strategy crash) must not hide the
        // successes on the other bundles. Rejections are logged and dropped;
        // per-channel failures inside a bundle are already captured as
        // `ChannelReport { ok: false }` by `processBundle` itself.
        const perBundle = await Promise.allSettled(
            bundles.map((bundle) =>
                this.processBundle(firedAlert, bundle, payload, kind),
            ),
        );
        return perBundle.flatMap((res, i) => {
            if (res.status === "fulfilled") return res.value;
            appLog.error(
                `Bundle #${bundles[i]?.id} threw during processing:`,
                res.reason,
            );
            return [];
        });
    },

    async processBundle(
        alert: FiredAlert,
        bundle: FiredBundle,
        payload: unknown,
        kind: FireKind = "alert",
    ): Promise<ChannelReport[]> {
        const outputs = bundle.outputs;

        if (outputs.length === 0) {
            appLog.warn(
                `⚠️ Bundle #${bundle.id} of alert #${alert.id} has no outputs`,
            );
            return [];
        }

        const message = this.formatMessage(alert, bundle, payload, kind);

        // Group outputs by their channel kind. Bundles are homogeneous by
        // policy (one kind per bundle), but grouping keeps legacy mixed rows
        // round-tripping cleanly — one dispatcher round-trip per kind, never
        // one per output row. Dispatchers themselves live in ./channels; the
        // factory maps `BundleOutputType` → strategy. Adding a new channel is
        // one strategy file + one registry line, no notifier change.
        const byChannel = new Map<BundleOutput["type"], BundleOutput[]>();
        for (const output of outputs) {
            const list = byChannel.get(output.type);
            if (list) list.push(output);
            else byChannel.set(output.type, [output]);
        }

        const dispatches = [...byChannel.entries()].map(([type, os]) => {
            const dispatcher = channelFactory.forChannel(type);
            if (!dispatcher) {
                appLog.warn(
                    `⚠️ Bundle #${bundle.id}: unknown channel '${type}' — skipping`,
                );
                return Promise.resolve<ChannelReport | null>(null);
            }
            return dispatcher
                .dispatch(os, { alert, bundle, message, kind })
                .catch(
                    (err): ChannelReport => ({
                        channel: type,
                        ok: false,
                        recipients: os.length,
                        error: errorMessage(err),
                    }),
                );
        });

        const settled = await Promise.all(dispatches);
        return settled.filter((r): r is ChannelReport => r !== null);
    },

    // formatMessage is used by testers too, which pass a not-yet-persisted
    // draft alert (id nullable). Formatting only reads text fields, so the
    // wire types suffice.
    formatMessage(
        alert: AlertModel,
        bundle: BundleModel,
        payload: unknown,
        kind: FireKind = "alert",
    ): string {
        const body = renderBody(alert, bundle, payload);
        return kind === "recovery" ? `${RECOVERY_PREFIX} ${body}` : body;
    },
};

// Internal: builds the bundle's message body (no recovery prefix). The
// per-format logic lives in server/services/formatters/ — one strategy
// per Formatting value, selected by the factory. Strategies never throw.
function renderBody(
    alert: AlertModel,
    bundle: BundleModel,
    payload: unknown,
): string {
    const strategy = formatterFactory.forFormatting(bundle.formating);
    return strategy.render(alert, bundle, payload);
}

function errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    try {
        return JSON.stringify(err);
    } catch {
        return "unknown error";
    }
}
