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

// Server-side polling condition evaluator. Thin adapter over the centralized
// `conditionEvaluator` in `#shared/condition/conditionEvaluator` — all the
// operator logic, wildcard expansion, and aggregation lives there. This file
// only maps the shared result into the server-specific `EvalResult` shape.

import { conditionEvaluator } from "#shared/condition/conditionEvaluator";
import type { EvalResult } from "../types";

export function evaluate(
    rawCondition: any,
    parsed: any,
    baseline: any | undefined,
): EvalResult {
    const result = conditionEvaluator.evaluate(rawCondition, parsed, baseline);
    return {
        fired: result.fired,
        reason: result.reason,
        verdicts: result.verdicts,
    };
}
