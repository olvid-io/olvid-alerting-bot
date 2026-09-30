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

// The full alert object as the frontend handles it.
//
//    No internal discriminator on the params (that would duplicate the
//    parent's `input` field). Narrowing is by the parent — use the
//    `getPollingParams(alert)` accessor below to avoid casts at every
//    read site. The moment a second member joins the union, every
//    `alert.alertParams.url`-style read becomes a TS error and the
//    accessor is the migration path.

import type { BundleModel } from "./bundle";
import type { PollingParams } from "./polling";
import type { MonitorParams } from "./monitor";
import { Source } from "./source";

export const AlertStatus = {
    Draft: "draft",
    Inactive: "inactive",
    Active: "active",
} as const;
export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

/**
 * Union of all source-specific param shapes. Each Source value MAY
 * contribute one type here; sources without per-alert config (Webhook)
 * contribute nothing (undefined). Adding a new source is a one-line union extension.
 */
export type AlertParams = PollingParams | MonitorParams | undefined;

export type AlertModel = {
    id: number | null;
    title: string;
    description: string;
    /**
     * Source value, or undefined for the blank-form initial state
     * (user hasn't picked a source yet)..
     */
    input?: Source;
    status: AlertStatus;
    token: string;
    /**
     * Source-specific config. Shape narrows by `input`:
     * Webhook alerts carry no params.
     * Prefer `getPollingParams(alert)` over `as PollingParams` at read sites.
     */
    alertParams?: AlertParams;
    bundles: BundleModel[];
    logs?: AlertLog[];
};

/**
 * Safe typed accessor for the polling-specific params block. Returns
 * undefined when the alert isn't a polling alert OR has no params yet
 * (blank form). Keeps read sites free of `as PollingParams` casts
 */
export const getPollingParams = (
    alert: AlertModel | null | undefined,
): PollingParams | undefined =>
    alert?.input === Source.Polling
        ? (alert.alertParams as PollingParams | undefined)
        : undefined;

/**
 * Safe typed accessor for the monitoring-specific params block. Returns
 * undefined when the alert isn't a monitoring alert OR has no params yet
 * Keeps read sites free of `as Monitoring Params` casts
 */
export const getMonitorParams = (
    alert: AlertModel | null | undefined,
): MonitorParams | undefined =>
    alert?.input === Source.Monitoring
        ? (alert.alertParams as MonitorParams | undefined)
        : undefined;
