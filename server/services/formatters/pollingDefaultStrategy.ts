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
 * `PollingDefault` — the computed polling message: which watched fields
 * verified the condition and their observed values. All the real logic
 * lives in shared/polling/message.ts (it's also used by the wizard's
 * bundle preview); this strategy is the thin adapter into the registry.
 */

import { Formatting } from "#shared/types/bundle";
import { buildPollingDefaultMessage } from "#shared/polling/message";
import type { FormattingStrategy } from "./formattingStrategy";

export const pollingDefaultStrategy: FormattingStrategy = {
    formatting: Formatting.PollingDefault,

    render(alert, _bundle, payload) {
        return buildPollingDefaultMessage(alert, payload);
    },
};
