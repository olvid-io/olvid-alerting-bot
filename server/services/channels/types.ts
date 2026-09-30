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
 * Channel-dispatch strategy contract.
 *
 * A Bundle is homogeneous (one output kind by policy). The notifier picks
 * the strategy whose `channel` matches the bundle's kind and hands off a
 * small context object: the pre-formatted body plus the alert + bundle
 * needed to derive per-channel headers (mail subject, recovery prefix, …).
 * Adding a new channel = new strategy file + one registry line.
 */

import type {
    AlertModel,
    AlertStatus,
} from "#shared/types/alert";
import type { BundleModel, BundleOutput } from "#shared/types/bundle";
import type { ChannelReport } from "#shared/types/dispatchStrategy";

export type ChannelFireKind = "alert" | "recovery";

/** The `id`-required intersections mirror what the notifier already knows
 *  by the time it dispatches (persisted alert, persisted bundle). */
export type PersistedAlert = AlertModel & { id: number; status: AlertStatus };
export type PersistedBundle = BundleModel & { id: number };

export interface ChannelDispatchContext {
    alert: PersistedAlert;
    bundle: PersistedBundle;
    /** Formatter output — each strategy is free to use it verbatim or
     *  transform it for its transport. */
    message: string;
    kind: ChannelFireKind;
}

export interface ChannelDispatcher {
    channel: BundleOutput["type"];

    /** Emit a single ChannelReport for the outputs of one kind. Return
     *  `null` when there was nothing to send (all recipients invalid). */
    dispatch(
        outputs: BundleOutput[],
        ctx: ChannelDispatchContext,
    ): Promise<ChannelReport | null>;
}
