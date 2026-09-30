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

import { computed } from "vue";
import {
    ConditionKind,
    ConditionOperator,
    ConditionAggregation,
    OPERATORS_NEEDING_VALUE,
    type PollingCondition,
    type Verdict,
} from "#shared/types/condition.ts";
import { conditionEvaluator } from "#shared/condition/conditionEvaluator.ts";

export type ConditionVerdict = {
    // True when the current condition WOULD fire against the snapshot.
    ok: boolean;
    // One-line human summary — already localised.
    label: string;
    // Per-path breakdown.
    breakdown?: Verdict[];
};

/**
 * Computes the "would fire?" preview for the polling condition editor.
 * Runs the shared evaluator against the retrieved snapshot and turns
 * the raw verdicts into a display-ready { ok, label, breakdown } shape.
 *
 * @param currentGetter    Reactive getter for the migrated PollingCondition.
 * @param parsedGetter     Reactive getter for the parsed source snapshot.
 * @param retrievedGetter  Reactive getter for the "have we successfully
 *                         retrieved?" flag (mirrors useSourceRetrieve.retrieved).
 * @param effectivePathsGetter Reactive getter for wildcard-expanded paths
 *                             (from useConditionForm.effectivePaths).
 */
export const useConditionVerdict = (
    currentGetter: () => PollingCondition,
    parsedGetter: () => unknown,
    retrievedGetter: () => boolean,
    effectivePathsGetter: () => string[],
) => {
    const { t } = useI18n();

    /** Per-path verdicts for the current snapshot. Shared evaluator, same
     *  logic the server engine + polling-default message builder use.
     *  No baseline available client-side, so `Changed` shows as "would fire
     *  on next change" (evaluator preview default). */
    const verdicts = computed<Verdict[]>(() => {
        const current = currentGetter();
        if (!retrievedGetter() || current.paths.length === 0) return [];
        return conditionEvaluator.evaluate(current, parsedGetter()).verdicts;
    });

    /** Numeric reducers (Sum / Average / Min / Max) collapse everything into
     *  one synthetic verdict — the All / Any "X of Y fields" phrasing doesn't
     *  apply, and the per-field breakdown would be misleading. */
    const isNumericAgg = computed(() => {
        const agg = currentGetter().aggregation;
        return agg !== ConditionAggregation.All && agg !== ConditionAggregation.Any;
    });

    const summary = computed<ConditionVerdict>(() => {
        const current = currentGetter();
        const retrieved = retrievedGetter();
        const effective = effectivePathsGetter();

        if (current.kind === ConditionKind.None) {
            return { ok: true, label: t("conditionEditor.summary.firesEvery") };
        }
        if (current.paths.length === 0) {
            return { ok: false, label: t("conditionEditor.summary.noFields") };
        }
        if (retrieved && effective.length === 0) {
            return { ok: false, label: t("conditionEditor.summary.noMatch") };
        }
        if (current.operator === ConditionOperator.Changed) {
            const n = effective.length;
            return {
                ok: false,
                label:
                    n === 1
                        ? t("conditionEditor.summary.changedNeedsBaseline", { n })
                        : t("conditionEditor.summary.changedNeedsBaselinePlural", { n }),
            };
        }
        const literal = current.value ?? "";
        if (OPERATORS_NEEDING_VALUE.has(current.operator) && !literal) {
            return {
                ok: false,
                label: t("conditionEditor.summary.operatorNeedsValue", {
                    operator: current.operator,
                }),
            };
        }
        if (!retrieved) {
            return {
                ok: false,
                label: t("conditionEditor.summary.waitingForSource"),
            };
        }

        const vs = verdicts.value;

        // Numeric aggregation: a single synthetic verdict carries the collapsed
        // value + comparison in its detail. No per-field breakdown to show.
        if (isNumericAgg.value) {
            const v = vs[0];
            if (!v) {
                return {
                    ok: false,
                    label: t("conditionEditor.summary.waitingForSource"),
                };
            }
            return {
                ok: v.fired,
                label: t(
                    v.fired
                        ? "conditionEditor.summary.wouldFireAgg"
                        : "conditionEditor.summary.wouldNotFireAgg",
                    { detail: v.detail },
                ),
            };
        }

        const isAll = current.aggregation === ConditionAggregation.All;
        const fired = isAll ? vs.every((v) => v.fired) : vs.some((v) => v.fired);
        const passing = vs.filter((v) => v.fired).length;
        const total = vs.length;
        const key = fired
            ? isAll
                ? total === 1
                    ? "conditionEditor.summary.wouldFireAll"
                    : "conditionEditor.summary.wouldFireAllPlural"
                : total === 1
                    ? "conditionEditor.summary.wouldFireAny"
                    : "conditionEditor.summary.wouldFireAnyPlural"
            : isAll
                ? total === 1
                    ? "conditionEditor.summary.wouldNotFireRequiresAll"
                    : "conditionEditor.summary.wouldNotFireRequiresAllPlural"
                : total === 1
                    ? "conditionEditor.summary.wouldNotFireRequiresAny"
                    : "conditionEditor.summary.wouldNotFireRequiresAnyPlural";
        return { ok: fired, label: t(key, { total, passing }), breakdown: vs };
    });

    return { summary, verdicts, isNumericAgg };
};
