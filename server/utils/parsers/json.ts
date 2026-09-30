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

// JSON parser — trivial pass-through to JSON.parse. Same output shape
// as the XML/HTML parsers (JSON-like tree) so the condition evaluator
// and tree renderer don't need to care about the source format.

import { PollingFormat } from "#shared/types/polling";
import type { Parser, ParserContext, ParseResult } from "../types";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("JSON Parser");

export const jsonParser: Parser = {
    format: PollingFormat.JSON,
    parse(ctx: ParserContext): ParseResult {
        const raw = ctx.raw ?? "";
        if (!raw.trim()) {
            return {
                raw,
                parsed: null,
                error: "Empty response body — nothing to parse.",
            };
        }
        // Cheap pre-check: JSON must start with "{" or "[" (or a primitive).
        // We accept the common object/array cases and fall through to
        // JSON.parse for the rest, letting it produce the real error.
        try {
            const parsed = JSON.parse(raw);
            return { raw, parsed };
        } catch (e: any) {
            appLog.error("Parse failed :", e);
            return { raw, parsed: null, error: e?.message ?? "JSON parse error" };
        }
    },
};
