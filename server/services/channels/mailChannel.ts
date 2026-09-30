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
 * Mail channel strategy.
 *
 * Subject rules live here so the notifier doesn't have to know about them:
 *   · Per-bundle override (`bundle.mailSubject`) wins when set.
 *   · Falls back to the alert title.
 *   · Recovery runs prefix the chosen subject with the RECOVERY marker
 *     so the reader immediately sees "this is the all-clear".
 * Body is passed through as HTML — the mail transport is HTML-native and
 * the preview mirrors that (see MailPreview.vue).
 */

import { BundleOutputType, type MailOutputParams } from "#shared/types/bundle";
import type { ChannelReport } from "#shared/types/dispatchStrategy";
import { mailClient } from "../../clients/mailClient";
import type { ChannelDispatcher } from "./types";

const RECOVERY_PREFIX = "✓ RECOVERED:";

export const mailChannel: ChannelDispatcher = {
    channel: BundleOutputType.Mail,

    async dispatch(outputs, ctx): Promise<ChannelReport | null> {
        const addresses: string[] = [];
        for (const output of outputs) {
            if (output.type !== BundleOutputType.Mail) continue;
            const raw = (output.params as MailOutputParams)?.address;
            if (typeof raw === "string" && raw.trim() !== "") {
                addresses.push(raw.trim());
            }
        }
        if (addresses.length === 0) return null;

        const baseSubject = ctx.bundle.mailSubject?.trim() || ctx.alert.title;
        const subject =
            ctx.kind === "recovery"
                ? `${RECOVERY_PREFIX} ${baseSubject}`
                : baseSubject;

        const ok = await mailClient.send(addresses, subject, ctx.message);
        return {
            channel: BundleOutputType.Mail,
            ok,
            recipients: addresses.length,
            error: ok ? undefined : "MailPace rejected one or more recipients",
        };
    },
};
