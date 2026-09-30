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
 * `Custom` — runs the bundle's user-authored Handlebars template over
 * the payload. Shared by `PollingCustom` (the factory maps both enum
 * values here): the template engine doesn't care whether the payload
 * came from a webhook POST or a parsed poll.
 *
 * Never throws: a broken template degrades to an apologetic message with
 * the raw payload attached, so the notification still reaches the
 * discussion and the author can see what their script received.
 */

import { Formatting } from "#shared/types/bundle";
import { formatMessage as runHandlebars } from "#shared/handlebars";
import { getErrorMessage } from "~/utils/errors";
import type { FormattingStrategy } from "./formattingStrategy";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("Custom Strategy");

export const customStrategy: FormattingStrategy = {
    formatting: Formatting.Custom,

    render(alert, bundle, payload) {
        try {
            return runHandlebars(bundle.custom_script, payload);
        } catch (error: unknown) {
            const msg = getErrorMessage(error, "Unknown template error");
            appLog.error(
                `Script failed for alert "${alert.title}": ${msg}`,
            );
            return `🚨 An error occurred while running the custom script for alert **${alert.title}**\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
        }
    },
};
