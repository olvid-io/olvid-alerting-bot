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

// Shared types for the polling subsystem.
//
// The polling pipeline is: fetch → parse → evaluate condition. Each stage is
// behind a thin interface so additional content formats (JSON, HTML, …) can be
// added by dropping a new parser into ./parsers/ without touching the engine.

import type { Verdict } from "#shared/types/condition";

export interface ParserContext {
    raw: string;
}

export interface ParseResult {
    raw: string;
    parsed: any;
    error?: string;
}

export interface Parser {
    format: string;

    parse(ctx: ParserContext): ParseResult;
}

export interface EvalResult {
    fired: boolean;
    reason: string;
    /** Full per-path breakdown (empty when kind=None or no fields
     *  configured). Reused as `ConditionOutcome.verdicts` on the client. */
    verdicts: Verdict[];
}

export type RunResult = {
    ok: boolean;
    url: string;
    format: string;
    raw?: string;
    parsed?: any;
    condition?: EvalResult;
    error?: string;
};
