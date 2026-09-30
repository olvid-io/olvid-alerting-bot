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
 * Olvid channel strategy.
 *
 * Recipients arrive as OlvidOutputParams (stringified bigint ids). Anything
 * non-parseable is warned + skipped rather than throwing, so one bad row
 * can't take down a bundle's send. Olvid renders markdown natively — the
 * message is passed through verbatim (matches the preview split).
 */

import { BundleOutputType, type OlvidOutputParams } from "#shared/types/bundle";
import type { ChannelReport } from "#shared/types/dispatchStrategy";
import { olvidClient } from "../../clients/olvidClient";
import type { ChannelDispatcher } from "./types";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("Olvid");

export const olvidChannel: ChannelDispatcher = {
    channel: BundleOutputType.Olvid,

    async dispatch(outputs, ctx): Promise<ChannelReport | null> {
        const discussions: bigint[] = [];
        for (const output of outputs) {
            if (output.type !== BundleOutputType.Olvid) continue;
            const raw = (output.params as OlvidOutputParams)?.discussionId;
            if (raw === null || raw === undefined) continue;
            try {
                discussions.push(BigInt(raw));
            } catch {
                appLog.warn(
                    `⚠️ Bundle #${ctx.bundle.id}: invalid Olvid discussionId ${JSON.stringify(raw)}`,
                );
            }
        }
        if (discussions.length === 0) return null;

        const ok = await olvidClient.sendMessage(discussions, ctx.message);
        return {
            channel: BundleOutputType.Olvid,
            ok,
            recipients: discussions.length,
            error: ok ? undefined : "Olvid daemon reported a send failure",
        };
    },
};
