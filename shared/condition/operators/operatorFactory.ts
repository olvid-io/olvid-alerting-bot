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

// Factory: ConditionOperator → operator strategy.
// Adding a new operator =
//   1. add its value to the ConditionOperator enum,
//   2. write its strategy file in this folder,
//   3. add one entry to the map.
// The evaluator, the message builder and the UI never change (OCP).

import { ConditionOperator } from "../../types/condition";
import type { OperatorStrategy } from "../../types/operatorStrategy";
import { changedStrategy } from "./changedStrategy";
import { equalsStrategy } from "./equalsStrategy";
import { greaterThanStrategy } from "./greaterThanStrategy";
import { lessThanStrategy } from "./lessThanStrategy";
import { containsStrategy } from "./containsStrategy";
import { regExpStrategy } from "./regExpStrategy";

const strategies: Record<ConditionOperator, OperatorStrategy> = {
    [ConditionOperator.Changed]: changedStrategy,
    [ConditionOperator.Equals]: equalsStrategy,
    [ConditionOperator.GreaterThan]: greaterThanStrategy,
    [ConditionOperator.LessThan]: lessThanStrategy,
    [ConditionOperator.Contains]: containsStrategy,
    [ConditionOperator.RegExp]: regExpStrategy,
};

export const operatorFactory = {
    /** Null for unknown operators — the caller degrades to a non-firing
     *  verdict with a diagnostic detail instead of crashing the poll. */
    forOperator(operator: ConditionOperator): OperatorStrategy | null {
        return strategies[operator] ?? null;
    },
};


export const orderedOperators: readonly ConditionOperator[] = [
    ConditionOperator.Changed,
    ConditionOperator.Equals,
    ConditionOperator.GreaterThan,
    ConditionOperator.LessThan,
    ConditionOperator.Contains,
    ConditionOperator.RegExp,
];
