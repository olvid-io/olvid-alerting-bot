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

// `Equals` — string equality. Both sides are coerced to strings so a
// numeric payload value matches its string representation from the UI
// ("42" equals 42).

import { ConditionOperator } from "../../types/condition";
import type { OperatorStrategy } from "../../types/operatorStrategy";

export const equalsStrategy: OperatorStrategy = {
    operator: ConditionOperator.Equals,

    evaluate(threshold, observed) {
        const fired = String(observed ?? "") === String(threshold ?? "");
        return {
            fired,
            detail: fired
                ? `equals "${threshold}"`
                : `is "${observed}" (expected "${threshold}")`,
        };
    },
};
