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

// `Average` — numeric reducer: arithmetic mean of every numeric observed
// value, rounded to 4 decimals so verdict details don't drown in
// floating-point tail.

import { ConditionAggregation } from "../../types/condition";
import type { NumericAggregatorStrategy } from "../../types/aggregatorStrategy";

export const averageStrategy: NumericAggregatorStrategy = {
    aggregation: ConditionAggregation.Average,
    kind: "numeric",
    label: "average",

    collapse(values) {
        const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
        return Math.round(mean * 10000) / 10000;
    },
};
