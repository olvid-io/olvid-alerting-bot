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

// `LessThan` — strict numeric comparison. Symmetric to GreaterThan.

import { ConditionOperator } from "../../types/condition";
import type { OperatorStrategy } from "../../types/operatorStrategy";
import { asNumbers } from "./helpers";

export const lessThanStrategy: OperatorStrategy = {
    operator: ConditionOperator.LessThan,

    evaluate(threshold, observed) {
        const nums = asNumbers(observed, threshold);
        if (!nums) {
            return {
                fired: false,
                detail: `non-numeric: "${observed}" or "${threshold}"`,
            };
        }
        const fired = nums[0] < nums[1];
        return {
            fired,
            detail: fired ? `${nums[0]} < ${nums[1]}` : `${nums[0]} ≥ ${nums[1]}`,
        };
    },
};
