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
 * Factory: Formatting enum value → formatting strategy.
 *
 * The lookup map replaces the switch that used to live in
 * notifierService.renderBody. Adding a new format =
 *   1. add its value to the Formatting enum,
 *   2. write its strategy file in this folder,
 *   3. add one entry to the map.
 * notifierService never changes (OCP).
 *
 * PollingCustom intentionally maps to customStrategy: both run the
 * bundle's Handlebars template; the enum distinction only matters to the
 * wizard UI (which templates it offers), not to rendering.
 */

import { Formatting } from "#shared/types/bundle";
import type { FormattingStrategy } from "./formattingStrategy";

const strategies: Record<Formatting, FormattingStrategy> = {
    [Formatting.WebhookRaw]: unformattedStrategy,
    [Formatting.Simple]: simpleStrategy,
    [Formatting.Custom]: customStrategy,
    [Formatting.PollingCustom]: customStrategy,
    [Formatting.PollingDefault]: pollingDefaultStrategy,
};

export const formatterFactory = {
    /** Always returns a strategy — unknown/legacy formats degrade to the
     *  raw-JSON dump instead of dropping the notification. */
    forFormatting(formatting: string | undefined | null): FormattingStrategy {
        return strategies[formatting as Formatting] ?? unformattedStrategy;
    },
};
