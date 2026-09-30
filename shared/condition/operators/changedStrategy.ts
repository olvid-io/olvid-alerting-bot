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

// `Changed` — fires when the observed value differs from the previous
// poll's snapshot at the same path. Ignores `threshold`; reads `baseline`.

import { ConditionOperator } from "../../types/condition";
import type { OperatorStrategy } from "../../types/operatorStrategy";
import { deepEqual } from "./helpers";

export const changedStrategy: OperatorStrategy = {
    operator: ConditionOperator.Changed,

    evaluate(_threshold, observed, baseline) {
        if (baseline === undefined) {
            return {
                fired: false,
                detail: "No baseline yet",
            };
        }
        const changed = !deepEqual(observed, baseline);
        return {
            fired: changed,
            detail: changed ? "changed since last poll" : "unchanged since last poll", // TODO i18n
        };
    },
};
