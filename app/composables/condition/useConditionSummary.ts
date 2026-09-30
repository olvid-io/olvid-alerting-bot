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

import {
    ConditionAggregation,
    ConditionKind,
    ConditionOperator,
    OPERATORS_NEEDING_VALUE,
} from "#shared/types/condition.ts";
import { paramCleaner } from "#shared/condition/paramCleaner.ts";

/**
 * Builds the human-readable summary of a polling condition shown in the
 * view-mode "Condition" row of AlertEditor.
 *
 * @return shape: `{ headline, paths }`
 *   - `headline` is a localised sentence such as
 *     "Fires when the sum of these fields is greater than 100."
 *   - `paths`    is the list of watched dot-paths (rendered as code chips).
 */
export const useConditionSummary = () => {
    const { t } = useI18n();

    const isNumericAggregation = (a: ConditionAggregation): boolean =>
        a !== ConditionAggregation.All && a !== ConditionAggregation.Any;

    // Operator → translated phrase. `singular` picks the verb form that
    // agrees with a collapsed (single-value) subject.
    const operatorPhrase = (
        op: ConditionOperator,
        v?: string,
        singular = false,
    ): string => {
        const value = v ?? "";
        const ns = singular ? "phraseSingular" : "phrase";
        switch (op) {
            case ConditionOperator.Changed:
                return t(`editor.condition.${ns}.changed`);
            case ConditionOperator.Equals:
                return t(`editor.condition.${ns}.equals`, { value });
            case ConditionOperator.GreaterThan:
                return t(`editor.condition.${ns}.greaterThan`, { value });
            case ConditionOperator.LessThan:
                return t(`editor.condition.${ns}.lessThan`, { value });
            case ConditionOperator.Contains:
                return t(`editor.condition.${ns}.contains`, { value });
            case ConditionOperator.RegExp:
                return t(`editor.condition.${ns}.regExp`, { value });
            default:
                return String(op);
        }
    };

    const conditionSummary = (
        rawCondition: any,
    ): { headline: string; paths: string[] } => {
        const c = paramCleaner.migrateCondition(rawCondition);

        if (c.kind === ConditionKind.None) {
            return { headline: t("editor.condition.summaryNone"), paths: [] };
        }
        if (c.kind === ConditionKind.Rule) {
            const numeric = isNumericAggregation(c.aggregation);
            const subject = t(`editor.condition.subject.${c.aggregation}`);
            const phrase = operatorPhrase(c.operator, c.value, numeric);
            const needsValue = OPERATORS_NEEDING_VALUE.has(c.operator) && !c.value;
            const key = needsValue
                ? "editor.condition.summaryRuleMissingValue"
                : "editor.condition.summaryRule";
            return { headline: t(key, { subject, phrase }), paths: c.paths ?? [] };
        }
        return { headline: t("common.emDash"), paths: [] };
    };

    return { conditionSummary, operatorPhrase };
};
