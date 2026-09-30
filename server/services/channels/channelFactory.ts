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
 * Registry mapping BundleOutputType → ChannelDispatcher.
 *
 * Same shape as `formatterFactory` / `operatorFactory` / `aggregatorFactory`:
 * one file to touch when adding a new channel (Slack, Discord, …). Consumers
 * receive `null` for unknown types and decide what to do (skip + warn).
 */

import type { BundleOutput } from "#shared/types/bundle";
import type { ChannelDispatcher } from "./types";
import { olvidChannel } from "./olvidChannel";
import { mailChannel } from "./mailChannel";

const registry = new Map<BundleOutput["type"], ChannelDispatcher>([
    [olvidChannel.channel, olvidChannel],
    [mailChannel.channel, mailChannel],
]);

export const channelFactory = {
    forChannel(type: BundleOutput["type"]): ChannelDispatcher | null {
        return registry.get(type) ?? null;
    },
};
