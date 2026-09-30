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

// `Any` — boolean aggregator: at least one watched path's verdict fires.

import { ConditionAggregation } from "../../types/condition";
import type { BooleanAggregatorStrategy } from "../../types/aggregatorStrategy";

export const anyStrategy: BooleanAggregatorStrategy = {
    aggregation: ConditionAggregation.Any,
    kind: "boolean",

    combine(flags) {
        return flags.some(Boolean);
    },
};
