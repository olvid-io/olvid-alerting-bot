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

// Condition under which a polling alert actually fires. Three independent
// axes that combine into one rule:
//
//   - ConditionKind        ─ "is there a rule at all?" (None vs Rule).
//   - ConditionOperator    ─ how to compare the observed value to the threshold.
//   - ConditionAggregation ─ when the rule watches multiple paths, do ALL
//                            of them need to pass (All) or just one (Any)?
//
// `PollingCondition` is the homogeneous storage shape: every field is always
// present, even when not currently meaningful (e.g. `value` is unused for
// the `Changed` operator). The compact form for DB persistence is produced
// by `paramCleaner.compactCondition` (in shared/condition/paramCleaner.ts).

export const ConditionKind = {
    None: "none",
    Rule: "rule",
} as const;
export type ConditionKind = (typeof ConditionKind)[keyof typeof ConditionKind];

export const ConditionOperator = {
    Changed: "changed", // value differs from previous poll's snapshot
    Equals: "equals", // value === literal
    GreaterThan: "greaterThan", // numeric comparison
    LessThan: "lessThan",
    Contains: "contains", // substring match on string value
    RegExp: "regExp", // regular-expression match against value's string form
} as const;
export type ConditionOperator =
    (typeof ConditionOperator)[keyof typeof ConditionOperator];

// How the observed values of the watched paths are AGGREGATED before /
// while the operator applies. Two families:
//
//   Boolean combinators — the operator evaluates EVERY path's value
//   individually and the per-path verdicts are combined:
//     All  → every path must verify   (logical AND)
//     Any  → at least one path        (logical OR)
//
//   Numeric reducers — the observed values are first collapsed into ONE
//   number, and the operator evaluates that single result:
//     Sum / Average / Minimum / Maximum
//
// e.g. paths=[..temperature.max], aggregation=Average, operator=GreaterThan,
// value=30 reads as: "fire when the AVERAGE of every matched temperature
// exceeds 30".
export const ConditionAggregation = {
    All: "all",
    Any: "any",
    Sum: "sum",
    Average: "average",
    Minimum: "minimum",
    Maximum: "maximum",
} as const;
export type ConditionAggregation =
    (typeof ConditionAggregation)[keyof typeof ConditionAggregation];

// Operators that need a literal value to compare against. `Changed` doesn't —
// it's always compared to the previous poll's snapshot.
export const OPERATORS_NEEDING_VALUE: ReadonlySet<ConditionOperator> = new Set([
    ConditionOperator.Equals,
    ConditionOperator.GreaterThan,
    ConditionOperator.LessThan,
    ConditionOperator.Contains,
    ConditionOperator.RegExp,
]);

// HTML <input type=...> appropriate for the operator's value field. Used by
// ConditionEditor to restrict the user to numeric input when the operator
// only makes sense over numbers — preventing the otherwise silent failure
// where "abc" enters a `greater_than` field and the evaluator then declines
// to fire (asNumbers returns null, no error surfaces).
//
// Returned values map to HTML input types so the binding is one
// :type="inputTypeForOperator(operator)" on the value input.
export const inputTypeForOperator = (
    op: ConditionOperator,
): "number" | "text" => {
    switch (op) {
        case ConditionOperator.GreaterThan:
        case ConditionOperator.LessThan:
            return "number";
        default:
            return "text";
    }
};

// ── Data shape ─────────────────────────────────────────────────────────────

export type PollingCondition = {
    kind: ConditionKind;
    paths: string[]; // dot-paths or wildcard patterns
    operator: ConditionOperator; // unused (but preserved) when kind === None
    value?: string; // unused for `changed` and for kind === None
    aggregation: ConditionAggregation; // unused (but preserved) when kind === None
};

// ── Evaluation output ──────────────────────────────────────────────────────
// Lives here (with the rest of the condition types) rather than in
// shared/condition/evaluate.ts so the evaluator file holds logic only,
// matching the project convention (types in shared/types/, logic in
// shared/condition/).

/** One verdict per concrete (post-expansion) path. */
export type Verdict = {
    path: string;
    fired: boolean;
    observed: any;
    baseline?: any;
    detail: string;
};

/** Full result of evaluating a condition against a payload. */
export type EvaluationResult = {
    /** Pulled from the (migrated) condition for convenience — callers often branch on this first. */
    kind: ConditionKind;
    /** Aggregate truth across all verdicts, per condition.aggregation. */
    fired: boolean;
    /** Human-readable summary for UI / logs. */
    reason: string;
    /** Per-path breakdown. Empty when kind=None or when no paths configured. */
    verdicts: Verdict[];
    /** Normalized condition (after `migrateCondition`) — saves the caller from re-running it. */
    condition: PollingCondition;
};
