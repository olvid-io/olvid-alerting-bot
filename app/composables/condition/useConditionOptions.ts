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

import { computed, toValue } from "vue";
import {
    ConditionOperator,
    OPERATORS_NEEDING_VALUE,
} from "#shared/types/condition.ts";
import { orderedAggregations } from "#shared/condition/aggregators/aggregatorFactory.ts";
import { orderedOperators } from "#shared/condition/operators/operatorFactory.ts";

/**
 * Reactive catalog + validation for the ConditionRuleRow.
 */
export const useConditionOptions = (
    operator: () => ConditionOperator,
    value: () => string,
) => {
    const { t } = useI18n();

    const aggregationOptions = computed(() =>
        orderedAggregations.map((a) => ({
            value: a,
            label: t(`conditionEditor.aggregation.${a}`),
        })),
    );

    const operatorOptions = computed(() =>
        orderedOperators.map((o) => ({
            value: o,
            label: t(`conditionEditor.operator.${o}`),
        })),
    );

    const needsValue = computed(() =>
        OPERATORS_NEEDING_VALUE.has(toValue(operator)),
    );

    // Flag the value input when theres a mistake
    //   - RegExp -> pattern doesn't compile with new RegExp(v).
    //   - GreaterThan / LessThan -> not a finite number.
    //   - Equals / Contains -> always accepted (any string compares).
    // Empty values are not flagged: the user hasn't finished typing yet.
    const inputError = computed(() => {
        if (!needsValue.value) return false;
        const v = toValue(value);
        if (!v) return false;
        const op = toValue(operator);
        if (op === ConditionOperator.RegExp) {
            try {
                new RegExp(v);
                return false;
            } catch {
                return true;
            }
        }
        if (
            op === ConditionOperator.GreaterThan ||
            op === ConditionOperator.LessThan
        ) {
            // Any non-numeric junk (arithmetic operators, letters, stray
            // punctuation) makes Number(v) → NaN, which the evaluator later
            // treats as "no value" and refuses to fire. Flag it up front so
            // the user sees a red border instead of a silent no-op.
            return !Number.isFinite(Number(v));
        }
        return false;
    });

    return { aggregationOptions, operatorOptions, needsValue, inputError };
};
