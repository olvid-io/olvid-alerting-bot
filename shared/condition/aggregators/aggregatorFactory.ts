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

// Factory: ConditionAggregation → aggregator strategy.
//
// Adding a new aggregation =
//   1. add its value to the ConditionAggregation enum,
//   2. write its strategy file in this folder,
//   3. add one entry to the map.
// The evaluator and the UI option list derive from here (OCP).

import { ConditionAggregation } from "../../types/condition";
import type { AggregatorStrategy } from "../../types/aggregatorStrategy";
import { allStrategy } from "./allStrategy";
import { anyStrategy } from "./anyStrategy";
import { sumStrategy } from "./sumStrategy";
import { averageStrategy } from "./averageStrategy";
import { minimumStrategy } from "./minimumStrategy";
import { maximumStrategy } from "./maximumStrategy";

const strategies: Record<ConditionAggregation, AggregatorStrategy> = {
    [ConditionAggregation.All]: allStrategy,
    [ConditionAggregation.Any]: anyStrategy,
    [ConditionAggregation.Sum]: sumStrategy,
    [ConditionAggregation.Average]: averageStrategy,
    [ConditionAggregation.Minimum]: minimumStrategy,
    [ConditionAggregation.Maximum]: maximumStrategy,
};

export const aggregatorFactory = {
    /** Unknown / legacy values degrade to `All` — the strictest and the
     *  historical default, so old rows keep their exact behaviour. */
    forAggregation(
        aggregation: ConditionAggregation | undefined | null,
    ): AggregatorStrategy {
        return (aggregation && strategies[aggregation]) || allStrategy;
    },
};

/** Stable display order for the aggregation dropdown — boolean
 *  combinators first, numeric reducers after. The ConditionEditor
 *  derives its options from this list. */
export const orderedAggregations: readonly ConditionAggregation[] = [
    ConditionAggregation.All,
    ConditionAggregation.Any,
    ConditionAggregation.Sum,
    ConditionAggregation.Average,
    ConditionAggregation.Minimum,
    ConditionAggregation.Maximum,
];
