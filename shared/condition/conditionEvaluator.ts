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

// Centralized polling-condition evaluation.
// Consumers:
//   - ConditionEditor              → per-path verdicts for the live preview.
//   - buildPollingDefaultMessage   → which paths fired + observed values.
//   - server polling strategy      → real evaluation against a baseline.
//
// Wildcards: any chip whose path contains `..` is expanded against
// `payload` before evaluation. So one wildcard chip can produce many
// verdicts. A pattern that matches nothing surfaces as a single
// non-firing verdict (visible in the breakdown, not vacuously dropped).

import {
    ConditionAggregation,
    ConditionKind,
    type ConditionOperator,
    OPERATORS_NEEDING_VALUE,
    type EvaluationResult,
    type Verdict,
} from "../types/condition";
import { paramCleaner } from "./paramCleaner";
import { expandPath, hasWildcard, resolvePath } from "./pathExpand";
import { operatorFactory } from "./operators/operatorFactory";
import { aggregatorFactory } from "./aggregators/aggregatorFactory";

/** Evaluate a single concrete path against an observed value (and optional
 *  baseline). Pure delegation to the operator's strategy. */
function evalOne(
    operator: ConditionOperator,
    threshold: string | undefined,
    observed: unknown,
    baseline: unknown,
): { fired: boolean; detail: string } {
    const strategy = operatorFactory.forOperator(operator);
    if (!strategy) {
        return { fired: false, detail: `unknown operator: ${operator}` };
    }
    return strategy.evaluate(threshold, observed, baseline);
}

/** Coerce a list of observed values to numbers, silently dropping the
 *  non-numeric ones. Numeric aggregators (Sum, Average, …) only consume
 *  what survives; the evaluator reports how many were skipped. */
function toNumbers(values: readonly unknown[]): number[] {
    const nums: number[] = [];
    for (const v of values) {
        if (v === null || v === undefined || v === "") continue;
        const n = Number(v);
        if (!Number.isNaN(n)) nums.push(n);
    }
    return nums;
}

/** One concrete (post-wildcard-expansion) observation point. `missing`
 *  marks a wildcard chip that matched nothing — kept visible in the
 *  breakdown instead of silently dropped. */
type Observation = {
    path: string;
    observed: unknown;
    baseline: unknown;
    missing?: boolean;
};

// ── Public service ─────────────────────────────────────────────────────────

export const conditionEvaluator = {
    /**
     * Evaluate a polling condition against a parsed payload.
     *
     * @param rawCondition  Raw condition from alertParams (any shape — migrated internally).
     * @param payload       Parsed source object (parsed XML tree, JSON body, etc.).
     * @param baseline      Optional previous-poll snapshot for `changed` comparisons.
     *                      Omit for previews; required server-side for accurate Changed evaluation.
     */
    evaluate(rawCondition: any, payload: any, baseline?: any): EvaluationResult {
        const condition = paramCleaner.migrateCondition(rawCondition);

        // No-condition case — fires every poll cycle by definition.
        if (condition.kind === ConditionKind.None) {
            return {
                kind: ConditionKind.None,
                fired: true,
                reason: "No condition — fires every poll cycle.",
                verdicts: [],
                condition,
            };
        }

        if (condition.paths.length === 0) {
            return {
                kind: condition.kind,
                fired: false,
                reason: "No fields selected.",
                verdicts: [],
                condition,
            };
        }

        if (OPERATORS_NEEDING_VALUE.has(condition.operator) && !condition.value) {
            return {
                kind: condition.kind,
                fired: false,
                reason: `Operator "${condition.operator}" needs a value.`,
                verdicts: [],
                condition,
            };
        }

        // First pass: expand wildcard patterns into concrete observations
        // against the CURRENT payload. One wildcard chip ("..temperatura.maxima")
        // becomes one observation per match — re-expanded every call, so new
        // array entries between polls are picked up automatically. A pattern
        // that matches nothing yields a `missing` placeholder so the preview
        // shows it instead of silently dropping the chip.
        const observations: Observation[] = condition.paths.flatMap(
            (pathOrPattern) => {
                if (!hasWildcard(pathOrPattern)) {
                    return [
                        {
                            path: pathOrPattern,
                            observed: resolvePath(payload, pathOrPattern),
                            baseline:
                                baseline === undefined
                                    ? undefined
                                    : resolvePath(baseline, pathOrPattern),
                        },
                    ];
                }
                const concretes = expandPath(pathOrPattern, payload);
                if (concretes.length === 0) {
                    return [
                        {
                            path: pathOrPattern,
                            observed: undefined,
                            baseline: undefined,
                            missing: true,
                        },
                    ];
                }
                return concretes.map((concretePath) => ({
                    path: concretePath,
                    observed: resolvePath(payload, concretePath),
                    baseline:
                        baseline === undefined
                            ? undefined
                            : resolvePath(baseline, concretePath),
                }));
            },
        );

        // Strategy dispatch — the ONLY branch on the aggregation family.
        const aggregator = aggregatorFactory.forAggregation(condition.aggregation);

        // ── Numeric reducers (Sum / Average / Minimum / Maximum) ──────────────
        // Collapse every numeric observed value into ONE number, then run the
        // operator once against that result. Baselines collapse the same way,
        // so `Changed` compares aggregate-vs-aggregate ("the sum changed").
        if (aggregator.kind === "numeric") {
            const present = observations.filter((o) => !o.missing);
            const nums = toNumbers(present.map((o) => o.observed));
            const label = `${aggregator.label}(${present.length} field${present.length === 1 ? "" : "s"})`;

            if (nums.length === 0) {
                const verdict: Verdict = {
                    path: label,
                    fired: false,
                    observed: undefined,
                    baseline: undefined,
                    detail: "no numeric values to aggregate",
                };
                return {
                    kind: condition.kind,
                    fired: false,
                    reason: `No numeric values for ${aggregator.label} — condition cannot fire.`,
                    verdicts: [verdict],
                    condition,
                };
            }

            const collapsed = aggregator.collapse(nums);
            const baselineNums =
                baseline === undefined ? [] : toNumbers(present.map((o) => o.baseline));
            const collapsedBaseline =
                baseline !== undefined && baselineNums.length > 0
                    ? aggregator.collapse(baselineNums)
                    : undefined;

            const skipped = present.length - nums.length;
            const skippedNote =
                skipped > 0 ? ` (${skipped} non-numeric skipped)` : "";
            const { fired, detail } = evalOne(
                condition.operator,
                condition.value,
                collapsed,
                collapsedBaseline,
            );
            const verdict: Verdict = {
                path: label,
                fired,
                observed: collapsed,
                baseline: collapsedBaseline,
                detail: `${detail}${skippedNote}`,
            };
            return {
                kind: condition.kind,
                fired,
                reason: `${label} = ${collapsed} — ${detail}${skippedNote}.`,
                verdicts: [verdict],
                condition,
            };
        }

        // ── Boolean combinators (All / Any) — one verdict per path ────────────
        const verdicts: Verdict[] = observations.map((o) => {
            if (o.missing) {
                return {
                    path: o.path,
                    fired: false,
                    observed: undefined,
                    baseline: undefined,
                    detail: "pattern matched no paths in the current source",
                };
            }
            const { fired, detail } = evalOne(
                condition.operator,
                condition.value,
                o.observed,
                o.baseline,
            );
            return {
                path: o.path,
                fired,
                observed: o.observed,
                baseline: o.baseline,
                detail,
            };
        });

        // "All of N" = every concrete (post-expansion) path must fire — the
        // meaningful semantics, not "all chips fired" (which would ignore
        // expansion).
        const fired = aggregator.combine(verdicts.map((v) => v.fired));

        const firedCount = verdicts.filter((v) => v.fired).length;
        const total = verdicts.length;
        const reason = `${condition.aggregation === ConditionAggregation.Any ? "Any" : "All"} of ${total} field${total === 1 ? "" : "s"} — ${firedCount}/${total} verified.`;

        return { kind: condition.kind, fired, reason, verdicts, condition };
    },
};
