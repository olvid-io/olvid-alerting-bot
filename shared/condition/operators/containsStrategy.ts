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

// `Contains` — substring match. An empty threshold never fires (every
// string "contains" the empty needle, which is never what the user meant).

import { ConditionOperator } from "../../types/condition";
import type { OperatorStrategy } from "../../types/operatorStrategy";

export const containsStrategy: OperatorStrategy = {
    operator: ConditionOperator.Contains,

    evaluate(threshold, observed) {
        const hay = String(observed ?? "");
        const needle = String(threshold ?? "");
        const fired = needle.length > 0 && hay.includes(needle);
        return {
            fired,
            detail: fired ? `contains "${needle}"` : `does not contain "${needle}"`,
        };
    },
};
