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

// `RegExp` — regular-expression match against the observed value's string
// form. Threshold is compiled with `new RegExp(threshold)` — supports the
// standard JS syntax including flag suffixes via `(?i)`-style prefixes only
// if the caller writes an inline flag group; we don't parse `/pat/i` style.
//
// An empty or invalid pattern never fires (the invalid case is
// caller-visible via the `detail` string — same shape as other strategies'
// diagnostic-on-bad-input path).

import { ConditionOperator } from "../../types/condition";
import type { OperatorStrategy } from "../../types/operatorStrategy";

export const regExpStrategy: OperatorStrategy = {
    operator: ConditionOperator.RegExp,

    evaluate(threshold, observed) {
        if (!threshold) {
            return {
                fired: false,
                detail: "empty regular expression",
            };
        }
        let regex: RegExp;
        try {
            regex = new RegExp(threshold);
        } catch {
            return {
                fired: false,
                detail: `invalid regular expression "${threshold}"`,
            };
        }
        const fired = regex.test(String(observed ?? ""));
        return {
            fired,
            detail: fired
                ? `matches /${threshold}/`
                : `does not match /${threshold}/`,
        };
    },
};
