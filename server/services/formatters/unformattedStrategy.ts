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

// `Unformatted` — raw payload dump inside a JSON code fence. Also the
// factory's fallback for unknown Formatting values, so a corrupt DB row
// still produces a readable (if ugly) message instead of nothing.

import { Formatting } from "#shared/types/bundle";
import type { FormattingStrategy } from "./formattingStrategy";

export const unformattedStrategy: FormattingStrategy = {
    formatting: Formatting.WebhookRaw,

    render(_alert, _bundle, payload) {
        return `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
    },
};
